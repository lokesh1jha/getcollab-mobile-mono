import { useAuthStore } from '@shared/stores/auth-store'
import apiService from '@shared/services/api'

jest.mock('@shared/services/notification-service', () => ({
  notificationService: {
    unregisterPushToken: jest.fn(() => Promise.resolve()),
    cleanup: jest.fn(),
    initialize: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock('@shared/services/api', () => ({
  __esModule: true,
  // Real predicate, not a stub: the store's silent-UNAUTHORIZED branch hinges on
  // it, so a drifted copy here would let the test pass while the app broke.
  isUnauthorizedError: jest.requireActual('@shared/services/api').isUnauthorizedError,
  default: {
    signin: jest.fn(),
    signup: jest.fn(),
    getCurrentUser: jest.fn(),
    getToken: jest.fn(() => Promise.resolve('tok')),
    updateProfile: jest.fn(),
    setToken: jest.fn(() => Promise.resolve()),
    setRefreshToken: jest.fn(() => Promise.resolve()),
    clearTokens: jest.fn(() => Promise.resolve()),
  },
}))

import { notificationService } from '@shared/services/notification-service'

const mockApi = apiService as jest.Mocked<typeof apiService>
const mockNotif = notificationService as jest.Mocked<typeof notificationService>

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
    jest.clearAllMocks()
  })

  it('signIn stores user on success', async () => {
    // signIn persists the tokens and then re-reads the session via fetchCurrentUser,
    // so the user object comes from getCurrentUser — not from the signin response.
    mockApi.signin.mockResolvedValueOnce({ token: 'tok', refreshToken: 'ref' })
    mockApi.getCurrentUser.mockResolvedValueOnce({
      user: { id: '1', name: 'Alice', email: 'a@a.com', role: 'brand' },
    })

    await useAuthStore.getState().signIn('a@a.com', 'pw')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe('a@a.com')
    expect(mockApi.setToken).toHaveBeenCalledWith('tok')
    expect(mockApi.setRefreshToken).toHaveBeenCalledWith('ref')
  })

  it('signIn surfaces errors and stays unauthenticated', async () => {
    mockApi.signin.mockRejectedValueOnce(new Error('Bad credentials'))
    await expect(useAuthStore.getState().signIn('a@a.com', 'wrong')).rejects.toThrow('Bad credentials')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBe('Bad credentials')
  })

  it('fetchCurrentUser handles UNAUTHORIZED silently', async () => {
    mockApi.getCurrentUser.mockRejectedValueOnce(new Error('UNAUTHORIZED'))
    await useAuthStore.getState().fetchCurrentUser()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBeNull()
  })

  // signOut is the api client's onUnauthorized handler; a 401 on its own
  // push-token DELETE re-enters it. The second entry must be a no-op.
  it('signOut ignores re-entry while a sign-out is in flight', async () => {
    let reentered: Promise<void> | undefined
    mockNotif.unregisterPushToken.mockImplementationOnce(async () => {
      reentered = useAuthStore.getState().signOut()
    })
    await useAuthStore.getState().signOut()
    await reentered
    expect(mockNotif.unregisterPushToken).toHaveBeenCalledTimes(1)
    expect(mockApi.clearTokens).toHaveBeenCalledTimes(1)
  })

  it('registers push after a session is loaded', async () => {
    mockApi.getCurrentUser.mockResolvedValueOnce({ data: { id: 'u1', role: 'brand' } } as any)
    await useAuthStore.getState().fetchCurrentUser()
    expect(mockNotif.initialize).toHaveBeenCalledTimes(1)
  })
})
