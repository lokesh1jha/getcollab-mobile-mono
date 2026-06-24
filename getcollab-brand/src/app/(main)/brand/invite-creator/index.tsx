import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, spacing } from '@shared/constants'
import { Button, Card } from '@shared/components/ui'
import apiService, { handleApiError } from '@shared/services/api'

type RouteParams = RouteProp<{ inviteCreator: { creatorId: string; creator?: any } }, 'inviteCreator'>

interface Campaign {
  id: string
  title: string
  status: string
  budget?: number
}

export default function InviteCreatorScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation<any>()
  const { creatorId, creator } = route.params || ({ creatorId: '' } as any)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [message, setMessage] = useState(
    `Hi ${creator?.name || 'there'}, I'd love to collaborate with you on a campaign. Take a look and let me know!`
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const response = await apiService.getMyCampaigns()
      const list = response?.data || response?.campaigns || (Array.isArray(response) ? response : [])
      const active = (Array.isArray(list) ? list : []).filter((c: any) =>
        ['active', 'ACTIVE', 'draft', 'DRAFT'].includes(c.status)
      )
      setCampaigns(active)
      if (active.length > 0) setSelectedCampaignId(active[0].id)
    } catch (err) {
      handleApiError(err, 'Failed to load your campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!selectedCampaignId) {
      Alert.alert('Select a campaign', 'Choose a campaign to invite this creator to.')
      return
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert('Message too short', 'Add a few words about why you want to work with this creator.')
      return
    }
    setSubmitting(true)
    try {
      await apiService.inviteCreatorToCampaign(selectedCampaignId, creatorId, message.trim())
      Alert.alert('Invite sent', `${creator?.name || 'The creator'} will receive a notification.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err) {
      handleApiError(err, 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Invite to Campaign</Text>
          {creator?.name && <Text style={styles.subtitle}>Inviting {creator.name}</Text>}
        </View>

        {campaigns.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No campaigns yet</Text>
            <Text style={styles.emptySubtext}>Create a campaign first, then invite creators to it.</Text>
            <Button title="Create Campaign" onPress={() => navigation.navigate('CreateCampaign')} fullWidth style={styles.createBtn} />
          </Card>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Choose Campaign</Text>
            <View style={styles.campaignList}>
              {campaigns.map((c) => {
                const selected = selectedCampaignId === c.id
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.campaignRow, selected && styles.campaignRowSelected]}
                    onPress={() => setSelectedCampaignId(c.id)}
                  >
                    <View style={styles.campaignInfo}>
                      <Text style={styles.campaignTitle} numberOfLines={1}>
                        {c.title}
                      </Text>
                      <Text style={styles.campaignMeta}>
                        {c.status} · ₹{(c.budget || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioActive]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={styles.sectionLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Personalize your invite..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
            />

            <Button
              title={submitting ? 'Sending...' : 'Send Invite'}
              onPress={handleSendInvite}
              disabled={submitting || !selectedCampaignId}
              loading={submitting}
              fullWidth
              style={styles.sendBtn}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.primary, marginTop: spacing.xs, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  campaignList: { marginBottom: spacing.lg },
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  campaignRowSelected: { borderColor: colors.primary },
  campaignInfo: { flex: 1 },
  campaignTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  campaignMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  messageInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  sendBtn: { marginBottom: spacing.lg },
  emptyCard: { padding: spacing.lg, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  emptySubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  createBtn: {},
})
