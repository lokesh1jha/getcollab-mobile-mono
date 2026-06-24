import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, spacing, CATEGORIES } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'
import { PortfolioGallery } from '../../../../components/PortfolioGallery'

interface ProfileScreenProps {
  navigation?: any
}

interface SocialFields {
  instagramHandle: string
  instagramFollowers: string
  instagramAvgLikesPerPost: string
  instagramAvgReelViews: string
  youtubeHandle: string
  youtubeSubscribers: string
  youtubeAvgViews: string
  tiktokHandle: string
  tiktokFollowers: string
  tiktokAvgViews: string
  twitterHandle: string
  twitterFollowers: string
  facebookHandle: string
  facebookFollowers: string
}

interface PricingFields {
  pricePerPost: string
  pricePerReel: string
  pricePerStory: string
  pricePerVideo: string
  pricePerCampaign: string
}

const emptySocial: SocialFields = {
  instagramHandle: '',
  instagramFollowers: '',
  instagramAvgLikesPerPost: '',
  instagramAvgReelViews: '',
  youtubeHandle: '',
  youtubeSubscribers: '',
  youtubeAvgViews: '',
  tiktokHandle: '',
  tiktokFollowers: '',
  tiktokAvgViews: '',
  twitterHandle: '',
  twitterFollowers: '',
  facebookHandle: '',
  facebookFollowers: '',
}

const emptyPricing: PricingFields = {
  pricePerPost: '',
  pricePerReel: '',
  pricePerStory: '',
  pricePerVideo: '',
  pricePerCampaign: '',
}

export default function InfluencerProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, updateProfile } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [avatar, setAvatar] = useState<string | null>(user?.image || null)
  const [cover, setCover] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [portfolio, setPortfolio] = useState<{ id: string; url: string }[]>([])
  const [basic, setBasic] = useState({
    name: user?.name || '',
    bio: '',
    location: '',
    portfolioUrl: '',
  })
  const [categories, setCategories] = useState<string[]>([])
  const [social, setSocial] = useState<SocialFields>(emptySocial)
  const [pricing, setPricing] = useState<PricingFields>(emptyPricing)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await apiService.getProfileWithMetrics().catch(() => apiService.getProfile().catch(() => null))
      const profile = response?.data || response?.profile || response?.influencerProfile || response || {}

      setBasic({
        name: user?.name || profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        portfolioUrl: profile.portfolioUrl || '',
      })
      if (profile.image || profile.avatar) {
        setAvatar(profile.image || profile.avatar)
      }
      if (profile.coverImage) {
        setCover(profile.coverImage)
      }
      if (Array.isArray(profile.portfolio)) {
        setPortfolio(
          profile.portfolio.map((url: any, idx: number) =>
            typeof url === 'string' ? { id: `p${idx}`, url } : { id: url?.id || String(idx), url: url?.url }
          )
        )
      }
      setCategories(profile.categories || [])

      const metrics = (key: string) => profile[`${key}Metrics`] || {}
      setSocial({
        instagramHandle: profile.instagramHandle || '',
        instagramFollowers: profile.instagramFollowers || metrics('instagram').followers?.toString() || '',
        instagramAvgLikesPerPost: profile.instagramAvgLikesPerPost || metrics('instagram').avgLikesPerPost?.toString() || '',
        instagramAvgReelViews: profile.instagramAvgReelViews || metrics('instagram').avgReelViews?.toString() || '',
        youtubeHandle: profile.youtubeHandle || '',
        youtubeSubscribers: profile.youtubeSubscribers || metrics('youtube').followers?.toString() || '',
        youtubeAvgViews: profile.youtubeAvgViews || metrics('youtube').avgViews?.toString() || '',
        tiktokHandle: profile.tiktokHandle || '',
        tiktokFollowers: profile.tiktokFollowers || metrics('tiktok').followers?.toString() || '',
        tiktokAvgViews: profile.tiktokAvgViews || metrics('tiktok').avgViews?.toString() || '',
        twitterHandle: profile.twitterHandle || '',
        twitterFollowers: profile.twitterFollowers || metrics('twitter').followers?.toString() || '',
        facebookHandle: profile.facebookHandle || '',
        facebookFollowers: profile.facebookFollowers || metrics('facebook').followers?.toString() || '',
      })

      const pricingData = profile.pricing || profile
      setPricing({
        pricePerPost: pricingData.pricePerPost?.toString() || '',
        pricePerReel: pricingData.pricePerReel?.toString() || '',
        pricePerStory: pricingData.pricePerStory?.toString() || '',
        pricePerVideo: pricingData.pricePerVideo?.toString() || '',
        pricePerCampaign: pricingData.pricePerCampaign?.toString() || '',
      })
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
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
        handleApiError(err, 'Failed to upload avatar')
      } finally {
        setUploadingAvatar(false)
      }
    } catch (err) {
      console.error('Avatar pick failed:', err)
    }
  }

  const pickCover = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable photo library access.')
      return
    }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      })
      if (result.canceled || !result.assets[0] || !result.assets[0].base64) return
      setUploadingCover(true)
      try {
        const response = await apiService.uploadCoverImage(`data:image/jpeg;base64,${result.assets[0].base64}`)
        const url = response?.url || response?.imageUrl || response?.data?.url
        if (url) setCover(url)
      } catch (err) {
        handleApiError(err, 'Cover upload failed')
      } finally {
        setUploadingCover(false)
      }
    } catch (err) {
      console.error('Cover pick failed:', err)
    }
  }

  const handleSave = async () => {
    if (!basic.name.trim()) {
      Alert.alert('Error', 'Name is required')
      return
    }
    if (!social.instagramHandle && !social.youtubeHandle && !social.tiktokHandle && !social.twitterHandle && !social.facebookHandle) {
      Alert.alert('Error', 'Add at least one social handle so brands can find you.')
      return
    }

    setLoading(true)
    try {
      await updateProfile({ name: basic.name })

      const profilePayload: any = {
        bio: basic.bio,
        location: basic.location,
        portfolioUrl: basic.portfolioUrl,
        coverImage: cover || undefined,
        portfolio: portfolio.map((p) => p.url),
        categories,
        ...social,
      }
      Object.keys(profilePayload).forEach((k) => {
        if (profilePayload[k] === '') delete profilePayload[k]
      })
      await apiService.updateProfile(profilePayload)

      const pricingPayload: Record<string, number> = {}
      Object.entries(pricing).forEach(([key, value]) => {
        const num = Number(value)
        if (!isNaN(num) && num >= 0 && value !== '') {
          pricingPayload[key] = num
        }
      })
      if (Object.keys(pricingPayload).length > 0) {
        await apiService.updatePricing(pricingPayload).catch((err) => {
          console.warn('Pricing update failed:', err)
        })
      }

      Alert.alert('Success', 'Profile updated successfully!')
      setIsEditing(false)
      loadProfile()
    } catch (error) {
      handleApiError(error, 'Failed to update profile')
    } finally {
      setLoading(false)
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

  if (initialLoading) {
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
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your creator profile</Text>
        </View>

        <TouchableOpacity
          onPress={isEditing ? pickCover : undefined}
          style={styles.coverWrap}
          activeOpacity={isEditing ? 0.7 : 1}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>
                {isEditing ? '📸 Tap to add a cover image (16:9)' : 'No cover image'}
              </Text>
            </View>
          )}
          {uploadingCover && (
            <View style={styles.coverUploading}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={isEditing ? pickAvatar : undefined} style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
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
            <View style={styles.basicForm}>
              <Input
                label="Name"
                value={basic.name}
                onChangeText={(text) => setBasic({ ...basic, name: text })}
                style={styles.input}
              />
              <Input label="Email" value={user?.email || ''} editable={false} style={styles.input} />
              <Input
                label="Bio"
                value={basic.bio}
                onChangeText={(text) => setBasic({ ...basic, bio: text })}
                placeholder="Tell brands about yourself..."
                multiline
                style={styles.input}
              />
              <Input
                label="Location"
                value={basic.location}
                onChangeText={(text) => setBasic({ ...basic, location: text })}
                placeholder="City, Country"
                style={styles.input}
              />
              <Input
                label="Portfolio URL"
                value={basic.portfolioUrl}
                onChangeText={(text) => setBasic({ ...basic, portfolioUrl: text })}
                placeholder="https://your-portfolio.com"
                style={styles.input}
              />
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {basic.bio ? <Text style={styles.bio}>{basic.bio}</Text> : null}
              {basic.location ? <Text style={styles.location}>📍 {basic.location}</Text> : null}
              {basic.portfolioUrl ? (
                <Text style={styles.portfolioLink}>🔗 {basic.portfolioUrl}</Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {isEditing ? (
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, categories.includes(category) && styles.categoryChipActive]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text
                    style={[styles.categoryChipText, categories.includes(category) && styles.categoryChipTextActive]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.categoriesContainer}>
              {categories.length === 0 ? (
                <Text style={styles.emptyText}>No categories selected</Text>
              ) : (
                categories.map((c) => (
                  <View key={c} style={[styles.categoryChip, styles.categoryChipActive]}>
                    <Text style={[styles.categoryChipText, styles.categoryChipTextActive]}>{c}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Social Profiles</Text>

          <SocialEditor
            platform="Instagram"
            color={colors.instagram}
            handleValue={social.instagramHandle}
            followersValue={social.instagramFollowers}
            extraLabel="Avg Likes / Post"
            extraValue={social.instagramAvgLikesPerPost}
            editable={isEditing}
            onChangeHandle={(v) => setSocial({ ...social, instagramHandle: v })}
            onChangeFollowers={(v) => setSocial({ ...social, instagramFollowers: v })}
            onChangeExtra={(v) => setSocial({ ...social, instagramAvgLikesPerPost: v })}
          />
          <SocialEditor
            platform="YouTube"
            color={colors.youtube}
            handleValue={social.youtubeHandle}
            followersValue={social.youtubeSubscribers}
            followersLabel="Subscribers"
            extraLabel="Avg Views"
            extraValue={social.youtubeAvgViews}
            editable={isEditing}
            onChangeHandle={(v) => setSocial({ ...social, youtubeHandle: v })}
            onChangeFollowers={(v) => setSocial({ ...social, youtubeSubscribers: v })}
            onChangeExtra={(v) => setSocial({ ...social, youtubeAvgViews: v })}
          />
          <SocialEditor
            platform="TikTok"
            color={colors.tiktok}
            handleValue={social.tiktokHandle}
            followersValue={social.tiktokFollowers}
            extraLabel="Avg Views"
            extraValue={social.tiktokAvgViews}
            editable={isEditing}
            onChangeHandle={(v) => setSocial({ ...social, tiktokHandle: v })}
            onChangeFollowers={(v) => setSocial({ ...social, tiktokFollowers: v })}
            onChangeExtra={(v) => setSocial({ ...social, tiktokAvgViews: v })}
          />
          <SocialEditor
            platform="Twitter / X"
            color={colors.twitter}
            handleValue={social.twitterHandle}
            followersValue={social.twitterFollowers}
            editable={isEditing}
            onChangeHandle={(v) => setSocial({ ...social, twitterHandle: v })}
            onChangeFollowers={(v) => setSocial({ ...social, twitterFollowers: v })}
          />
          <SocialEditor
            platform="Facebook"
            color={colors.primary}
            handleValue={social.facebookHandle}
            followersValue={social.facebookFollowers}
            editable={isEditing}
            onChangeHandle={(v) => setSocial({ ...social, facebookHandle: v })}
            onChangeFollowers={(v) => setSocial({ ...social, facebookFollowers: v })}
          />
        </View>

        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <Text style={styles.fieldHint}>
            {isEditing ? 'Add up to 9 photos showcasing your work. Long-press to remove.' : 'Showcase of recent work'}
          </Text>
          <PortfolioGallery items={portfolio} onChange={setPortfolio} editable={isEditing} maxItems={9} />
        </View>

        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Pricing (₹)</Text>
          <Text style={styles.fieldHint}>Leave blank if not applicable. Brands see this when shortlisting.</Text>
          <View style={styles.pricingGrid}>
            <PricingField
              label="Per Post"
              value={pricing.pricePerPost}
              editable={isEditing}
              onChange={(v) => setPricing({ ...pricing, pricePerPost: v })}
            />
            <PricingField
              label="Per Reel"
              value={pricing.pricePerReel}
              editable={isEditing}
              onChange={(v) => setPricing({ ...pricing, pricePerReel: v })}
            />
            <PricingField
              label="Per Story"
              value={pricing.pricePerStory}
              editable={isEditing}
              onChange={(v) => setPricing({ ...pricing, pricePerStory: v })}
            />
            <PricingField
              label="Per Video"
              value={pricing.pricePerVideo}
              editable={isEditing}
              onChange={(v) => setPricing({ ...pricing, pricePerVideo: v })}
            />
            <PricingField
              label="Full Campaign"
              value={pricing.pricePerCampaign}
              editable={isEditing}
              onChange={(v) => setPricing({ ...pricing, pricePerCampaign: v })}
            />
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {isEditing ? (
            <>
              <Button
                title={loading ? 'Saving...' : 'Save Changes'}
                onPress={handleSave}
                disabled={loading}
                loading={loading}
                style={styles.saveButton}
              />
              <Button title="Cancel" variant="outline" onPress={() => setIsEditing(false)} />
            </>
          ) : (
            <>
              <Button title="Edit Profile" onPress={() => setIsEditing(true)} />
              <Button
                title="Preview Public Profile"
                variant="outline"
                onPress={() => navigation?.navigate('ProfilePreview')}
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate('Settings')}>
            <Text style={styles.settingText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation?.navigate('Earnings')}>
            <Text style={styles.settingText}>Earnings</Text>
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

interface SocialEditorProps {
  platform: string
  color: string
  handleValue: string
  followersValue: string
  followersLabel?: string
  extraLabel?: string
  extraValue?: string
  editable: boolean
  onChangeHandle: (value: string) => void
  onChangeFollowers: (value: string) => void
  onChangeExtra?: (value: string) => void
}

const SocialEditor = ({
  platform,
  color,
  handleValue,
  followersValue,
  followersLabel = 'Followers',
  extraLabel,
  extraValue,
  editable,
  onChangeHandle,
  onChangeFollowers,
  onChangeExtra,
}: SocialEditorProps) => {
  if (!editable && !handleValue) return null
  return (
    <View style={[styles.socialCard, { borderLeftColor: color }]}>
      <Text style={[styles.socialPlatform, { color }]}>{platform}</Text>
      {editable ? (
        <>
          <Input
            label="Handle"
            value={handleValue}
            onChangeText={onChangeHandle}
            placeholder="@username"
            style={styles.socialInput}
          />
          <Input
            label={followersLabel}
            value={followersValue}
            onChangeText={onChangeFollowers}
            placeholder="e.g. 12000"
            keyboardType="numeric"
            style={styles.socialInput}
          />
          {extraLabel && onChangeExtra && (
            <Input
              label={extraLabel}
              value={extraValue || ''}
              onChangeText={onChangeExtra}
              placeholder="e.g. 4500"
              keyboardType="numeric"
              style={styles.socialInput}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.socialHandle}>{handleValue.startsWith('@') ? handleValue : `@${handleValue}`}</Text>
          {followersValue ? <Text style={styles.socialStats}>{followersLabel}: {followersValue}</Text> : null}
          {extraValue ? <Text style={styles.socialStats}>{extraLabel}: {extraValue}</Text> : null}
        </>
      )}
    </View>
  )
}

interface PricingFieldProps {
  label: string
  value: string
  editable: boolean
  onChange: (value: string) => void
}

const PricingField = ({ label, value, editable, onChange }: PricingFieldProps) => {
  if (!editable && !value) return null
  return (
    <View style={styles.pricingItem}>
      <Text style={styles.pricingLabel}>{label}</Text>
      {editable ? (
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="0"
          keyboardType="numeric"
        />
      ) : (
        <Text style={styles.pricingValue}>₹{Number(value || 0).toLocaleString()}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  basicForm: {
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
    marginBottom: spacing.xs,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  location: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  portfolioLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  editSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  socialCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  socialPlatform: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialHandle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  socialStats: {
    fontSize: 13,
    color: colors.textMuted,
  },
  socialInput: {
    marginBottom: spacing.sm,
  },
  pricingGrid: {
    gap: spacing.sm,
  },
  pricingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  pricingLabel: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  pricingValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
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
  coverWrap: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  coverPlaceholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  coverUploading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
