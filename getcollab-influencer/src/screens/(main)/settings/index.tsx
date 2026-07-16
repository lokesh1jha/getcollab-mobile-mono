import React, { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

interface SettingsState {
  twoFactorEnabled: boolean
  emailNotifications: boolean
  campaignUpdates: boolean
  pushNotifications: boolean
}

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuthStore()
  const [settings, setSettings] = useState<SettingsState>({ twoFactorEnabled: false, emailNotifications: true, campaignUpdates: true, pushNotifications: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await (apiService as any).getSettings?.()
      if (res) setSettings(prev => ({ ...prev, ...res }))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const toggle = async (key: keyof SettingsState) => {
    const newVal = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newVal }))
    setSaving(key)
    try { await (apiService as any).updateSettings?.({ [key]: newVal }) }
    catch (err: any) {
      setSettings(prev => ({ ...prev, [key]: !newVal }))
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
            try { await (apiService as any).deleteAccount?.(); await signOut() }
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
          <Pressable hitSlop={12} onPress={() => navigation?.goBack()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.75 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
          {/* Security */}
          <SectionHeader title="Security" />
          <View style={styles.listCard}>
            <ToggleRow
              icon="shield-checkmark-outline"
              label="Two-Factor Authentication"
              description="Add an extra layer of security"
              value={settings.twoFactorEnabled}
              onToggle={() => toggle('twoFactorEnabled')}
              loading={saving === 'twoFactorEnabled'}
            />
          </View>

          {/* Notifications */}
          <SectionHeader title="Notifications" />
          <View style={styles.listCard}>
            <ToggleRow icon="mail-outline" label="Email Notifications" value={settings.emailNotifications} onToggle={() => toggle('emailNotifications')} loading={saving === 'emailNotifications'} divider />
            <ToggleRow icon="megaphone-outline" label="Campaign Updates" value={settings.campaignUpdates} onToggle={() => toggle('campaignUpdates')} loading={saving === 'campaignUpdates'} divider />
            <ToggleRow icon="notifications-outline" label="Push Notifications" value={settings.pushNotifications} onToggle={() => toggle('pushNotifications')} loading={saving === 'pushNotifications'} />
          </View>

          {/* Account */}
          <SectionHeader title="Account" />
          <View style={styles.listCard}>
            <LinkRow icon="lock-closed-outline" label="Change Password" onPress={() => navigation?.navigate('ChangePassword')} divider />
            <LinkRow icon="receipt-outline" label="Subscription" onPress={() => navigation?.navigate('Subscription')} divider />
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

          <Text style={styles.versionText}>GetCollab v1.0.0 · For Creators</Text>
        </ScrollView>
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
})
