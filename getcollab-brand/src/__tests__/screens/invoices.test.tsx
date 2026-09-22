import { Linking } from 'react-native'
import { apiService } from '@shared/services/api'
import InvoicesScreen from '../../app/(main)/brand/invoices'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = { getInvoices: jest.fn(), downloadInvoice: jest.fn() }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

const PAID_INVOICE = {
  id: 'inv_1234567890',
  description: 'Pro plan — February',
  amount: 4999,
  status: 'paid',
  createdAt: '2026-02-10T00:00:00.000Z',
}

describe('InvoicesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getInvoices.mockResolvedValue({ invoices: [PAID_INVOICE] })
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
  })

  it('lists invoices with amount and status', async () => {
    renderScreen(InvoicesScreen)

    expect(await screen.findByText('Pro plan — February')).toBeOnTheScreen()
    expect(screen.getByText('Paid')).toBeOnTheScreen()
    expect(screen.getByText(/4,999/)).toBeOnTheScreen()
  })

  it('opens the invoice PDF in the browser rather than embedding a viewer', async () => {
    api.downloadInvoice.mockResolvedValue({ downloadUrl: 'https://cdn.getcollab.in/inv_1234567890.pdf' })
    renderScreen(InvoicesScreen)
    await screen.findByText('Pro plan — February')

    fireEvent.press(screen.getByText('Pro plan — February'))

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith('https://cdn.getcollab.in/inv_1234567890.pdf'),
    )
  })

  it('shows an empty state before the first payment', async () => {
    api.getInvoices.mockResolvedValue({ invoices: [] })
    renderScreen(InvoicesScreen)

    expect(await screen.findByText('No invoices yet')).toBeOnTheScreen()
  })
})
