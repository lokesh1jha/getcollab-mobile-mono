import React, { useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Animated, 
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@shared/stores/auth-store'

const { width } = Dimensions.get('window')

export default function LandingScreen({ navigation }: any) {
  const [logoAnim] = React.useState(new Animated.Value(0))
  const [contentAnim] = React.useState(new Animated.Value(0))
  const [buttonAnim] = React.useState(new Animated.Value(0))
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Main')
    }
  }, [isAuthenticated, navigation])

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  })

  const contentOpacity = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const buttonScale = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#101022" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Background Accents */}
        <View style={styles.bgAccent1} />
        <View style={styles.bgAccent2} />

        {/* Header Navigation */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Image 
                source={require('../../../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>GetCollab</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signInBtn}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Hero Image Card */}
          <Animated.View
            style={[
              styles.heroCard,
              { transform: [{ scale: logoScale }] }
            ]}
          >
            <View style={styles.heroImageArea}>
              <Text style={styles.heroPlaceholder}>🎬</Text>
            </View>

            {/* Creator Avatars */}
            <View style={styles.creatorsStack}>
              <View style={[styles.creatorAvatar, { backgroundColor: '#FF6B6B' }]}>
                <Text style={styles.creatorInitial}>A</Text>
              </View>
              <View style={[styles.creatorAvatar, { backgroundColor: '#4ECDC4', marginLeft: -12 }]}>
                <Text style={styles.creatorInitial}>B</Text>
              </View>
              <View style={[styles.creatorAvatar, { backgroundColor: '#45B7D1', marginLeft: -12 }]}>
                <Text style={styles.creatorInitial}>C</Text>
              </View>
              <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>50k+</Text>
              </View>
            </View>

            {/* Community Badge */}
            <Text style={styles.communityText}>ACTIVE COMMUNITY</Text>
          </Animated.View>

          {/* Main Title and Subtitle */}
          <Animated.View style={{ opacity: contentOpacity }}>
            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle}>Scale Your</Text>
              <Text style={styles.titleHighlight}>Brand</Text>
            </View>

            <Text style={styles.subtitle}>
              Connect with Elite Creators and expand your reach.
            </Text>
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsContainer,
            { transform: [{ scale: buttonScale }] }
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButtonLarge}
            onPress={() => navigation.navigate('SignUp', { selectedRole: 'brand' })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonTextLarge}>I'm a Brand</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButtonLarge}
            onPress={() => navigation.navigate('SignUp', { selectedRole: 'influencer' })}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonTextLarge}>I'm an Influencer</Text>
            <Text style={styles.boltIcon}>⚡</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Premium Platform Badge */}
        <View style={styles.premiumBadge}>
          <View style={styles.badgeLine} />
          <Text style={styles.badgeText}>PREMIUM PLATFORM</Text>
          <View style={styles.badgeLine} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101022',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  bgAccent1: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(19, 19, 236, 0.25)',
  },
  bgAccent2: {
    position: 'absolute',
    bottom: '5%',
    left: '-10%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 245, 160, 0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 20,
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1313EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signInBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1313EC',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    width: width - 48,
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginBottom: 40,
  },
  heroImageArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroPlaceholder: {
    fontSize: 100,
    opacity: 0.3,
  },
  creatorsStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#101022',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  creatorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#101022',
    backgroundColor: '#1313EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  creatorBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  communityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00F5A0',
    letterSpacing: 1.5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 52,
  },
  titleHighlight: {
    fontSize: 44,
    fontWeight: '700',
    color: '#1313EC',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  primaryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1313EC',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#1313EC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonTextLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  buttonArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 16,
  },
  secondaryButtonTextLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  boltIcon: {
    fontSize: 16,
    color: '#00F5A0',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  badgeLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 2,
  },
})