"use client";

import { useEffect, useRef, useCallback } from "react";
import { TicketAction, WSMessage } from "../lib/types";
import { mockWS } from "../mock/mockWebSocket";

export function useWebSocket(
  dispatch: React.Dispatch<TicketAction>,
  useMock = true
) {
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "status_change":
          dispatch({
            type: "UPDATE_STATUS",
            ticket_id: msg.ticket_id,
            status: msg.data.status,
          });
          break;
        case "plan_update":
          dispatch({
            type: "UPDATE_PLAN",
            ticket_id: msg.ticket_id,
            plan: msg.data.plan,
          });
          break;
        case "diff_update":
          dispatch({
            type: "UPDATE_DIFF",
            ticket_id: msg.ticket_id,
            diff: msg.data.diff,
          });
          break;
        case "log":
          dispatch({
            type: "ADD_LOG",
            ticket_id: msg.ticket_id,
            log: msg.data.log,
          });
          break;
        case "review_update":
          dispatch({
            type: "UPDATE_REVIEW",
            ticket_id: msg.ticket_id,
            review: msg.data.review,
          });
          break;
        case "outputs_update":
          dispatch({
            type: "UPDATE_OUTPUTS",
            ticket_id: msg.ticket_id,
            outputs: msg.data.outputs,
          });
          break;
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
      } else {
        // Real API call handled separately
      }
    },
    [useMock]
  );

  return { startBuild };
}
