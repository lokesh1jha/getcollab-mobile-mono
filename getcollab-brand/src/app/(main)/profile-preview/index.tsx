import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import apiService from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface Props { navigation?: any }

export default function ProfilePreviewScreen({ navigation }: Props) {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const response = await apiService.getProfileWithMetrics().catch(() => apiService.getProfile())
      setProfile(response?.data || response?.profile || response || {})
    } catch (e) { console.error('Failed to load profile preview:', e) }
    finally { setLoading(false) }
  }

  if (loading) {
    return <SafeAreaView style={styles.root}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.neon} /></View></SafeAreaView>
  }

  const socials = [
    { name: 'Instagram', handle: profile?.instagramHandle, followers: profile?.instagramFollowers || profile?.instagramMetrics?.followers },
    { name: 'YouTube', handle: profile?.youtubeHandle, followers: profile?.youtubeSubscribers || profile?.youtubeMetrics?.followers },
    { name: 'TikTok', handle: profile?.tiktokHandle, followers: profile?.tiktokFollowers || profile?.tiktokMetrics?.followers },
  ].filter((s) => s.handle)

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.previewBadge}>
              <Ionicons name="eye" size={14} color={colors.blue} />
              <Text style={styles.previewBadgeText}>Preview as a brand sees you</Text>
            </View>

            {profile?.coverImage ? <Image source={{ uri: profile.coverImage }} style={styles.cover} /> : null}

            <View style={styles.profileHeader}>
              {profile?.image || user?.image ? (
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
              <View style={styles.card}>
                <Text style={styles.bio}>{profile.bio}</Text>
              </View>
            ) : null}

            {socials.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Social Reach</Text>
                {socials.map((s) => (
                  <View key={s.name} style={styles.socialRow}>
                    <Text style={styles.socialName}>{s.name}</Text>
                    <Text style={styles.socialHandle}>{String(s.handle).startsWith('@') ? s.handle : `@${s.handle}`}</Text>
                    {s.followers ? <Text style={styles.socialMeta}>{s.followers.toLocaleString()} followers</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {profile?.categories?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.tagRow}>
                  {profile.categories.map((c: string) => (
                    <View key={c} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {(profile?.pricePerPost || profile?.pricePerReel || profile?.pricePerCampaign) && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Pricing</Text>
                {profile.pricePerPost ? <PriceRow label="Per Post" value={profile.pricePerPost} /> : null}
                {profile.pricePerReel ? <PriceRow label="Per Reel" value={profile.pricePerReel} /> : null}
                {profile.pricePerStory ? <PriceRow label="Per Story" value={profile.pricePerStory} /> : null}
                {profile.pricePerCampaign ? <PriceRow label="Full Campaign" value={profile.pricePerCampaign} /> : null}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>₹{Number(value).toLocaleString()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.blueSoft, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignSelf: 'flex-start', marginBottom: spacing.md },
  previewBadgeText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  cover: { width: '100%', height: 160, borderRadius: radius.lg, marginBottom: spacing.md },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: { backgroundColor: colors.elevated, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  location: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: spacing.md, letterSpacing: -0.3 },
  bio: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  socialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  socialName: { color: colors.textMuted, fontSize: 12, fontWeight: '700', width: 80 },
  socialHandle: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  socialMeta: { color: colors.textMuted, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  tagText: { color: colors.blue, fontSize: 12, fontWeight: '500' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  priceLabel: { color: colors.textMuted, fontSize: 14 },
  priceValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
