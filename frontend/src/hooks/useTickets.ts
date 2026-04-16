"use client";

import { useReducer, useCallback, useEffect, useState } from "react";
import { Ticket, TicketAction, TicketStatus } from "../lib/types";
import { api } from "../lib/api";
import { mockTickets } from "../mock/mockData";

export function ticketReducer(state: Ticket[], action: TicketAction): Ticket[] {
  switch (action.type) {
    case "SET_TICKETS":
      return action.tickets;

    case "ADD_TICKET":
      return [...state, action.ticket];

    case "UPDATE_TICKET":
      return state.map((t) => (t.id === action.ticket.id ? action.ticket : t));

    case "UPDATE_STATUS":
      return state.map((t) =>
        t.id === action.ticket_id ? { ...t, status: action.status } : t
      );

    case "UPDATE_PHASE":
      return state.map((t) =>
        t.id === action.ticket_id ? { ...t, current_phase: action.phase } : t
      );

    case "UPDATE_PLAN":
      return state.map((t) =>
        t.id === action.ticket_id ? { ...t, agent_plan: action.plan } : t
      );

    case "UPDATE_DIFF":
      return state.map((t) =>
        t.id === action.ticket_id ? { ...t, agent_diff: action.diff } : t
      );

    case "ADD_LOG":
      return state.map((t) =>
        t.id === action.ticket_id
          ? { ...t, agent_logs: [...t.agent_logs, action.log] }
          : t
      );

    case "UPDATE_REVIEW":
      return state.map((t) =>
        t.id === action.ticket_id ? { ...t, review_result: action.review } : t
      );

    case "UPDATE_OUTPUTS":
      return state.map((t) =>
        t.id === action.ticket_id
          ? { ...t, outputs: { ...t.outputs, ...action.outputs } }
          : t
      );

    case "SET_ERROR":
      return state.map((t) =>
        t.id === action.ticket_id ? { ...t, last_error: action.error } : t
      );

    default:
      return state;
  }
}

export function useTickets(useMock = false) {
  const [tickets, dispatch] = useReducer(ticketReducer, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (useMock) {
      dispatch({ type: "SET_TICKETS", tickets: mockTickets });
      setLoading(false);
    } else {
      api
        .getTickets()
        .then((data) => {
          dispatch({ type: "SET_TICKETS", tickets: data });
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [useMock]);

  const getByStatus = useCallback(
    (status: TicketStatus) => tickets.filter((t) => t.status === status),
    [tickets]
  );

  return { tickets, dispatch, loading, error, getByStatus };
}
