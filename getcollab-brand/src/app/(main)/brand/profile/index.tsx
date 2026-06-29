import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image, ActivityIndicator, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, radius, spacing } from '@/src/theme'
import { useAuthStore } from '@shared/stores/auth-store'
import { useCampaignStore } from '@shared/stores/campaign-store'
import { useSubscriptionStore } from '../../../../stores/subscription-store'
import apiService, { handleApiError } from '@shared/services/api'

const SETTINGS_ROWS = [
  { id: 'notifications', icon: 'notifications-outline', label: 'Notifications' },
  { id: 'settings', icon: 'settings-outline', label: 'Settings' },
  { id: 'disputes', icon: 'shield-outline', label: 'Disputes' },
] as const

interface Props { navigation?: any }

export default function BrandProfileScreen({ navigation }: Props) {
  const { user, updateProfile } = useAuthStore()
  const { myCampaigns, fetchMyCampaigns } = useCampaignStore()
  const subscription = useSubscriptionStore((s) => s.subscription)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(user?.image || null)
  const [form, setForm] = useState({ name: user?.name || '', bio: '', location: '', portfolioUrl: '' })

  useEffect(() => {
    loadProfile()
    fetchMyCampaigns().catch(() => undefined)
  }, [])

  const loadProfile = async () => {
    try {
      const response = await apiService.getSettings().catch(() => null)
      const profile = response?.data || response?.settings || response || {}
      setForm({ name: user?.name || profile.name || '', bio: profile.bio || '', location: profile.location || '', portfolioUrl: profile.websiteUrl || profile.portfolioUrl || '' })
      if (profile.image || profile.avatar || user?.image) setAvatar(profile.image || profile.avatar || user?.image || null)
    } catch (err) { console.error('Failed to load brand profile:', err) }
  }

  const activeCampaigns = myCampaigns.filter((c) => c.status === 'active').length
  const planLabel = subscription?.plan
    ? `${subscription.plan}${subscription.status === 'TRIALING' ? ' · Trial' : ''}`
    : subscription?.status === 'TRIALING'
      ? 'Trial workspace'
      : 'Free workspace'

  const pickAvatar = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Please enable photo library access.'); return }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({ mediaTypes: ImagePickerLib.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true })
      if (result.canceled || !result.assets[0] || !result.assets[0].base64) return
      setUploadingAvatar(true)
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`
      try {
        const response = await apiService.uploadProfileImage(base64Image)
        const url = response?.url || response?.imageUrl || response?.data?.url
        if (url) { setAvatar(url); await updateProfile({ image: url } as any) }
      } catch (err) { handleApiError(err, 'Failed to upload logo') }
      finally { setUploadingAvatar(false) }
    } catch (err) { console.error('Avatar pick failed:', err) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Brand name is required'); return }
    setSaving(true)
    try {
      await updateProfile({ name: form.name })
      const payload: any = { bio: form.bio, location: form.location, portfolioUrl: form.portfolioUrl }
      Object.keys(payload).forEach((k) => { if (!payload[k]) delete payload[k] })
      if (Object.keys(payload).length > 0) await apiService.updateProfile(payload).catch((err) => console.warn('Profile update failed:', err))
      Alert.alert('Success', 'Profile updated successfully!')
      setIsEditing(false)
    } catch (error) { handleApiError(error, 'Failed to update profile') }
    finally { setSaving(false) }
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await useAuthStore.getState().signOut() } },
    ])
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]} onPress={() => setIsEditing(!isEditing)}>
              <Ionicons name={isEditing ? 'close' : 'create-outline'} size={18} color="#fff" />
            </Pressable>
          </View>

          <Animated.View entering={FadeInDown.duration(400)} style={styles.brandCard}>
            <Pressable onPress={isEditing ? pickAvatar : undefined} style={styles.logoWrap}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.logo}>
                  <View style={styles.logoInner} />
                </View>
              )}
              {uploadingAvatar && <ActivityIndicator size="small" color={colors.neon} style={{ position: 'absolute' }} />}
              {isEditing && !uploadingAvatar && (
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={12} color="#000" />
                </View>
              )}
            </Pressable>

            {isEditing ? (
              <View style={{ width: '100%', gap: spacing.md }}>
                <FieldInput label="Brand Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <FieldInput label="Email" value={user?.email || ''} editable={false} />
                <FieldInput label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} multiline />
                <FieldInput label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
                <FieldInput label="Website" value={form.portfolioUrl} onChange={(v) => setForm({ ...form, portfolioUrl: v })} />
              </View>
            ) : (
              <>
                <Text style={styles.company}>{user?.name}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={styles.planPill}>
                  <View style={styles.planDot} />
                  <Text style={styles.planText}>{planLabel}</Text>
                </View>
                {form.bio ? <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.md }}>{form.bio}</Text> : null}
                {form.location ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.xs }}>📍 {form.location}</Text> : null}
              </>
            )}

            {isEditing && (
              <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.md }}>
                <Pressable style={({ pressed }) => [styles.blueBtn, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.blueBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.outlinedBtn, pressed && { opacity: 0.7 }]} onPress={() => setIsEditing(false)}>
                  <Text style={styles.outlinedBtnText}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {!isEditing && (
            <>
              <View style={styles.statsCard}>
                <View style={styles.stat}><Text style={styles.statValue}>{myCampaigns.length}</Text><Text style={styles.statLabel}>Campaigns</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.stat}><Text style={styles.statValue}>{myCampaigns.reduce((sum, c) => sum + (c.bidCount || 0), 0)}</Text><Text style={styles.statLabel}>Bids</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.stat}><Text style={styles.statValue}>{activeCampaigns}</Text><Text style={styles.statLabel}>Active</Text></View>
              </View>

              <Text style={styles.sectionTitle}>WORKSPACE</Text>
              <View style={styles.listCard}>
                {SETTINGS_ROWS.map((r, idx) => (
                  <Pressable
                    key={r.id}
                    style={({ pressed }) => [styles.row, idx !== SETTINGS_ROWS.length - 1 && styles.rowDivider, pressed && { opacity: 0.6 }]}
                    onPress={() => navigation?.navigate(r.id.charAt(0).toUpperCase() + r.id.slice(1))}
                  >
                    <View style={styles.rowIcon}><Ionicons name={r.icon as any} size={18} color="#fff" /></View>
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </Pressable>
                ))}
              </View>

              <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>

              <Text style={styles.version}>GetCollab v1.0.0</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function FieldInput({ label, value, onChange, editable = true, multiline = false }: { label: string; value: string; onChange?: (v: string) => void; editable?: boolean; multiline?: boolean }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <TextInput value={value} onChangeText={onChange} editable={editable} placeholderTextColor={colors.textSubtle} multiline={multiline} style={styles.fieldInput} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },

  brandCard: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  logoWrap: { marginBottom: spacing.md, position: 'relative' },
  logo: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#000' },
  avatarImg: { width: 64, height: 64, borderRadius: radius.lg },
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.neon, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  company: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  email: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  planPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59,130,246,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: spacing.md, borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)' },
  planDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue },
  planText: { color: colors.blue, fontSize: 12, fontWeight: '700' },

  statsCard: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  fieldWrap: { borderWidth: 1, borderColor: '#262626', borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.bg },
  fieldInput: { color: '#fff', fontSize: 14, padding: 0 },

  blueBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 14 },
  blueBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  outlinedBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingVertical: 14 },
  outlinedBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },

  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  listCard: { marginHorizontal: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  rowLabel: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', borderRadius: radius.md, paddingVertical: 14, backgroundColor: 'rgba(239,68,68,0.06)' },
  logoutText: { color: colors.error, fontSize: 14, fontWeight: '700' },
  version: { color: colors.textSubtle, fontSize: 11, textAlign: 'center', marginTop: spacing.lg },
})
