import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService } from '@shared/services/api'
import * as Haptics from 'expo-haptics'

/**
 * Growth workspace shell: sub-navigation, the site gate, and the shared label
 * maps. Mirrors `getcollab/src/components/growth/growth-workspace.tsx` +
 * `growth-copy.ts` so both clients describe the same data the same way.
 */

export const GROWTH_NAV = [
  { route: 'Growth', label: 'Overview' },
  { route: 'GrowthSeo', label: 'SEO' },
  { route: 'GrowthSearchConsole', label: 'Search Console' },
  { route: 'GrowthAiVisibility', label: 'AI Visibility' },
  { route: 'GrowthOpportunities', label: 'Opportunities' },
  { route: 'GrowthRecommendations', label: 'Recommendations' },
] as const

const DIMENSION_LABELS: Record<string, string> = {
  technical: 'SEO Health',
  on_page: 'SEO Health',
  seo_health: 'SEO Health',
  content: 'Content Coverage',
  content_coverage: 'Content Coverage',
  search_visibility: 'Search Performance',
  search_performance: 'Search Performance',
  ai_readiness: 'AI Readiness',
  ai_visibility: 'AI Visibility',
  brand_creator: 'Creators',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Fix first',
  warning: 'Worth fixing',
  info: 'Nice to have',
}

const OPPORTUNITY_KIND_LABELS: Record<string, string> = {
  page_2: 'Almost on page one',
  page_two: 'Almost on page one',
  ctr_gap: 'People see you, few click',
  declining: 'Falling in search',
  content_gap: 'Topic you could cover',
  branded: 'Your brand name',
}

export const SEVERITY_TONES: Record<string, { fg: string; bg: string }> = {
  critical: { fg: colors.error, bg: colors.errorSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  info: { fg: colors.blue, bg: colors.blueSoft },
}

export function dimensionLabel(key?: string | null): string {
  if (!key) return 'General'
  return DIMENSION_LABELS[key] ?? key.replace(/_/g, ' ')
}

export function severityLabel(key?: string | null): string {
  if (!key) return 'Note'
  return SEVERITY_LABELS[key] ?? key
}

export function opportunityKindLabel(key?: string | null): string {
  if (!key) return 'Opportunity'
  return OPPORTUNITY_KIND_LABELS[key] ?? key.replace(/_/g, ' ')
}

/** Unavailable signals stay blank — we never render 0 for "not connected". */
export function scoreDisplay(value?: number | null): string {
  return value == null ? '—' : String(value)
}

export interface GrowthSite {
  id: string
  websiteUrl: string
  host: string
}

/** Load the brand's tracked website; `notFound` means "set one up first". */
export function useGrowthSite() {
  const [site, setSite] = useState<GrowthSite | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiService.getGrowthSite()
      const s = res?.site || res?.data || res
      if (s?.id) {
        setSite(s)
        setNotFound(false)
      } else {
        setNotFound(true)
      }
      setError(null)
    } catch (err: any) {
      // The API client surfaces the envelope's stable `code`, not the HTTP status,
      // so match on `not_found` first and keep the message as a fallback.
      const code = String(err?.code ?? '')
      const status = err?.status ?? err?.statusCode
      const missing =
        code === 'not_found' ||
        status === 404 ||
        /not[\s_-]?found/i.test(code) ||
        /not found/i.test(err?.message || '')
      setNotFound(missing)
      if (!missing) setError(err?.message || 'Could not load Growth')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  return { site, loading, notFound, error, reload: load }
}

/**
 * Renders a section body only once a site exists, otherwise points the brand at
 * setup. Sections call this so none of them has to repeat the gate.
 */
export function GrowthGate({
  navigation,
  children,
}: {
  navigation?: any
  children: (site: GrowthSite) => React.ReactNode
}) {
  const { site, loading, notFound, error, reload } = useGrowthSite()

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  if (notFound) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <GrowthEmpty
              icon="globe-outline"
              title="Add your website"
              body="Growth needs a website to analyse. Add one to see scores, issues, and creator opportunities."
              ctaLabel="Set up Growth"
              onCta={() => navigation?.navigate('GrowthSetup')}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    )
  }

  if (error || !site) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: spacing.lg }]}>
        <Text style={{ color: colors.error, fontSize: 16, textAlign: 'center' }}>
          {error || 'Could not load Growth'}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); reload() }}
        >
          <Text style={styles.emptyCtaText}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  return <>{children(site)}</>
}

export function GrowthEmpty({
  icon = 'sparkles-outline',
  title,
  body,
  ctaLabel,
  onCta,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  ctaLabel?: string
  onCta?: () => void
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{body}</Text>
      {ctaLabel && onCta ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onCta() }}
        >
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * Shared scaffold for every Growth section: safe area, header, horizontal
 * sub-navigation, and a scrolling body.
 */
export function GrowthScreen({
  title,
  subtitle,
  active,
  navigation,
  host,
  children,
  refreshing,
  onRefresh,
}: {
  title: string
  subtitle: string
  active: string
  navigation?: any
  host?: string
  children: React.ReactNode
  refreshing?: boolean
  onRefresh?: () => void
}) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRefresh() }} tintColor={colors.neon} />
            ) : undefined
          }
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {host ? <Text style={styles.host}>{host}</Text> : null}
          </Animated.View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subnavRow}>
            {GROWTH_NAV.map((item) => {
              const isActive = item.route === active
              return (
                <Pressable
                  key={item.route}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => { Haptics.selectionAsync(); navigation?.navigate(item.route) }}
                  style={({ pressed }) => [
                    styles.subnavChip,
                    isActive && styles.subnavChipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.subnavText, isActive && styles.subnavTextActive]}>{item.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

/** Styles shared by the section bodies. */
export const growthStyles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  rowLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },

  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },

  metricRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 6 },

  scoreValue: { color: '#fff', fontSize: 40, fontWeight: '700', letterSpacing: -1 },

  primaryBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 20 },
  outlinedBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },

  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, color: '#fff', fontSize: 14, backgroundColor: colors.bg },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, marginBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  host: { color: colors.textSubtle, fontSize: 12, marginTop: spacing.xs },

  subnavRow: { gap: spacing.sm, paddingBottom: spacing.md },
  subnavChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  subnavChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  subnavText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  subnavTextActive: { color: '#000' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyCta: { backgroundColor: colors.neon, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, marginTop: spacing.md },
  emptyCtaText: { color: '#000', fontSize: 13, fontWeight: '700' },
})
