import { Alert } from 'react-native'
import { apiService } from '@shared/services/api'
import WalletScreen from '../../app/(main)/brand/wallet'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

// The screens import `apiService` as a named export while a few older ones use the
// default export, so the double is exposed under both keys.
jest.mock('@shared/services/api', () => {
  const api = {
    fetchWalletSummary: jest.fn(),
    fetchWalletTransactions: jest.fn(),
    topUpWallet: jest.fn(),
    requestWalletRefund: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

describe('WalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.fetchWalletSummary.mockResolvedValue({ available_minor: 500000, held_minor: 200000, balance_minor: 700000 })
    api.fetchWalletTransactions.mockResolvedValue({
      transactions: [
        { id: 't1', entry_type: 'fund', amount_minor: 100000, memo: 'Initial top-up', created_at: '2026-01-05T00:00:00.000Z' },
      ],
    })
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
  })

  it('renders balances and the transaction ledger', async () => {
    renderScreen(WalletScreen)

    expect(await screen.findByText('Wallet')).toBeOnTheScreen()
    // amounts are minor units → 5,000 / 2,000 / 7,000
    expect(screen.getByText('₹5,000')).toBeOnTheScreen()
    expect(screen.getByText('₹2,000')).toBeOnTheScreen()
    expect(screen.getByText('₹7,000')).toBeOnTheScreen()

    expect(screen.getByText('Top-up / Fund')).toBeOnTheScreen()
    expect(screen.getByText('+₹1,000')).toBeOnTheScreen()
  })

  it('shows the empty state when there are no transactions', async () => {
    api.fetchWalletTransactions.mockResolvedValue({ transactions: [] })
    renderScreen(WalletScreen)

    expect(await screen.findByText('No transactions yet')).toBeOnTheScreen()
  })

  it('submits a top-up in minor units', async () => {
    api.topUpWallet.mockResolvedValue({ success: true })
    renderScreen(WalletScreen)
    await screen.findByText('Wallet')

    fireEvent.press(screen.getAllByText('Top up')[0])
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 10000'), '1500')
    // The modal confirm shares its label with the trigger — it renders last.
    fireEvent.press(screen.getAllByText('Top up')[1])

    await waitFor(() => expect(api.topUpWallet).toHaveBeenCalledTimes(1))
    expect(api.topUpWallet).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 150000, memo: 'wallet top-up' }),
    )
  })

  it('rejects a non-numeric top-up before hitting the API', async () => {
    renderScreen(WalletScreen)
    await screen.findByText('Wallet')

    fireEvent.press(screen.getAllByText('Top up')[0])
    fireEvent.press(screen.getAllByText('Top up')[1])

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Enter a valid amount')
    expect(api.topUpWallet).not.toHaveBeenCalled()
  })
})
