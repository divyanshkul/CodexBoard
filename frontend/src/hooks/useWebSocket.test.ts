import { describe, expect, it } from "vitest";
import { mapWSMessageToActions } from "./useWebSocket";
import { WSMessage } from "../lib/types";

describe("mapWSMessageToActions", () => {
  it("maps ticket_status_changed to UPDATE_TICKET when a full ticket is present", () => {
    const message: WSMessage = {
      type: "ticket_status_changed",
      ticket_id: "ticket-1",
      data: {
        status: "in_progress",
        ticket: {
          id: "ticket-1",
          title: "Test",
          description: "Desc",
          acceptance_criteria: [],
          target_repo: "/tmp/repo",
          output_preferences: {
            screenshots: false,
            pixel_diff: false,
            video: false,
            markdown: false,
          },
          status: "in_progress",
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
          current_phase: "building",
          codex_thread_id: null,
          worktree_path: null,
        },
      },
    };

    const actions = mapWSMessageToActions(message);
    expect(actions).toEqual([{ type: "UPDATE_TICKET", ticket: message.data.ticket }]);
  });

  it("maps output_ready events to the matching output field", () => {
    const actions = mapWSMessageToActions({
      type: "output_ready",
      ticket_id: "ticket-1",
      data: {
        output_type: "video",
        outputs: { video_path: "video/walkthrough.mp4" },
      },
    });

    expect(actions).toEqual([
      {
        type: "UPDATE_OUTPUTS",
        ticket_id: "ticket-1",
        outputs: { video_path: "video/walkthrough.mp4" },
      },
    ]);
  });

  it("maps build_failed to an error action", () => {
    const actions = mapWSMessageToActions({
      type: "build_failed",
      ticket_id: "ticket-1",
      data: {
        error: "Context window exceeded",
      },
    });

    expect(actions).toContainEqual({
      type: "SET_ERROR",
      ticket_id: "ticket-1",
      error: "Context window exceeded",
    });
  });
});
