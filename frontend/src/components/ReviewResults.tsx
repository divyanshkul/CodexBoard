"use client";

import { ReviewResult } from "../lib/types";
import { Check, X, HelpCircle, FileText, AlertTriangle } from "lucide-react";

export function ReviewResults({ review }: { review: ReviewResult | null }) {
  if (!review) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        No review results yet
      </div>
    );
  }

  const passCount = review.criteria_results.filter(
    (c) => c.status === "pass"
  ).length;
  const failCount = review.criteria_results.filter(
    (c) => c.status === "fail"
  ).length;
  const unknownCount = review.criteria_results.filter(
    (c) => c.status === "unknown"
  ).length;
  const total = review.criteria_results.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 p-3 rounded-md border border-border-card">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background:
                passCount === total
                  ? "var(--status-done)"
                  : "var(--status-in-progress)",
            }}
          />
          <span className="text-[13px] font-medium text-text-primary">
            {passCount > 0 || failCount > 0
              ? `${passCount}/${total} criteria passed`
              : `${unknownCount}/${total} criteria pending verification`}
          </span>
        </div>
        <span className="text-[11px] text-text-muted">|</span>
        <span className="flex items-center gap-1 text-[12px] text-text-secondary">
          <FileText size={12} />
          {review.files_changed} files changed
        </span>
        <span className="text-[11px] text-text-muted">|</span>
        <span
          className="flex items-center gap-1 text-[12px] font-medium"
          style={{
            color:
              review.risk_level === "low"
                ? "var(--status-done)"
                : review.risk_level === "medium"
                  ? "var(--status-in-progress)"
                  : "var(--status-failed)",
          }}
        >
          <AlertTriangle size={12} />
          {review.risk_level} risk
        </span>
      </div>

      {/* Criteria list */}
      <div className="space-y-1">
        {review.criteria_results.map((cr, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-2 px-2 rounded hover:bg-[var(--status-todo-bg)] transition-colors"
          >
            <div className="mt-0.5 flex-shrink-0">
              {cr.status === "pass" ? (
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
              ) : cr.status === "fail" ? (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "var(--status-failed-bg)" }}
                >
                  <X
                    size={10}
                    style={{ color: "var(--status-failed)" }}
                    strokeWidth={2.5}
                  />
                </div>
              ) : (
                <HelpCircle size={16} style={{ color: "var(--text-muted)" }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-text-primary">
                {cr.criterion}
              </p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {cr.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary text */}
      <div className="p-3 rounded-md border border-border-divider">
        <p className="text-[12px] text-text-secondary leading-relaxed">
          {review.summary}
        </p>
      </div>

      {review.raw_review_text && (
        <div className="p-3 rounded-md border border-border-divider">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-2">
            Raw review
          </div>
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-secondary font-mono">
            {review.raw_review_text}
          </pre>
        </div>
      )}
    </div>
  );
}
