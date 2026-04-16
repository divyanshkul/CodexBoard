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
    case "markdown":
      return {
        markdown_path:
          (outputs as { markdown_path?: string; path?: string }).markdown_path ??
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

export function useWebSocket(
  dispatch: React.Dispatch<TicketAction>,
  useMock = false
) {
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      for (const action of mapWSMessageToActions(msg)) {
        dispatch(action);
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (useMock) {
      mockWS.connect(handleMessage);
      return () => mockWS.disconnect();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      handleMessage(msg);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [useMock, handleMessage]);

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
