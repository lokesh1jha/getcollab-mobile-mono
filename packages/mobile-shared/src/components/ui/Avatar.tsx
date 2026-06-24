import React from 'react'
import { View, Image, Text, StyleSheet, ImageStyle, StyleProp, ViewStyle } from 'react-native'
import { colors, borderRadius } from '../../constants'

interface AvatarProps {
  uri?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  style?: StyleProp<ImageStyle>
}

const SIZES = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
}

const FONT_SIZES = {
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 'md', style }) => {
  const dimension = SIZES[size]
  const fontSize = FONT_SIZES[size]

  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return names[0].substring(0, 2).toUpperCase()
  }

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.avatar,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
          style,
        ]}
      />
    )
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.placeholder,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{name ? getInitials(name) : '?'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.surfaceLight,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  initials: {
    color: colors.white,
    fontWeight: '600',
  },
})
