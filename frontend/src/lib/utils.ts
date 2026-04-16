import { TicketStatus } from "./types";

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; column: string; color: string }
> = {
  todo: { label: "Todo", column: "Todo", color: "var(--status-todo)" },
  in_progress: {
    label: "In Progress",
    column: "In Progress",
    color: "var(--status-in-progress)",
  },
  review: { label: "In Review", column: "In Review", color: "var(--status-review)" },
  done: { label: "Done", column: "Done", color: "var(--status-done)" },
  failed: { label: "Failed", column: "Failed", color: "var(--status-failed)" },
};

export const COLUMN_ORDER: TicketStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
];

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
