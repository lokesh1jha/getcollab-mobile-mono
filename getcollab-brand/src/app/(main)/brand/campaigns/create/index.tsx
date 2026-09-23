import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import * as ImagePickerLib from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/src/theme'
import { apiService, handleApiError } from '@shared/services/api'
import { useReferenceDataStore, selectCategories, selectRegions, selectDeliverables } from '@shared/stores/reference-data-store'
import { TrialGuard } from '../../../../../components/TrialGuard'
import { logger } from '@shared/services/logger'

interface CreateCampaignScreenProps {
  navigation?: any
}

const toIsoDate = (value: string): string | null => {
  if (!value) return null
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = match ? new Date(`${value}T12:00:00Z`) : new Date(value)
  if (isNaN(date.getTime())) return null
  return date.toISOString()
}

export default function CreateCampaignScreen({ navigation }: CreateCampaignScreenProps) {
  const categories = useReferenceDataStore(selectCategories)
  const regions = useReferenceDataStore(selectRegions)
  const deliverables = useReferenceDataStore(selectDeliverables)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    region: '',
    budget: '',
    startDate: '',
    endDate: '',
    deliverables: [] as string[],
    categories: [] as string[],
  })
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [coverBase64, setCoverBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null)
  const [startDateObj, setStartDateObj] = useState<Date | null>(null)
  const [endDateObj, setEndDateObj] = useState<Date | null>(null)

  const formatDisplayDate = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const onDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    const field = showDatePicker
    if (!field) return

    if (event.type === 'dismissed') {
      setShowDatePicker(null)
      return
    }

    if (selectedDate) {
      if (field === 'start') {
        setStartDateObj(selectedDate)
        setFormData((prev) => ({ ...prev, startDate: selectedDate.toISOString() }))
      } else {
        setEndDateObj(selectedDate)
        setFormData((prev) => ({ ...prev, endDate: selectedDate.toISOString() }))
      }
      if (errors[field === 'start' ? 'startDate' : 'endDate']) {
        setErrors((prev) => ({ ...prev, [field === 'start' ? 'startDate' : 'endDate']: '' }))
      }
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(null)
    }
  }, [showDatePicker, errors])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const toggleSelection = (field: 'categories' | 'deliverables', value: string) => {
    setFormData((prev) => {
      const list = prev[field]
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      return { ...prev, [field]: next }
    })
  }

  const pickCoverImage = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable photo library access in settings.')
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
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      setCoverImage(asset.uri)
      if (asset.base64) {
        setCoverBase64(`data:image/jpeg;base64,${asset.base64}`)
      }
    } catch (err) {
      handleApiError(err, 'Failed to pick cover image')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim() || formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }
    if (!formData.description.trim() || formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }
    const budgetNum = Number(formData.budget)
    if (!formData.budget) {
      newErrors.budget = 'Budget is required'
    } else if (isNaN(budgetNum) || budgetNum < 0 || !Number.isInteger(budgetNum)) {
      newErrors.budget = 'Enter a valid whole-number budget'
    }
    const startIso = toIsoDate(formData.startDate)
    const endIso = toIsoDate(formData.endDate)
    if (!startIso) newErrors.startDate = 'Start date is required'
    if (!endIso) newErrors.endDate = 'End date is required'
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      newErrors.endDate = 'End date must be after start date'
    }
    if (formData.categories.length === 0) {
      newErrors.categories = 'Pick at least one category'
    }
    if (formData.deliverables.length === 0) {
      newErrors.deliverables = 'Pick at least one deliverable'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateCampaign = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      let coverImageUrl: string | undefined
      if (coverBase64) {
        try {
          const dataUri = coverBase64.startsWith('data:') ? coverBase64 : `data:image/jpeg;base64,${coverBase64}`
          coverImageUrl = await apiService.uploadCampaignCover(dataUri)
        } catch (err) {
          logger.warn('Cover upload failed, continuing without image', { error: err })
        }
      }

      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        targetCountries: ['IN'],
        budget: parseInt(formData.budget, 10),
        budgetCurrency: 'INR',
        deliverables: formData.deliverables,
        categories: formData.categories,
        startDate: toIsoDate(formData.startDate),
        endDate: toIsoDate(formData.endDate),
      }
      // The API reads featuredImage; coverImage was ignored, so no cover was saved.
      if (coverImageUrl) payload.featuredImage = coverImageUrl

      await apiService.createCampaign(payload)

      Alert.alert('Success', 'Campaign created successfully!', [
        { text: 'OK', onPress: () => navigation?.navigate('Campaigns') },
      ])
    } catch (error: any) {
      handleApiError(error, 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <TrialGuard feature="campaign:create">
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.title}>Create New Campaign</Text>
                <Text style={styles.subtitle}>Fill in the details for your campaign</Text>
              </Animated.View>

              <Pressable style={({ pressed }) => [styles.coverPicker, pressed && { opacity: 0.85 }]} onPress={pickCoverImage}>
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.coverPlaceholderText}>Tap to add a cover image</Text>
                    <Text style={styles.coverPlaceholderHint}>16:9 ratio recommended</Text>
                  </View>
                )}
              </Pressable>

              {/* Title */}
              <View style={styles.field}>
                <Text style={styles.label}>Campaign Title</Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="Enter campaign title"
                  placeholderTextColor={colors.textSubtle}
                  value={formData.title}
                  onChangeText={(v) => handleInputChange('title', v)}
                />
                {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <View style={[styles.textArea, errors.description && styles.inputError]}>
                  <TextInput
                    style={styles.textAreaInput}
                    placeholder="Describe your campaign (min 20 characters)..."
                    placeholderTextColor={colors.textSubtle}
                    value={formData.description}
                    onChangeText={(v) => handleInputChange('description', v)}
                    multiline
                    numberOfLines={4}
                  />
                </View>
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
              </View>

              {/* Budget */}
              <View style={styles.field}>
                <Text style={styles.label}>Budget (₹)</Text>
                <TextInput
                  style={[styles.input, errors.budget && styles.inputError]}
                  placeholder="Enter budget amount"
                  placeholderTextColor={colors.textSubtle}
                  value={formData.budget}
                  onChangeText={(v) => handleInputChange('budget', v)}
                  keyboardType="numeric"
                />
                {errors.budget ? <Text style={styles.errorText}>{errors.budget}</Text> : null}
              </View>

              {/* Dates */}
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.label}>Start Date</Text>
                  <Pressable
                    style={[styles.dateButton, errors.startDate && styles.inputError]}
                    onPress={() => setShowDatePicker('start')}
                  >
                    <Text style={[styles.dateButtonText, startDateObj && { color: colors.text }]}>
                      {startDateObj ? formatDisplayDate(startDateObj) : 'Select start date'}
                    </Text>
                  </Pressable>
                  {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.label}>End Date</Text>
                  <Pressable
                    style={[styles.dateButton, errors.endDate && styles.inputError]}
                    onPress={() => setShowDatePicker('end')}
                  >
                    <Text style={[styles.dateButtonText, endDateObj && { color: colors.text }]}>
                      {endDateObj ? formatDisplayDate(endDateObj) : 'Select end date'}
                    </Text>
                  </Pressable>
                  {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={showDatePicker === 'start' ? (startDateObj || new Date()) : (endDateObj || new Date())}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={showDatePicker === 'end' && startDateObj ? startDateObj : undefined}
                  onChange={onDateChange}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <Pressable style={styles.dateDoneButton} onPress={() => setShowDatePicker(null)}>
                  <Text style={styles.dateDoneButtonText}>Done</Text>
                </Pressable>
              )}

              {/* Region */}
              <View style={styles.field}>
                <Text style={styles.label}>Region</Text>
                <View style={styles.chipGrid}>
                  {regions.map((region) => (
                    <Pressable
                      key={region}
                      style={({ pressed }) => [
                        styles.chip,
                        formData.region === region && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => handleInputChange('region', region)}
                    >
                      <Text style={[styles.chipText, formData.region === region && styles.chipTextActive]}>
                        {region}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Categories */}
              <View style={styles.field}>
                <Text style={styles.label}>Categories</Text>
                <View style={styles.chipGrid}>
                  {categories.map((category) => (
                    <Pressable
                      key={category}
                      style={({ pressed }) => [
                        styles.chip,
                        formData.categories.includes(category) && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => toggleSelection('categories', category)}
                    >
                      <Text style={[styles.chipText, formData.categories.includes(category) && styles.chipTextActive]}>
                        {category}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {errors.categories ? <Text style={styles.errorText}>{errors.categories}</Text> : null}
              </View>

              {/* Deliverables */}
              <View style={styles.field}>
                <Text style={styles.label}>Deliverables</Text>
                <View style={styles.chipGrid}>
                  {deliverables.map((deliverable) => (
                    <Pressable
                      key={deliverable}
                      style={({ pressed }) => [
                        styles.chip,
                        formData.deliverables.includes(deliverable) && styles.chipActive,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => toggleSelection('deliverables', deliverable)}
                    >
                      <Text style={[styles.chipText, formData.deliverables.includes(deliverable) && styles.chipTextActive]}>
                        {deliverable}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {errors.deliverables ? <Text style={styles.errorText}>{errors.deliverables}</Text> : null}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleCreateCampaign}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Campaign</Text>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => navigation?.goBack()}
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TrialGuard>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xl },

  coverPicker: {
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 16 / 9,
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  coverPlaceholderText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  coverPlaceholderHint: { fontSize: 12, color: colors.textMuted },

  field: { marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.bg,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: spacing.xs },

  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },
  textAreaInput: {
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 0,
  },

  dateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  dateField: { flex: 1 },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  dateButtonText: { fontSize: 14, color: colors.textSubtle },
  dateDoneButton: { alignSelf: 'flex-end', paddingVertical: spacing.sm },
  dateDoneButtonText: { fontSize: 14, color: colors.blue, fontWeight: '600' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.neon, borderColor: colors.neon },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  chipTextActive: { color: '#000', fontWeight: '600' },

  actions: { gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.xxxl },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neon,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  secondaryBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
})
