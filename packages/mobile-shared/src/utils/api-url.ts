import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'

function getDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost

  if (!hostUri) return null
  const host = hostUri.split(':')[0]
  return host || null
}

function replaceLocalhost(url: string, host: string): string {
  return url.replace('localhost', host).replace('127.0.0.1', host)
}

/** Rewrite localhost so simulators/emulators/devices can reach the dev machine. */
export function resolveApiBaseUrl(url: string): string {
  if (!__DEV__) return url

  if (process.env.EXPO_PUBLIC_USE_LOCALHOST === 'true') {
    return url
  }

  const isLocalhost = /:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)
  if (!isLocalhost) return url

  // iOS simulator: localhost already maps to the Mac host.
  if (Platform.OS === 'ios' && !Device.isDevice) {
    return url
  }

  // Android emulator: Metro's LAN IP is often unreachable; 10.0.2.2 is the host loopback alias.
  if (Platform.OS === 'android' && !Device.isDevice) {
    return replaceLocalhost(url, '10.0.2.2')
  }

  // Physical devices: use the same host Metro connected with.
  const devHost = getDevHost()
  if (devHost) {
    return replaceLocalhost(url, devHost)
  }

  if (Platform.OS === 'android') {
    return replaceLocalhost(url, '10.0.2.2')
  }

  return url
}
