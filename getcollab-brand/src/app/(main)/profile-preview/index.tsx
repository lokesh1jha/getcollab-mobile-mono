import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@shared/constants'
import { Card } from '@shared/components/ui'
import { PortfolioGallery } from '../../../components/PortfolioGallery'
import apiService from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface Props {
  navigation?: any
}

export default function ProfilePreviewScreen({ navigation }: Props) {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const response = await apiService.getProfileWithMetrics().catch(() => apiService.getProfile())
      setProfile(response?.data || response?.profile || response || {})
    } catch (e) {
      console.error('Failed to load profile preview:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const portfolio = Array.isArray(profile?.portfolio)
    ? profile.portfolio.map((url: any, idx: number) =>
        typeof url === 'string' ? { id: `p${idx}`, url } : { id: url.id || String(idx), url: url.url }
      )
    : []

  const socials = [
    { name: 'Instagram', handle: profile?.instagramHandle, color: colors.instagram, followers: profile?.instagramFollowers || profile?.instagramMetrics?.followers },
    { name: 'YouTube', handle: profile?.youtubeHandle, color: colors.youtube, followers: profile?.youtubeSubscribers || profile?.youtubeMetrics?.followers },
    { name: 'TikTok', handle: profile?.tiktokHandle, color: colors.tiktok, followers: profile?.tiktokFollowers || profile?.tiktokMetrics?.followers },
    { name: 'Twitter', handle: profile?.twitterHandle, color: colors.twitter, followers: profile?.twitterFollowers || profile?.twitterMetrics?.followers },
  ].filter((s) => s.handle)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>👁  Preview as a brand sees you</Text>
        </View>

        {profile?.coverImage ? (
          <Image source={{ uri: profile.coverImage }} style={styles.cover} />
        ) : null}

        <View style={styles.profileHeader}>
          {(profile?.image || user?.image) ? (
            <Image source={{ uri: profile?.image || user?.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.name}>{user?.name || profile?.name}</Text>
            {profile?.location ? <Text style={styles.location}>📍 {profile.location}</Text> : null}
          </View>
        </View>

        {profile?.bio ? (
          <Card style={styles.section}>
            <Text style={styles.bio}>{profile.bio}</Text>
          </Card>
        ) : null}

        {portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <PortfolioGallery items={portfolio} onChange={() => {}} editable={false} />
          </View>
        )}

        {socials.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Social Reach</Text>
            {socials.map((s) => (
              <View key={s.name} style={[styles.socialRow, { borderLeftColor: s.color }]}>
                <Text style={[styles.socialName, { color: s.color }]}>{s.name}</Text>
                <Text style={styles.socialHandle}>{String(s.handle).startsWith('@') ? s.handle : `@${s.handle}`}</Text>
                {s.followers ? <Text style={styles.socialMeta}>{s.followers} followers</Text> : null}
              </View>
            ))}
          </Card>
        )}

        {(profile?.categories?.length || 0) > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.tagRow}>
              {profile.categories.map((c: string) => (
                <View key={c} style={styles.tag}>
                  <Text style={styles.tagText}>{c}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {(profile?.pricePerPost || profile?.pricePerReel || profile?.pricePerCampaign) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            {profile.pricePerPost ? <PriceRow label="Per Post" value={profile.pricePerPost} /> : null}
            {profile.pricePerReel ? <PriceRow label="Per Reel" value={profile.pricePerReel} /> : null}
            {profile.pricePerStory ? <PriceRow label="Per Story" value={profile.pricePerStory} /> : null}
            {profile.pricePerVideo ? <PriceRow label="Per Video" value={profile.pricePerVideo} /> : null}
            {profile.pricePerCampaign ? <PriceRow label="Full Campaign" value={profile.pricePerCampaign} /> : null}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const PriceRow = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.priceRow}>
    <Text style={styles.priceLabel}>{label}</Text>
    <Text style={styles.priceValue}>₹{Number(value).toLocaleString()}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg },
  previewBadge: {
    backgroundColor: `${colors.primary}30`,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  previewBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  cover: { width: '100%', height: 160, borderRadius: 16, marginBottom: spacing.md },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  location: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  section: { marginBottom: spacing.lg, padding: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  bio: { color: colors.text, fontSize: 14, lineHeight: 22 },
  socialRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  socialName: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  socialHandle: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
  socialMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: `${colors.accent}20`, borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  tagText: { color: colors.accent, fontSize: 12, fontWeight: '500' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: 1 },
  priceLabel: { color: colors.textMuted, fontSize: 14 },
  priceValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
})
