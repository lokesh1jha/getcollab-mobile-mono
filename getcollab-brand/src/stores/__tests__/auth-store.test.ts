import { useAuthStore } from '../auth-store'
import apiService from '@shared/services/api'

jest.mock('../../services/notification-service', () => ({
  notificationService: {
    unregisterPushToken: jest.fn(() => Promise.resolve()),
    cleanup: jest.fn(),
  },
}))

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    signin: jest.fn(),
    signup: jest.fn(),
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn(),
    setToken: jest.fn(() => Promise.resolve()),
    setRefreshToken: jest.fn(() => Promise.resolve()),
    clearTokens: jest.fn(() => Promise.resolve()),
  },
}))

const mockApi = apiService as jest.Mocked<typeof apiService>

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
    jest.clearAllMocks()
  })

  it('signIn stores user on success', async () => {
    mockApi.signin.mockResolvedValueOnce({
      user: { id: '1', name: 'Alice', email: 'a@a.com', role: 'brand' },
      token: 'tok',
      refreshToken: 'ref',
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
})
