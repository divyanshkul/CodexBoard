"use client";

import { AgentLog } from "../lib/types";
import {
  MessageSquare,
  Terminal,
  FileEdit,
  Info,
  AlertCircle,
} from "lucide-react";

const LOG_ICONS: Record<AgentLog["type"], typeof Info> = {
  agent_message: MessageSquare,
  command: Terminal,
  file_change: FileEdit,
  info: Info,
  error: AlertCircle,
};

const LOG_CLASSES: Record<AgentLog["type"], string> = {
  agent_message: "",
  command: "log-command",
  file_change: "log-file-change",
  info: "log-info",
  error: "log-error",
};

export function AgentLogFeed({ logs }: { logs: AgentLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        No logs yet
      </div>
    );
  }

  return (
    <div className="space-y-0.5 font-mono">
      {logs.map((log, i) => {
        const Icon = LOG_ICONS[log.type];
        return (
          <div
            key={i}
            className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-[var(--status-todo-bg)] transition-colors animate-slide-up"
          >
            <Icon
              size={13}
              className={`mt-0.5 flex-shrink-0 ${LOG_CLASSES[log.type]}`}
            />
            <div className="min-w-0 flex-1">
              <span className={`text-[12px] ${LOG_CLASSES[log.type]}`}>
                {log.message}
              </span>
            </div>
            <span className="text-[10px] text-text-muted flex-shrink-0 tabular-nums">
              {new Date(log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
