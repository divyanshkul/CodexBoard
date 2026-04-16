"use client";

import { Ticket } from "../lib/types";
import { StatusIcon } from "./StatusIcon";
import { formatRelativeTime, formatDuration } from "../lib/utils";
import { Clock, GitBranch, Play, MoreHorizontal } from "lucide-react";

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  onStartBuild?: () => void;
  onDragStart?: (e: React.DragEvent, ticketId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function TicketCard({ ticket, onClick, onStartBuild, onDragStart, onDragEnd, isDragging }: TicketCardProps) {
  const borderColor =
    ticket.status === "in_progress"
      ? "var(--status-in-progress)"
      : ticket.status === "review"
        ? "var(--status-review)"
        : ticket.status === "done"
          ? "var(--status-done)"
          : ticket.status === "failed"
            ? "var(--status-failed)"
            : undefined;

  const showLeftBorder = ticket.status !== "todo";

  // Compute plan progress for in_progress tickets
  const planProgress =
    ticket.agent_plan && ticket.agent_plan.length > 0
      ? ticket.agent_plan.filter((s) => s.status === "completed").length /
        ticket.agent_plan.length
      : 0;

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", ticket.id);
        onDragStart?.(e, ticket.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`group relative bg-card-bg border border-border-card rounded-lg cursor-grab transition-all duration-150 hover:shadow-[var(--shadow-card-hover)] focus-ring active:cursor-grabbing ${isDragging ? "opacity-40 scale-[0.97]" : ""}`}
      style={{
        boxShadow: "var(--shadow-card)",
        borderLeft: showLeftBorder
          ? `2.5px solid ${borderColor}`
          : undefined,
      }}
      tabIndex={0}
      role="button"
    >
      <div className="px-3.5 py-3">
        {/* Top row: ID + actions */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-text-muted font-mono tracking-wide">
            {ticket.id}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
            {ticket.status === "todo" && onStartBuild && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartBuild();
                }}
                className="p-1 rounded-md hover:bg-[var(--accent-bg)] text-text-muted hover:text-accent transition-all duration-100"
                title="Start build"
              >
                <Play size={12} fill="currentColor" />
              </button>
            )}
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md hover:bg-[var(--status-todo-bg)] text-text-faint hover:text-text-muted transition-all duration-100"
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="text-[13px] font-medium text-text-primary leading-[1.4] mb-2.5 tracking-[-0.01em]">
          {ticket.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Target repo */}
          <span className="inline-flex items-center gap-1 text-[11px] text-text-muted bg-[var(--border-divider)] px-1.5 py-[1px] rounded">
            <GitBranch size={9} strokeWidth={2.5} />
            {ticket.target_repo.split("/")[1]}
          </span>

          {/* Duration */}
          {ticket.build_duration_seconds !== null && (
            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted bg-[var(--border-divider)] px-1.5 py-[1px] rounded">
              <Clock size={9} strokeWidth={2.5} />
              {formatDuration(ticket.build_duration_seconds)}
            </span>
          )}

          {/* Phase badge */}
          {ticket.current_phase && ticket.status === "in_progress" && (
            <span
              className="text-[10px] font-semibold px-1.5 py-[2px] rounded tracking-wide uppercase"
              style={{
                background: "var(--status-in-progress-bg)",
                color: "var(--status-in-progress)",
              }}
            >
              {ticket.current_phase}
            </span>
          )}

          {/* Review risk */}
          {ticket.review_result && (
            <span
              className="text-[10px] font-semibold px-1.5 py-[2px] rounded tracking-wide uppercase"
              style={{
                background:
                  ticket.review_result.risk_level === "low"
                    ? "var(--status-done-bg)"
                    : ticket.review_result.risk_level === "medium"
                      ? "var(--status-in-progress-bg)"
                      : "var(--status-failed-bg)",
                color:
                  ticket.review_result.risk_level === "low"
                    ? "var(--status-done)"
                    : ticket.review_result.risk_level === "medium"
                      ? "var(--status-in-progress)"
                      : "var(--status-failed)",
              }}
            >
              {ticket.review_result.risk_level} risk
            </span>
          )}

          {/* Spacer + time */}
          <span className="text-[10px] text-text-faint ml-auto">
            {formatRelativeTime(ticket.created_at)}
          </span>
        </div>
      </div>

      {/* Micro progress bar for in_progress */}
      {ticket.status === "in_progress" && ticket.agent_plan && (
        <div className="card-progress-track">
          <div
            className="card-progress-bar"
            style={{
              width: `${planProgress * 100}%`,
              background: "var(--status-in-progress)",
            }}
          />
        </div>
      )}
    </div>
  );
}
