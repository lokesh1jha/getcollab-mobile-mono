import { apiService } from '@shared/services/api'
import RelationshipDetailScreen from '../../app/(main)/brand/relationships/[id]'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

// Detail screens read the id from route params, so the navigation module is
// replaced with a stable double.
jest.mock('@react-navigation/native', () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() }
  return {
    __esModule: true,
    __navigation: navigation,
    useRoute: () => ({ params: { id: 'r1' } }),
    useNavigation: () => navigation,
    useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  }
})

jest.mock('@shared/services/api', () => {
  const api = {
    getRelationship: jest.fn(),
    getRelationshipCollaborations: jest.fn(),
    getRelationshipTimeline: jest.fn(),
    createDirectChat: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>
const { __navigation: navigation } = require('@react-navigation/native')

describe('RelationshipDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getRelationship.mockResolvedValue({
      relationship: {
        id: 'r1',
        status: 'active',
        otherParty: { id: 'u1', name: 'Priya Nair' },
        totalCollaborations: 3,
        averageRating: 4.5,
        totalSpend: 12000,
      },
    })
    api.getRelationshipCollaborations.mockResolvedValue({ collaborations: [] })
    api.getRelationshipTimeline.mockResolvedValue({ timeline: [] })
  })

  it('loads the partner, status and lifetime stats', async () => {
    renderScreen(RelationshipDetailScreen)

    expect(await screen.findByText('Priya Nair')).toBeOnTheScreen()
    expect(screen.getByText('Active')).toBeOnTheScreen()
    expect(screen.getByText('Collaborations')).toBeOnTheScreen()
    expect(screen.getByText('4.5')).toBeOnTheScreen()
    expect(screen.getByText('₹12,000')).toBeOnTheScreen()
    expect(api.getRelationship).toHaveBeenCalledWith('r1')
  })

  it('opens a direct chat with the partner', async () => {
    api.createDirectChat.mockResolvedValue({ id: 'room-1' })
    renderScreen(RelationshipDetailScreen)
    await screen.findByText('Priya Nair')

    fireEvent.press(screen.getByText('Message'))

    await waitFor(() => expect(api.createDirectChat).toHaveBeenCalledWith('u1'))
    expect(navigation.navigate).toHaveBeenCalledWith('ChatDetail', { roomId: 'room-1', id: 'room-1' })
  })
})
