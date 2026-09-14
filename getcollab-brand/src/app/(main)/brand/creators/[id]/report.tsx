import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ creatorReport: { id: string } }, 'creatorReport'>

export default function CreatorReportScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation()
  const { id } = route.params || {}

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [report, setReport] = useState<any>(null)

  const loadReport = async () => {
    try {
      const [profileRes, metricsRes] = await Promise.all([
        apiService.getInfluencer(id),
        apiService.getProfileWithMetrics().catch(() => null),
      ])
      const profile = profileRes?.influencer || profileRes?.data || profileRes || {}
      setReport({
        name: profile.name || 'Creator',
        handle: profile.instagramHandle || profile.handle,
        bio: profile.bio,
        location: profile.location,
        categories: profile.categories || [],
        followers: profile.instagramMetrics?.followers || profile.audienceSize || 0,
        engagementRate: profile.instagramMetrics?.avgEngagement || profile.engagementRate || 0,
        avgLikes: profile.instagramMetrics?.avgLikesPerPost || 0,
        avgViews: profile.instagramMetrics?.avgViews || 0,
        verified: profile.verified,
        collabs: profile.collabCount || 0,
      })
    } catch (err) {
      handleApiError(err, 'Failed to load report')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (id) loadReport()
  }, [id])

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.neon} />
        </View>
      </SafeAreaView>
    )
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Report not found</Text>
          <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.outlinedBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const followers = report.followers
  const followersDisplay = followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport() }} tintColor={colors.neon} />}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          {/* Header */}
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{report.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{report.name}</Text>
            {report.handle && <Text style={styles.handle}>@{report.handle}</Text>}
            {report.verified && (
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color={colors.blue} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{followersDisplay}</Text>
              <Text style={styles.metricLabel}>Followers</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{report.engagementRate ? `${report.engagementRate.toFixed(1)}%` : '—'}</Text>
              <Text style={styles.metricLabel}>Engagement</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{report.collabs}</Text>
              <Text style={styles.metricLabel}>Collabs</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Audience</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Avg Likes</Text>
              <Text style={styles.value}>{report.avgLikes ? report.avgLikes.toLocaleString() : '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Avg Views</Text>
              <Text style={styles.value}>{report.avgViews ? report.avgViews.toLocaleString() : '—'}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{report.location || '—'}</Text>
            </View>
          </View>

          {report.categories?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.chipRow}>
                {report.categories.map((cat: string) => (
                  <View key={cat} style={styles.chip}>
                    <Text style={styles.chipText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {report.bio && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bio}>{report.bio}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  handle: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(59,130,246,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: spacing.sm, borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)' },
  verifiedText: { color: colors.blue, fontSize: 11, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  metricValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  metricLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.textMuted, fontSize: 14 },
  value: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bio: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },

  outlinedBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, marginTop: spacing.md },
  outlinedBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
