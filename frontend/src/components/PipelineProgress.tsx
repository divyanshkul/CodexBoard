"use client";

import { Ticket } from "../lib/types";
import { CheckCircle2, Circle, Loader2, Camera, Bot, FileSearch, Clapperboard, FileText } from "lucide-react";

/**
 * User-friendly pipeline stages. Each ticket flows through these steps.
 * The component figures out which step is active based on ticket state.
 */
interface PipelineStage {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STAGES: PipelineStage[] = [
  {
    id: "before_capture",
    label: "Capturing current state",
    description: "Taking screenshots of the app before changes",
    icon: <Camera size={14} />,
  },
  {
    id: "building",
    label: "Building feature",
    description: "AI agent is writing code and implementing the feature",
    icon: <Bot size={14} />,
  },
  {
    id: "reviewing",
    label: "Reviewing changes",
    description: "Analyzing the code to verify quality and correctness",
    icon: <FileSearch size={14} />,
  },
  {
    id: "generating_outputs",
    label: "Generating deliverables",
    description: "Creating screenshots, videos, and summary reports",
    icon: <Clapperboard size={14} />,
  },
  {
    id: "complete",
    label: "Ready for review",
    description: "All deliverables generated -- awaiting your approval",
    icon: <FileText size={14} />,
  },
];

function getStageStatus(
  stageId: string,
  ticket: Ticket
): "completed" | "active" | "pending" {
  const phase = ticket.current_phase;
  const status = ticket.status;

  // If ticket is done or in review with no active phase, everything is complete
  if (status === "done") return "completed";
  if (status === "review" && !phase) return "completed";

  const stageOrder = STAGES.map((s) => s.id);
  const currentIndex = phase ? stageOrder.indexOf(phase) : -1;
  const stageIndex = stageOrder.indexOf(stageId);

  // "complete" stage is special -- only completed when all pipeline work is truly done
  if (stageId === "complete") {
    if (status === "done") return "completed";
    if (status === "review" && !phase) return "completed";
    return "pending";
  }

  if (currentIndex === -1) {
    // No phase set -- if building, assume we're in the "building" stage
    if (status === "in_progress") {
      if (stageId === "building") return "active";
      if (stageId === "before_capture") return "completed";
      return "pending";
    }
    return "pending";
  }

  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) return "active";
  return "pending";
}

/** Compact version for the TicketCard -- shows just the active step label */
export function PipelineProgressCompact({ ticket }: { ticket: Ticket }) {
  if (ticket.status !== "in_progress" && ticket.status !== "review") {
    return null;
  }

  const activeStage = STAGES.find(
    (s) => getStageStatus(s.id, ticket) === "active"
  );

  if (!activeStage && ticket.status === "review") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--status-review)" }}>
        <CheckCircle2 size={11} strokeWidth={2.5} />
        Ready for your review
      </div>
    );
  }

  if (!activeStage) return null;

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--status-in-progress)" }}>
      <Loader2 size={11} className="animate-spin" strokeWidth={2.5} />
      {activeStage.label}
    </div>
  );
}

/** Full version for the TicketDetailModal Overview tab */
export function PipelineProgressFull({ ticket }: { ticket: Ticket }) {
  if (ticket.status === "todo" || ticket.status === "failed") {
    return null;
  }

  return (
    <div>
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-3">
        Pipeline Progress
      </h3>
      <div className="space-y-0">
        {STAGES.map((stage, index) => {
          const stageStatus = getStageStatus(stage.id, ticket);
          const isLast = index === STAGES.length - 1;

          return (
            <div key={stage.id} className="flex gap-3">
              {/* Vertical line + icon column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    stageStatus === "completed"
                      ? "bg-[var(--status-review)] text-white"
                      : stageStatus === "active"
                        ? "bg-[var(--status-in-progress)] text-white"
                        : "bg-[var(--border-divider)] text-text-faint"
                  }`}
                >
                  {stageStatus === "completed" ? (
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                  ) : stageStatus === "active" ? (
                    <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Circle size={14} strokeWidth={2} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className="w-[2px] flex-1 min-h-[20px] transition-colors duration-300"
                    style={{
                      background:
                        stageStatus === "completed"
                          ? "var(--status-review)"
                          : "var(--border-divider)",
                    }}
                  />
                )}
              </div>

              {/* Label + description */}
              <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
                <div
                  className={`text-[13px] font-semibold leading-[1.7] transition-colors duration-200 ${
                    stageStatus === "completed"
                      ? "text-text-primary"
                      : stageStatus === "active"
                        ? "text-text-primary"
                        : "text-text-faint"
                  }`}
                >
                  {stage.label}
                  {stageStatus === "completed" && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--status-review)" }}>
                      Done
                    </span>
                  )}
                  {stageStatus === "active" && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--status-in-progress)" }}>
                      In progress
                    </span>
                  )}
                </div>
                <div
                  className={`text-[12px] leading-[1.5] ${
                    stageStatus === "pending"
                      ? "text-text-faint"
                      : "text-text-muted"
                  }`}
                >
                  {stage.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
