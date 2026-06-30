import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, spacing } from '@shared/constants'
import { Button } from '@shared/components/ui/Button'
import { Input } from '@shared/components/ui/Input'
import { apiService, handleApiError } from '@shared/services/api'
import { useReferenceDataStore, selectCategories, selectRegions, selectDeliverables } from '@shared/stores/reference-data-store'
import { TrialGuard } from '../../../../../components/TrialGuard'

interface CreateCampaignScreenProps {
  navigation?: any
}

const toIsoDate = (value: string): string | null => {
  if (!value) return null
  // Accept YYYY-MM-DD or full ISO
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
      const iso = selectedDate.toISOString()
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
    if (!startIso) newErrors.startDate = 'Start date is required (YYYY-MM-DD)'
    if (!endIso) newErrors.endDate = 'End date is required (YYYY-MM-DD)'
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
          const uploadRes = await apiService.uploadImage(coverBase64)
          coverImageUrl = uploadRes?.url || uploadRes?.imageUrl || uploadRes?.data?.url
        } catch (err) {
          console.warn('Cover upload failed, continuing without image:', err)
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
      if (coverImageUrl) payload.coverImage = coverImageUrl

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
    <SafeAreaView style={styles.container}>
      <TrialGuard feature="campaign:create">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create New Campaign</Text>
          <Text style={styles.subtitle}>Fill in the details for your campaign</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverPlaceholderIcon}>📸</Text>
                <Text style={styles.coverPlaceholderText}>Tap to add a cover image</Text>
                <Text style={styles.coverPlaceholderHint}>16:9 ratio recommended</Text>
              </View>
            )}
          </TouchableOpacity>

          <Input
            label="Campaign Title"
            placeholder="Enter campaign title"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            error={errors.title}
            style={styles.input}
          />

          <View style={styles.textAreaContainer}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.textArea, errors.description && styles.errorBorder]}>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Describe your campaign (min 20 characters)..."
                placeholderTextColor={colors.textMuted}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                multiline
                numberOfLines={4}
              />
            </View>
            {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
          </View>

          <Input
            label="Budget (₹)"
            placeholder="Enter budget amount"
            value={formData.budget}
            onChangeText={(value) => handleInputChange('budget', value)}
            keyboardType="numeric"
            error={errors.budget}
            style={styles.input}
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, errors.startDate ? styles.dateButtonError : null]}
                onPress={() => setShowDatePicker('start')}
                accessibilityRole="button"
                accessibilityLabel="Pick start date"
              >
                <Text style={[styles.dateButtonText, startDateObj ? styles.dateButtonTextFilled : null]}>
                  {startDateObj ? formatDisplayDate(startDateObj) : 'Select start date'}
                </Text>
              </TouchableOpacity>
              {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}
            </View>
            <View style={styles.dateField}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, errors.endDate ? styles.dateButtonError : null]}
                onPress={() => setShowDatePicker('end')}
                accessibilityRole="button"
                accessibilityLabel="Pick end date"
              >
                <Text style={[styles.dateButtonText, endDateObj ? styles.dateButtonTextFilled : null]}>
                  {endDateObj ? formatDisplayDate(endDateObj) : 'Select end date'}
                </Text>
              </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.dateDoneButton}
              onPress={() => setShowDatePicker(null)}
              accessibilityRole="button"
              accessibilityLabel="Done picking date"
            >
              <Text style={styles.dateDoneButtonText}>Done</Text>
            </TouchableOpacity>
          )}

          <View style={styles.categoryContainer}>
            <Text style={styles.label}>Region</Text>
            <View style={styles.categoryGrid}>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[styles.categoryButton, formData.region === region && styles.selectedCategory]}
                  onPress={() => handleInputChange('region', region)}
                >
                  <Text style={[styles.categoryText, formData.region === region && styles.selectedCategoryText]}>
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.categoryContainer}>
            <Text style={styles.label}>Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    formData.categories.includes(category) && styles.selectedCategory,
                  ]}
                  onPress={() => toggleSelection('categories', category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.categories.includes(category) && styles.selectedCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.categories ? <Text style={styles.errorText}>{errors.categories}</Text> : null}
          </View>

          <View style={styles.categoryContainer}>
            <Text style={styles.label}>Deliverables</Text>
            <View style={styles.categoryGrid}>
              {deliverables.map((deliverable) => (
                <TouchableOpacity
                  key={deliverable}
                  style={[
                    styles.categoryButton,
                    formData.deliverables.includes(deliverable) && styles.selectedCategory,
                  ]}
                  onPress={() => toggleSelection('deliverables', deliverable)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.deliverables.includes(deliverable) && styles.selectedCategoryText,
                    ]}
                  >
                    {deliverable}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.deliverables ? <Text style={styles.errorText}>{errors.deliverables}</Text> : null}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Create Campaign"
            onPress={handleCreateCampaign}
            loading={loading}
            disabled={loading}
            fullWidth
          />

          <Button
            title="Cancel"
            variant="outline"
            onPress={() => navigation?.goBack()}
            style={styles.cancelButton}
            fullWidth
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      </TrialGuard>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  form: {
    marginBottom: spacing.xl,
  },
  coverPicker: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 16 / 9,
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
  coverPlaceholderIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  coverPlaceholderText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  coverPlaceholderHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    marginBottom: spacing.lg,
  },
  textAreaContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  textAreaInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dateField: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategory: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: colors.white,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  dateButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateButtonError: {
    borderColor: colors.error,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  dateButtonTextFilled: {
    color: colors.text,
  },
  dateDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  dateDoneButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
})
