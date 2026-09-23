import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import {
  GrowthGate,
  GrowthScreen,
  GrowthEmpty,
  growthStyles,
  dimensionLabel,
  severityLabel,
  SEVERITY_TONES,
  type GrowthSite,
} from '../../../../components/growth/growth-shared'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'critical', label: 'Fix first' },
  { key: 'warning', label: 'Worth fixing' },
  { key: 'info', label: 'Nice to have' },
]

const READINESS_ROWS: Array<[string, string]> = [
  ['Organization schema', 'hasOrganizationSchema'],
  ['Product schema', 'hasProductSchema'],
  ['FAQ', 'hasFAQSchema'],
  ['Sitemap', 'hasSitemap'],
  ['robots.txt', 'hasRobots'],
  ['llms.txt', 'hasLLMSTxt'],
  ['Author entities', 'hasAuthorPages'],
  ['Review schema', 'hasReviewSchema'],
]

function SeoBody({ site, navigation, initialSeverity }: { site: GrowthSite; navigation?: any; initialSeverity?: string }) {
  const [severity, setSeverity] = useState(initialSeverity ?? '')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthSeo(site.id, severity || undefined)
      setData(res?.data || res)
    } catch (err) {
      handleApiError(err, 'Could not load site checks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [site.id, severity])

  useEffect(() => {
    load()
  }, [load])

  const issues = data?.issues ?? []
  const readiness = data?.readiness

  return (
    <GrowthScreen
      title="SEO"
      subtitle="Plain-language checks on your public pages"
      active="GrowthSeo"
      navigation={navigation}
      host={site.host}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load()
      }}
    >
      <View style={[growthStyles.btnRow, { marginBottom: 12 }]}>
        {FILTERS.map((f) => {
          const isActive = severity === f.key
          return (
            <Pressable
              key={f.key || 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setSeverity(f.key)}
              style={({ pressed }) => [
                isActive ? growthStyles.primaryBtn : growthStyles.outlinedBtn,
                { paddingVertical: 8, paddingHorizontal: 14 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={isActive ? growthStyles.primaryBtnText : growthStyles.outlinedBtnText}>{f.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {data?.score ? (
        <Text style={[growthStyles.meta, { marginBottom: 12 }]}>
          Growth Score {data.score.overall} (algorithm {data.score.algorithmVersion}). SEO Health is crawl-based; AI
          Readiness is markup — not AI assistant rankings.
        </Text>
      ) : null}

      {readiness ? (
        <View style={growthStyles.card}>
          <Text style={growthStyles.cardTitle}>AI Readiness</Text>
          <Text style={growthStyles.rowBody}>On-site signals only. No ChatGPT, Gemini, or Claude.</Text>
          <View style={{ marginTop: 12 }}>
            {READINESS_ROWS.map(([label, key]) => {
              const ok = !!readiness[key]
              return (
                <View key={key} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ color: ok ? '#22C55E' : '#EF4444', fontSize: 14, fontWeight: '700' }}>
                    {ok ? '✓' : '✗'}
                  </Text>
                  <Text style={growthStyles.rowLabel}>{label}</Text>
                </View>
              )
            })}
          </View>
        </View>
      ) : null}

      {!loading && issues.length === 0 ? (
        <GrowthEmpty
          icon="checkmark-circle-outline"
          title={severity ? 'Nothing in this filter' : 'No issues found'}
          body={
            severity
              ? 'Try a different severity filter.'
              : 'Run an analysis from Overview if this is your first visit.'
          }
        />
      ) : (
        issues.map((issue: any, i: number) => {
          const tone = SEVERITY_TONES[issue.severity] ?? { fg: colors.textMuted, bg: 'rgba(161,161,170,0.12)' }
          return (
            <Animated.View key={issue.id} entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)} style={growthStyles.card}>
              <View style={growthStyles.pillRow}>
                <View style={[growthStyles.pill, { backgroundColor: tone.bg }]}>
                  <Text style={[growthStyles.pillText, { color: tone.fg }]}>{severityLabel(issue.severity)}</Text>
                </View>
                <View style={[growthStyles.pill, { backgroundColor: 'rgba(161,161,170,0.12)' }]}>
                  <Text style={[growthStyles.pillText, { color: colors.textMuted }]}>
                    {dimensionLabel(issue.dimension)}
                  </Text>
                </View>
              </View>
              <Text style={growthStyles.rowLabel}>{issue.title}</Text>
              <Text style={growthStyles.rowBody}>{issue.summary}</Text>
              {issue.pageUrl ? <Text style={growthStyles.meta}>{issue.pageUrl}</Text> : null}
            </Animated.View>
          )
        })
      )}
    </GrowthScreen>
  )
}

export default function GrowthSeoScreen({ navigation, route }: { navigation?: any; route?: any }) {
  const severity = route?.params?.severity as string | undefined
  return (
    <GrowthGate navigation={navigation}>
      {(site) => <SeoBody site={site} navigation={navigation} initialSeverity={severity} />}
    </GrowthGate>
  )
}
