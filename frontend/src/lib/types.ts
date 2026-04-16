export type TicketStatus = "todo" | "in_progress" | "review" | "done" | "failed";

export type PlanStepStatus = "pending" | "inProgress" | "completed";

export interface PlanStep {
  step: string;
  status: PlanStepStatus;
}

export interface CriterionResult {
  criterion: string;
  status: "pass" | "fail" | "unknown";
  explanation: string;
}

export interface ReviewResult {
  criteria_results: CriterionResult[];
  summary: string;
  raw_review_text: string;
  files_changed: number;
  risk_level: "low" | "medium" | "high";
}

export interface OutputPreferences {
  screenshots: boolean;
  pixel_diff: boolean;
  video: boolean;
  markdown: boolean;
}

export interface TicketOutputs {
  before_screenshots: Record<string, string>;
  after_screenshots: Record<string, string>;
  diff_heatmaps: Record<string, string>;
  video_path: string | null;
  remotion_video_path: string | null;
  markdown_path: string | null;
}

export interface AgentLog {
  timestamp: string;
  type: "agent_message" | "command" | "file_change" | "info" | "error";
  message: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  target_repo: string;
  output_preferences: OutputPreferences;
  status: TicketStatus;
  created_at: string;
  build_started_at: string | null;
  build_completed_at: string | null;
  build_duration_seconds: number | null;
  rejection_feedback: string | null;
  last_error?: string | null;
  agent_plan: PlanStep[] | null;
  agent_diff: string | null;
  agent_logs: AgentLog[];
  review_result: ReviewResult | null;
  outputs: TicketOutputs;
  current_phase: string | null;
  codex_thread_id: string | null;
  worktree_path: string | null;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  acceptance_criteria: string[];
  target_repo: string;
  output_preferences: OutputPreferences;
}

export interface RejectTicketRequest {
  feedback: string;
}

export interface WSMessage {
  type: string;
  ticket_id: string;
  data: Record<string, unknown>;
}

export type TicketAction =
  | { type: "SET_TICKETS"; tickets: Ticket[] }
  | { type: "ADD_TICKET"; ticket: Ticket }
  | { type: "UPDATE_TICKET"; ticket: Ticket }
  | { type: "UPDATE_STATUS"; ticket_id: string; status: TicketStatus }
  | { type: "UPDATE_PHASE"; ticket_id: string; phase: string | null }
  | { type: "UPDATE_PLAN"; ticket_id: string; plan: PlanStep[] }
  | { type: "UPDATE_DIFF"; ticket_id: string; diff: string }
  | { type: "ADD_LOG"; ticket_id: string; log: AgentLog }
  | { type: "UPDATE_REVIEW"; ticket_id: string; review: ReviewResult }
  | { type: "UPDATE_OUTPUTS"; ticket_id: string; outputs: Partial<TicketOutputs> }
  | { type: "SET_ERROR"; ticket_id: string; error: string | null };
