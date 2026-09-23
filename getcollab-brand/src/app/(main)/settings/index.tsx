import React from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useAuthStore } from '@shared/stores/auth-store'

const SETTINGS_SECTIONS = [
  { id: 'profile', icon: 'person-outline', label: 'Profile', description: 'Public brand info' },
  { id: 'account', icon: 'card-outline', label: 'Account', description: 'Login and contact' },
  { id: 'security', icon: 'shield-checkmark-outline', label: 'Security', description: 'Password and 2FA' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', description: 'Email and push prefs' },
  { id: 'team', icon: 'people-outline', label: 'Team', description: 'Members and invites' },
  { id: 'billing', icon: 'wallet-outline', label: 'Billing', description: 'Plan and invoices' },
] as const

interface Props { navigation?: any }

export default function SettingsShellScreen({ navigation }: Props) {
  const { signOut } = useAuthStore()

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

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(320)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your workspace</Text>
  
            <View style={styles.listCard}>
              {SETTINGS_SECTIONS.map((section, idx) => (
                <Pressable
                  key={section.id}
                  style={({ pressed }) => [styles.row, idx !== SETTINGS_SECTIONS.length - 1 && styles.rowDivider, pressed && { opacity: 0.6 }]}
                  onPress={() => {
                    const routeName = section.id === 'notifications' ? 'NotificationSettings' : section.id.charAt(0).toUpperCase() + section.id.slice(1)
                    navigation?.navigate(routeName)
                  }}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={section.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{section.label}</Text>
                    <Text style={styles.rowDescription}>{section.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </Pressable>
              ))}
            </View>
  
            {/* Danger Zone */}
            <Text style={styles.dangerHeader}>Danger Zone</Text>
            <View style={styles.listCard}>
              <Pressable onPress={handleDeleteAccount} style={({ pressed }) => [styles.dangerRow, pressed && { opacity: 0.85 }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.errorSoft }]}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </View>
                <Text style={styles.dangerText}>Delete Account</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowDescription: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dangerHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  dangerText: { color: colors.error, fontSize: 15, fontWeight: '600' },
})
