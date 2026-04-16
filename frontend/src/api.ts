import type { Ticket, CreateTicketRequest } from './types'

const BASE_URL = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function listTickets(): Promise<Ticket[]> {
  return request<Ticket[]>('/api/tickets')
}

export async function createTicket(req: CreateTicketRequest): Promise<Ticket> {
  return request<Ticket>('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getTicket(id: string): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${id}`)
}

export async function startBuild(id: string): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${id}/build`, { method: 'POST' })
}

export async function approveTicket(id: string): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${id}/approve`, { method: 'POST' })
}

export async function rejectTicket(id: string, feedback: string): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}

export function outputUrl(ticketId: string, path: string): string {
  return `${BASE_URL}/outputs/${ticketId}/${path}`
}
