import * as Notifications from 'expo-notifications'
import { createNavigationContainerRef } from '@react-navigation/native'
import apiService from './api'

export const navigationRef = createNavigationContainerRef<any>()

function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params)
  }
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

class NotificationService {
  private pushToken: string | null = null
  private notificationSubscription: { remove: () => void } | null = null
  private responseSubscription: { remove: () => void } | null = null

  /**
   * Initialize notifications and request permissions on first launch
   */
  async initialize(): Promise<void> {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync()

      if (status !== 'granted') {
        console.warn('Notification permission not granted')
        return
      }

      // Get push token
      const token = await this.getPushToken()

      if (token) {
        this.pushToken = token
        console.log('Push token obtained:', token)

        // Register push token with backend
        await this.registerPushToken(token)
      }

      // Set up notification listeners
      this.setupListeners()
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
    }
  }

  /**
   * Set up notification listeners
   */
   private setupListeners(): void {
     // Listen for notifications when app is in foreground
     this.notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
       console.log('Notification received:', notification)
     })

     // Listen for notification taps
     this.responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
       console.log('Notification tapped:', response.notification)
       // Handle navigation or actions based on notification data
       this.handleNotificationTap(response.notification)
     })
   }

   /**
    * Get the current push token
    */
   private async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync()
      return token.data
    } catch (error) {
      console.error('Failed to get push token:', error)
      return null
    }
  }

  /**
   * Register push token with backend
   */
  private async registerPushToken(token: string): Promise<void> {
    try {
      await apiService.post('/notifications/subscribe', {
        endpoint: token, // Using Expo token as endpoint for now
        keys: {
          op: 'expo', // Placeholder for backend compliance
          auth: 'expo',   // Placeholder for backend compliance
        },
      })
      console.log('Push token registered with backend')
    } catch (error) {
      console.error('Failed to register push token:', error)
    }
  }

  /**
   * Handle notification tap/response
   */
  private handleNotificationTap(notification: Notifications.Notification): void {
    const data = (notification.request.content.data || {}) as Record<string, any>

    if (data.type === 'chat' && data.roomId) {
      navigate('ChatDetail', { id: data.roomId, roomId: data.roomId, chat: data.chat })
    } else if (data.type === 'campaign' && data.campaignId) {
      navigate('CampaignDetails', { id: data.campaignId })
    } else if (data.type === 'bid' && data.bidId) {
      navigate('Bids', { bidId: data.bidId })
    } else if (data.type === 'subscription') {
      navigate('Subscription')
    }
  }

  /**
   * Unregister push token and clean up listeners
   */
  async unregisterPushToken(): Promise<void> {
    try {
      if (this.pushToken) {
        await apiService.delete(`/notifications/subscribe?endpoint=${this.pushToken}`)
        this.pushToken = null
        console.log('Push token unregistered')
      }
    } catch (error) {
      console.error('Failed to unregister push token:', error)
    }
  }

  /**
   * Remove all notification listeners (call on logout/app cleanup)
   */
  cleanup(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove()
      this.notificationSubscription = null
    }
    if (this.responseSubscription) {
      this.responseSubscription.remove()
      this.responseSubscription = null
    }
  }

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: data || {},
        },
        trigger: { type: 'time' as any, seconds: 1 },
      })
    } catch (error) {
      console.error('Failed to send local notification:', error)
    }
  }
}

export const notificationService = new NotificationService()
