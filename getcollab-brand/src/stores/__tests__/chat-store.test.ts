import { useChatStore } from '@shared/stores/chat-store'

jest.mock('@shared/services/api', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(() => Promise.resolve('tok')),
    getBaseUrl: jest.fn(() => 'http://localhost:3000/api/v1'),
    getChatRooms: jest.fn(),
    getChatMessages: jest.fn(),
    sendChatMessage: jest.fn(),
    sendChatMessageWithAttachments: jest.fn(),
    markChatRoomRead: jest.fn(() => Promise.resolve({})),
  },
  uploadMediaBlob: jest.fn(),
}))

const apiService = require('@shared/services/api').default

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
    // Read state is saved on the server (the socket event never reached it).
    expect(apiService.markChatRoomRead).toHaveBeenCalledWith('r1')
  })

  it('totalUnread sums across rooms', () => {
    useChatStore.setState({ unreadByRoom: { r1: 2, r2: 5 } })
    expect(useChatStore.getState().totalUnread()).toBe(7)
  })

  it('sendImage uploads through the media service and sends the blob id', async () => {
    const { uploadMediaBlob } = require('@shared/services/api')
    uploadMediaBlob.mockResolvedValueOnce({ id: 'b1' })
    apiService.sendChatMessageWithAttachments.mockResolvedValueOnce({
      id: 'm2',
      message: '',
      senderId: 'u1',
      createdAt: new Date().toISOString(),
      attachments: [{ blobId: 'b1' }],
    })

    await useChatStore.getState().sendImage('r1', 'data:image/jpeg;base64,xxxx')
    expect(uploadMediaBlob).toHaveBeenCalledWith(expect.objectContaining({ uri: 'data:image/jpeg;base64,xxxx', mime: 'image/jpeg' }))
    expect(apiService.sendChatMessageWithAttachments).toHaveBeenCalledWith('r1', '', ['b1'])
    expect(useChatStore.getState().messages).toHaveLength(1)
  })

  it('polls the open room and appends only messages it has not seen', async () => {
    jest.useFakeTimers()
    const m = (id: string) => ({ id, content: id, senderId: 'u2', roomId: 'r1', createdAt: new Date().toISOString() })
    apiService.getChatMessages.mockResolvedValueOnce({ messages: [m('m1')] })
    await useChatStore.getState().fetchMessages('r1')
    await useChatStore.getState().initializeSocket()

    // Newest first from the API: m2 is new, m1 is already on screen.
    apiService.getChatMessages.mockResolvedValue({ messages: [m('m2'), m('m1')] })
    await jest.advanceTimersByTimeAsync(5000)
    expect(useChatStore.getState().messages.map((x) => x.id)).toEqual(['m1', 'm2'])

    await jest.advanceTimersByTimeAsync(5000)
    expect(useChatStore.getState().messages).toHaveLength(2)

    useChatStore.getState().disconnectSocket()
    apiService.getChatMessages.mockClear()
    await jest.advanceTimersByTimeAsync(10000)
    expect(apiService.getChatMessages).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('stops polling a room once its chat screen leaves it', async () => {
    jest.useFakeTimers()
    apiService.getChatMessages.mockResolvedValue({ data: [] })
    useChatStore.setState({ activeRoomId: 'r1' })
    await useChatStore.getState().initializeSocket()

    await jest.advanceTimersByTimeAsync(5000)
    expect(apiService.getChatMessages).toHaveBeenCalledTimes(1)

    useChatStore.getState().leaveRoom('r1')
    await jest.advanceTimersByTimeAsync(15000)
    expect(apiService.getChatMessages).toHaveBeenCalledTimes(1)

    // A screen closing for an older room must not stop the newer one's poll.
    useChatStore.setState({ activeRoomId: 'r2' })
    useChatStore.getState().leaveRoom('r1')
    expect(useChatStore.getState().activeRoomId).toBe('r2')
    useChatStore.getState().disconnectSocket()
    jest.useRealTimers()
  })
})
