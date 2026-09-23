import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'

interface NotificationPrefs {
  emailCampaignUpdates: boolean
  emailBidAlerts: boolean
  emailMessageAlerts: boolean
  emailWeeklyDigest: boolean
  pushCampaignUpdates: boolean
  pushBidAlerts: boolean
  pushMessageAlerts: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailCampaignUpdates: true,
  emailBidAlerts: true,
  emailMessageAlerts: true,
  emailWeeklyDigest: false,
  pushCampaignUpdates: true,
  pushBidAlerts: true,
  pushMessageAlerts: true,
}

export default function NotificationsSettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null)

  const loadPrefs = useCallback(async () => {
    try {
      const res = await apiService.getSettings()
      const s = res?.settings || res?.data || res || {}
      const notifications = s.notifications || s.notificationSettings || {}
      setPrefs({
        emailCampaignUpdates: notifications.emailCampaignUpdates ?? DEFAULT_PREFS.emailCampaignUpdates,
        emailBidAlerts: notifications.emailBidAlerts ?? DEFAULT_PREFS.emailBidAlerts,
        emailMessageAlerts: notifications.emailMessageAlerts ?? DEFAULT_PREFS.emailMessageAlerts,
        emailWeeklyDigest: notifications.emailWeeklyDigest ?? DEFAULT_PREFS.emailWeeklyDigest,
        pushCampaignUpdates: notifications.pushCampaignUpdates ?? DEFAULT_PREFS.pushCampaignUpdates,
        pushBidAlerts: notifications.pushBidAlerts ?? DEFAULT_PREFS.pushBidAlerts,
        pushMessageAlerts: notifications.pushMessageAlerts ?? DEFAULT_PREFS.pushMessageAlerts,
      })
    } catch (err) {
      console.warn('Failed to load notification settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadPrefs()
    }, [loadPrefs])
  )

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaving(key)
    try {
      await apiService.updateNotificationSettings({ [key]: value })
    } catch (err) {
      handleApiError(err, 'Failed to update setting')
      setPrefs((prev) => ({ ...prev, [key]: !value }))
    } finally {
      setSaving(null)
    }
  }

  const SettingRow = ({ label, description, valueKey }: { label: string; description: string; valueKey: keyof NotificationPrefs }) => (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={prefs[valueKey]}
        onValueChange={(v) => updatePref(valueKey, v)}
        trackColor={{ false: colors.border, true: colors.blue }}
        thumbColor={'#fff'}
        disabled={saving === valueKey}
      />
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.neon} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Email and push preferences</Text>

          <Text style={styles.sectionLabel}>Email</Text>
          <View style={styles.card}>
            <SettingRow label="Campaign Updates" description="New bids, status changes, and milestones" valueKey="emailCampaignUpdates" />
            <SettingRow label="Bid Alerts" description="When a creator applies to your campaign" valueKey="emailBidAlerts" />
            <SettingRow label="Message Alerts" description="New chat messages" valueKey="emailMessageAlerts" />
          </View>

          <Text style={styles.sectionLabel}>Push</Text>
          <View style={styles.card}>
            <SettingRow label="Campaign Updates" description="Push for campaign activity" valueKey="pushCampaignUpdates" />
            <SettingRow label="Bid Alerts" description="Push when creators apply" valueKey="pushBidAlerts" />
            <SettingRow label="Message Alerts" description="Push for new messages" valueKey="pushMessageAlerts" />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1, marginRight: spacing.md },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowDescription: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
})
