import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { apiService, handleApiError } from '@shared/services/api'
import { colors } from '@/src/theme'
import {
  GrowthGate,
  GrowthScreen,
  GrowthEmpty,
  growthStyles,
  dimensionLabel,
  scoreDisplay,
  type GrowthSite,
} from '../../../../components/growth/growth-shared'

const POLL_INTERVAL_MS = 2500

interface Job {
  id: string
  status: string
  pagesCrawled?: number
  errorMessage?: string
}

function OverviewBody({ site, navigation }: { site: GrowthSite; navigation?: any }) {
  const [overview, setOverview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthOverview(site.id)
      setOverview(res?.overview || res?.data || res)
    } catch (err) {
      handleApiError(err, 'Could not load overview')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [site.id])

  useEffect(() => {
    load()
  }, [load])

  // Poll the crawl job while it runs, then pull the fresh overview.
  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return
    pollRef.current = setTimeout(async () => {
      try {
        const res = await apiService.getGrowthJob(job.id)
        const next: Job = res?.job || res?.data || res
        setJob(next)
        if (next?.status === 'succeeded' || next?.status === 'failed') {
          setAnalyzing(false)
          load()
        }
      } catch {
        setAnalyzing(false)
      }
    }, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [job, load])

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await apiService.analyzeGrowthSite(site.id)
      const jobId = res?.jobId || res?.job?.id
      setJob({ id: jobId, status: res?.status || 'queued' })
    } catch (err) {
      setAnalyzing(false)
      handleApiError(err, 'Could not start analysis')
    }
  }

  const score = overview?.score
  const signals = score?.signals ?? []
  const recommendations = overview?.topRecommendations ?? []
  const clusters = overview?.contentClusters ?? []
  const issueCounts = overview?.issueCounts ?? {}
  const empty = !loading && !score && !analyzing

  const issueCards = [
    { label: 'Fix first', value: issueCounts.critical ?? 0, severity: 'critical' },
    { label: 'Worth fixing', value: issueCounts.warning ?? 0, severity: 'warning' },
    { label: 'Nice to have', value: issueCounts.info ?? 0, severity: 'info' },
  ]

  return (
    <GrowthScreen
      title="Overview"
      subtitle="Your website and creator marketing at a glance"
      active="Growth"
      navigation={navigation}
      host={site.host}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load()
      }}
    >
      <View style={growthStyles.btnRow}>
        <Pressable
          accessibilityRole="button"
          onPress={runAnalysis}
          disabled={analyzing}
          style={({ pressed }) => [growthStyles.primaryBtn, (pressed || analyzing) && { opacity: 0.7 }]}
        >
          <Text style={growthStyles.primaryBtnText}>{analyzing ? 'Analyzing…' : 'Run analysis'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation?.navigate('GrowthSetup')}
          style={({ pressed }) => [growthStyles.outlinedBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={growthStyles.outlinedBtnText}>Change website</Text>
        </Pressable>
      </View>

      {analyzing ? (
        <Text style={[growthStyles.meta, { marginBottom: 12 }]}>
          Checking your pages{job?.pagesCrawled ? ` · ${job.pagesCrawled} pages so far` : ''}. This usually takes a minute.
        </Text>
      ) : null}

      {job?.status === 'failed' ? (
        <Text style={[growthStyles.meta, { color: '#EF4444' }]}>
          {job.errorMessage || 'Analysis failed. Try again.'}
        </Text>
      ) : null}

      {empty ? (
        <GrowthEmpty
          icon="analytics-outline"
          title="No analysis yet"
          body="Run an analysis to see scores, issues, and next steps."
          ctaLabel="Analyze website"
          onCta={runAnalysis}
        />
      ) : null}

      {score ? (
        <>
          <Animated.View entering={FadeInDown.duration(320)} style={growthStyles.card}>
            <Text style={growthStyles.metricLabel}>Growth Score</Text>
            <Text style={growthStyles.scoreValue}>{score.overall}</Text>
            <Text style={growthStyles.meta}>
              Algorithm {score.algorithmVersion}
              {typeof score.trend === 'number'
                ? ` · ${score.trend > 0 ? '↑' : score.trend < 0 ? '↓' : '→'} ${Math.abs(score.trend)} vs last snapshot`
                : ''}
              {score.updatedAt ? ` · Updated ${new Date(score.updatedAt).toLocaleDateString()}` : ''}
            </Text>
          </Animated.View>

          <View style={growthStyles.metricRow}>
            {signals.slice(0, 3).map((sig: any) => (
              <View key={sig.key} style={growthStyles.metricCard}>
                <Text style={growthStyles.metricLabel} numberOfLines={1}>
                  {sig.name}
                </Text>
                <Text style={growthStyles.metricValue}>{scoreDisplay(sig.score)}</Text>
              </View>
            ))}
          </View>
          {signals.length > 3 ? (
            <View style={growthStyles.metricRow}>
              {signals.slice(3).map((sig: any) => (
                <View key={sig.key} style={growthStyles.metricCard}>
                  <Text style={growthStyles.metricLabel} numberOfLines={1}>
                    {sig.name}
                  </Text>
                  <Text style={growthStyles.metricValue}>{scoreDisplay(sig.score)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={growthStyles.meta}>
            Blank cards need Search Console or an AI Visibility scan.
          </Text>

          <View style={growthStyles.metricRow}>
            {issueCards.map((c) => (
              <Pressable
                key={c.severity}
                accessibilityRole="button"
                onPress={() => navigation?.navigate('GrowthSeo', { severity: c.severity })}
                style={({ pressed }) => [growthStyles.metricCard, pressed && { opacity: 0.8 }]}
              >
                <Text style={growthStyles.metricLabel}>{c.label}</Text>
                <Text style={growthStyles.metricValue}>{c.value}</Text>
              </Pressable>
            ))}
          </View>

          <View style={growthStyles.card}>
            <Text style={growthStyles.cardTitle}>Next steps</Text>
            {recommendations.length === 0 ? (
              <Text style={growthStyles.rowBody}>
                Nothing open. Run analysis again after you make changes.
              </Text>
            ) : (
              recommendations.map((rec: any) => (
                <View key={rec.id} style={{ marginBottom: 12 }}>
                  <Text style={growthStyles.rowLabel}>{rec.title}</Text>
                  <Text style={growthStyles.rowBody}>{rec.summary}</Text>
                  <View style={[growthStyles.pill, { backgroundColor: colors.blueSoft }]}>
                    <Text style={[growthStyles.pillText, { color: colors.blue }]}>{dimensionLabel(rec.dimension)}</Text>
                  </View>
                </View>
              ))
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation?.navigate('GrowthRecommendations')}
              style={({ pressed }) => [growthStyles.outlinedBtn, { marginTop: 4 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={growthStyles.outlinedBtnText}>All recommendations</Text>
            </Pressable>
          </View>

          {clusters.length > 0 ? (
            <View style={growthStyles.card}>
              <Text style={growthStyles.cardTitle}>Content coverage</Text>
              {clusters.map((c: any) => (
                <View key={c.name} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={growthStyles.rowLabel}>{c.name}</Text>
                  <Text style={growthStyles.rowBody}>{c.coverage}%</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={growthStyles.card}>
            <Text style={growthStyles.cardTitle}>Search Performance</Text>
            <Text style={growthStyles.rowBody}>
              {overview?.searchConsole?.connected
                ? `Connected${overview.searchConsole.selectedProperty ? ` · ${overview.searchConsole.selectedProperty}` : ''}`
                : 'Connect Google Search Console'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation?.navigate('GrowthSearchConsole')}
              style={({ pressed }) => [growthStyles.outlinedBtn, { marginTop: 12 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={growthStyles.outlinedBtnText}>Open</Text>
            </Pressable>
          </View>

          <View style={growthStyles.card}>
            <Text style={growthStyles.cardTitle}>AI Visibility</Text>
            <Text style={growthStyles.rowBody}>
              {overview?.aiVisibility?.score != null
                ? `${overview.aiVisibility.score} from configured APIs (${(overview.aiVisibility.configuredProviders ?? []).join(', ') || 'none'})`
                : overview?.aiVisibility?.reason ||
                  'Needs an official provider API and a scan. Not a ChatGPT ranking.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation?.navigate('GrowthAiVisibility')}
              style={({ pressed }) => [growthStyles.outlinedBtn, { marginTop: 12 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={growthStyles.outlinedBtnText}>Open</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {!score && analyzing ? (
        <Text style={growthStyles.meta}>First results appear when the check finishes.</Text>
      ) : null}
    </GrowthScreen>
  )
}

const colors_blueSoft = 'rgba(59,130,246,0.12)'

export default function GrowthOverviewScreen({ navigation }: { navigation?: any }) {
  return (
    <GrowthGate navigation={navigation}>
      {(site) => <OverviewBody site={site} navigation={navigation} />}
    </GrowthGate>
  )
}
