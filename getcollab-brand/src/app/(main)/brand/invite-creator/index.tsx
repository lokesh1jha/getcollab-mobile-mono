import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors, radius, spacing } from '@/src/theme'
import apiService, { handleApiError } from '@shared/services/api'
import { extractCampaigns } from '@shared/lib/campaign-utils'

type RouteParams = RouteProp<{ inviteCreator: { creatorId: string; creator?: any } }, 'inviteCreator'>
interface Campaign { id: string; title: string; status: string; budget?: number }

export default function InviteCreatorScreen() {
  const route = useRoute<RouteParams>()
  const navigation = useNavigation<any>()
  const { creatorId, creator } = route.params || ({ creatorId: '' } as any)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [message, setMessage] = useState(`Hi ${creator?.name || 'there'}, I'd love to collaborate with you on a campaign. Take a look and let me know!`)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadCampaigns() }, [])

  const loadCampaigns = async () => {
    try {
      const response = await apiService.getMyCampaigns()
      const list = extractCampaigns(response)
      const active = list.filter((c) => ['active', 'draft'].includes(c.status))
      setCampaigns(active)
      if (active.length > 0) setSelectedCampaignId(active[0].id)
    } catch (err) { handleApiError(err, 'Failed to load your campaigns') }
    finally { setLoading(false) }
  }

  const handleSendInvite = async () => {
    if (!selectedCampaignId) { Alert.alert('Select a campaign', 'Choose a campaign to invite this creator to.'); return }
    if (!message.trim() || message.trim().length < 10) { Alert.alert('Message too short', 'Add a few words about why you want to work with this creator.'); return }
    setSubmitting(true)
    try {
      await apiService.inviteCreatorToCampaign(selectedCampaignId, creatorId, message.trim())
      Alert.alert('Invite sent', `${creator?.name || 'The creator'} will receive a notification.`, [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err) { handleApiError(err, 'Failed to send invite') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return <SafeAreaView style={styles.root}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.neon} /></View></SafeAreaView>
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.title}>Invite to Campaign</Text>
            {creator?.name && <Text style={styles.subtitle}>Inviting <Text style={{ color: '#fff' }}>{creator.name}</Text></Text>}

            {campaigns.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: spacing.xs, textAlign: 'center' }}>No campaigns yet</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing.lg }}>Create a campaign first, then invite creators.</Text>
                <Pressable style={({ pressed }) => [styles.blueBtn, pressed && { opacity: 0.85 }]} onPress={() => navigation.navigate('CreateCampaign')}>
                  <Text style={styles.blueBtnText}>Create Campaign</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>CHOOSE CAMPAIGN</Text>
                <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
                  {campaigns.map((c) => {
                    const selected = selectedCampaignId === c.id
                    return (
                      <Pressable key={c.id} style={[styles.campaignRow, selected && styles.campaignRowSelected]} onPress={() => setSelectedCampaignId(c.id)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.campaignTitle} numberOfLines={1}>{c.title}</Text>
                          <Text style={styles.campaignMeta}>{c.status} · ₹{(c.budget || 0).toLocaleString()}</Text>
                        </View>
                        <View style={[styles.radio, selected && styles.radioActive]}>{selected && <View style={styles.radioDot} />}</View>
                      </Pressable>
                    )
                  })}
                </View>

                <Text style={styles.sectionLabel}>MESSAGE</Text>
                <View style={styles.textAreaWrap}>
                  <TextInput value={message} onChangeText={setMessage} placeholder="Personalize your invite..." placeholderTextColor={colors.textSubtle} multiline numberOfLines={5} style={styles.textArea} />
                </View>

                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]} onPress={handleSendInvite} disabled={submitting || !selectedCampaignId}>
                  <Text style={styles.primaryBtnText}>{submitting ? 'Sending...' : 'Send Invite'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </Pressable>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.8, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.xl },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm },

  campaignRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  campaignRowSelected: { borderColor: colors.blue },
  campaignTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  campaignMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },

  textAreaWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.card, marginBottom: spacing.xl },
  textArea: { color: '#fff', fontSize: 14, minHeight: 100, textAlignVertical: 'top', padding: 0 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.neon, borderRadius: radius.pill, paddingVertical: 18 },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  blueBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderRadius: radius.pill, paddingVertical: 14 },
  blueBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
})
