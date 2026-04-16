"use client";

import { useState, useCallback } from "react";
import { Ticket, TicketStatus } from "../lib/types";
import { TicketCard } from "./TicketCard";
import { StatusIcon } from "./StatusIcon";
import { STATUS_CONFIG } from "../lib/utils";
import { Plus, MoreHorizontal } from "lucide-react";

interface ColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStartBuild?: (ticketId: string) => void;
  onCreateClick?: () => void;
  onDropTicket?: (ticketId: string, newStatus: TicketStatus) => void;
  draggingTicketId: string | null;
  onDragStart?: (ticketId: string) => void;
  onDragEnd?: () => void;
}

export function Column({
  status,
  tickets,
  onTicketClick,
  onStartBuild,
  onCreateClick,
  onDropTicket,
  draggingTicketId,
  onDragStart,
  onDragEnd,
}: ColumnProps) {
  const config = STATUS_CONFIG[status];
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const ticketId = e.dataTransfer.getData("text/plain");
      if (ticketId && onDropTicket) {
        onDropTicket(ticketId, status);
      }
    },
    [onDropTicket, status]
  );

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 transition-colors duration-150 ${
        dragOver ? "drop-target-active" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} size={15} />
          <span className="text-[13px] font-semibold text-text-primary tracking-[-0.01em]">
            {config.column}
          </span>
          <span
            className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-full"
            style={{
              background: "var(--border-divider)",
              color: "var(--text-muted)",
            }}
          >
            {tickets.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {status === "todo" && onCreateClick && (
            <button
              onClick={onCreateClick}
              className="p-1 rounded-md hover:bg-[var(--accent-bg)] text-text-muted hover:text-accent transition-all duration-100 focus-ring"
              title="Add ticket"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          )}
          <button className="p-1 rounded-md hover:bg-[var(--status-todo-bg)] text-text-faint hover:text-text-muted transition-all duration-100">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-[6px] column-scroll overflow-y-auto flex-1 px-2 pb-4">
        {tickets.map((ticket, i) => (
          <div
            key={ticket.id}
            className={`animate-slide-up animate-stagger-${Math.min(i + 1, 4)}`}
          >
            <TicketCard
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
              onStartBuild={
                status === "todo" && onStartBuild
                  ? () => onStartBuild(ticket.id)
                  : undefined
              }
              isDragging={draggingTicketId === ticket.id}
              onDragStart={(_e, id) => onDragStart?.(id)}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
              style={{ background: "var(--border-divider)" }}
            >
              <StatusIcon status={status} size={14} />
            </div>
            <p className="text-[12px] text-text-faint">No tickets</p>
          </div>
        )}

        {/* Drop zone hint when dragging over empty area */}
        {dragOver && tickets.length === 0 && (
          <div
            className="mx-1 h-12 rounded-lg border-2 border-dashed flex items-center justify-center text-[11px] font-medium animate-fade-in"
            style={{
              borderColor: "var(--accent)",
              color: "var(--accent)",
              background: "var(--accent-bg)",
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
