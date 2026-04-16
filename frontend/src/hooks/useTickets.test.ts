import { describe, expect, it } from "vitest";
import { ticketReducer } from "./useTickets";
import { Ticket } from "../lib/types";

const baseTicket: Ticket = {
  id: "ticket-1",
  title: "Test ticket",
  description: "Desc",
  acceptance_criteria: ["One"],
  target_repo: "/tmp/repo",
  output_preferences: {
    screenshots: true,
    pixel_diff: false,
    video: false,
    markdown: true,
  },
  status: "todo",
  created_at: "2026-04-16T00:00:00Z",
  build_started_at: null,
  build_completed_at: null,
  build_duration_seconds: null,
  rejection_feedback: null,
  last_error: null,
  agent_plan: null,
  agent_diff: null,
  agent_logs: [],
  review_result: null,
  outputs: {
    before_screenshots: {},
    after_screenshots: {},
    diff_heatmaps: {},
    video_path: null,
    markdown_path: null,
  },
  current_phase: null,
  codex_thread_id: null,
  worktree_path: null,
};

describe("ticketReducer", () => {
  it("updates the full ticket on UPDATE_TICKET", () => {
    const updated = ticketReducer([baseTicket], {
      type: "UPDATE_TICKET",
      ticket: { ...baseTicket, status: "in_progress", current_phase: "building" },
    });

    expect(updated[0].status).toBe("in_progress");
    expect(updated[0].current_phase).toBe("building");
  });

  it("stores build errors for failed tickets", () => {
    const updated = ticketReducer([baseTicket], {
      type: "SET_ERROR",
      ticket_id: baseTicket.id,
      error: "Codex turn failed",
    });

    expect(updated[0].last_error).toBe("Codex turn failed");
  });
});
