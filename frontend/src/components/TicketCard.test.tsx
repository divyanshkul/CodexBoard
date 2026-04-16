import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketCard } from "./TicketCard";
import { Ticket } from "../lib/types";

const ticket: Ticket = {
  id: "ticket-1",
  title: "Test ticket",
  description: "Desc",
  acceptance_criteria: ["One", "Two"],
  target_repo: "/tmp/repo",
  output_preferences: {
    screenshots: false,
    pixel_diff: false,
    video: false,
    markdown: false,
  },
  status: "failed",
  created_at: "2026-04-16T00:00:00Z",
  build_started_at: null,
  build_completed_at: null,
  build_duration_seconds: null,
  rejection_feedback: null,
  last_error: "Codex turn failed",
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

describe("TicketCard", () => {
  it("renders failed ticket errors and retry affordance", () => {
    render(
      <TicketCard
        ticket={ticket}
        onClick={vi.fn()}
        onStartBuild={vi.fn()}
      />
    );

    expect(screen.getByText("Build failed")).toBeInTheDocument();
    expect(screen.getByText("Retry available")).toBeInTheDocument();
    expect(screen.getByText("Codex turn failed")).toBeInTheDocument();
  });
});
