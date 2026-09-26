import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { apiService, handleApiError } from '../../services/api'
import type { PanelTheme } from './DeliverablesPanel'

export type LegalField = 'legalName' | 'addressLine' | 'city' | 'state' | 'postalCode'

const LABELS: Record<LegalField, string> = {
  legalName: 'Legal name',
  addressLine: 'Address',
  city: 'City',
  state: 'State',
  postalCode: 'PIN code',
}
const FIELDS: LegalField[] = ['legalName', 'addressLine', 'city', 'state', 'postalCode']

/**
 * Asks for the legal name and address the deal agreement names this user by.
 * The agreement can't be signed without them; saving regenerates its text so
 * the user reads the final version before signing.
 */
export function LegalDetailsForm({ dealId, missing, theme, onSaved }: {
  dealId: string
  missing: LegalField[]
  theme: PanelTheme
  onSaved: () => void
}) {
  const s = styles(theme)
  const [form, setForm] = useState<Record<LegalField, string>>({ legalName: '', addressLine: '', city: '', state: '', postalCode: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiService.getLegalDetails().then((d) => d && setForm((f) => ({ ...f, ...d }))).catch(() => {})
  }, [])

  const save = async () => {
    setBusy(true)
    try {
      await apiService.saveLegalDetails(form)
      await apiService.refreshDealContract(dealId)
      onSaved()
    } catch (e) {
      handleApiError(e, "Couldn't save your details")
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={s.box}>
      <Text style={s.notice}>
        Please fill these to proceed: {missing.map((k) => LABELS[k].toLowerCase()).join(', ')}. The agreement names you by them.
      </Text>
      {FIELDS.map((k) => (
        <TextInput
          key={k}
          value={form[k]}
          onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))}
          placeholder={k === 'legalName' ? 'Legal name (as on your PAN)' : LABELS[k]}
          placeholderTextColor={theme.textSubtle}
          keyboardType={k === 'postalCode' ? 'number-pad' : 'default'}
          maxLength={k === 'postalCode' ? 6 : undefined}
          accessibilityLabel={LABELS[k]}
          style={s.input}
        />
      ))}
      <Pressable onPress={save} disabled={busy} style={({ pressed }) => [s.primary, (pressed || busy) && { opacity: 0.6 }]}>
        <Text style={s.primaryText}>{busy ? 'Saving…' : 'Save and update the agreement'}</Text>
      </Pressable>
    </View>
  )
}

const styles = (t: PanelTheme) =>
  StyleSheet.create({
    box: { gap: 8, backgroundColor: t.elevated, borderRadius: 12, padding: 12 },
    notice: { color: t.text, fontSize: 12, borderWidth: 1, borderColor: t.warning, borderRadius: 12, padding: 10 },
    input: { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 12, padding: 12, color: t.text },
    primary: { alignSelf: 'flex-start', backgroundColor: t.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    primaryText: { color: '#000', fontWeight: '800' },
  })
