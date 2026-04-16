import type { Ticket } from '../types'

export const mockTickets: Ticket[] = [
  {
    id: 'cb-001-todo',
    title: 'Add dark mode toggle to settings',
    description: 'Add a toggle switch on the /settings page that allows users to switch between light and dark theme. The preference should persist in localStorage.',
    acceptance_criteria: [
      'Toggle switch is visible on /settings page',
      'Clicking toggle switches between light and dark theme',
      'Preference persists across page reloads',
    ],
    target_repo: '/home/user/projects/my-app',
    output_preferences: { screenshots: true, pixel_diff: true, video: false, markdown: true },
    status: 'todo',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    build_started_at: null,
    build_completed_at: null,
    build_duration_seconds: null,
    rejection_feedback: null,
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
  },
  {
    id: 'cb-002-progress',
    title: 'Implement password reset flow',
    description: 'Build a complete password reset flow: forgot password page at /forgot-password, email with reset link, /reset-password page with new password form.',
    acceptance_criteria: [
      'Forgot password form sends reset email',
      'Reset link opens /reset-password page',
      'New password is validated and saved',
      'User can log in with new password',
      'Error handling for invalid/expired tokens',
    ],
    target_repo: '/home/user/projects/auth-service',
    output_preferences: { screenshots: true, pixel_diff: false, video: true, markdown: true },
    status: 'in_progress',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    build_started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    build_completed_at: null,
    build_duration_seconds: null,
    rejection_feedback: null,
    agent_plan: [
      { step: 'Analyze codebase structure and auth patterns', status: 'completed' },
      { step: 'Create ForgotPassword component and route', status: 'completed' },
      { step: 'Build ResetPassword form with validation', status: 'inProgress' },
      { step: 'Add email service integration', status: 'pending' },
      { step: 'Write unit and integration tests', status: 'pending' },
    ],
    agent_diff: `diff --git a/src/components/ForgotPassword.tsx b/src/components/ForgotPassword.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/ForgotPassword.tsx
@@ -0,0 +1,47 @@
+import React, { useState } from 'react';
+import { sendResetEmail } from '../api/auth';
+
+export function ForgotPassword() {
+  const [email, setEmail] = useState('');
+  const [sent, setSent] = useState(false);
+
+  const handleSubmit = async (e) => {
+    e.preventDefault();
+    await sendResetEmail(email);
+    setSent(true);
+  };
+
+  return (
+    <div className="reset-container">
+      <h2>Reset your password</h2>
+      {sent ? (
+        <p>Check your email for a reset link.</p>
+      ) : (
+        <form onSubmit={handleSubmit}>
+          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
+          <button type="submit">Send Reset Link</button>
+        </form>
+      )}
+    </div>
+  );
+}
diff --git a/src/api/auth.ts b/src/api/auth.ts
--- a/src/api/auth.ts
+++ b/src/api/auth.ts
@@ -10,6 +10,14 @@
+export async function sendResetEmail(email: string): Promise<void> {
+  await fetch('/api/auth/reset', {
+    method: 'POST',
+    body: JSON.stringify({ email }),
+  });
+}
+
+export async function resetPassword(token: string, password: string): Promise<void> {
+  await fetch('/api/auth/reset/confirm', {
+    method: 'POST',
+    body: JSON.stringify({ token, password }),
+  });
+}
diff --git a/src/routes.tsx b/src/routes.tsx
--- a/src/routes.tsx
+++ b/src/routes.tsx
@@ -5,6 +5,8 @@
+import { ForgotPassword } from './components/ForgotPassword';
+import { ResetPassword } from './components/ResetPassword';
@@ -12,6 +14,8 @@
+    <Route path="/forgot-password" element={<ForgotPassword />} />
+    <Route path="/reset-password" element={<ResetPassword />} />`,
    agent_logs: [
      {
        timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
        type: 'info',
        message: 'Starting analysis of codebase structure...',
      },
      {
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        type: 'agent_message',
        message: 'Found React Router setup with existing auth pages. Will follow the same patterns.',
      },
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        type: 'file_change',
        message: 'Created src/components/ForgotPassword.tsx',
      },
      {
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        type: 'command',
        message: 'npm run typecheck -- passed',
      },
      {
        timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        type: 'file_change',
        message: 'Updated src/api/auth.ts with reset functions',
      },
    ],
    review_result: null,
    outputs: {
      before_screenshots: {},
      after_screenshots: {},
      diff_heatmaps: {},
      video_path: null,
      markdown_path: null,
    },
    current_phase: 'building',
    codex_thread_id: 'thread_mock_002',
    worktree_path: '/tmp/workspaces/ticket-cb-002',
  },
  {
    id: 'cb-003-review',
    title: 'Add search to navigation bar',
    description: 'Add a search input to the top navigation bar on all pages. Results should filter as the user types, showing matching page titles and content snippets.',
    acceptance_criteria: [
      'Search input appears in navigation bar',
      'Results filter as user types (debounced)',
      'Matching pages show title and snippet',
    ],
    target_repo: '/home/user/projects/docs-site',
    output_preferences: { screenshots: true, pixel_diff: true, video: true, markdown: true },
    status: 'review',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    build_started_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    build_completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    build_duration_seconds: 322,
    rejection_feedback: null,
    agent_plan: [
      { step: 'Analyze navbar component structure', status: 'completed' },
      { step: 'Create SearchInput component', status: 'completed' },
      { step: 'Implement search index and filtering', status: 'completed' },
      { step: 'Add keyboard navigation for results', status: 'completed' },
    ],
    agent_diff: `diff --git a/src/components/SearchInput.tsx b/src/components/SearchInput.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/SearchInput.tsx
@@ -0,0 +1,85 @@
+import React, { useState, useMemo, useRef } from 'react';
+import { useDebounce } from '../hooks/useDebounce';
+import { searchPages } from '../lib/search';
+
+export function SearchInput() {
+  const [query, setQuery] = useState('');
+  const debouncedQuery = useDebounce(query, 200);
+  const results = useMemo(() => searchPages(debouncedQuery), [debouncedQuery]);
+  // ... component implementation
+}
diff --git a/src/components/Navbar.tsx b/src/components/Navbar.tsx
--- a/src/components/Navbar.tsx
+++ b/src/components/Navbar.tsx
@@ -8,6 +8,7 @@
+import { SearchInput } from './SearchInput';
@@ -15,6 +16,7 @@
+        <SearchInput />
diff --git a/src/lib/search.ts b/src/lib/search.ts
new file mode 100644
--- /dev/null
+++ b/src/lib/search.ts
@@ -0,0 +1,32 @@
+interface SearchResult {
+  title: string;
+  path: string;
+  snippet: string;
+}
+
+export function searchPages(query: string): SearchResult[] {
+  if (!query.trim()) return [];
+  // Search implementation
+}
diff --git a/src/hooks/useDebounce.ts b/src/hooks/useDebounce.ts
new file mode 100644
--- /dev/null
+++ b/src/hooks/useDebounce.ts
@@ -0,0 +1,12 @@
+import { useState, useEffect } from 'react';
+export function useDebounce<T>(value: T, delay: number): T {
+  const [debounced, setDebounced] = useState(value);
+  useEffect(() => {
+    const timer = setTimeout(() => setDebounced(value), delay);
+    return () => clearTimeout(timer);
+  }, [value, delay]);
+  return debounced;
+}
diff --git a/src/styles/search.css b/src/styles/search.css
new file mode 100644
--- /dev/null
+++ b/src/styles/search.css
@@ -0,0 +1,28 @@
+.search-container { position: relative; }
+.search-results { position: absolute; top: 100%; }`,
    agent_logs: [
      {
        timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
        type: 'info',
        message: 'Analyzing navbar structure and existing components...',
      },
      {
        timestamp: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
        type: 'agent_message',
        message: 'Navbar uses flexbox layout. Adding search input between logo and nav links.',
      },
      {
        timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        type: 'file_change',
        message: 'Created src/components/SearchInput.tsx',
      },
      {
        timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
        type: 'file_change',
        message: 'Created src/lib/search.ts',
      },
      {
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        type: 'command',
        message: 'npm test -- all 12 tests passed',
      },
    ],
    review_result: {
      criteria_results: [
        { criterion: 'Search input appears in navigation bar', status: 'pass', explanation: 'SearchInput component correctly integrated into Navbar with proper positioning.' },
        { criterion: 'Results filter as user types (debounced)', status: 'pass', explanation: 'useDebounce hook implements 200ms delay. Search function filters pages by title and content.' },
        { criterion: 'Matching pages show title and snippet', status: 'pass', explanation: 'SearchResult type includes title, path, and snippet fields. Results display correctly.' },
      ],
      summary: 'Feature implemented correctly. Search component is well-structured with proper debouncing and accessible keyboard navigation. Code follows existing patterns.',
      raw_review_text: 'The implementation adds a search feature to the navigation bar...',
      files_changed: 5,
      risk_level: 'low',
    },
    outputs: {
      before_screenshots: { '/': 'before/root.png' },
      after_screenshots: { '/': 'after/root.png' },
      diff_heatmaps: { '/': 'diff/root-diff.png' },
      video_path: 'video/walkthrough.webm',
      markdown_path: 'markdown/summary.md',
    },
    current_phase: null,
    codex_thread_id: 'thread_mock_003',
    worktree_path: '/tmp/workspaces/ticket-cb-003',
  },
  {
    id: 'cb-004-done',
    title: 'Fix mobile responsive layout',
    description: 'The dashboard layout breaks on screens narrower than 768px. Fix the grid to stack vertically on mobile and adjust font sizes.',
    acceptance_criteria: [
      'Dashboard renders correctly on 375px viewport',
      'Grid columns stack vertically on mobile',
      'Text remains readable at all breakpoints',
    ],
    target_repo: '/home/user/projects/dashboard',
    output_preferences: { screenshots: true, pixel_diff: false, video: false, markdown: true },
    status: 'done',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    build_started_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    build_completed_at: new Date(Date.now() - 98 * 60 * 1000).toISOString(),
    build_duration_seconds: 754,
    rejection_feedback: null,
    agent_plan: [
      { step: 'Audit responsive breakpoints', status: 'completed' },
      { step: 'Fix grid layout for mobile', status: 'completed' },
      { step: 'Adjust typography scaling', status: 'completed' },
    ],
    agent_diff: null,
    agent_logs: [],
    review_result: {
      criteria_results: [
        { criterion: 'Dashboard renders correctly on 375px viewport', status: 'pass', explanation: 'Verified with Playwright at 375px width.' },
        { criterion: 'Grid columns stack vertically on mobile', status: 'pass', explanation: 'Grid switches to single column below 768px.' },
        { criterion: 'Text remains readable at all breakpoints', status: 'pass', explanation: 'Font sizes scale appropriately.' },
      ],
      summary: 'All responsive issues resolved. Layout adapts correctly to mobile viewports.',
      raw_review_text: 'The responsive layout fix addresses all reported issues...',
      files_changed: 3,
      risk_level: 'low',
    },
    outputs: {
      before_screenshots: {},
      after_screenshots: {},
      diff_heatmaps: {},
      video_path: null,
      markdown_path: 'markdown/summary.md',
    },
    current_phase: null,
    codex_thread_id: null,
    worktree_path: null,
  },
  {
    id: 'cb-005-failed',
    title: 'Add notification system',
    description: 'Implement a real-time notification system using WebSocket connections. Show a bell icon in the header with unread count badge.',
    acceptance_criteria: [
      'Bell icon shows in header with unread count',
      'Notifications dropdown opens on click',
      'Real-time updates via WebSocket',
    ],
    target_repo: '/home/user/projects/social-app',
    output_preferences: { screenshots: true, pixel_diff: false, video: true, markdown: false },
    status: 'failed',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    build_started_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    build_completed_at: null,
    build_duration_seconds: null,
    rejection_feedback: null,
    agent_plan: [
      { step: 'Set up WebSocket server integration', status: 'completed' },
      { step: 'Create NotificationBell component', status: 'completed' },
      { step: 'Implement notification dropdown', status: 'inProgress' },
    ],
    agent_diff: null,
    agent_logs: [
      {
        timestamp: new Date(Date.now() - 54 * 60 * 1000).toISOString(),
        type: 'error',
        message: 'Error: Context window exceeded during notification dropdown implementation',
      },
    ],
    review_result: null,
    outputs: {
      before_screenshots: {},
      after_screenshots: {},
      diff_heatmaps: {},
      video_path: null,
      markdown_path: null,
    },
    current_phase: null,
    codex_thread_id: 'thread_mock_005',
    worktree_path: null,
  },
]
