import { WSMessage, PlanStep, AgentLog, ReviewResult } from "../lib/types";

type WSHandler = (msg: WSMessage) => void;

export class MockWebSocket {
  private handler: WSHandler | null = null;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  connect(onMessage: WSHandler) {
    this.handler = onMessage;
  }

  disconnect() {
    this.handler = null;
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
    this.running = false;
  }

  simulateBuild(ticketId: string) {
    if (this.running) return;
    this.running = true;

    const send = (msg: WSMessage) => {
      if (this.handler) this.handler(msg);
    };

    const schedule = (fn: () => void, ms: number) => {
      this.timeouts.push(setTimeout(fn, ms));
    };

    // t=0s: Status -> in_progress
    schedule(() => {
      send({
        type: "ticket_status_changed",
        ticket_id: ticketId,
        data: { status: "in_progress" },
      });
    }, 500);

    // t=2s: Plan appears
    const planSteps: PlanStep[] = [
      { step: "Analyze codebase and understand patterns", status: "pending" },
      { step: "Create component structure", status: "pending" },
      { step: "Implement core logic", status: "pending" },
      { step: "Add styling and animations", status: "pending" },
      { step: "Write tests", status: "pending" },
    ];

    schedule(() => {
      send({
        type: "agent_plan_updated",
        ticket_id: ticketId,
        data: { plan: planSteps },
      });
    }, 2000);

    // t=4s: Step 1 in progress + log
    schedule(() => {
      planSteps[0].status = "inProgress";
      send({
        type: "agent_plan_updated",
        ticket_id: ticketId,
        data: { plan: [...planSteps] },
      });
      send({
        type: "agent_log",
        ticket_id: ticketId,
        data: {
          log: {
            timestamp: new Date().toISOString(),
            type: "agent_message",
            message: "Analyzing existing codebase patterns...",
          } as AgentLog,
        },
      });
    }, 4000);

    // t=7s: Step 1 done, step 2 in progress
    schedule(() => {
      planSteps[0].status = "completed";
      planSteps[1].status = "inProgress";
      send({
        type: "agent_plan_updated",
        ticket_id: ticketId,
        data: { plan: [...planSteps] },
      });
      send({
        type: "agent_log",
        ticket_id: ticketId,
        data: {
          log: {
            timestamp: new Date().toISOString(),
            type: "command",
            message: "mkdir -p src/components/feature",
          } as AgentLog,
        },
      });
    }, 7000);

    // t=10s: Step 2 done, step 3 in progress + diff starts
    schedule(() => {
      planSteps[1].status = "completed";
      planSteps[2].status = "inProgress";
      send({
        type: "agent_plan_updated",
        ticket_id: ticketId,
        data: { plan: [...planSteps] },
      });
      send({
        type: "agent_log",
        ticket_id: ticketId,
        data: {
          log: {
            timestamp: new Date().toISOString(),
            type: "file_change",
            message: "Created src/components/feature/index.tsx",
          } as AgentLog,
        },
      });
      send({
        type: "agent_diff_updated",
        ticket_id: ticketId,
        data: {
          diff: `diff --git a/src/components/feature/index.tsx b/src/components/feature/index.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/feature/index.tsx
@@ -0,0 +1,15 @@
+import { useState } from 'react';
+
+export function Feature() {
+  const [active, setActive] = useState(false);
+
+  return (
+    <div className="feature-container">
+      <button onClick={() => setActive(!active)}>
+        Toggle Feature
+      </button>
+      {active && <div className="feature-content">Active!</div>}
+    </div>
+  );
+}`,
        },
      });
    }, 10000);

    // t=14s: Steps 3-4 done, step 5 in progress
    schedule(() => {
      planSteps[2].status = "completed";
      planSteps[3].status = "completed";
      planSteps[4].status = "inProgress";
      send({
        type: "agent_plan_updated",
        ticket_id: ticketId,
        data: { plan: [...planSteps] },
      });
      send({
        type: "agent_log",
        ticket_id: ticketId,
        data: {
          log: {
            timestamp: new Date().toISOString(),
            type: "command",
            message: "npm run test -- --run src/components/feature/",
          } as AgentLog,
        },
      });
    }, 14000);

    // t=18s: All done, move to review
    schedule(() => {
      planSteps[4].status = "completed";
      send({
        type: "agent_plan_updated",
        ticket_id: ticketId,
        data: { plan: [...planSteps] },
      });
      send({
        type: "ticket_status_changed",
        ticket_id: ticketId,
        data: { status: "review" },
      });
      send({
        type: "review_started",
        ticket_id: ticketId,
        data: {},
      });
      send({
        type: "agent_log",
        ticket_id: ticketId,
        data: {
          log: {
            timestamp: new Date().toISOString(),
            type: "info",
            message: "Build complete. Running automated review...",
          } as AgentLog,
        },
      });
    }, 18000);

    // t=22s: Review result
    schedule(() => {
      const review: ReviewResult = {
        criteria_results: [
          {
            criterion: "Feature implemented correctly",
            status: "pass",
            explanation: "Component renders and toggles state as expected.",
          },
          {
            criterion: "Tests pass",
            status: "pass",
            explanation: "All 8 unit tests pass successfully.",
          },
          {
            criterion: "Code quality",
            status: "pass",
            explanation: "Follows existing code patterns and conventions.",
          },
        ],
        summary: "All criteria met. Implementation is clean and well-tested.",
        raw_review_text: "Automated review passed all checks.",
        files_changed: 3,
        risk_level: "low",
      };
      send({
        type: "review_complete",
        ticket_id: ticketId,
        data: { review_result: review },
      });
    }, 22000);

    // t=25s: Outputs
    schedule(() => {
      send({
        type: "output_ready",
        ticket_id: ticketId,
        data: {
          output_type: "after_screenshots",
          outputs: { main: `/outputs/${ticketId}/after/main.png` },
        },
      });
      send({
        type: "output_ready",
        ticket_id: ticketId,
        data: {
          output_type: "markdown",
          outputs: { markdown_path: `/outputs/${ticketId}/summary.md` },
        },
      });
      this.running = false;
    }, 25000);
  }
}

export const mockWS = new MockWebSocket();
