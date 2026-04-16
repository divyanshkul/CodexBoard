"use client";

import { TicketStatus } from "../lib/types";

export function StatusIcon({
  status,
  size = 16,
}: {
  status: TicketStatus;
  size?: number;
}) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const strokeWidth = 1.5;
  const innerR = r - strokeWidth;

  switch (status) {
    case "todo":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="none"
            stroke="var(--status-todo)"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "in_progress":
      return (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="animate-pulse-dot"
        >
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="none"
            stroke="var(--status-in-progress)"
            strokeWidth={strokeWidth}
          />
          <path
            d={`M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 0 1 ${cx + innerR} ${cy}`}
            fill="none"
            stroke="var(--status-in-progress)"
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
          />
        </svg>
      );
    case "review":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="none"
            stroke="var(--status-review)"
            strokeWidth={strokeWidth}
          />
          <path
            d={`M ${cx} ${strokeWidth} A ${innerR} ${innerR} 0 1 0 ${cx} ${size - strokeWidth}`}
            fill="var(--status-review)"
          />
        </svg>
      );
    case "done":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={innerR} fill="var(--status-done)" />
          <polyline
            points={`${size * 0.3},${size * 0.5} ${size * 0.45},${size * 0.65} ${size * 0.7},${size * 0.35}`}
            fill="none"
            stroke="white"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "failed":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={innerR} fill="var(--status-failed)" />
          <line
            x1={size * 0.35}
            y1={size * 0.35}
            x2={size * 0.65}
            y2={size * 0.65}
            stroke="white"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            x1={size * 0.65}
            y1={size * 0.35}
            x2={size * 0.35}
            y2={size * 0.65}
            stroke="white"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
