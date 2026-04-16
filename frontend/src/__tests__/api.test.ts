import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// We need to dynamically import after mocking
let api: typeof import('../api')

beforeEach(async () => {
  mockFetch.mockReset()
  // Re-import to get fresh module
  api = await import('../api')
})

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }
}

describe('API client', () => {
  it('listTickets calls GET /api/tickets', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    const result = await api.listTickets()
    expect(result).toEqual([])
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    )
  })

  it('createTicket calls POST /api/tickets with body', async () => {
    const ticket = { id: '123', title: 'Test', status: 'todo' }
    mockFetch.mockResolvedValueOnce(mockResponse(ticket))

    const result = await api.createTicket({
      title: 'Test',
      description: 'Desc',
      acceptance_criteria: ['Works'],
      target_repo: '/tmp/test',
      output_preferences: { screenshots: false, pixel_diff: false, video: false, markdown: false },
    })

    expect(result).toEqual(ticket)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    )
  })

  it('startBuild calls POST /api/tickets/{id}/build', async () => {
    const ticket = { id: '123', status: 'in_progress' }
    mockFetch.mockResolvedValueOnce(mockResponse(ticket))

    const result = await api.startBuild('123')
    expect(result).toEqual(ticket)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/123/build',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('approveTicket calls POST /api/tickets/{id}/approve', async () => {
    const ticket = { id: '123', status: 'done' }
    mockFetch.mockResolvedValueOnce(mockResponse(ticket))

    const result = await api.approveTicket('123')
    expect(result).toEqual(ticket)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/123/approve',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('rejectTicket calls POST /api/tickets/{id}/reject with feedback', async () => {
    const ticket = { id: '123', status: 'in_progress' }
    mockFetch.mockResolvedValueOnce(mockResponse(ticket))

    const result = await api.rejectTicket('123', 'Fix the button color')
    expect(result).toEqual(ticket)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/123/reject',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ feedback: 'Fix the button color' }),
      }),
    )
  })

  it('throws on non-2xx response with detail message', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Ticket not found' }, 404))
    await expect(api.getTicket('bad-id')).rejects.toThrow('Ticket not found')
  })

  it('outputUrl returns correct URL', () => {
    const url = api.outputUrl('abc-123', 'before/root.png')
    expect(url).toBe('/outputs/abc-123/before/root.png')
  })
})
