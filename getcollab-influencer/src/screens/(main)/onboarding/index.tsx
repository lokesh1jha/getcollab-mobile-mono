import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/src/theme'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { useAuthStore } from '@shared/stores/auth-store'
import { useReferenceDataStore, selectCategories, selectLanguages, selectCampaignTypes, selectObjectives } from '@shared/stores/reference-data-store'
import type { RefItem } from '@shared/stores/reference-data-store'
import apiService, { handleApiError } from '@shared/services/api'

// Web pins these first in the language picker (creator flow suggestions).
const SUGGESTED_LANGUAGES = ['English', 'Hindi']
// Same fallback list as the web start-profile country select.
const FALLBACK_COUNTRIES = ['India', 'United States', 'United Kingdom', 'UAE']

interface Props {
  navigation?: any
}

const AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+']
const GENDERS = ['Male', 'Female', 'Non-binary', 'All']
// Stable empty — a fresh [] per call would re-trigger the useSyncExternalStore
// getSnapshot infinite loop (see reference-data-store selectors).
const NO_COUNTRIES: RefItem[] = []

export default function OnboardingScreen({ navigation }: Props) {
  const { user, fetchCurrentUser } = useAuthStore()
  const categories = useReferenceDataStore(selectCategories)
  const languages = useReferenceDataStore(selectLanguages)
  const campaignTypes = useReferenceDataStore(selectCampaignTypes)
  const objectives = useReferenceDataStore(selectObjectives)
  const countries = useReferenceDataStore((s) => s.data?.countries ?? NO_COUNTRIES)
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
  const [infStep1, setInfStep1] = useState({ bio: '', country: '', state: '', phoneNumber: '', categories: [] as string[], languages: [] as string[] })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
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
      await apiService.patchOnboarding({ role: 'brand', step: 'brand.profile', patch: { profile: brandStep1 } })
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
      await apiService.patchOnboarding({
        role: 'brand',
        step: 'brand.campaigns',
        patch: {
          campaigns: {
            campaignTypes: brandStep2.campaignTypes,
            targetAudience: {
              ageRanges: brandStep2.ageRanges,
              genders: brandStep2.genders,
              location: brandStep2.location,
            },
            creatorCategories: brandStep2.creatorCategories,
            objectives: brandStep2.objectives,
          },
        },
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
      await apiService.patchOnboarding({
        role: 'brand',
        step: 'brand.scale',
        patch: {
          scale: {
            budgetRange: brandStep3.budgetRange,
            companySize: brandStep3.companySize,
            timeline: brandStep3.timeline,
            frequency: brandStep3.frequency,
            currency: 'INR',
            // Web's payments step sets this to trigger server-side terms
            // acceptance (service.Patch: scale.termsAccepted → AcceptTerms).
            termsAccepted: true,
          },
        },
      })
      await apiService.completeOnboarding('brand')
      await fetchCurrentUser()
      Alert.alert('Welcome aboard!', 'Your brand profile is set up. Manage billing from the web dashboard to launch campaigns.', [
        { text: 'Go to Dashboard', onPress: () => navigation?.navigate('Dashboard') },
      ])
    } catch (e) {
      handleApiError(e, 'Failed to complete onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Enable photo library access to add a profile photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })
    if (result.canceled || !result.assets[0]?.base64) return
    const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`
    setUploadingAvatar(true)
    try {
      // Same endpoint the Profile screen uses — persists avatar_key server-side.
      const res = await apiService.uploadProfileImage(base64)
      setAvatarUrl(res?.url || res?.data?.url || res?.image || base64)
    } catch (e) {
      handleApiError(e, 'Failed to upload photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleInfStep1 = async () => {
    if (!infStep1.bio.trim() || infStep1.bio.trim().length < 20) {
      Alert.alert('Bio too short', 'Tell brands about yourself (at least 20 characters).')
      return
    }
    if (!infStep1.country.trim()) {
      Alert.alert('Location', 'Select your country.')
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
      // profile patch upserts catalog.influencer_profile on the backend —
      // without it /bids returns 403 "influencer profile required".
      // Field keys mirror the web wizard's buildPatch (onboarding-api.ts).
      await apiService.patchOnboarding({
        role: 'influencer',
        step: 'influencer.profile',
        patch: {
          profile: {
            name: user?.name || '',
            bio: infStep1.bio,
            country: infStep1.country,
            state: infStep1.state,
            categories: infStep1.categories,
            languages: infStep1.languages,
            phone: infStep1.phoneNumber || undefined,
          },
        },
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
      await apiService.patchOnboarding({
        role: 'influencer',
        step: 'influencer.socials',
        patch: {
          socials: {
            instagram: infStep2.instagram || undefined,
            youtube: infStep2.youtube || undefined,
            tiktok: infStep2.tiktok || undefined,
          },
        },
      })
      await apiService.completeOnboarding('influencer')
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

  const renderAvatarPicker = () => (
    <View style={styles.avatarWrap}>
      <Pressable style={styles.avatar} onPress={pickAvatar} disabled={uploadingAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
        ) : (
          <Ionicons name="person" size={40} color={colors.textSubtle} />
        )}
        <View style={styles.avatarEdit}>
          {uploadingAvatar ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Ionicons name="pencil" size={13} color={colors.bg} />
          )}
        </View>
      </Pressable>
      <Text style={styles.avatarHint}>{avatarUrl ? 'Tap to change photo' : 'Add a profile photo'}</Text>
    </View>
  )

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
        {renderChips(campaignTypes.map(t => t.label), brandStep2.campaignTypes, (v) => setBrandStep2({ ...brandStep2, campaignTypes: toggle(brandStep2.campaignTypes, v) }))}

        <SectionLabel label="Target Age Ranges *" />
        {renderChips(AGE_RANGES, brandStep2.ageRanges, (v) => setBrandStep2({ ...brandStep2, ageRanges: toggle(brandStep2.ageRanges, v) }))}

        <SectionLabel label="Target Genders *" />
        {renderChips(GENDERS, brandStep2.genders, (v) => setBrandStep2({ ...brandStep2, genders: toggle(brandStep2.genders, v) }))}

        <SectionLabel label="Target Location" />
        <Input value={brandStep2.location} onChangeText={(v) => setBrandStep2({ ...brandStep2, location: v })} placeholder="e.g. All India" />

        <SectionLabel label="Creator Categories *" />
        {renderChips(categories, brandStep2.creatorCategories, (v) => setBrandStep2({ ...brandStep2, creatorCategories: toggle(brandStep2.creatorCategories, v) }))}

        <SectionLabel label="Objectives *" />
        {renderChips(objectives.map(o => o.label), brandStep2.objectives, (v) => setBrandStep2({ ...brandStep2, objectives: toggle(brandStep2.objectives, v) }))}

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
    const countryOptions = (countries.length > 0
      ? countries.map((c) => c.label)
      : FALLBACK_COUNTRIES
    ).map((label) => ({ label, value: label }))
    const languageOptions = languages.map((l) => ({ label: l.label, value: l.slug }))
    const categoryOptions = categories.map((label) => ({ label, value: label }))
    return (
      <Wrapper>
        <Text style={styles.heading}>Tell brands about you</Text>
        <Text style={styles.subheading}>Step 1 of 2 · Creator profile</Text>
        {renderProgress()}

        {renderAvatarPicker()}

        <Input label="Bio *" value={infStep1.bio} onChangeText={(v) => setInfStep1({ ...infStep1, bio: v })} placeholder="At least 20 characters" multiline style={styles.input} />
        <Input label="Phone (optional)" value={infStep1.phoneNumber} onChangeText={(v) => setInfStep1({ ...infStep1, phoneNumber: v })} keyboardType="phone-pad" style={styles.input} />

        <SectionLabel label="Country *" />
        <MultiSearchSelect
          options={countryOptions}
          selected={infStep1.country ? [infStep1.country] : []}
          onToggle={(v) => setInfStep1({ ...infStep1, country: infStep1.country === v ? '' : v })}
          placeholder="Search country"
          single
        />
        <Input label="State" value={infStep1.state} onChangeText={(v) => setInfStep1({ ...infStep1, state: v })} placeholder="e.g. Maharashtra" style={styles.input} />

        <SectionLabel label="Categories *" />
        <MultiSearchSelect
          options={categoryOptions}
          selected={infStep1.categories}
          onToggle={(v) => setInfStep1({ ...infStep1, categories: toggle(infStep1.categories, v) })}
          placeholder="Search categories"
        />

        <SectionLabel label="Content Languages *" />
        <MultiSearchSelect
          options={languageOptions}
          selected={infStep1.languages}
          onToggle={(v) => setInfStep1({ ...infStep1, languages: toggle(infStep1.languages, v) })}
          placeholder="Search languages"
          suggestions={SUGGESTED_LANGUAGES}
        />

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

// Search-enabled multi/single select dropdown (web parity: searchable select
// fields with suggestions). Pure RN — inline expanding list under the field.
function MultiSearchSelect({
  options,
  selected,
  onToggle,
  placeholder,
  single = false,
  suggestions = [],
}: {
  options: Array<{ label: string; value: string }>
  selected: string[]
  onToggle: (value: string) => void
  placeholder: string
  single?: boolean
  suggestions?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label)
  // Suggestion chips resolve to the option's value (slug) so selection state
  // stays consistent with rows picked from the list.
  const suggested = suggestions
    .map((s) => options.find((o) => o.value === s || o.label === s))
    .filter((o): o is { label: string; value: string } => !!o && !selected.includes(o.value))

  return (
    <View style={ss.wrap}>
      {selectedLabels.length > 0 && !open && (
        <View style={ss.chipRow}>
          {selectedLabels.map((label) => (
            <View key={label} style={ss.chip}>
              <Text style={ss.chipText}>{label}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable style={ss.field} onPress={() => setOpen(!open)}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text
          style={[ss.fieldText, selectedLabels.length === 0 && ss.fieldPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open && (
        <View style={ss.dropdown}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Type to filter..."
            placeholderTextColor={colors.textSubtle}
            style={ss.search}
          />
          {suggested.length > 0 && q === '' && (
            <View style={ss.suggestRow}>
              <Text style={ss.suggestLabel}>Suggested</Text>
              <View style={ss.suggestChips}>
                {suggested.map((o) => (
                  <TouchableOpacity key={o.value} style={ss.suggestChip} onPress={() => onToggle(o.value)}>
                    <Text style={ss.suggestChipText}>+ {o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <ScrollView style={ss.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.length === 0 && <Text style={ss.empty}>No matches</Text>}
            {filtered.map((o) => {
              const isSel = selected.includes(o.value)
              return (
                <TouchableOpacity
                  key={o.value}
                  style={[ss.row, isSel && ss.rowSel]}
                  onPress={() => {
                    onToggle(o.value)
                    if (single) setOpen(false)
                  }}
                >
                  <Text style={[ss.rowText, isSel && ss.rowTextSel]}>{o.label}</Text>
                  {isSel && <Ionicons name="checkmark" size={18} color={colors.neon} />}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          <TouchableOpacity
            style={ss.doneBtn}
            onPress={() => {
              setOpen(false)
              setQuery('')
            }}
          >
            <Text style={ss.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const ss = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: {
    backgroundColor: colors.neonSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.neon, fontSize: 13, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  fieldText: { flex: 1, color: colors.text, fontSize: 15 },
  fieldPlaceholder: { color: colors.textSubtle },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  search: {
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestRow: { paddingHorizontal: 14, paddingTop: 10 },
  suggestLabel: { color: colors.textSubtle, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  suggestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestChip: {
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestChipText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  list: { maxHeight: 220 },
  empty: { color: colors.textSubtle, fontSize: 13, padding: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowSel: { backgroundColor: colors.neonSoft },
  rowText: { color: colors.text, fontSize: 15 },
  rowTextSel: { color: colors.neon, fontWeight: '600' },
  doneBtn: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  doneText: { color: colors.neon, fontSize: 14, fontWeight: '700' },
})

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
  avatarWrap: { alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  avatarHint: { color: colors.textSubtle, fontSize: 12, marginTop: 6 },
})
