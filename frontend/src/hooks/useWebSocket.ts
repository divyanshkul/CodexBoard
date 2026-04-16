"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  AgentLog,
  PlanStep,
  ReviewResult,
  Ticket,
  TicketAction,
  TicketOutputs,
  WSMessage,
} from "../lib/types";
import { api } from "../lib/api";
import { mockWS } from "../mock/mockWebSocket";

function isTicket(value: unknown): value is Ticket {
  return Boolean(value) && typeof value === "object" && "id" in (value as Ticket);
}

function mapOutputUpdate(
  outputType: unknown,
  outputs: unknown
): Partial<TicketOutputs> | null {
  if (!outputs || typeof outputs !== "object") {
    return null;
  }

  switch (outputType) {
    case "before_screenshots":
      return { before_screenshots: outputs as Record<string, string> };
    case "after_screenshots":
      return { after_screenshots: outputs as Record<string, string> };
    case "diff_heatmaps":
      return { diff_heatmaps: outputs as Record<string, string> };
    case "video":
      return {
        video_path:
          (outputs as { video_path?: string; path?: string }).video_path ??
          (outputs as { path?: string }).path ??
          null,
      };
    case "remotion_video":
      return {
        remotion_video_path:
          (outputs as { remotion_video_path?: string; path?: string }).remotion_video_path ??
          (outputs as { path?: string }).path ??
          null,
      };
    case "markdown":
      return {
        markdown_path:
          (outputs as { markdown_path?: string; path?: string }).markdown_path ??
          (outputs as { path?: string }).path ??
          null,
      };
    case "pdf":
      return {
        pdf_path:
          (outputs as { pdf_path?: string; path?: string }).pdf_path ??
          (outputs as { path?: string }).path ??
          null,
      };
    default:
      return null;
  }
}

export function mapWSMessageToActions(msg: WSMessage): TicketAction[] {
  switch (msg.type) {
    case "ticket_status_changed":
      if (isTicket(msg.data.ticket)) {
        return [{ type: "UPDATE_TICKET", ticket: msg.data.ticket }];
      }
      if (typeof msg.data.status === "string") {
        return [
          {
            type: "UPDATE_STATUS",
            ticket_id: msg.ticket_id,
            status: msg.data.status as Ticket["status"],
          },
        ];
      }
      return [];

    case "agent_plan_updated":
      if (Array.isArray(msg.data.plan)) {
        return [
          {
            type: "UPDATE_PLAN",
            ticket_id: msg.ticket_id,
            plan: msg.data.plan as PlanStep[],
          },
        ];
      }
      return [];

    case "agent_diff_updated":
      if (typeof msg.data.diff === "string") {
        return [{ type: "UPDATE_DIFF", ticket_id: msg.ticket_id, diff: msg.data.diff }];
      }
      return [];

    case "agent_log":
      if (msg.data.log && typeof msg.data.log === "object") {
        return [{ type: "ADD_LOG", ticket_id: msg.ticket_id, log: msg.data.log as AgentLog }];
      }
      return [];

    case "review_started":
      return [{ type: "UPDATE_PHASE", ticket_id: msg.ticket_id, phase: "reviewing" }];

    case "review_complete": {
      const actions: TicketAction[] = [];
      if (msg.data.review_result && typeof msg.data.review_result === "object") {
        actions.push({
          type: "UPDATE_REVIEW",
          ticket_id: msg.ticket_id,
          review: msg.data.review_result as ReviewResult,
        });
      }
      if (isTicket(msg.data.ticket)) {
        actions.push({ type: "UPDATE_TICKET", ticket: msg.data.ticket });
      }
      return actions;
    }

    case "output_ready": {
      const outputUpdate = mapOutputUpdate(msg.data.output_type, msg.data.outputs);
      return outputUpdate
        ? [{ type: "UPDATE_OUTPUTS", ticket_id: msg.ticket_id, outputs: outputUpdate }]
        : [];
    }

    case "build_failed": {
      const actions: TicketAction[] = [];
      if (isTicket(msg.data.ticket)) {
        actions.push({ type: "UPDATE_TICKET", ticket: msg.data.ticket });
      } else {
        actions.push({ type: "UPDATE_STATUS", ticket_id: msg.ticket_id, status: "failed" });
        actions.push({ type: "UPDATE_PHASE", ticket_id: msg.ticket_id, phase: null });
      }
      actions.push({
        type: "SET_ERROR",
        ticket_id: msg.ticket_id,
        error: typeof msg.data.error === "string" ? msg.data.error : "Build failed.",
      });
      return actions;
    }

    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Reconnecting WebSocket hook
// ---------------------------------------------------------------------------

const WS_BACKOFF_BASE = 1000;
const WS_BACKOFF_MAX = 10000;

export function useWebSocket(
  dispatch: React.Dispatch<TicketAction>,
  useMock = false
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard against reconnecting after unmount
  const mountedRef = useRef(true);

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      for (const action of mapWSMessageToActions(msg)) {
        dispatch(action);
      }
    },
    [dispatch]
  );

  /** Re-fetch all tickets to sync state after a reconnect. */
  const resyncTickets = useCallback(async () => {
    try {
      const tickets = await api.getTickets();
      dispatch({ type: "SET_TICKETS", tickets });
    } catch {
      /* silent -- next reconnect will try again */
    }
  }, [dispatch]);

  /** Create a WebSocket and wire event handlers. */
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0; // reset backoff on success
      // If this is a reconnect (not the first connect), re-fetch state
      resyncTickets();
    };

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      handleMessage(msg);
    };

    ws.onclose = () => {
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose fires after onerror, so reconnect happens there
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMessage, resyncTickets]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    const delay = Math.min(WS_BACKOFF_BASE * Math.pow(2, retryRef.current), WS_BACKOFF_MAX);
    retryRef.current += 1;
    timerRef.current = setTimeout(connect, delay);
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;

    if (useMock) {
      mockWS.connect(handleMessage);
      return () => {
        mountedRef.current = false;
        mockWS.disconnect();
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMock]);

  const startBuild = useCallback(
    (ticketId: string) => {
      if (useMock) {
        mockWS.simulateBuild(ticketId);
      }
    },
    [useMock]
  );

  return { startBuild };
}
