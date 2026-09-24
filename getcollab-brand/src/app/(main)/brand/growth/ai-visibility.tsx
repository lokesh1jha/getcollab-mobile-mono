import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import {
  GrowthGate,
  GrowthScreen,
  GrowthEmpty,
  growthStyles,
  type GrowthSite,
} from '../../../../components/growth/growth-shared'

function AiVisibilityBody({ site, navigation }: { site: GrowthSite; navigation?: any }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<any>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthAiVisibility(site.id)
      setData(res?.data || res)
    } catch (err) {
      handleApiError(err, 'Could not load AI visibility')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [site.id])

  useEffect(() => {
    load()
  }, [load])

  const scan = async () => {
    setScanning(true)
    try {
      await apiService.scanGrowthAiVisibility(site.id)
      await load()
    } catch (err) {
      handleApiError(err, 'Could not start AI visibility scan')
    } finally {
      setScanning(false)
    }
  }

  const ask = async () => {
    const q = question.trim()
    if (!q) return
    setAsking(true)
    try {
      const res = await apiService.askGrowthCopilot(site.id, q)
      setAnswer(res?.data || res)
    } catch (err) {
      handleApiError(err, 'Could not run copilot')
    } finally {
      setAsking(false)
    }
  }

  const providers = data?.providers ?? []
  const missingQueries = data?.missingQueries ?? []
  const hasScan = data?.score != null || providers.length > 0

  return (
    <GrowthScreen
      title="AI Visibility"
      subtitle="How often AI answers mention you"
      active="GrowthAiVisibility"
      navigation={navigation}
      host={site.host}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load()
      }}
    >
      {data?.available ? (
        <View style={growthStyles.btnRow}>
          <Pressable
            accessibilityRole="button"
            onPress={scan}
            disabled={scanning}
            style={({ pressed }) => [growthStyles.primaryBtn, (pressed || scanning) && { opacity: 0.7 }]}
          >
            <Text style={growthStyles.primaryBtnText}>{scanning ? 'Queuing…' : 'Run scan'}</Text>
          </Pressable>
        </View>
      ) : null}

      {data && !data.available ? (
        <GrowthEmpty
          icon="sparkles-outline"
          title="AI Visibility isn’t configured"
          body={
            data.reason ||
            'We only use official APIs (OpenAI, Anthropic, Gemini, Perplexity), never consumer chat apps.'
          }
        />
      ) : null}

      {data?.available && !hasScan ? (
        <GrowthEmpty
          icon="sparkles-outline"
          title="Run your first scan"
          body="We’ll ask buyer-style questions and record mentions, citations and competitors."
          ctaLabel="Run scan"
          onCta={scan}
        />
      ) : null}

      {hasScan ? (
        <View style={growthStyles.metricRow}>
          <View style={growthStyles.metricCard}>
            <Text style={growthStyles.metricLabel}>AI Visibility</Text>
            <Text style={growthStyles.metricValue}>{data?.score ?? '—'}</Text>
          </View>
          <View style={growthStyles.metricCard}>
            <Text style={growthStyles.metricLabel}>Mention rate</Text>
            <Text style={growthStyles.metricValue}>
              {data?.mentionRate != null ? `${Math.round(data.mentionRate * 100)}%` : '—'}
            </Text>
          </View>
          <View style={growthStyles.metricCard}>
            <Text style={growthStyles.metricLabel}>Citation rate</Text>
            <Text style={growthStyles.metricValue}>
              {data?.citationRate != null ? `${Math.round(data.citationRate * 100)}%` : '—'}
            </Text>
          </View>
        </View>
      ) : null}

      {providers.map((p: any, i: number) => (
        <Animated.View key={p.name} entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)} style={growthStyles.card}>
          <Text style={growthStyles.cardTitle}>{String(p.name).replace(/^./, (c) => c.toUpperCase())}</Text>
          <Text style={growthStyles.rowBody}>
            {p.mentioned ? 'Mentioned' : 'Not mentioned'} · {p.results} tracked answers
          </Text>
        </Animated.View>
      ))}

      {missingQueries.length > 0 ? (
        <View style={growthStyles.card}>
          <Text style={growthStyles.cardTitle}>Queries without a mention</Text>
          {missingQueries.map((q: string, i: number) => (
            <Text key={q} style={[growthStyles.rowBody, { marginBottom: 4 }]}>
              {i + 1}. {q}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={growthStyles.card}>
        <Text style={growthStyles.cardTitle}>Ask about this site</Text>
        <Text style={growthStyles.rowBody}>
          Answers use only the data you’ve connected.
        </Text>
        <TextInput
          style={[growthStyles.input, { marginTop: spacing.md, minHeight: 80, textAlignVertical: 'top' }]}
          value={question}
          onChangeText={setQuestion}
          placeholder="What should we fix first?"
          placeholderTextColor={colors.textSubtle}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          onPress={ask}
          disabled={!question.trim() || asking}
          style={({ pressed }) => [
            growthStyles.primaryBtn,
            { marginTop: spacing.md },
            (pressed || !question.trim() || asking) && { opacity: 0.7 },
          ]}
        >
          <Text style={growthStyles.primaryBtnText}>{asking ? 'Thinking…' : 'Ask'}</Text>
        </Pressable>

        {answer ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            {([
              ['Observed', answer.observed],
              ['Interpretation', answer.interpretation],
              ['Recommendation', answer.recommendation],
            ] as Array<[string, string[] | undefined]>).map(([label, items]) => (
              <View key={label}>
                <Text style={[growthStyles.metricLabel, { letterSpacing: 0.5 }]}>{label.toUpperCase()}</Text>
                {(items ?? []).map((x, i) => (
                  <Text key={i} style={growthStyles.rowBody}>
                    • {x}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </GrowthScreen>
  )
}

export default function GrowthAiVisibilityScreen({ navigation }: { navigation?: any }) {
  return (
    <GrowthGate navigation={navigation}>
      {(site) => <AiVisibilityBody site={site} navigation={navigation} />}
    </GrowthGate>
  )
}
