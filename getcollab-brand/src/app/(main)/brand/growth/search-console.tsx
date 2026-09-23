import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable, Linking } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { colors } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import {
  GrowthGate,
  GrowthScreen,
  GrowthEmpty,
  growthStyles,
  type GrowthSite,
} from '../../../../components/growth/growth-shared'

function SearchConsoleBody({ site, navigation }: { site: GrowthSite; navigation?: any }) {
  const [data, setData] = useState<any>(null)
  const [properties, setProperties] = useState<string[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthSearchConsole(site.id)
      const payload = res?.data || res
      setData(payload)
      const conn = payload?.connection
      // Only ask Google for properties while none is chosen yet.
      if (conn?.connected && !conn.selectedProperty) {
        const propsRes = await apiService.getGrowthSearchConsoleProperties(site.id).catch(() => null)
        setProperties(propsRes?.properties ?? [])
      }
    } catch (err) {
      handleApiError(err, 'Could not load Search Console')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [site.id])

  useEffect(() => {
    load()
  }, [load])

  const connect = async () => {
    setBusy(true)
    try {
      const res = await apiService.connectGrowthSearchConsole(site.id)
      const url = res?.url || res?.data?.url
      // OAuth happens in the browser; the user returns here and we refetch on focus.
      if (url) await Linking.openURL(url)
    } catch (err) {
      handleApiError(err, 'Could not start Search Console')
    } finally {
      setBusy(false)
    }
  }

  const saveProperty = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await apiService.selectGrowthSearchConsoleProperty(site.id, selected)
      await load()
    } catch (err) {
      handleApiError(err, 'Could not save property')
    } finally {
      setBusy(false)
    }
  }

  const sync = async () => {
    setBusy(true)
    try {
      await apiService.syncGrowthSearchConsole(site.id)
      await load()
    } catch (err) {
      handleApiError(err, 'Could not sync Search Console')
    } finally {
      setBusy(false)
    }
  }

  const conn = data?.connection
  const queries = data?.queries ?? []
  const needsConnect = !loading && conn && (!conn.available || !conn.connected)

  return (
    <GrowthScreen
      title="Search Console"
      subtitle="Real search queries from Google"
      active="GrowthSearchConsole"
      navigation={navigation}
      host={site.host}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load()
      }}
    >
      {conn?.connected ? (
        <View style={growthStyles.btnRow}>
          <Pressable
            accessibilityRole="button"
            onPress={sync}
            disabled={busy}
            style={({ pressed }) => [growthStyles.primaryBtn, (pressed || busy) && { opacity: 0.7 }]}
          >
            <Text style={growthStyles.primaryBtnText}>{busy ? 'Syncing…' : 'Refresh data'}</Text>
          </Pressable>
        </View>
      ) : null}

      {needsConnect ? (
        <GrowthEmpty
          icon="link-outline"
          title={
            conn?.available === false
              ? 'Search Console isn’t available on this plan'
              : 'Connect Google Search Console'
          }
          body={
            conn?.unavailableReason ||
            'Without Google, we can only score your pages. Connecting Search Console shows the real searches you already rank for.'
          }
          ctaLabel={conn?.available === false ? undefined : busy ? 'Redirecting…' : 'Connect Google'}
          onCta={conn?.available === false ? undefined : connect}
        />
      ) : null}

      {conn?.connected && !conn.selectedProperty ? (
        <View style={growthStyles.card}>
          <Text style={growthStyles.cardTitle}>Choose a property</Text>
          <Text style={growthStyles.rowBody}>
            Pick the Search Console property that matches {site.host}.
          </Text>
          <View style={[growthStyles.btnRow, { marginTop: 12 }]}>
            {properties.length === 0 ? (
              <Text style={growthStyles.rowBody}>No properties returned by Google yet.</Text>
            ) : (
              properties.map((p) => {
                const isActive = selected === p
                return (
                  <Pressable
                    key={p}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setSelected(p)}
                    style={({ pressed }) => [
                      isActive ? growthStyles.primaryBtn : growthStyles.outlinedBtn,
                      { paddingVertical: 8, paddingHorizontal: 14 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={isActive ? growthStyles.primaryBtnText : growthStyles.outlinedBtnText}>{p}</Text>
                  </Pressable>
                )
              })
            )}
          </View>
          {properties.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={saveProperty}
              disabled={!selected || busy}
              style={({ pressed }) => [
                growthStyles.primaryBtn,
                { marginTop: 12 },
                (pressed || !selected || busy) && { opacity: 0.7 },
              ]}
            >
              <Text style={growthStyles.primaryBtnText}>Save</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {conn?.connected && conn.selectedProperty ? (
        <>
          <Text style={[growthStyles.meta, { marginBottom: 12 }]}>
            Property {conn.selectedProperty}
            {conn.lastSyncedAt ? ` · last sync ${new Date(conn.lastSyncedAt).toLocaleDateString()}` : ''}
          </Text>

          {queries.length === 0 ? (
            <GrowthEmpty
              icon="search-outline"
              title="No search queries yet"
              body="Refresh data after Google has a few days of traffic, or check that the property matches your site."
              ctaLabel="Refresh data"
              onCta={sync}
            />
          ) : (
            queries.map((row: any, i: number) => (
              <Animated.View key={`${row.query}-${i}`} entering={FadeInDown.delay(Math.min(i, 5) * 80).duration(320)} style={growthStyles.card}>
                <Text style={growthStyles.rowLabel}>{row.query}</Text>
                <Text style={growthStyles.meta}>
                  {row.clicks} clicks · shown {Number(row.impressions).toLocaleString()} · avg position{' '}
                  {Number(row.position).toFixed(1)}
                </Text>
              </Animated.View>
            ))
          )}
        </>
      ) : null}
    </GrowthScreen>
  )
}

export default function GrowthSearchConsoleScreen({ navigation }: { navigation?: any }) {
  return (
    <GrowthGate navigation={navigation}>
      {(site) => <SearchConsoleBody site={site} navigation={navigation} />}
    </GrowthGate>
  )
}
