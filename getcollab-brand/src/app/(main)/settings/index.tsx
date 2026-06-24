import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import apiService, { handleApiError } from '@shared/services/api'

interface SettingsScreenProps {
  navigation?: any
}

interface SettingsState {
  twoFactorEnabled: boolean
  emailNotifications: boolean
  campaignUpdates: boolean
  pushNotifications: boolean
}

const defaultSettings: SettingsState = {
  twoFactorEnabled: false,
  emailNotifications: true,
  campaignUpdates: true,
  pushNotifications: true,
}

const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const response = await apiService.getSettings()
      const data = response?.data || response?.settings || response || {}
      setSettings({
        twoFactorEnabled: !!data.twoFactorEnabled,
        emailNotifications: data.emailNotifications ?? true,
        campaignUpdates: data.campaignUpdates ?? true,
        pushNotifications: data.pushNotifications ?? true,
      })
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadSettings()
    }, [loadSettings])
  )

  const updateSetting = async (key: keyof SettingsState, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaving(key)
    try {
      if (key === 'emailNotifications' || key === 'campaignUpdates') {
        await apiService.updateNotificationSettings({ [key]: value })
      } else {
        await apiService.updateSettings({ [key]: value })
      }
    } catch (error) {
      handleApiError(error, 'Failed to update setting')
    } finally {
      setSaving(null)
    }
  }

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.post('/profile/delete', { confirmation: 'DELETE' })
              Alert.alert('Account deleted', 'Your account has been deleted.')
              navigation?.navigate('SignIn')
            } catch (err) {
              handleApiError(err, 'Failed to delete account')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Settings</Text>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.section}>
          <SettingRow
            label="Email Notifications"
            description="Receive updates about your account by email"
            value={settings.emailNotifications}
            onValueChange={(v) => updateSetting('emailNotifications', v)}
            saving={saving === 'emailNotifications'}
          />
          <SettingRow
            label="Campaign Updates"
            description="Alerts for new bids, matches and status changes"
            value={settings.campaignUpdates}
            onValueChange={(v) => updateSetting('campaignUpdates', v)}
            saving={saving === 'campaignUpdates'}
          />
          <SettingRow
            label="Push Notifications"
            description="Mobile push alerts for time-sensitive activity"
            value={settings.pushNotifications}
            onValueChange={(v) => updateSetting('pushNotifications', v)}
            saving={saving === 'pushNotifications'}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.section}>
          <SettingRow
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            value={settings.twoFactorEnabled}
            onValueChange={(v) => updateSetting('twoFactorEnabled', v)}
            saving={saving === 'twoFactorEnabled'}
            isLast
          />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => navigation?.navigate('ChangePassword')}
          >
            <Text style={styles.optionText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => navigation?.navigate('Subscription')}
          >
            <Text style={styles.optionText}>Subscription & Billing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => navigation?.navigate('Notifications')}
          >
            <Text style={styles.optionText}>View Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, styles.lastOption]}
            onPress={confirmDeleteAccount}
          >
            <Text style={[styles.optionText, styles.dangerText]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

interface SettingRowProps {
  label: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
  saving?: boolean
  isLast?: boolean
}

const SettingRow = ({ label, description, value, onValueChange, saving, isLast }: SettingRowProps) => (
  <View style={[styles.row, !isLast && styles.rowBorder]}>
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
      disabled={!!saving}
    />
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  dangerText: {
    color: colors.error,
  },
})

export default SettingsScreen
