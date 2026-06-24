import { useChatStore } from '../chat-store'

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(() => Promise.resolve('tok')),
    getBaseUrl: jest.fn(() => 'http://localhost:3000/api/v1'),
    getChatRooms: jest.fn(),
    getChatMessages: jest.fn(),
    sendChatMessage: jest.fn(),
    uploadChatImage: jest.fn(),
    uploadImage: jest.fn(),
  },
}))

const apiService = require('../../services/api').default

describe('chat-store', () => {
  beforeEach(() => {
    useChatStore.getState().reset()
    jest.clearAllMocks()
  })

  it('addMessage appends to the current list', () => {
    useChatStore.getState().addMessage({
      id: 'm1',
      content: 'hi',
      senderId: 'u1',
      roomId: 'r1',
      createdAt: new Date().toISOString(),
    })
    expect(useChatStore.getState().messages).toHaveLength(1)
  })

  it('markRoomRead clears the unread count for that room', () => {
    useChatStore.setState({ unreadByRoom: { r1: 3, r2: 1 } })
    useChatStore.getState().markRoomRead('r1')
    expect(useChatStore.getState().unreadByRoom).toEqual({ r2: 1 })
  })

  it('totalUnread sums across rooms', () => {
    useChatStore.setState({ unreadByRoom: { r1: 2, r2: 5 } })
    expect(useChatStore.getState().totalUnread()).toBe(7)
  })

  it('sendImage uploads then dispatches an image message', async () => {
    apiService.uploadChatImage.mockResolvedValueOnce({ url: 'https://cdn/x.jpg' })
    apiService.sendChatMessage.mockResolvedValueOnce({
      id: 'm2',
      content: 'https://cdn/x.jpg',
      senderId: 'u1',
      roomId: 'r1',
      createdAt: new Date().toISOString(),
      type: 'image',
    })

    await useChatStore.getState().sendImage('r1', 'data:image/jpeg;base64,xxxx')
    expect(apiService.uploadChatImage).toHaveBeenCalled()
    expect(apiService.sendChatMessage).toHaveBeenCalledWith('r1', 'https://cdn/x.jpg', 'image')
    expect(useChatStore.getState().messages).toHaveLength(1)
  })
})
