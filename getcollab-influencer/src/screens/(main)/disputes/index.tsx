import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, RefreshControl, Image, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, spacing } from '@shared/constants'
import { Card, Button } from '@shared/components/ui'
import apiService, { handleApiError } from '@shared/services/api'

interface Dispute {
  id: string
  campaignId: string | null
  reason: string
  description: string
  status: 'open' | 'resolved' | 'dismissed'
  resolution?: string
  createdAt: string
  campaign?: {
    title: string
  }
}

interface DisputesScreenProps {
  navigation?: any
}

interface AttachmentDraft {
  uri: string
  base64: string
  uploading: boolean
  url?: string
}

export default function DisputesScreen({ navigation }: DisputesScreenProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ reason: '', description: '', campaignId: '' })
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchDisputes = useCallback(async () => {
    try {
      const response = await apiService.getDisputes()
      const list = response?.data || response?.disputes || (Array.isArray(response) ? response : [])
      setDisputes(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Error fetching disputes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchDisputes()
    }, [fetchDisputes])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDisputes()
    setRefreshing(false)
  }

  const pickAttachment = async () => {
    if (attachments.length >= 5) {
      Alert.alert('Limit reached', 'You can attach up to 5 images per dispute.')
      return
    }
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable photo library access in settings.')
      return
    }
    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to read image data')
        return
      }
      const draft: AttachmentDraft = {
        uri: asset.uri,
        base64: `data:image/jpeg;base64,${asset.base64}`,
        uploading: true,
      }
      setAttachments((prev) => [...prev, draft])

      try {
        const response = await apiService.uploadImage(draft.base64)
        const url = response?.url || response?.imageUrl || response?.data?.url
        setAttachments((prev) =>
          prev.map((a) => (a.uri === draft.uri ? { ...a, uploading: false, url } : a))
        )
      } catch (err) {
        setAttachments((prev) => prev.filter((a) => a.uri !== draft.uri))
        handleApiError(err, 'Upload failed')
      }
    } catch (err) {
      console.error('Failed to pick image:', err)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const removeAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri))
  }

  const resetForm = () => {
    setFormData({ reason: '', description: '', campaignId: '' })
    setAttachments([])
    setShowForm(false)
  }

  const handleSubmitDispute = async () => {
    if (!formData.reason.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in reason and description.')
      return
    }
    if (attachments.some((a) => a.uploading)) {
      Alert.alert('Hold on', 'Wait for attachments to finish uploading.')
      return
    }

    const uploadedUrls = attachments.filter((a) => a.url).map((a) => a.url!)
    const descriptionWithEvidence = uploadedUrls.length
      ? `${formData.description.trim()}\n\nEvidence:\n${uploadedUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
      : formData.description.trim()

    setSubmitting(true)
    try {
      await apiService.createDispute({
        reason: formData.reason.trim(),
        description: descriptionWithEvidence,
        campaignId: formData.campaignId.trim() || undefined,
      })
      Alert.alert('Success', 'Dispute filed successfully. Our team will review it.')
      resetForm()
      fetchDisputes()
    } catch (err: any) {
      handleApiError(err, 'Failed to submit dispute. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return colors.success
      case 'dismissed':
        return colors.textMuted
      default:
        return colors.warning
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'Resolved'
      case 'dismissed':
        return 'Dismissed'
      default:
        return 'Open'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filteredDisputes = statusFilter === 'all' ? disputes : disputes.filter((d) => d.status === statusFilter)

  const renderDisputeItem = ({ item }: { item: Dispute }) => (
    <Card style={styles.disputeCard}>
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeReason}>{item.reason}</Text>
          <Text style={styles.disputeCampaign}>{item.campaign?.title || 'General Dispute'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.disputeDescription} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.disputeFooter}>
        <Text style={styles.disputeDate}>{formatDate(item.createdAt)}</Text>
        {item.resolution && (
          <View style={styles.resolutionContainer}>
            <Text style={styles.resolutionLabel}>Resolution:</Text>
            <Text style={styles.resolutionText} numberOfLines={2}>
              {item.resolution}
            </Text>
          </View>
        )}
      </View>
    </Card>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No disputes found</Text>
      <Text style={styles.emptySubtext}>You haven't filed any disputes yet</Text>
    </View>
  )

  if (loading && !refreshing) {
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
      <FlatList
        data={filteredDisputes}
        renderItem={renderDisputeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredDisputes.length === 0 ? styles.emptyList : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Disputes</Text>
              <Text style={styles.headerSubtitle}>Report and track issues</Text>
            </View>

            <View style={styles.filterContainer}>
              {['all', 'open', 'resolved', 'dismissed'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterButton, statusFilter === filter && styles.filterButtonActive]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={showForm ? 'Close Form' : 'Report an Issue'}
              variant={showForm ? 'outline' : 'primary'}
              onPress={() => setShowForm(!showForm)}
              style={styles.reportButton}
            />

            {showForm && (
              <Card style={styles.formCard}>
                <Text style={styles.formTitle}>File a New Dispute</Text>

                <Text style={styles.fieldLabel}>Reason *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Payment not received"
                  placeholderTextColor={colors.textMuted}
                  value={formData.reason}
                  onChangeText={(text) => setFormData({ ...formData, reason: text })}
                />

                <Text style={styles.fieldLabel}>Campaign ID (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Related campaign ID"
                  placeholderTextColor={colors.textMuted}
                  value={formData.campaignId}
                  onChangeText={(text) => setFormData({ ...formData, campaignId: text })}
                />

                <Text style={styles.fieldLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the issue in detail (min 10 chars)..."
                  placeholderTextColor={colors.textMuted}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.fieldLabel}>Evidence (optional)</Text>
                <Text style={styles.fieldHint}>
                  Attach screenshots or photos. URLs will be added to your dispute description.
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.attachmentRow}
                  contentContainerStyle={styles.attachmentRowContent}
                >
                  {attachments.map((att) => (
                    <View key={att.uri} style={styles.attachmentItem}>
                      <Image source={{ uri: att.uri }} style={styles.attachmentImage} />
                      {att.uploading && (
                        <View style={styles.attachmentOverlay}>
                          <ActivityIndicator color={colors.white} />
                        </View>
                      )}
                      {!att.uploading && (
                        <TouchableOpacity style={styles.attachmentRemove} onPress={() => removeAttachment(att.uri)}>
                          <Text style={styles.attachmentRemoveText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {attachments.length < 5 && (
                    <TouchableOpacity style={styles.attachmentAdd} onPress={pickAttachment}>
                      <Text style={styles.attachmentAddIcon}>＋</Text>
                      <Text style={styles.attachmentAddText}>Add Image</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <View style={styles.formButtons}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={resetForm}
                    style={styles.cancelButton}
                  />
                  <Button
                    title={submitting ? 'Submitting...' : 'Submit'}
                    onPress={handleSubmitDispute}
                    disabled={submitting}
                    loading={submitting}
                    style={styles.submitButton}
                  />
                </View>
              </Card>
            )}

            {filteredDisputes.length > 0 && <Text style={styles.sectionTitle}>History</Text>}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
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
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.white,
  },
  reportButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  formCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  attachmentRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  attachmentRowContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  attachmentItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    marginRight: spacing.sm,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentRemoveText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  attachmentAdd: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  attachmentAddIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  attachmentAddText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  disputeCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  disputeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  disputeReason: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  disputeCampaign: {
    fontSize: 14,
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disputeDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  disputeDate: {
    fontSize: 12,
    color: colors.textDark,
  },
  resolutionContainer: {
    flex: 1,
    marginLeft: spacing.md,
    alignItems: 'flex-end',
  },
  resolutionLabel: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  resolutionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
})
