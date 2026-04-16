import type { Dispatch } from 'react'
import type { TicketAction } from '../hooks/useTickets'
import type { Ticket, PlanStep, AgentLog } from '../types'

/**
 * Mock WebSocket that simulates a full build cycle on a timer.
 * Call startMockBuild(ticket, dispatch) to fire a sequence of events
 * that mirror what the real backend would send.
 */
export function startMockBuild(ticket: Ticket, dispatch: Dispatch<TicketAction>) {
  const id = ticket.id
  const timers: ReturnType<typeof setTimeout>[] = []

  const schedule = (ms: number, fn: () => void) => {
    timers.push(setTimeout(fn, ms))
  }

  const now = () => new Date().toISOString()

  // t=0s: status -> in_progress
  schedule(0, () => {
    const updated: Ticket = {
      ...ticket,
      status: 'in_progress',
      build_started_at: now(),
      current_phase: 'building',
      agent_plan: null,
      agent_diff: null,
      agent_logs: [],
      review_result: null,
    }
    dispatch({ type: 'UPDATE_TICKET', ticket: updated })
  })

  // t=1.5s: plan updated (step 1 inProgress)
  const planStages: PlanStep[][] = [
    [
      { step: 'Analyze codebase structure', status: 'inProgress' },
      { step: 'Implement core feature logic', status: 'pending' },
      { step: 'Create UI components', status: 'pending' },
      { step: 'Write tests', status: 'pending' },
    ],
    [
      { step: 'Analyze codebase structure', status: 'completed' },
      { step: 'Implement core feature logic', status: 'inProgress' },
      { step: 'Create UI components', status: 'pending' },
      { step: 'Write tests', status: 'pending' },
    ],
    [
      { step: 'Analyze codebase structure', status: 'completed' },
      { step: 'Implement core feature logic', status: 'completed' },
      { step: 'Create UI components', status: 'inProgress' },
      { step: 'Write tests', status: 'pending' },
    ],
    [
      { step: 'Analyze codebase structure', status: 'completed' },
      { step: 'Implement core feature logic', status: 'completed' },
      { step: 'Create UI components', status: 'completed' },
      { step: 'Write tests', status: 'inProgress' },
    ],
    [
      { step: 'Analyze codebase structure', status: 'completed' },
      { step: 'Implement core feature logic', status: 'completed' },
      { step: 'Create UI components', status: 'completed' },
      { step: 'Write tests', status: 'completed' },
    ],
  ]

  schedule(1500, () => dispatch({ type: 'UPDATE_PLAN', ticket_id: id, plan: planStages[0] }))

  // t=3s: log + plan step 1 complete
  schedule(3000, () => {
    const log: AgentLog = { timestamp: now(), type: 'agent_message', message: 'Analyzed codebase. Found React Router with existing component patterns.' }
    dispatch({ type: 'APPEND_LOG', ticket_id: id, log })
    dispatch({ type: 'UPDATE_PLAN', ticket_id: id, plan: planStages[1] })
  })

  // t=5s: diff appears
  schedule(5000, () => {
    dispatch({
      type: 'UPDATE_DIFF',
      ticket_id: id,
      diff: `diff --git a/src/components/Feature.tsx b/src/components/Feature.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/Feature.tsx
@@ -0,0 +1,24 @@
+import React from 'react';
+
+export function Feature() {
+  return <div>New feature component</div>;
+}`,
    })
    const log: AgentLog = { timestamp: now(), type: 'file_change', message: 'Created src/components/Feature.tsx' }
    dispatch({ type: 'APPEND_LOG', ticket_id: id, log })
  })

  // t=7s: step 2 complete
  schedule(7000, () => dispatch({ type: 'UPDATE_PLAN', ticket_id: id, plan: planStages[2] }))

  // t=9s: more files, step 3 complete
  schedule(9000, () => {
    dispatch({
      type: 'UPDATE_DIFF',
      ticket_id: id,
      diff: `diff --git a/src/components/Feature.tsx b/src/components/Feature.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/Feature.tsx
@@ -0,0 +1,24 @@
+import React from 'react';
+export function Feature() { return <div>New feature</div>; }
diff --git a/src/components/FeatureForm.tsx b/src/components/FeatureForm.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/FeatureForm.tsx
@@ -0,0 +1,18 @@
+import React, { useState } from 'react';
+export function FeatureForm() { return <form>...</form>; }
diff --git a/src/routes.tsx b/src/routes.tsx
--- a/src/routes.tsx
+++ b/src/routes.tsx
@@ -5,6 +5,8 @@
+import { Feature } from './components/Feature';
+    <Route path="/feature" element={<Feature />} />`,
    })
    dispatch({ type: 'UPDATE_PLAN', ticket_id: id, plan: planStages[3] })
    const log: AgentLog = { timestamp: now(), type: 'command', message: 'npm run typecheck -- passed' }
    dispatch({ type: 'APPEND_LOG', ticket_id: id, log })
  })

  // t=12s: all steps done
  schedule(12000, () => {
    dispatch({ type: 'UPDATE_PLAN', ticket_id: id, plan: planStages[4] })
    const log: AgentLog = { timestamp: now(), type: 'info', message: 'All tests passed. Build complete.' }
    dispatch({ type: 'APPEND_LOG', ticket_id: id, log })
  })

  // t=14s: move to review
  schedule(14000, () => {
    const buildStarted = ticket.build_started_at || now()
    const durationMs = Date.now() - new Date(buildStarted).getTime()
    const reviewTicket: Ticket = {
      ...ticket,
      status: 'review',
      build_completed_at: now(),
      build_duration_seconds: durationMs / 1000,
      current_phase: 'reviewing',
      agent_plan: planStages[4],
    }
    dispatch({ type: 'UPDATE_TICKET', ticket: reviewTicket })
  })

  // t=18s: review complete
  schedule(18000, () => {
    dispatch({
      type: 'SET_REVIEW',
      ticket_id: id,
      review_result: {
        criteria_results: ticket.acceptance_criteria.map(c => ({
          criterion: c,
          status: 'pass' as const,
          explanation: 'Implementation correctly satisfies this criterion.',
        })),
        summary: 'Feature implemented correctly. Code follows existing patterns and all acceptance criteria are met.',
        raw_review_text: 'Full review text from mock Codex review...',
        files_changed: 3,
        risk_level: 'low',
      },
    })
  })

  // t=20s: output screenshots
  schedule(20000, () => {
    dispatch({
      type: 'SET_OUTPUT',
      ticket_id: id,
      output_type: 'before_screenshots',
      data: { '/': 'before/root.png' },
    })
  })

  // t=22s: after screenshots
  schedule(22000, () => {
    dispatch({
      type: 'SET_OUTPUT',
      ticket_id: id,
      output_type: 'after_screenshots',
      data: { '/': 'after/root.png' },
    })
  })

  // Return cleanup function
  return () => timers.forEach(clearTimeout)
}
