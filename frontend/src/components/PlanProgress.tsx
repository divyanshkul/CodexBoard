"use client";

import { PlanStep } from "../lib/types";
import { Check, Circle, Loader2 } from "lucide-react";

export function PlanProgress({ steps }: { steps: PlanStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        No plan available yet
      </div>
    );
  }

  const completed = steps.filter((s) => s.status === "completed").length;

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 bg-border-divider rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completed / steps.length) * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <span className="text-[11px] text-text-muted tabular-nums">
          {completed}/{steps.length}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-0.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded">
            <div className="mt-0.5 flex-shrink-0">
              {step.status === "completed" ? (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "var(--status-done-bg)" }}
                >
                  <Check
                    size={10}
                    style={{ color: "var(--status-done)" }}
                    strokeWidth={2.5}
                  />
                </div>
              ) : step.status === "inProgress" ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ color: "var(--status-in-progress)" }}
                />
              ) : (
                <Circle size={16} style={{ color: "var(--border-card)" }} />
              )}
            </div>
            <span
              className={`text-[13px] leading-snug ${
                step.status === "completed"
                  ? "text-text-muted line-through"
                  : step.status === "inProgress"
                    ? "text-text-primary font-medium"
                    : "text-text-secondary"
              }`}
            >
              {step.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
