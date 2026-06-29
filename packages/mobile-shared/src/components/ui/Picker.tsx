import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../../constants'
import { Modal } from './Modal'

interface PickerOption {
  label: string
  value: string
}

interface PickerProps {
  label?: string
  placeholder?: string
  options: PickerOption[]
  selectedValue?: string
  onValueChange: (value: string) => void
  error?: string
}

export function Picker({ label, placeholder = 'Select an option', options, selectedValue, onValueChange, error }: PickerProps) {
  const [modalVisible, setModalVisible] = useState(false)
  const selectedOption = options.find((o) => o.value === selectedValue)
  const displayText = selectedOption ? selectedOption.label : placeholder

  const handleSelect = (value: string) => {
    onValueChange(value)
    setModalVisible(false)
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.picker, error && styles.errorBorder]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="combobox"
        accessibilityLabel={label || placeholder}
        accessibilityValue={{ text: displayText }}
      >
        <Text style={[styles.pickerText, !selectedValue && styles.placeholderText]} numberOfLines={1}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={label || 'Select'}>
        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isSelected = selectedValue === option.value
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, isSelected && styles.selectedOption]}
                onPress={() => handleSelect(option.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  pickerText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  optionsContainer: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedOption: {
    backgroundColor: `${colors.primary}12`,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: '600',
  },
})
