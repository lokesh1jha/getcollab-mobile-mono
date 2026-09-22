import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiService } from '@shared/services/api'
import BrowseCreatorsScreen from '../../app/(main)/brand/creators'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = {
    getMarketplace: jest.fn(),
    listCreatorCircles: jest.fn(),
    createCreatorCircle: jest.fn(),
    getCreatorCircleMembers: jest.fn(),
    addCreatorCircleMembers: jest.fn(),
    removeCreatorCircleMember: jest.fn(),
    createDirectChat: jest.fn(),
    // TrialGuard reads the subscription status through the generic getter.
    get: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

const CREATORS = [
  { id: 'i1', name: 'Riya', categories: ['Beauty'] },
  { id: 'i2', name: 'Arjun', categories: ['Tech'] },
]

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
  api.getMarketplace.mockResolvedValue({ influencers: CREATORS })
  api.listCreatorCircles.mockResolvedValue({ circles: [{ id: 'circle1', name: 'Saved Creators' }] })
  api.getCreatorCircleMembers.mockResolvedValue({ members: [] })
  api.get.mockResolvedValue({ status: 'TRIALING' })
})

describe('BrowseCreators — saved creators', () => {
  it('hydrates the saved list from the brand circle, not just local storage', async () => {
    // The circle already holds i1 on the server; nothing is cached on this device.
    api.getCreatorCircleMembers.mockResolvedValue({ members: [{ influencer_id: 'i1' }] })
    renderScreen(BrowseCreatorsScreen)

    expect(await screen.findByLabelText('Remove Riya from saved')).toBeOnTheScreen()
    expect(screen.getByLabelText('Save Arjun')).toBeOnTheScreen()
    expect(api.getCreatorCircleMembers).toHaveBeenCalledWith('circle1')
  })

  it('persists a newly saved creator into the circle', async () => {
    api.addCreatorCircleMembers.mockResolvedValue({ success: true })
    renderScreen(BrowseCreatorsScreen)
    await screen.findByLabelText('Save Riya')

    fireEvent.press(screen.getByLabelText('Save Riya'))

    await waitFor(() => expect(api.addCreatorCircleMembers).toHaveBeenCalledWith('circle1', ['i1']))
    expect(await screen.findByLabelText('Remove Riya from saved')).toBeOnTheScreen()
  })

  it('creates the saved circle lazily on the first bookmark', async () => {
    api.listCreatorCircles.mockResolvedValue({ circles: [] })
    api.createCreatorCircle.mockResolvedValue({ id: 'circle-new' })
    api.addCreatorCircleMembers.mockResolvedValue({ success: true })
    renderScreen(BrowseCreatorsScreen)
    await screen.findByLabelText('Save Riya')

    fireEvent.press(screen.getByLabelText('Save Riya'))

    await waitFor(() =>
      expect(api.createCreatorCircle).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Saved Creators' }),
      ),
    )
    expect(api.addCreatorCircleMembers).toHaveBeenCalledWith('circle-new', ['i1'])
  })

  it('removes a creator from the circle when unsaved', async () => {
    api.getCreatorCircleMembers.mockResolvedValue({ members: [{ influencer_id: 'i1' }] })
    api.removeCreatorCircleMember.mockResolvedValue({ success: true })
    renderScreen(BrowseCreatorsScreen)
    await screen.findByLabelText('Remove Riya from saved')

    fireEvent.press(screen.getByLabelText('Remove Riya from saved'))

    await waitFor(() => expect(api.removeCreatorCircleMember).toHaveBeenCalledWith('circle1', 'i1'))
    expect(await screen.findByLabelText('Save Riya')).toBeOnTheScreen()
  })

  it('rolls the bookmark back when the server rejects it', async () => {
    api.addCreatorCircleMembers.mockRejectedValue(new Error('offline'))
    renderScreen(BrowseCreatorsScreen)
    await screen.findByLabelText('Save Riya')

    fireEvent.press(screen.getByLabelText('Save Riya'))

    // Optimistic flip is reverted, so the button never lies about server state.
    await waitFor(() => expect(screen.getByLabelText('Save Riya')).toBeOnTheScreen())
    expect(screen.queryByLabelText('Remove Riya from saved')).not.toBeOnTheScreen()
  })

  it('still renders the saved list from the local mirror when the circle API is unreachable', async () => {
    await AsyncStorage.setItem('@getcollab:brand:saved_creators', JSON.stringify({ i2: true }))
    api.listCreatorCircles.mockRejectedValue(new Error('offline'))
    renderScreen(BrowseCreatorsScreen)

    expect(await screen.findByLabelText('Remove Arjun from saved')).toBeOnTheScreen()
  })

  it('filters to the saved creators behind the Saved chip', async () => {
    api.getCreatorCircleMembers.mockResolvedValue({ members: [{ influencer_id: 'i1' }] })
    renderScreen(BrowseCreatorsScreen)
    await screen.findByLabelText('Remove Riya from saved')

    fireEvent.press(screen.getByText('Saved'))

    await waitFor(() => expect(screen.queryByText('Arjun')).not.toBeOnTheScreen())
    expect(screen.getByText('Riya')).toBeOnTheScreen()
  })
})
