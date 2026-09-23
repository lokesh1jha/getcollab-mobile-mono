import React, { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, ActivityIndicator, Linking, RefreshControl } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'
import { InfluencerNavigationProp } from '@/src/types/navigation'
import * as Haptics from 'expo-haptics'

interface NotificationSettings {
  emailNotifications?: boolean
  pushNotifications?: boolean
  campaignUpdates?: boolean
  messageNotifications?: boolean
  paymentNotifications?: boolean
}

interface NotificationSettings {
  emailNotifications?: boolean
  pushNotifications?: boolean
  campaignUpdates?: boolean
  messageNotifications?: boolean
  paymentNotifications?: boolean
}

interface SettingsState {
  twoFactorEnabled: boolean
  notifications: NotificationSettings
}

export default function SettingsScreen({ navigation }: { navigation: InfluencerNavigationProp }) {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }
  const { signOut } = useAuthStore()
  const [settings, setSettings] = useState<SettingsState>({
    twoFactorEnabled: false,
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      campaignUpdates: true,
      messageNotifications: true,
      paymentNotifications: true,
    },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [settingsRes, notifRes] = await Promise.all([
        apiService.getSettings().catch(() => null),
        apiService.getNotifications().catch(() => null),
      ])
      const s = settingsRes?.data || settingsRes || {}
      const n = s.notifications || s.notificationSettings || {}
      setSettings(prev => ({
        twoFactorEnabled: s.twoFactorEnabled ?? s.two_factor_enabled ?? prev.twoFactorEnabled,
        notifications: {
          emailNotifications: n.emailNotifications ?? n.email ?? prev.notifications.emailNotifications,
          pushNotifications: n.pushNotifications ?? n.push ?? prev.notifications.pushNotifications,
          campaignUpdates: n.campaignUpdates ?? n.campaign ?? prev.notifications.campaignUpdates,
          messageNotifications: n.messageNotifications ?? n.message ?? prev.notifications.messageNotifications,
          paymentNotifications: n.paymentNotifications ?? n.payment ?? prev.notifications.paymentNotifications,
        },
      }))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const toggleNotif = async (key: keyof NotificationSettings) => {
    const newVal = !settings.notifications[key]
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: newVal } }))
    setSaving(key)
    try {
      await apiService.updateNotificationSettings({ [key]: newVal })
    } catch (err: any) {
      setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: !newVal } }))
      handleApiError(err, 'Failed to update setting')
    } finally { setSaving(null) }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data, campaigns, and earnings history will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try { await apiService.deleteAccount(); await signOut() }
            catch (err: any) { handleApiError(err, 'Failed to delete account') }
          }
        }
      ]
    )
  }

  if (loading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.neon} />
    </View>
  )

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRefresh() }} tintColor={colors.neon} />} contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
            {/* No two-factor toggle: the API has no 2FA to switch on, so it
                saved nothing. */}
            {/* Notifications */}
            <SectionHeader title="Notifications" />
            <View style={styles.listCard}>
              <ToggleRow icon="mail-outline" label="Email Notifications" value={settings.notifications.emailNotifications ?? false} onToggle={() => toggleNotif('emailNotifications')} loading={saving === 'emailNotifications'} divider />
              <ToggleRow icon="phone-portrait-outline" label="Push Notifications" value={settings.notifications.pushNotifications ?? false} onToggle={() => toggleNotif('pushNotifications')} loading={saving === 'pushNotifications'} divider />
              <ToggleRow icon="megaphone-outline" label="Campaign Updates" value={settings.notifications.campaignUpdates ?? false} onToggle={() => toggleNotif('campaignUpdates')} loading={saving === 'campaignUpdates'} divider />
              <ToggleRow icon="chatbubble-outline" label="Message Notifications" value={settings.notifications.messageNotifications ?? false} onToggle={() => toggleNotif('messageNotifications')} loading={saving === 'messageNotifications'} divider />
              <ToggleRow icon="cash-outline" label="Payment Notifications" value={settings.notifications.paymentNotifications ?? false} onToggle={() => toggleNotif('paymentNotifications')} loading={saving === 'paymentNotifications'} />
            </View>
  
            {/* Account */}
            <SectionHeader title="Account" />
            <View style={styles.listCard}>
              <LinkRow icon="lock-closed-outline" label="Change Password" onPress={() => navigation?.navigate('ChangePassword')} divider />
              <LinkRow icon="card-outline" label="Payout Details" onPress={() => navigation?.navigate('PayoutSettings')} divider />
              <LinkRow icon="notifications-outline" label="Notification Preferences" onPress={() => navigation?.navigate('Notifications')} />
            </View>
  
            {/* Danger Zone */}
            <SectionHeader title="Danger Zone" />
            <View style={styles.listCard}>
              <Pressable onPress={handleDeleteAccount} style={({ pressed }) => [styles.dangerRow, pressed && { opacity: 0.85 }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.errorSoft }]}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </View>
                <Text style={styles.dangerText}>Delete Account</Text>
              </Pressable>
            </View>
  
            <Pressable onPress={() => Linking.openURL('mailto:support@getcollab.in')} style={({ pressed }) => [styles.supportLink, pressed && { opacity: 0.8 }]}>
              <Text style={styles.supportText}>Need help? Contact support</Text>
            </Pressable>
            <Text style={styles.versionText}>GetCollab v1.0.0 · For Creators</Text>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function ToggleRow({ icon, label, description, value, onToggle, loading, divider }: { icon: string; label: string; description?: string; value: boolean; onToggle: () => void; loading?: boolean; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={18} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.neon} />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.elevated, true: colors.neonSoft }}
          thumbColor={value ? colors.neon : colors.textSubtle}
          ios_backgroundColor={colors.elevated}
        />
      )}
    </View>
  )
}

function LinkRow({ icon, label, onPress, divider }: { icon: string; label: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, divider && styles.rowDivider, pressed && { opacity: 0.85 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={18} color={colors.textMuted} />
      </View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  listCard: { marginHorizontal: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: '500' },
  rowDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  dangerText: { color: colors.error, fontSize: 15, fontWeight: '600' },
  versionText: { color: colors.textSubtle, fontSize: 12, textAlign: 'center', marginTop: spacing.xl },
  supportLink: { alignItems: 'center', marginTop: spacing.xl },
  supportText: { color: colors.blue, fontSize: 13, fontWeight: '600' },
})
