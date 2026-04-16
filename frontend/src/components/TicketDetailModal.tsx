"use client";

import { useState } from "react";
import { Ticket } from "../lib/types";
import { StatusIcon } from "./StatusIcon";
import { PlanProgress } from "./PlanProgress";
import { DiffSummary } from "./DiffSummary";
import { ReviewResults } from "./ReviewResults";
import { AgentLogFeed } from "./AgentLogFeed";
import { ScreenshotViewer } from "./ScreenshotViewer";
import { VideoPlayer } from "./VideoPlayer";
import { MarkdownViewer } from "./MarkdownViewer";
import { STATUS_CONFIG, formatDuration, formatRelativeTime } from "../lib/utils";
import {
  X,
  Play,
  Check,
  XCircle,
  Clock,
  GitBranch,
  ExternalLink,
} from "lucide-react";

interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
  onStartBuild?: () => void;
  onApprove?: () => void;
  onReject?: (feedback: string) => void;
}

type Tab = "overview" | "plan" | "diff" | "review" | "logs" | "outputs";

export function TicketDetailModal({
  ticket,
  onClose,
  onStartBuild,
  onApprove,
  onReject,
}: TicketDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "plan", label: "Plan" },
    { id: "diff", label: "Diff" },
    { id: "review", label: "Review" },
    { id: "logs", label: "Logs" },
    { id: "outputs", label: "Outputs" },
  ];

  const config = STATUS_CONFIG[ticket.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card-bg rounded-xl w-full max-w-[680px] max-h-[85vh] flex flex-col animate-modal"
        style={{ boxShadow: "var(--shadow-modal)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-divider flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-medium text-text-muted font-mono tracking-wide">
                {ticket.id}
              </span>
              <div
                className="flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background:
                    ticket.status === "todo"
                      ? "var(--status-todo-bg)"
                      : ticket.status === "in_progress"
                        ? "var(--status-in-progress-bg)"
                        : ticket.status === "review"
                          ? "var(--status-review-bg)"
                          : ticket.status === "done"
                            ? "var(--status-done-bg)"
                            : "var(--status-failed-bg)",
                  color: config.color,
                }}
              >
                <StatusIcon status={ticket.status} size={11} />
                {config.label}
              </div>
            </div>
            <h2 className="text-[16px] font-semibold text-text-primary leading-snug tracking-[-0.02em]">
              {ticket.title}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted">
              <span className="inline-flex items-center gap-1">
                <GitBranch size={11} strokeWidth={2} />
                {ticket.target_repo}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} strokeWidth={2} />
                {formatRelativeTime(ticket.created_at)}
              </span>
              {ticket.build_duration_seconds !== null && (
                <span>
                  Built in {formatDuration(ticket.build_duration_seconds)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--status-todo-bg)] text-text-muted hover:text-text-secondary transition-all duration-100 ml-3 flex-shrink-0"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-6 border-b border-border-divider flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 py-2.5 text-[12px] font-medium transition-colors duration-100 ${
                activeTab === tab.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-2">
                  Description
                </h3>
                <p className="text-[13px] text-text-secondary leading-[1.65]">
                  {ticket.description}
                </p>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-2">
                  Acceptance criteria
                </h3>
                <ul className="space-y-1.5">
                  {ticket.acceptance_criteria.map((c, i) => {
                    const reviewCrit =
                      ticket.review_result?.criteria_results[i];
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-[13px] py-1"
                      >
                        <span className="mt-0.5 flex-shrink-0">
                          {reviewCrit?.status === "pass" ? (
                            <Check
                              size={14}
                              strokeWidth={2.5}
                              style={{ color: "var(--status-done)" }}
                            />
                          ) : reviewCrit?.status === "fail" ? (
                            <XCircle
                              size={14}
                              strokeWidth={2}
                              style={{ color: "var(--status-failed)" }}
                            />
                          ) : (
                            <div
                              className="w-3.5 h-3.5 rounded-full border-[1.5px]"
                              style={{ borderColor: "var(--border-card)" }}
                            />
                          )}
                        </span>
                        <span className="text-text-secondary leading-[1.4]">
                          {c}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {ticket.rejection_feedback && (
                <div
                  className="p-3.5 rounded-lg border"
                  style={{
                    borderColor: "var(--status-failed)",
                    background: "var(--status-failed-bg)",
                  }}
                >
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1"
                    style={{ color: "var(--status-failed)" }}
                  >
                    Rejection feedback
                  </h3>
                  <p className="text-[13px] text-text-secondary leading-[1.5]">
                    {ticket.rejection_feedback}
                  </p>
                </div>
              )}

              {ticket.last_error && ticket.status === "failed" && (
                <div
                  className="p-3.5 rounded-lg border"
                  style={{
                    borderColor: "var(--status-failed)",
                    background: "var(--status-failed-bg)",
                  }}
                >
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1"
                    style={{ color: "var(--status-failed)" }}
                  >
                    Last error
                  </h3>
                  <p className="text-[13px] text-text-secondary leading-[1.5]">
                    {ticket.last_error}
                  </p>
                </div>
              )}

              {(ticket.codex_thread_id || ticket.current_phase) && (
                <div className="grid grid-cols-2 gap-3">
                  {ticket.codex_thread_id && (
                    <div className="p-3 rounded-lg bg-[var(--accent-subtle)] border border-border-divider">
                      <div className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-semibold mb-1">
                        Thread ID
                      </div>
                      <div className="text-[12px] font-mono text-text-secondary flex items-center gap-1.5">
                        {ticket.codex_thread_id}
                        <ExternalLink
                          size={10}
                          className="text-text-faint"
                        />
                      </div>
                    </div>
                  )}
                  {ticket.current_phase && (
                    <div className="p-3 rounded-lg bg-[var(--accent-subtle)] border border-border-divider">
                      <div className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-semibold mb-1">
                        Current Phase
                      </div>
                      <div className="text-[12px] font-medium text-text-secondary capitalize">
                        {ticket.current_phase}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "plan" && (
            <PlanProgress steps={ticket.agent_plan || []} />
          )}
          {activeTab === "diff" && <DiffSummary diff={ticket.agent_diff} />}
          {activeTab === "review" && (
            <ReviewResults review={ticket.review_result} />
          )}
          {activeTab === "logs" && <AgentLogFeed logs={ticket.agent_logs} />}
          {activeTab === "outputs" && (
            <div className="space-y-6">
              <ScreenshotViewer ticketId={ticket.id} outputs={ticket.outputs} />
              {ticket.outputs.video_path && (
                <VideoPlayer ticketId={ticket.id} videoPath={ticket.outputs.video_path} />
              )}
              {ticket.outputs.markdown_path && (
                <MarkdownViewer ticketId={ticket.id} path={ticket.outputs.markdown_path} />
              )}
            </div>
          )}
        </div>

        {/* Action bar */}
        {(ticket.status === "todo" ||
          ticket.status === "review" ||
          ticket.status === "failed") && (
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-border-divider flex-shrink-0">
            {ticket.status === "todo" && onStartBuild && (
              <button
                onClick={onStartBuild}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
                style={{ background: "var(--accent)" }}
              >
                <Play size={13} fill="white" />
                Start build
              </button>
            )}

            {ticket.status === "failed" && onStartBuild && (
              <button
                onClick={onStartBuild}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
                style={{ background: "var(--accent)" }}
              >
                <Play size={13} fill="white" />
                Retry build
              </button>
            )}

            {ticket.status === "review" && (
              <>
                {showRejectInput ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={rejectFeedback}
                      onChange={(e) => setRejectFeedback(e.target.value)}
                      placeholder="Rejection reason..."
                      className="flex-1 px-3 py-2 text-[13px] border border-border-input rounded-lg bg-card-bg text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          rejectFeedback.trim() &&
                          onReject
                        ) {
                          onReject(rejectFeedback.trim());
                          setShowRejectInput(false);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (rejectFeedback.trim() && onReject) {
                          onReject(rejectFeedback.trim());
                          setShowRejectInput(false);
                        }
                      }}
                      disabled={!rejectFeedback.trim()}
                      className="px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 disabled:opacity-40 hover:brightness-110"
                      style={{ background: "var(--status-failed)" }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-2 text-[13px] text-text-secondary border border-border-card rounded-lg hover:bg-[var(--status-todo-bg)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-lg border transition-all duration-150 hover:brightness-95"
                      style={{
                        borderColor: "var(--status-failed)",
                        color: "var(--status-failed)",
                        background: "var(--status-failed-bg)",
                      }}
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                    <button
                      onClick={onApprove}
                      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
                      style={{ background: "var(--status-done)" }}
                    >
                      <Check size={13} strokeWidth={2.5} />
                      Approve
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
