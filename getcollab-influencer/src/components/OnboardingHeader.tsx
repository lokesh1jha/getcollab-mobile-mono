import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '@/src/theme'

interface Props {
  currentStep: number
  totalSteps?: number
  onBack?: () => void
  onSkip?: () => void
  showSkip?: boolean
  showBack?: boolean
}

const OnboardingHeader = ({
  currentStep,
  totalSteps = 3,
  onBack,
  onSkip,
  showSkip = true,
  showBack = true,
}: Props) => {
  const progress = (currentStep / totalSteps) * 100

  return (
    <>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%` },
          ]}
        />
      </View>

      {/* Header */}
      <View style={styles.container}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.side}>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#5E6AD2"
          />
        </TouchableOpacity>
        ) : (
          <View style={styles.side} />
        )}
        {/* <Text style={styles.title}>
          Step {currentStep} of {totalSteps}
        </Text> */}

        {showSkip ? (
          <TouchableOpacity
            onPress={onSkip}
            style={styles.side}
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.side} />
        )}
      </View>
    </>
  )
}

export default OnboardingHeader

const styles = StyleSheet.create({
  progressContainer: {
    height: 4,
    width: '100%',
   
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5E6AD2',
    borderRadius: 2,
  },
  container: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  side: {
    width: 60,
  },
  title: {
  color: colors.text,fontWeight: '600', fontSize: 16, marginTop: spacing.sm
  },
  skip: {
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '600',
    color: '#5E6AD2',
    letterSpacing: 1,
  },
})