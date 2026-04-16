import { Ticket, CreateTicketRequest, RejectTicketRequest } from "./types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  getTickets: () => request<Ticket[]>("/tickets"),

  getTicket: (id: string) => request<Ticket>(`/tickets/${id}`),

  createTicket: (data: CreateTicketRequest) =>
    request<Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  startBuild: (id: string) =>
    request<Ticket>(`/tickets/${id}/build`, { method: "POST" }),

  approveTicket: (id: string) =>
    request<Ticket>(`/tickets/${id}/approve`, { method: "POST" }),

  rejectTicket: (id: string, data: RejectTicketRequest) =>
    request<Ticket>(`/tickets/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export function resolveOutputPath(ticketId: string, path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/outputs/")) {
    return path;
  }

  if (path.startsWith("outputs/")) {
    return `/${path}`;
  }

  return `/outputs/${ticketId}/${path.replace(/^\/+/, "")}`;
}
