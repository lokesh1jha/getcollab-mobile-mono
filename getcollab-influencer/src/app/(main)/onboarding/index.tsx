import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, CATEGORIES, REGIONS, CONTENT_LANGUAGES } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import apiService, { handleApiError } from '@shared/services/api'

interface Props {
  navigation?: any
}

const CAMPAIGN_TYPES = ['Sponsored Posts', 'Product Reviews', 'Brand Ambassador', 'Affiliate', 'UGC', 'Event Coverage']
const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+']
const GENDERS = ['Male', 'Female', 'Non-binary', 'All']
const OBJECTIVES = ['Brand Awareness', 'Sales', 'Engagement', 'App Installs', 'Lead Gen', 'Content']

export default function OnboardingScreen({ navigation }: Props) {
  const { user, fetchCurrentUser } = useAuthStore()
  const role = user?.role === 'brand' ? 'brand' : 'influencer'
  const totalSteps = role === 'brand' ? 3 : 2
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Brand state
  const [brandStep1, setBrandStep1] = useState({ companyName: '', websiteUrl: '', primaryPhone: '', industry: '' })
  const [brandStep2, setBrandStep2] = useState<{
    campaignTypes: string[]
    ageRanges: string[]
    genders: string[]
    location: string
    creatorCategories: string[]
    objectives: string[]
  }>({ campaignTypes: [], ageRanges: [], genders: [], location: '', creatorCategories: [], objectives: [] })
  const [brandStep3, setBrandStep3] = useState({ budgetRange: '', companySize: '', timeline: '', frequency: '' })

  // Influencer state
  const [infStep1, setInfStep1] = useState({ bio: '', location: '', phoneNumber: '', categories: [] as string[], languages: [] as string[] })
  const [infStep2, setInfStep2] = useState({
    instagram: '',
    instagramFollowers: '',
    youtube: '',
    youtubeSubscribers: '',
    tiktok: '',
    tiktokFollowers: '',
  })

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v]

  const handleBrandStep1 = async () => {
    if (!brandStep1.companyName.trim() || !brandStep1.industry.trim()) {
      Alert.alert('Required fields', 'Company name and industry are required.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.submitBrandOnboardingStep1(brandStep1)
      setStep(2)
    } catch (e) {
      handleApiError(e, 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBrandStep2 = async () => {
    if (brandStep2.campaignTypes.length === 0 || brandStep2.creatorCategories.length === 0) {
      Alert.alert('Select more', 'Pick campaign types and creator categories.')
      return
    }
    if (brandStep2.ageRanges.length === 0 || brandStep2.genders.length === 0) {
      Alert.alert('Target audience', 'Pick at least one age range and gender.')
      return
    }
    if (brandStep2.objectives.length === 0) {
      Alert.alert('Objectives', 'Pick at least one objective.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.submitBrandOnboardingStep2({
        campaignTypes: brandStep2.campaignTypes,
        targetAudience: {
          ageRanges: brandStep2.ageRanges,
          genders: brandStep2.genders,
          location: brandStep2.location,
        },
        creatorCategories: brandStep2.creatorCategories,
        objectives: brandStep2.objectives,
      })
      setStep(3)
    } catch (e) {
      handleApiError(e, 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBrandStep3 = async () => {
    setSubmitting(true)
    try {
      await apiService.submitBrandOnboardingStep3({
        budgetRange: brandStep3.budgetRange,
        companySize: brandStep3.companySize,
        timeline: brandStep3.timeline,
        frequency: brandStep3.frequency,
        currency: 'INR',
      })
      await fetchCurrentUser()
      Alert.alert('Welcome aboard!', 'Your brand profile is set up. Start your free trial to launch campaigns.', [
        { text: "Let's go", onPress: () => navigation?.navigate('Subscription') },
      ])
    } catch (e) {
      handleApiError(e, 'Failed to complete onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInfStep1 = async () => {
    if (!infStep1.bio.trim() || infStep1.bio.trim().length < 20) {
      Alert.alert('Bio too short', 'Tell brands about yourself (at least 20 characters).')
      return
    }
    if (!infStep1.location.trim()) {
      Alert.alert('Location', 'Add your city/country.')
      return
    }
    if (infStep1.categories.length === 0) {
      Alert.alert('Categories', 'Pick at least one category.')
      return
    }
    if (infStep1.languages.length === 0) {
      Alert.alert('Content Language', 'Pick at least one language you create content in.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.submitInfluencerOnboardingStep1({
        bio: infStep1.bio,
        location: infStep1.location,
        categories: infStep1.categories,
        languages: infStep1.languages,
        phoneNumber: infStep1.phoneNumber || undefined,
      })
      setStep(2)
    } catch (e) {
      handleApiError(e, 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInfStep2 = async () => {
    const hasAny = infStep2.instagram || infStep2.youtube || infStep2.tiktok
    if (!hasAny) {
      Alert.alert('Add a handle', 'Link at least one social account.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.submitInfluencerOnboardingStep2({
        handles: {
          instagram: infStep2.instagram ? { handle: infStep2.instagram, followers: infStep2.instagramFollowers } : undefined,
          youtube: infStep2.youtube ? { channelUrl: infStep2.youtube, subscribers: infStep2.youtubeSubscribers } : undefined,
          tiktok: infStep2.tiktok ? { handle: infStep2.tiktok, followers: infStep2.tiktokFollowers } : undefined,
        },
      })
      await fetchCurrentUser()
      Alert.alert('You\'re all set!', 'Time to find campaigns that match your style.', [
        { text: 'Discover Campaigns', onPress: () => navigation?.navigate('Discover') },
      ])
    } catch (e) {
      handleApiError(e, 'Failed to complete onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  const renderProgress = () => (
    <View style={styles.progressBar}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressDot, i + 1 <= step ? styles.progressDotActive : null]}
        />
      ))}
    </View>
  )

  const renderChips = (
    options: string[],
    selected: string[],
    onToggle: (v: string) => void
  ) => (
    <View style={styles.chipGrid}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, selected.includes(o) && styles.chipActive]}
          onPress={() => onToggle(o)}
        >
          <Text style={[styles.chipText, selected.includes(o) && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  // ----- Brand steps -----
  if (role === 'brand' && step === 1) {
    return (
      <Wrapper>
        <Text style={styles.heading}>Tell us about your brand</Text>
        <Text style={styles.subheading}>Step 1 of 3 · Company profile</Text>
        {renderProgress()}
        <Input label="Company Name *" value={brandStep1.companyName} onChangeText={(v) => setBrandStep1({ ...brandStep1, companyName: v })} style={styles.input} />
        <Input label="Industry *" value={brandStep1.industry} onChangeText={(v) => setBrandStep1({ ...brandStep1, industry: v })} placeholder="e.g. Fashion, Tech" style={styles.input} />
        <Input label="Website" value={brandStep1.websiteUrl} onChangeText={(v) => setBrandStep1({ ...brandStep1, websiteUrl: v })} placeholder="https://" style={styles.input} />
        <Input label="Phone" value={brandStep1.primaryPhone} onChangeText={(v) => setBrandStep1({ ...brandStep1, primaryPhone: v })} keyboardType="phone-pad" style={styles.input} />
        <Button title={submitting ? 'Saving...' : 'Continue'} onPress={handleBrandStep1} loading={submitting} disabled={submitting} fullWidth />
      </Wrapper>
    )
  }

  if (role === 'brand' && step === 2) {
    return (
      <Wrapper>
        <Text style={styles.heading}>Campaign preferences</Text>
        <Text style={styles.subheading}>Step 2 of 3 · Who & what</Text>
        {renderProgress()}

        <SectionLabel label="Campaign Types *" />
        {renderChips(CAMPAIGN_TYPES, brandStep2.campaignTypes, (v) => setBrandStep2({ ...brandStep2, campaignTypes: toggle(brandStep2.campaignTypes, v) }))}

        <SectionLabel label="Target Age Ranges *" />
        {renderChips(AGE_RANGES, brandStep2.ageRanges, (v) => setBrandStep2({ ...brandStep2, ageRanges: toggle(brandStep2.ageRanges, v) }))}

        <SectionLabel label="Target Genders *" />
        {renderChips(GENDERS, brandStep2.genders, (v) => setBrandStep2({ ...brandStep2, genders: toggle(brandStep2.genders, v) }))}

        <SectionLabel label="Target Location" />
        <Input value={brandStep2.location} onChangeText={(v) => setBrandStep2({ ...brandStep2, location: v })} placeholder="e.g. All India" />

        <SectionLabel label="Creator Categories *" />
        {renderChips(CATEGORIES, brandStep2.creatorCategories, (v) => setBrandStep2({ ...brandStep2, creatorCategories: toggle(brandStep2.creatorCategories, v) }))}

        <SectionLabel label="Objectives *" />
        {renderChips(OBJECTIVES, brandStep2.objectives, (v) => setBrandStep2({ ...brandStep2, objectives: toggle(brandStep2.objectives, v) }))}

        <View style={styles.actionRow}>
          <Button title="Back" variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }} />
          <Button title={submitting ? 'Saving...' : 'Continue'} onPress={handleBrandStep2} loading={submitting} disabled={submitting} style={{ flex: 1 }} />
        </View>
      </Wrapper>
    )
  }

  if (role === 'brand' && step === 3) {
    return (
      <Wrapper>
        <Text style={styles.heading}>Almost there</Text>
        <Text style={styles.subheading}>Step 3 of 3 · Scale</Text>
        {renderProgress()}

        <SectionLabel label="Budget Range" />
        {renderChips(['<₹50k', '₹50k-2L', '₹2L-10L', '₹10L+'], [brandStep3.budgetRange], (v) => setBrandStep3({ ...brandStep3, budgetRange: brandStep3.budgetRange === v ? '' : v }))}

        <SectionLabel label="Company Size" />
        {renderChips(['1-10', '11-50', '51-200', '200+'], [brandStep3.companySize], (v) => setBrandStep3({ ...brandStep3, companySize: brandStep3.companySize === v ? '' : v }))}

        <SectionLabel label="Campaign Frequency" />
        {renderChips(['Monthly', 'Quarterly', 'One-time', 'Ongoing'], [brandStep3.frequency], (v) => setBrandStep3({ ...brandStep3, frequency: brandStep3.frequency === v ? '' : v }))}

        <View style={styles.actionRow}>
          <Button title="Back" variant="outline" onPress={() => setStep(2)} style={{ flex: 1 }} />
          <Button title={submitting ? 'Finishing...' : 'Finish & Start Trial'} onPress={handleBrandStep3} loading={submitting} disabled={submitting} style={{ flex: 1 }} />
        </View>
      </Wrapper>
    )
  }

  // ----- Influencer steps -----
  if (role === 'influencer' && step === 1) {
    return (
      <Wrapper>
        <Text style={styles.heading}>Tell brands about you</Text>
        <Text style={styles.subheading}>Step 1 of 2 · Creator profile</Text>
        {renderProgress()}

        <Input label="Bio *" value={infStep1.bio} onChangeText={(v) => setInfStep1({ ...infStep1, bio: v })} placeholder="At least 20 characters" multiline style={styles.input} />
        <Input label="Location *" value={infStep1.location} onChangeText={(v) => setInfStep1({ ...infStep1, location: v })} placeholder="City, Country" style={styles.input} />
        <Input label="Phone (optional)" value={infStep1.phoneNumber} onChangeText={(v) => setInfStep1({ ...infStep1, phoneNumber: v })} keyboardType="phone-pad" style={styles.input} />

        <SectionLabel label="Categories *" />
        {renderChips(CATEGORIES, infStep1.categories, (v) => setInfStep1({ ...infStep1, categories: toggle(infStep1.categories, v) }))}

        <SectionLabel label="Content Languages *" />
        {renderChips(
          CONTENT_LANGUAGES.map((l) => l.label),
          CONTENT_LANGUAGES.filter((l) => infStep1.languages.includes(l.code)).map((l) => l.label),
          (label) => {
            const lang = CONTENT_LANGUAGES.find((l) => l.label === label)
            if (!lang) return
            setInfStep1({ ...infStep1, languages: toggle(infStep1.languages, lang.code) })
          },
        )}

        <Button title={submitting ? 'Saving...' : 'Continue'} onPress={handleInfStep1} loading={submitting} disabled={submitting} fullWidth style={{ marginTop: spacing.lg }} />
      </Wrapper>
    )
  }

  if (role === 'influencer' && step === 2) {
    return (
      <Wrapper>
        <Text style={styles.heading}>Connect your socials</Text>
        <Text style={styles.subheading}>Step 2 of 2 · Where you create</Text>
        {renderProgress()}

        <SectionLabel label="Instagram" />
        <Input value={infStep2.instagram} onChangeText={(v) => setInfStep2({ ...infStep2, instagram: v })} placeholder="@username" style={styles.input} />
        <Input value={infStep2.instagramFollowers} onChangeText={(v) => setInfStep2({ ...infStep2, instagramFollowers: v })} placeholder="Followers (e.g. 12000)" keyboardType="numeric" style={styles.input} />

        <SectionLabel label="YouTube" />
        <Input value={infStep2.youtube} onChangeText={(v) => setInfStep2({ ...infStep2, youtube: v })} placeholder="Channel URL or @handle" style={styles.input} />
        <Input value={infStep2.youtubeSubscribers} onChangeText={(v) => setInfStep2({ ...infStep2, youtubeSubscribers: v })} placeholder="Subscribers" keyboardType="numeric" style={styles.input} />

        <SectionLabel label="TikTok" />
        <Input value={infStep2.tiktok} onChangeText={(v) => setInfStep2({ ...infStep2, tiktok: v })} placeholder="@username" style={styles.input} />
        <Input value={infStep2.tiktokFollowers} onChangeText={(v) => setInfStep2({ ...infStep2, tiktokFollowers: v })} placeholder="Followers" keyboardType="numeric" style={styles.input} />

        <View style={styles.actionRow}>
          <Button title="Back" variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }} />
          <Button title={submitting ? 'Finishing...' : 'Finish'} onPress={handleInfStep2} loading={submitting} disabled={submitting} style={{ flex: 1 }} />
        </View>
      </Wrapper>
    )
  }

  return null
}

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
  </SafeAreaView>
)

const SectionLabel = ({ label }: { label: string }) => <Text style={styles.sectionLabel}>{label}</Text>

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  heading: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  subheading: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  progressBar: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  progressDot: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  progressDotActive: { backgroundColor: colors.primary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: { marginBottom: spacing.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
})
