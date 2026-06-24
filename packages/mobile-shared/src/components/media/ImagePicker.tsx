import React, { useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native'
import * as ImagePickerLib from 'expo-image-picker'
import { colors, spacing } from '../../constants'

interface ImagePickerProps {
  onImageSelected: (uri: string) => void
  onImageUploaded?: (url: string) => void
  label?: string
  placeholder?: string
  isUploading?: boolean
  uploadProgress?: number
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelected,
  onImageUploaded,
  label = 'Select Image',
  placeholder = 'Tap to select an image',
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
      return status === 'granted'
    } catch (error) {
      console.error('Failed to request permissions:', error)
      return false
    }
  }

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please enable photo library access in settings')
      return
    }

    try {
      setIsLoading(true)
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        setSelectedImage(uri)
        onImageSelected(uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
      console.error('Image picker error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePickerLib.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable camera access in settings')
        return
      }

      setIsLoading(true)
      const result = await ImagePickerLib.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        setSelectedImage(uri)
        onImageSelected(uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo')
      console.error('Camera error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const showImageSourceOptions = () => {
    Alert.alert(
      'Select Image Source',
      'Choose where to get your image from',
      [
        {
          text: 'Camera',
          onPress: pickImageFromCamera,
        },
        {
          text: 'Photo Library',
          onPress: pickImageFromLibrary,
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        onPress={showImageSourceOptions}
        disabled={isLoading || isUploading}
        style={[styles.picker, isLoading && styles.disabled]}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholder}>{placeholder}</Text>
          </View>
        )}
      </TouchableOpacity>

      {isUploading && (
        <View style={styles.uploadProgress}>
          <View
            style={[
              styles.progressBar,
              { width: `${uploadProgress}%` },
            ]}
          />
          <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  picker: {
    aspectRatio: 4 / 3,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  disabled: {
    opacity: 0.5,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  uploadProgress: {
    marginTop: spacing.md,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
})
