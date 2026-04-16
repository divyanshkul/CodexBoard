"use client";

import { Ticket } from "../lib/types";
import { formatRelativeTime, formatDuration } from "../lib/utils";
import { Clock, GitBranch, Play, MoreHorizontal, RotateCcw, AlertTriangle, CheckCircle2, Circle, MessageSquare } from "lucide-react";

function countChangedFiles(diff: string | null): number {
  if (!diff) {
    return 0;
  }
  return diff.split("\n").filter((line) => line.startsWith("diff --git ")).length;
}

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
  const changedFiles = countChangedFiles(ticket.agent_diff);
  const activeStep = ticket.agent_plan?.find((step) => step.status === "inProgress")?.step;
  const passCount = ticket.review_result?.criteria_results.filter((criterion) => criterion.status === "pass").length ?? 0;
  const totalCriteria = ticket.review_result?.criteria_results.length ?? 0;
  const repoLabel = ticket.target_repo.split("/").filter(Boolean).pop() ?? ticket.target_repo;

  // Compute plan progress for in_progress tickets
  const planProgress =
    ticket.agent_plan && ticket.agent_plan.length > 0
      ? ticket.agent_plan.filter((s) => s.status === "completed").length /
        ticket.agent_plan.length
      : 0;

  return (
    <div
      onClick={onClick}
      draggable={Boolean(onDragStart)}
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
            {(ticket.status === "todo" || ticket.status === "failed") && onStartBuild && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartBuild();
                }}
                className="p-1 rounded-md hover:bg-[var(--accent-bg)] text-text-muted hover:text-accent transition-all duration-100"
                title={ticket.status === "failed" ? "Retry build" : "Start build"}
              >
                {ticket.status === "failed" ? (
                  <RotateCcw size={12} />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
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
            {repoLabel}
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

          {/* Retry badge (visible when rebuilding after rejection) */}
          {ticket.rejection_feedback && ticket.status === "in_progress" && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-[2px] rounded tracking-wide uppercase"
              style={{
                background: "var(--status-failed-bg)",
                color: "var(--status-failed)",
              }}
              title={ticket.rejection_feedback}
            >
              <RotateCcw size={8} strokeWidth={2.5} />
              Retry
            </span>
          )}

          {ticket.status === "in_progress" && changedFiles > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-[2px] rounded tracking-wide uppercase bg-[var(--accent-bg)] text-accent">
              {changedFiles} file{changedFiles === 1 ? "" : "s"}
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

        {ticket.status === "in_progress" && ticket.rejection_feedback && (
          <div className="mt-2.5 rounded-md border px-2.5 py-2" style={{ borderColor: "var(--status-failed)", background: "var(--status-failed-bg)" }}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--status-failed)" }}>
              <MessageSquare size={11} />
              Rebuilding with feedback
            </div>
            <div className="mt-1 text-[11px] text-text-secondary line-clamp-2">
              {ticket.rejection_feedback}
            </div>
          </div>
        )}

        {ticket.status === "in_progress" && activeStep && (
          <div className="mt-2.5 rounded-md bg-[var(--status-in-progress-bg)] px-2 py-1.5 text-[11px] text-[var(--status-in-progress)]">
            Live plan: {activeStep}
          </div>
        )}

        {(ticket.status === "review" || ticket.status === "done") && ticket.review_result && (
          <div className="mt-2.5 rounded-md border border-border-divider px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary">
              <CheckCircle2 size={12} style={{ color: "var(--status-review)" }} />
              Review ready
            </div>
            <div className="mt-1 text-[11px] text-text-secondary">
              {ticket.review_result.summary || `${passCount}/${totalCriteria} criteria passed`}
            </div>
          </div>
        )}

        {ticket.status === "failed" && (
          <div className="mt-2.5 rounded-md border px-2.5 py-2" style={{ borderColor: "var(--status-failed)", background: "var(--status-failed-bg)" }}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--status-failed)" }}>
              <AlertTriangle size={12} />
              Build failed
            </div>
            <div className="mt-1 text-[11px] text-text-secondary line-clamp-2">
              {ticket.last_error || "The build ended in an error state. Open the ticket to retry."}
            </div>
          </div>
        )}

        {ticket.status === "failed" && onStartBuild && (
          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-text-muted">
            <Circle size={8} fill="currentColor" />
            Retry available
          </div>
        )}
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
