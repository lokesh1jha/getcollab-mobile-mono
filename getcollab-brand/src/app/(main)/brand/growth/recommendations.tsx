import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors, STATUS_COLORS } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import {
  GrowthGate,
  GrowthScreen,
  GrowthEmpty,
  growthStyles,
  dimensionLabel,
  type GrowthSite,
} from '../../../../components/growth/growth-shared'


function RecommendationsBody({ site, navigation }: { site: GrowthSite; navigation?: any }) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthRecommendations(site.id)
      const list = res?.recommendations || res?.data || []
      setRecommendations(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Could not load recommendations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [site.id])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id: string, status: string) => {
    setBusyId(id)
    try {
      await apiService.setGrowthRecommendationStatus(id, status)
      await load()
    } catch (err) {
      handleApiError(err, 'Could not update recommendation')
    } finally {
      setBusyId(null)
    }
  }

  const findCreators = async (id: string) => {
    setBusyId(id)
    try {
      const handoff = await apiService.getGrowthCreatorHandoff(id)
      // Hand the keyword to creator search rather than re-deriving it here.
      navigation?.navigate('Creators', { keyword: handoff?.target_keyword })
    } catch (err) {
      handleApiError(err, 'Could not open creator search')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <GrowthScreen
      title="Recommendations"
      subtitle="Ranked by impact vs effort"
      active="GrowthRecommendations"
      navigation={navigation}
      host={site.host}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load()
      }}
    >
      {!loading && recommendations.length === 0 ? (
        <GrowthEmpty
          icon="list-outline"
          title="No recommendations yet"
          body="Run a website analysis from Overview. We’ll turn issues into a short to-do list."
          ctaLabel="Go to Overview"
          onCta={() => navigation?.navigate('Growth')}
        />
      ) : (
        recommendations.map((rec: any, i: number) => {
          const tone = STATUS_COLORS[rec.status] ?? STATUS_COLORS.dismissed
          const busy = busyId === rec.id
          return (
            <Animated.View key={rec.id} entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)} style={growthStyles.card}>
              <View style={growthStyles.pillRow}>
                <View style={[growthStyles.pill, { backgroundColor: colors.blueSoft }]}>
                  <Text style={[growthStyles.pillText, { color: colors.blue }]}>{dimensionLabel(rec.dimension)}</Text>
                </View>
                <View style={[growthStyles.pill, { backgroundColor: tone.bg }]}>
                  <Text style={[growthStyles.pillText, { color: tone.fg }]}>
                    {String(rec.status || '').replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <Text style={growthStyles.rowLabel}>{rec.title}</Text>
              <Text style={growthStyles.rowBody}>{rec.summary}</Text>
              <Text style={growthStyles.meta}>
                Impact {rec.impact} · Confidence {rec.confidence} · Effort {rec.effort}
              </Text>

              <View style={growthStyles.btnRow}>
                {rec.status === 'open' ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setStatus(rec.id, 'approved')}
                      disabled={busy}
                      style={({ pressed }) => [growthStyles.outlinedBtn, { paddingVertical: 8 }, (pressed || busy) && { opacity: 0.7 }]}
                    >
                      <Text style={growthStyles.outlinedBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setStatus(rec.id, 'dismissed')}
                      disabled={busy}
                      style={({ pressed }) => [growthStyles.outlinedBtn, { paddingVertical: 8 }, (pressed || busy) && { opacity: 0.7 }]}
                    >
                      <Text style={growthStyles.outlinedBtnText}>Dismiss</Text>
                    </Pressable>
                  </>
                ) : null}

                {rec.status === 'approved' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setStatus(rec.id, 'done')}
                    disabled={busy}
                    style={({ pressed }) => [growthStyles.outlinedBtn, { paddingVertical: 8 }, (pressed || busy) && { opacity: 0.7 }]}
                  >
                    <Text style={growthStyles.outlinedBtnText}>Mark done</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => findCreators(rec.id)}
                  disabled={busy}
                  style={({ pressed }) => [growthStyles.primaryBtn, { paddingVertical: 8 }, (pressed || busy) && { opacity: 0.7 }]}
                >
                  <Text style={growthStyles.primaryBtnText}>Find creators</Text>
                </Pressable>
              </View>
            </Animated.View>
          )
        })
      )}
    </GrowthScreen>
  )
}

export default function GrowthRecommendationsScreen({ navigation }: { navigation?: any }) {
  return (
    <GrowthGate navigation={navigation}>
      {(site) => <RecommendationsBody site={site} navigation={navigation} />}
    </GrowthGate>
  )
}
