import React, { useState, useEffect, useCallback } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, Dimensions,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

const { width } = Dimensions.get('window')
const GRID_GAP = 2
const GRID_ITEM = (width - GRID_GAP * 2) / 3

const CATEGORIES = ['Fashion', 'Beauty', 'Fitness', 'Tech', 'Travel', 'Food', 'Lifestyle', 'Gaming', 'Education', 'Business', 'Entertainment', 'Sports', 'Health', 'Photography']
const SOCIAL_PLATFORMS = [
  { key: 'instagramHandle', icon: 'logo-instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'youtubeHandle', icon: 'logo-youtube', label: 'YouTube', color: '#FF0000' },
  { key: 'tiktokHandle', icon: 'logo-tiktok', label: 'TikTok', color: '#FFFFFF' },
  { key: 'twitterHandle', icon: 'logo-twitter', label: 'Twitter', color: '#1DA1F2' },
]

interface ProfileData {
  name?: string; bio?: string; location?: string; categories?: string[]
  instagramHandle?: string; youtubeHandle?: string; tiktokHandle?: string; twitterHandle?: string
  avatar?: string; coverImage?: string; portfolio?: string[]
  instagramMetrics?: { followers?: number }
  youtubeMetrics?: { followers?: number }
  tiktokMetrics?: { followers?: number }
}

function formatFollowers(n?: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function InfluencerProfile({ navigation }: any) {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileData>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiService.getProfileWithMetrics().catch(() => apiService.getProfile())
      const p = res?.data || res?.profile || res?.influencerProfile || res || {}
      setProfile(p)
      setForm(p)
    } catch (err: any) {
      handleApiError(err, 'Failed to load profile')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await apiService.updateProfile(form)
      setProfile(form)
      setEditing(false)
    } catch (err: any) {
      handleApiError(err, 'Failed to save profile')
    } finally { setSaving(false) }
  }

  const pickImage = async (field: 'avatar' | 'coverImage') => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Enable photo library access.'); return }
    const result = await ImagePickerLib.launchImageLibraryAsync({ mediaTypes: ImagePickerLib.MediaTypeOptions.Images, quality: 0.8, base64: false })
    if (!result.canceled && result.assets[0]?.uri) {
      setForm(prev => ({ ...prev, [field]: result.assets[0].uri }))
    }
  }

  const toggleCategory = (cat: string) => {
    setForm(prev => {
      const cats = prev.categories || []
      return { ...prev, categories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat] }
    })
  }

  const totalFollowers = [
    profile.instagramMetrics?.followers,
    profile.youtubeMetrics?.followers,
    profile.tiktokMetrics?.followers,
  ].reduce((sum: number, n) => sum + (n || 0), 0)

  if (loading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.neon} />
    </View>
  )

  const displayName = profile.name || user?.name || 'Creator'
  const handle = `@${(profile.name || user?.name || 'creator').replace(/\s+/g, '').toLowerCase()}`

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Cover image */}
          <Pressable onPress={editing ? () => pickImage('coverImage') : undefined} style={styles.coverWrap}>
            {form.coverImage ? (
              <Image source={{ uri: form.coverImage }} style={styles.coverImg} />
            ) : (
              <View style={styles.coverPlaceholder}>
                {editing && <Ionicons name="camera-outline" size={24} color={colors.textMuted} />}
              </View>
            )}
            {/* Header actions */}
            <View style={styles.coverActions}>
              <View style={{ flex: 1 }} />
              {editing ? (
                <View style={styles.coverBtns}>
                  <Pressable onPress={() => { setEditing(false); setForm(profile) }} style={[styles.coverBtn, { borderColor: colors.border }]}>
                    <Text style={styles.coverBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={save} disabled={saving} style={[styles.coverBtn, { backgroundColor: colors.neon, borderColor: colors.neon }]}>
                    {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={[styles.coverBtnText, { color: '#000' }]}>Save</Text>}
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setEditing(true)} style={[styles.coverBtn, { backgroundColor: colors.card }]}>
                  <Ionicons name="pencil-outline" size={14} color={colors.text} />
                  <Text style={styles.coverBtnText}>Edit</Text>
                </Pressable>
              )}
            </View>
          </Pressable>

          {/* Avatar + basic info */}
          <View style={styles.profileInfo}>
            <Pressable onPress={editing ? () => pickImage('avatar') : undefined} style={styles.avatarOuter}>
              {form.avatar ? (
                <Image source={{ uri: form.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {editing && (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={12} color="#000" />
                </View>
              )}
            </Pressable>

            {editing ? (
              <TextInput value={form.name || ''} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Your name" placeholderTextColor={colors.textSubtle} style={styles.nameInput} />
            ) : (
              <Text style={styles.displayName}>{displayName}</Text>
            )}
            <Text style={styles.handle}>{handle}</Text>

            {/* Stats row */}
            <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.statsCard}>
              <Stat label="Followers" value={formatFollowers(totalFollowers)} />
              <View style={styles.statDivider} />
              <Stat label="Campaigns" value={(profile as any).campaignCount ?? '—'} />
              <View style={styles.statDivider} />
              <Stat label="Rating" value={(profile as any).rating ? `${Number((profile as any).rating).toFixed(1)}★` : '—'} />
            </Animated.View>
          </View>

          <View style={{ paddingHorizontal: spacing.lg }}>
            {/* Bio */}
            <Section title="Bio">
              {editing ? (
                <TextInput
                  value={form.bio || ''}
                  onChangeText={v => setForm(p => ({ ...p, bio: v }))}
                  placeholder="Tell brands about yourself…"
                  placeholderTextColor={colors.textSubtle}
                  multiline
                  style={styles.bioInput}
                />
              ) : (
                <Text style={styles.bioText}>{profile.bio || 'No bio yet. Tap Edit to add one.'}</Text>
              )}
            </Section>

            {/* Location */}
            {editing && (
              <Section title="Location">
                <View style={styles.fieldWrap}>
                  <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                  <TextInput value={form.location || ''} onChangeText={v => setForm(p => ({ ...p, location: v }))} placeholder="City, Country" placeholderTextColor={colors.textSubtle} style={styles.fieldInput} />
                </View>
              </Section>
            )}

            {/* Social handles */}
            <Section title="Social Platforms">
              <View style={styles.socialList}>
                {SOCIAL_PLATFORMS.map(p => {
                  const val = (editing ? form : profile)[p.key as keyof ProfileData] as string | undefined
                  if (!editing && !val) return null
                  return (
                    <View key={p.key} style={styles.socialRow}>
                      <View style={[styles.socialIcon, { backgroundColor: p.color + '22' }]}>
                        <Ionicons name={p.icon as any} size={18} color={p.color} />
                      </View>
                      {editing ? (
                        <TextInput
                          value={(form[p.key as keyof ProfileData] as string) || ''}
                          onChangeText={v => setForm(prev => ({ ...prev, [p.key]: v }))}
                          placeholder={`@${p.label.toLowerCase()}_handle`}
                          placeholderTextColor={colors.textSubtle}
                          autoCapitalize="none"
                          style={styles.socialInput}
                        />
                      ) : (
                        <Text style={styles.socialHandle}>{val}</Text>
                      )}
                    </View>
                  )
                })}
                {!editing && SOCIAL_PLATFORMS.every(p => !(profile[p.key as keyof ProfileData])) && (
                  <Text style={styles.emptyNote}>No social handles added yet.</Text>
                )}
              </View>
            </Section>

            {/* Categories */}
            <Section title="Content Categories">
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => {
                  const active = (editing ? form : profile).categories?.includes(cat)
                  if (!editing && !active) return null
                  return (
                    <Pressable key={cat} onPress={editing ? () => toggleCategory(cat) : undefined} style={[styles.categoryChip, active && styles.categoryChipActive]}>
                      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{cat}</Text>
                    </Pressable>
                  )
                })}
                {!editing && !profile.categories?.length && <Text style={styles.emptyNote}>No categories added yet.</Text>}
              </View>
            </Section>

            {/* Portfolio grid */}
            {(profile.portfolio || []).length > 0 && (
              <Section title="Portfolio">
                <View style={styles.portfolioGrid}>
                  {(profile.portfolio || []).slice(0, 9).map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.portfolioItem} />
                  ))}
                </View>
              </Section>
            )}

            {/* Account actions */}
            <Section title="Account">
              <View style={styles.listCard}>
                <AccountRow icon="lock-closed-outline" label="Change Password" onPress={() => navigation?.navigate('ChangePassword')} divider />
                <AccountRow icon="notifications-outline" label="Notifications" onPress={() => navigation?.navigate('Notifications')} divider />
                <AccountRow icon="settings-outline" label="Settings" onPress={() => navigation?.navigate('Settings')} divider />
                <AccountRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
              </View>

              <Pressable
                onPress={() => { Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: useAuthStore.getState().signOut }]) }}
                style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </Pressable>
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AccountRow({ icon, label, onPress, divider }: { icon: string; label: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.accountRow, divider && styles.accountRowDivider, pressed && { opacity: 0.85 }]}>
      <View style={styles.accountIcon}><Ionicons name={icon as any} size={18} color={colors.textMuted} /></View>
      <Text style={styles.accountLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  coverWrap: { width: '100%', height: 180, backgroundColor: colors.elevated, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverActions: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md },
  coverBtns: { flexDirection: 'row', gap: spacing.sm },
  coverBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(0,0,0,0.6)' },
  coverBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  profileInfo: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 0, marginTop: -40 },
  avatarOuter: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.bg },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  displayName: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  nameInput: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4, minWidth: 200 },
  handle: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: spacing.lg },
  statsCard: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.lg },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, letterSpacing: 0.3 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.md },
  bioText: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  bioInput: { color: colors.text, fontSize: 14, lineHeight: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13 },
  fieldInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  socialList: { gap: spacing.sm },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  socialIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  socialHandle: { color: colors.text, fontSize: 14, fontWeight: '500' },
  socialInput: { flex: 1, color: colors.text, fontSize: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  emptyNote: { color: colors.textSubtle, fontSize: 13 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  categoryChipActive: { backgroundColor: colors.neon, borderColor: colors.neon },
  categoryText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#000' },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  portfolioItem: { width: GRID_ITEM, height: GRID_ITEM, backgroundColor: colors.elevated },
  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  accountRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  accountIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  accountLabel: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: colors.errorSoft, borderRadius: radius.md, paddingVertical: 14 },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '600' },
})
