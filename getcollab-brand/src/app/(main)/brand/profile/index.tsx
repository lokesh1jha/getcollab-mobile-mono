import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'

interface ProfileScreenProps {
  navigation?: any
}

export default function BrandProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(user?.image || null)
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: '',
    location: '',
    portfolioUrl: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await apiService.getProfile().catch(() => null)
      const profile = response?.data || response?.profile || response || {}
      setForm({
        name: user?.name || profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        portfolioUrl: profile.portfolioUrl || '',
      })
      if (profile.image || profile.avatar) {
        setAvatar(profile.image || profile.avatar)
      }
    } catch (err) {
      console.error('Failed to load brand profile:', err)
    }
  }

  const pickAvatar = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable photo library access.')
      return
    }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      })
      if (result.canceled || !result.assets[0] || !result.assets[0].base64) return
      setUploadingAvatar(true)
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`
      try {
        const response = await apiService.uploadProfileImage(base64Image)
        const url = response?.url || response?.imageUrl || response?.data?.url
        if (url) {
          setAvatar(url)
          await updateProfile({ image: url } as any)
        }
      } catch (err) {
        handleApiError(err, 'Failed to upload logo')
      } finally {
        setUploadingAvatar(false)
      }
    } catch (err) {
      console.error('Avatar pick failed:', err)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Brand name is required')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ name: form.name })
      const profilePayload: any = {
        bio: form.bio,
        location: form.location,
        portfolioUrl: form.portfolioUrl,
      }
      Object.keys(profilePayload).forEach((k) => {
        if (profilePayload[k] === '') delete profilePayload[k]
      })
      if (Object.keys(profilePayload).length > 0) {
        await apiService.updateProfile(profilePayload).catch((err) => {
          console.warn('Profile metadata update failed:', err)
        })
      }
      Alert.alert('Success', 'Profile updated successfully!')
      setIsEditing(false)
    } catch (error) {
      handleApiError(error, 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await useAuthStore.getState().signOut()
          navigation?.navigate('SignIn')
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Brand Profile</Text>
          <Text style={styles.subtitle}>Manage your brand account</Text>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={isEditing ? pickAvatar : undefined} style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, styles.brandAvatar]}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'B'}</Text>
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
            {isEditing && !uploadingAvatar && (
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditText}>✎</Text>
              </View>
            )}
          </TouchableOpacity>

          {isEditing ? (
            <View style={styles.editForm}>
              <Input
                label="Brand Name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                style={styles.input}
              />
              <Input label="Email" value={user?.email || ''} editable={false} style={styles.input} />
              <Input
                label="Bio"
                value={form.bio}
                onChangeText={(v) => setForm({ ...form, bio: v })}
                multiline
                placeholder="What does your brand stand for?"
                style={styles.input}
              />
              <Input
                label="Location"
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
                placeholder="City, Country"
                style={styles.input}
              />
              <Input
                label="Website"
                value={form.portfolioUrl}
                onChangeText={(v) => setForm({ ...form, portfolioUrl: v })}
                placeholder="https://yourbrand.com"
                style={styles.input}
              />
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Brand</Text>
              </View>
              {form.bio ? <Text style={styles.bio}>{form.bio}</Text> : null}
              {form.location ? <Text style={styles.metaLine}>📍 {form.location}</Text> : null}
              {form.portfolioUrl ? <Text style={styles.metaLink}>🔗 {form.portfolioUrl}</Text> : null}
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {isEditing ? (
            <>
              <Button
                title={saving ? 'Saving...' : 'Save Changes'}
                onPress={handleSave}
                disabled={saving}
                loading={saving}
                style={styles.saveButton}
              />
              <Button title="Cancel" variant="outline" onPress={() => setIsEditing(false)} />
            </>
          ) : (
            <Button title="Edit Profile" onPress={() => setIsEditing(true)} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate('Notifications')}>
            <Text style={styles.settingText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate('Settings')}>
            <Text style={styles.settingText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate('Disputes')}>
            <Text style={styles.settingText}>Disputes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutSection}>
          <Button title="Logout" variant="outline" onPress={handleLogout} style={styles.logoutButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  profileSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandAvatar: {
    backgroundColor: colors.accent,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarEditText: {
    color: colors.white,
    fontSize: 16,
  },
  editForm: {
    gap: spacing.sm,
  },
  infoContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  metaLine: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  metaLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
  },
  actionsContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  saveButton: {
    marginBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  settingItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
  },
  logoutSection: {
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logoutButton: {
    borderColor: colors.error,
  },
})
