"use client";

import { useState, useCallback } from "react";
import { Ticket, TicketStatus, CreateTicketRequest } from "../lib/types";
import { useTickets } from "../hooks/useTickets";
import { useWebSocket } from "../hooks/useWebSocket";
import { COLUMN_ORDER } from "../lib/utils";
import { Column } from "./Column";
import { CreateTicketModal } from "./CreateTicketModal";
import { TicketDetailModal } from "./TicketDetailModal";
import { api } from "../lib/api";
import {
  Plus,
  LayoutGrid,
  Loader2,
  Filter,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";

const useMockData =
  import.meta.env.VITE_USE_MOCKS === "true";

export function Board() {
  const useMock = useMockData;
  const { tickets, dispatch, loading, error, getByStatus } =
    useTickets(useMock);
  const { startBuild } = useWebSocket(dispatch, useMock);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentSelected = selectedTicket
    ? tickets.find((t) => t.id === selectedTicket.id) || null
    : null;

  const handleCreate = useCallback(
    async (data: CreateTicketRequest) => {
      setActionError(null);
      if (useMock) {
        const newTicket: Ticket = {
          id: `TKT-${String(tickets.length + 1).padStart(3, "0")}`,
          ...data,
          status: "todo",
          created_at: new Date().toISOString(),
          build_started_at: null,
          build_completed_at: null,
          build_duration_seconds: null,
          rejection_feedback: null,
          last_error: null,
          agent_plan: null,
          agent_diff: null,
          agent_logs: [],
          review_result: null,
          outputs: {
            before_screenshots: {},
            after_screenshots: {},
            diff_heatmaps: {},
            video_path: null,
            remotion_video_path: null,
            markdown_path: null,
          },
          current_phase: null,
          codex_thread_id: null,
          worktree_path: null,
        };
        dispatch({ type: "ADD_TICKET", ticket: newTicket });
      } else {
        try {
          const ticket = await api.createTicket(data);
          dispatch({ type: "ADD_TICKET", ticket });
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "Failed to create ticket.");
          return;
        }
      }
      setShowCreateModal(false);
    },
    [useMock, tickets.length, dispatch]
  );

  const handleStartBuild = useCallback(
    async (ticketId: string) => {
      setActionError(null);
      startBuild(ticketId);
      if (useMock) {
        return;
      }
      try {
        const ticket = await api.startBuild(ticketId);
        dispatch({ type: "UPDATE_TICKET", ticket });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to start build.");
      }
    },
    [dispatch, startBuild, useMock]
  );

  const handleApprove = useCallback(
    async (ticketId: string) => {
      setActionError(null);
      if (useMock) {
        dispatch({
          type: "UPDATE_STATUS",
          ticket_id: ticketId,
          status: "done",
        });
      } else {
        try {
          const ticket = await api.approveTicket(ticketId);
          dispatch({ type: "UPDATE_TICKET", ticket });
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "Failed to approve ticket.");
        }
      }
    },
    [useMock, dispatch]
  );

  const handleReject = useCallback(
    async (ticketId: string, feedback: string) => {
      setActionError(null);
      if (useMock) {
        // Build a fully-reset ticket matching real backend behavior
        const existing = tickets.find((t) => t.id === ticketId);
        if (existing) {
          const retryTicket: Ticket = {
            ...existing,
            status: "in_progress",
            rejection_feedback: feedback,
            build_started_at: new Date().toISOString(),
            build_completed_at: null,
            build_duration_seconds: null,
            agent_plan: null,
            agent_diff: null,
            agent_logs: [],
            review_result: null,
            last_error: null,
            current_phase: "building",
          };
          dispatch({ type: "UPDATE_TICKET", ticket: retryTicket });
          // Re-trigger the mock build simulation
          startBuild(ticketId);
        }
      } else {
        try {
          const ticket = await api.rejectTicket(ticketId, { feedback });
          dispatch({ type: "UPDATE_TICKET", ticket });
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "Failed to reject ticket.");
        }
      }
    },
    [useMock, tickets, dispatch, startBuild]
  );

  const handleMoveTicket = useCallback(
    (ticketId: string, newStatus: TicketStatus) => {
      if (!useMock) {
        setDraggingTicketId(null);
        return;
      }
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || ticket.status === newStatus) return;
      dispatch({
        type: "UPDATE_STATUS",
        ticket_id: ticketId,
        status: newStatus,
      });
      // If moved to in_progress, kick off the build simulation
      if (newStatus === "in_progress" && ticket.status === "todo") {
        startBuild(ticketId);
      }
      setDraggingTicketId(null);
    },
    [tickets, dispatch, startBuild]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-page-bg">
        <Loader2
          size={18}
          className="animate-spin"
          style={{ color: "var(--accent)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-page-bg">
        <div className="text-center">
          <p className="text-[14px] text-text-primary font-medium mb-1">
            Failed to load tickets
          </p>
          <p className="text-[13px] text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2.5 bg-header-bg flex-shrink-0 z-10"
        style={{ boxShadow: "var(--shadow-header)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <LayoutGrid size={13} color="white" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-semibold text-text-primary tracking-[-0.02em]">
              CodexBoard
            </span>
          </div>
          <div
            className="h-4 w-px"
            style={{ background: "var(--border-divider)" }}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-text-secondary font-medium">
              Board
            </span>
            <span className="text-[11px] text-text-faint font-medium tabular-nums">
              {tickets.length}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-text-muted hover:text-text-secondary rounded-md hover:bg-[var(--status-todo-bg)] transition-all duration-100">
            <Filter size={13} strokeWidth={2} />
            Filter
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-text-muted hover:text-text-secondary rounded-md hover:bg-[var(--status-todo-bg)] transition-all duration-100">
            <SlidersHorizontal size={13} strokeWidth={2} />
            Display
          </button>
          <div
            className="h-4 w-px"
            style={{ background: "var(--border-divider)" }}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white rounded-md transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={13} strokeWidth={2.5} />
            New ticket
          </button>
        </div>
      </header>

      {actionError && (
        <div className="px-4 py-2 border-b border-border-divider bg-[var(--status-failed-bg)] text-[12px] text-[var(--status-failed)] flex items-center gap-2">
          <AlertCircle size={14} />
          {actionError}
        </div>
      )}

      {/* Board columns — full width, evenly distributed */}
      <div className="flex-1 flex overflow-hidden">
        {COLUMN_ORDER.map((status, i) => (
          <div
            key={status}
            className="flex flex-col flex-1 min-w-0"
            style={{
              borderRight:
                i < COLUMN_ORDER.length - 1
                  ? "1px solid var(--border-column)"
                  : undefined,
            }}
          >
            <Column
              status={status}
              tickets={getByStatus(status)}
              onTicketClick={setSelectedTicket}
              onStartBuild={
                status === "todo" ? handleStartBuild : undefined
              }
              onCreateClick={
                status === "todo"
                  ? () => setShowCreateModal(true)
                  : undefined
              }
              onDropTicket={handleMoveTicket}
              draggingTicketId={draggingTicketId}
              onDragStart={setDraggingTicketId}
              onDragEnd={() => setDraggingTicketId(null)}
            />
          </div>
        ))}

        {/* Failed column — only if there are failed tickets */}
        {getByStatus("failed").length > 0 && (
          <div
            className="flex flex-col flex-1 min-w-0"
            style={{
              borderLeft: "1px solid var(--border-column)",
            }}
          >
            <Column
              status="failed"
              tickets={getByStatus("failed")}
              onTicketClick={setSelectedTicket}
              onStartBuild={handleStartBuild}
              onDropTicket={handleMoveTicket}
              draggingTicketId={draggingTicketId}
              onDragStart={setDraggingTicketId}
              onDragEnd={() => setDraggingTicketId(null)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {currentSelected && (
        <TicketDetailModal
          ticket={currentSelected}
          onClose={() => setSelectedTicket(null)}
          onStartBuild={
            currentSelected.status === "todo" ||
            currentSelected.status === "failed"
              ? () => handleStartBuild(currentSelected.id)
              : undefined
          }
          onApprove={
            currentSelected.status === "review"
              ? () => handleApprove(currentSelected.id)
              : undefined
          }
          onReject={
            currentSelected.status === "review"
              ? (feedback) => handleReject(currentSelected.id, feedback)
              : undefined
          }
        />
      )}
    </div>
  );
}
