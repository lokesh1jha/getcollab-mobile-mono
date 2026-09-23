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
  opportunityKindLabel,
  type GrowthSite,
} from '../../../../components/growth/growth-shared'

function OpportunitiesBody({ site, navigation }: { site: GrowthSite; navigation?: any }) {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthOpportunities(site.id)
      const list = res?.opportunities || res?.data || []
      setOpportunities(Array.isArray(list) ? list : [])
    } catch (err) {
      handleApiError(err, 'Could not load opportunities')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [site.id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <GrowthScreen
      title="Opportunities"
      subtitle="Searches you already show up for but could win more"
      active="GrowthOpportunities"
      navigation={navigation}
      host={site.host}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load()
      }}
    >
      {!loading && opportunities.length === 0 ? (
        <GrowthEmpty
          icon="trending-up-outline"
          title="No opportunities yet"
          body="Connect Search Console and sync. We look for queries you’re close to winning, plus topics with a creator angle."
          ctaLabel="Open Search Console"
          onCta={() => navigation?.navigate('GrowthSearchConsole')}
        />
      ) : (
        opportunities.map((o: any, i: number) => (
          <Animated.View key={o.id} entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)} style={growthStyles.card}>
            <View style={growthStyles.pillRow}>
              <View style={[growthStyles.pill, { backgroundColor: colors.blueSoft }]}>
                <Text style={[growthStyles.pillText, { color: colors.blue }]}>{opportunityKindLabel(o.kind)}</Text>
              </View>
              {o.branded ? (
                <View style={[growthStyles.pill, { backgroundColor: colors.elevated }]}>
                  <Text style={[growthStyles.pillText, { color: colors.textMuted }]}>Brand name</Text>
                </View>
              ) : null}
            </View>
            <Text style={growthStyles.rowLabel}>{o.query || o.summary}</Text>
            {o.query && o.summary ? <Text style={growthStyles.rowBody}>{o.summary}</Text> : null}
            <Text style={growthStyles.meta}>
              {o.position != null ? `Avg position ${Number(o.position).toFixed(1)}` : null}
              {o.impressions != null ? ` · shown ${Number(o.impressions).toLocaleString()}` : ''}
              {o.clicks != null ? ` · clicks ${Number(o.clicks).toLocaleString()}` : ''}
            </Text>
          </Animated.View>
        ))
      )}
    </GrowthScreen>
  )
}

export default function GrowthOpportunitiesScreen({ navigation }: { navigation?: any }) {
  return (
    <GrowthGate navigation={navigation}>
      {(site) => <OpportunitiesBody site={site} navigation={navigation} />}
    </GrowthGate>
  )
}
