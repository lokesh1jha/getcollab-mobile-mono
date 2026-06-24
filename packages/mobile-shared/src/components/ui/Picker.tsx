import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
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

export function Picker({ 
  label, 
  placeholder = 'Select an option', 
  options, 
  selectedValue, 
  onValueChange,
  error
}: PickerProps) {
  const [modalVisible, setModalVisible] = useState(false)

  const selectedOption = options.find(option => option.value === selectedValue)
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
      >
        <Text style={[styles.pickerText, !selectedValue && styles.placeholderText]}>
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={label || 'Select Option'}
      >
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                selectedValue === option.value && styles.selectedOption
              ]}
              onPress={() => handleSelect(option.value)}
            >
              <Text style={[
                styles.optionText,
                selectedValue === option.value && styles.selectedOptionText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
    paddingVertical: spacing.sm,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  arrow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  optionsContainer: {
    maxHeight: 300,
  },
  option: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedOption: {
    backgroundColor: `${colors.primary}10`, // Hex color with alpha transparency
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedOptionText: {
    color: colors.primary,
    fontWeight: '600',
  },
})