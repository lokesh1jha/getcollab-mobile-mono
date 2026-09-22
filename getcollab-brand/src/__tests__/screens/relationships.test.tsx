import { apiService } from '@shared/services/api'
import RelationshipsScreen from '../../app/(main)/brand/relationships'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = {
    getRelationships: jest.fn(),
    searchRelationships: jest.fn(),
    createRelationship: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

const RELATIONSHIP = {
  id: 'r1',
  status: 'active',
  otherParty: { id: 'u1', name: 'Priya Nair' },
  totalCollaborations: 3,
}

describe('RelationshipsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getRelationships.mockResolvedValue({ relationships: [RELATIONSHIP] })
  })

  it('lists relationships with status and collaboration count', async () => {
    renderScreen(RelationshipsScreen)

    expect(await screen.findByText('Priya Nair')).toBeOnTheScreen()
    expect(screen.getByText('Active')).toBeOnTheScreen()
    expect(screen.getByText('3 collaborations')).toBeOnTheScreen()
  })

  it('opens the detail screen for the tapped relationship', async () => {
    const { navigation } = renderScreen(RelationshipsScreen)

    fireEvent.press(await screen.findByText('Priya Nair'))

    expect(navigation.navigate).toHaveBeenCalledWith('RelationshipDetail', { id: 'r1' })
  })

  it('shows the empty state with a call to action when there are none', async () => {
    api.getRelationships.mockResolvedValue({ relationships: [] })
    renderScreen(RelationshipsScreen)

    expect(await screen.findByText('No relationships yet')).toBeOnTheScreen()
    expect(screen.getByText('Add relationship')).toBeOnTheScreen()
  })

  it('filters the visible list client-side as the user types', async () => {
    api.getRelationships.mockResolvedValue({
      relationships: [
        RELATIONSHIP,
        { id: 'r2', status: 'pending', otherParty: { id: 'u2', name: 'Arjun Rao' }, totalCollaborations: 0 },
      ],
    })
    renderScreen(RelationshipsScreen)
    await screen.findByText('Priya Nair')

    fireEvent.changeText(screen.getByPlaceholderText('Search relationships...'), 'arjun')

    await waitFor(() => expect(screen.queryByText('Priya Nair')).not.toBeOnTheScreen())
    expect(screen.getByText('Arjun Rao')).toBeOnTheScreen()
  })
})
