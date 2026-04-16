import { Ticket } from "../lib/types";

const now = new Date().toISOString();
const hourAgo = new Date(Date.now() - 3600000).toISOString();
const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
const threeHoursAgo = new Date(Date.now() - 10800000).toISOString();

export const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    title: "Add dark mode toggle",
    description:
      "Add a dark mode toggle button to the top navigation bar that switches between light and dark themes. Should persist the user's preference in localStorage.",
    acceptance_criteria: [
      "Toggle button visible in the nav bar",
      "Clicking toggles between light and dark themes",
      "Preference persists across page reloads",
      "Smooth transition between themes",
    ],
    target_repo: "acme/web-app",
    output_preferences: {
      screenshots: true,
      pixel_diff: true,
      video: false,
      markdown: true,
    },
    status: "todo",
    created_at: hourAgo,
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
    id: "TKT-002",
    title: "Implement password reset flow",
    description:
      "Build the complete password reset flow including the request form, email sending, token validation, and new password form.",
    acceptance_criteria: [
      "User can request password reset via email",
      "Reset email contains a valid token link",
      "Token expires after 1 hour",
      "User can set a new password with the valid token",
      "Invalid or expired tokens show an error",
    ],
    target_repo: "acme/web-app",
    output_preferences: {
      screenshots: true,
      pixel_diff: true,
      video: true,
      markdown: true,
    },
    status: "in_progress",
    created_at: twoHoursAgo,
    build_started_at: hourAgo,
    build_completed_at: null,
    build_duration_seconds: null,
    rejection_feedback: "The reset token should use crypto.randomUUID() instead of randomBytes for better entropy. Also the email template is missing the company logo.",
    agent_plan: [
      { step: "Analyze existing auth module structure", status: "completed" },
      { step: "Create password reset request endpoint", status: "completed" },
      { step: "Build email template and sending logic", status: "inProgress" },
      { step: "Implement token validation middleware", status: "pending" },
      { step: "Create new password form component", status: "pending" },
      { step: "Add integration tests", status: "pending" },
    ],
    agent_diff: `diff --git a/src/auth/reset.ts b/src/auth/reset.ts
new file mode 100644
--- /dev/null
+++ b/src/auth/reset.ts
@@ -0,0 +1,42 @@
+import { randomBytes } from 'crypto';
+import { db } from '../database';
+import { sendEmail } from '../email';
+
+export async function requestPasswordReset(email: string) {
+  const user = await db.users.findByEmail(email);
+  if (!user) return; // Silent fail for security
+
+  const token = randomBytes(32).toString('hex');
+  const expires = new Date(Date.now() + 3600000);
+
+  await db.resetTokens.create({
+    userId: user.id,
+    token,
+    expiresAt: expires,
+  });
+
+  await sendEmail({
+    to: email,
+    subject: 'Password Reset Request',
+    template: 'password-reset',
+    data: { token, userName: user.name },
+  });
+}`,
    agent_logs: [
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: "info",
        message: "Starting build for TKT-002",
      },
      {
        timestamp: new Date(Date.now() - 1700000).toISOString(),
        type: "agent_message",
        message: "Analyzing existing auth module to understand patterns...",
      },
      {
        timestamp: new Date(Date.now() - 1500000).toISOString(),
        type: "command",
        message: "grep -r 'auth' src/ --include='*.ts' -l",
      },
      {
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        type: "file_change",
        message: "Created src/auth/reset.ts",
      },
      {
        timestamp: new Date(Date.now() - 900000).toISOString(),
        type: "agent_message",
        message: "Building email template with reset link...",
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
    current_phase: "coding",
    codex_thread_id: "thread_abc123",
    worktree_path: "/tmp/codex/tkt-002",
  },
  {
    id: "TKT-003",
    title: "Add search to navigation bar",
    description:
      "Implement a search component in the main navigation bar with autocomplete suggestions and keyboard navigation support.",
    acceptance_criteria: [
      "Search input visible in navigation bar",
      "Autocomplete suggestions appear while typing",
      "Keyboard navigation works (up/down arrows, enter to select)",
      "Search results page shows filtered results",
      "Empty state handled gracefully",
    ],
    target_repo: "acme/web-app",
    output_preferences: {
      screenshots: true,
      pixel_diff: true,
      video: false,
      markdown: true,
    },
    status: "review",
    created_at: threeHoursAgo,
    build_started_at: twoHoursAgo,
    build_completed_at: hourAgo,
    build_duration_seconds: 3600,
    rejection_feedback: null,
    agent_plan: [
      { step: "Design search component architecture", status: "completed" },
      { step: "Implement search input with debouncing", status: "completed" },
      { step: "Build autocomplete dropdown", status: "completed" },
      { step: "Add keyboard navigation", status: "completed" },
      { step: "Create search results page", status: "completed" },
      { step: "Write unit and integration tests", status: "completed" },
    ],
    agent_diff: `diff --git a/src/components/SearchBar.tsx b/src/components/SearchBar.tsx
new file mode 100644
--- /dev/null
+++ b/src/components/SearchBar.tsx
@@ -0,0 +1,85 @@
+import { useState, useCallback, useRef } from 'react';
+import { useDebounce } from '../hooks/useDebounce';
+import { searchApi } from '../api/search';
+
+export function SearchBar() {
+  const [query, setQuery] = useState('');
+  const [results, setResults] = useState([]);
+  const [selectedIndex, setSelectedIndex] = useState(-1);
+  const debouncedQuery = useDebounce(query, 300);
+
+  const handleKeyDown = useCallback((e) => {
+    if (e.key === 'ArrowDown') {
+      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
+    } else if (e.key === 'ArrowUp') {
+      setSelectedIndex(i => Math.max(i - 1, 0));
+    } else if (e.key === 'Enter' && selectedIndex >= 0) {
+      navigateToResult(results[selectedIndex]);
+    }
+  }, [results, selectedIndex]);
+
+  return (
+    <div className="search-container">
+      <input
+        type="text"
+        value={query}
+        onChange={(e) => setQuery(e.target.value)}
+        onKeyDown={handleKeyDown}
+        placeholder="Search..."
+      />
+      {results.length > 0 && (
+        <ul className="search-results">
+          {results.map((result, i) => (
+            <li key={result.id} className={i === selectedIndex ? 'selected' : ''}>
+              {result.title}
+            </li>
+          ))}
+        </ul>
+      )}
+    </div>
+  );
+}`,
    agent_logs: [
      {
        timestamp: new Date(Date.now() - 7000000).toISOString(),
        type: "info",
        message: "Starting build for TKT-003",
      },
      {
        timestamp: new Date(Date.now() - 6800000).toISOString(),
        type: "agent_message",
        message: "Planning search component architecture...",
      },
      {
        timestamp: new Date(Date.now() - 6000000).toISOString(),
        type: "file_change",
        message: "Created src/components/SearchBar.tsx",
      },
      {
        timestamp: new Date(Date.now() - 5000000).toISOString(),
        type: "file_change",
        message: "Created src/hooks/useDebounce.ts",
      },
      {
        timestamp: new Date(Date.now() - 4000000).toISOString(),
        type: "command",
        message: "npm run test -- --run src/components/SearchBar.test.tsx",
      },
      {
        timestamp: new Date(Date.now() - 3800000).toISOString(),
        type: "info",
        message: "All 12 tests passed. Build complete.",
      },
    ],
    review_result: {
      criteria_results: [
        {
          criterion: "Search input visible in navigation bar",
          status: "pass",
          explanation:
            "SearchBar component is properly integrated into the NavBar component and renders an input element.",
        },
        {
          criterion: "Autocomplete suggestions appear while typing",
          status: "pass",
          explanation:
            "Debounced search triggers API calls and renders results in a dropdown.",
        },
        {
          criterion: "Keyboard navigation works",
          status: "pass",
          explanation:
            "Arrow keys navigate suggestions, Enter selects, Escape closes dropdown.",
        },
        {
          criterion: "Search results page shows filtered results",
          status: "pass",
          explanation:
            "Selecting a suggestion or pressing Enter navigates to /search?q=query with results.",
        },
        {
          criterion: "Empty state handled gracefully",
          status: "pass",
          explanation:
            'Shows "No results found" message with a suggestion to refine the search.',
        },
      ],
      summary:
        "All acceptance criteria met. The search implementation is clean with proper debouncing, keyboard navigation, and accessibility attributes.",
      raw_review_text:
        "Code review passed. Implementation follows existing patterns. Good use of custom hooks for debouncing. Accessibility is handled via aria-* attributes on the combobox.",
      files_changed: 6,
      risk_level: "low",
    },
    outputs: {
      before_screenshots: {
        "navbar-desktop": "/outputs/TKT-003/before/navbar-desktop.png",
      },
      after_screenshots: {
        "navbar-desktop": "/outputs/TKT-003/after/navbar-desktop.png",
        "search-open": "/outputs/TKT-003/after/search-open.png",
      },
      diff_heatmaps: {
        "navbar-desktop": "/outputs/TKT-003/diff/navbar-desktop.png",
      },
      video_path: null,
      markdown_path: "/outputs/TKT-003/summary.md",
    },
    current_phase: "review",
    codex_thread_id: "thread_def456",
    worktree_path: "/tmp/codex/tkt-003",
  },
  {
    id: "TKT-004",
    title: "Fix mobile responsive layout",
    description:
      "Fix the dashboard layout breaking on mobile viewports (< 768px). The sidebar should collapse into a hamburger menu and cards should stack vertically.",
    acceptance_criteria: [
      "Sidebar collapses to hamburger menu on mobile",
      "Dashboard cards stack vertically on small screens",
      "No horizontal scrollbar on mobile",
      "Touch-friendly tap targets (min 44px)",
    ],
    target_repo: "acme/web-app",
    output_preferences: {
      screenshots: true,
      pixel_diff: true,
      video: false,
      markdown: false,
    },
    status: "done",
    created_at: threeHoursAgo,
    build_started_at: twoHoursAgo,
    build_completed_at: new Date(Date.now() - 5400000).toISOString(),
    build_duration_seconds: 1847,
    rejection_feedback: null,
    agent_plan: [
      { step: "Audit current responsive breakpoints", status: "completed" },
      { step: "Implement collapsible sidebar", status: "completed" },
      { step: "Fix card grid for mobile viewports", status: "completed" },
      { step: "Verify touch target sizes", status: "completed" },
      { step: "Test across viewport sizes", status: "completed" },
    ],
    agent_diff: `diff --git a/src/components/Sidebar.tsx b/src/components/Sidebar.tsx
--- a/src/components/Sidebar.tsx
+++ b/src/components/Sidebar.tsx
@@ -1,12 +1,28 @@
-export function Sidebar() {
+import { useState } from 'react';
+import { MenuIcon, XIcon } from 'lucide-react';
+
+export function Sidebar() {
+  const [isOpen, setIsOpen] = useState(false);
+
   return (
-    <aside className="w-64 h-screen bg-gray-50">
+    <>
+      <button
+        className="md:hidden fixed top-4 left-4 z-50 p-2 min-w-[44px] min-h-[44px]"
+        onClick={() => setIsOpen(!isOpen)}
+      >
+        {isOpen ? <XIcon /> : <MenuIcon />}
+      </button>
+      <aside className={\`\${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static w-64 h-screen bg-gray-50 transition-transform z-40\`}>
         {/* sidebar content */}
       </aside>
+    </>
   );
 }`,
    agent_logs: [
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: "info",
        message: "Starting build for TKT-004",
      },
      {
        timestamp: new Date(Date.now() - 7000000).toISOString(),
        type: "agent_message",
        message: "Auditing responsive breakpoints in existing CSS...",
      },
      {
        timestamp: new Date(Date.now() - 6500000).toISOString(),
        type: "file_change",
        message: "Modified src/components/Sidebar.tsx",
      },
      {
        timestamp: new Date(Date.now() - 6000000).toISOString(),
        type: "file_change",
        message: "Modified src/components/Dashboard.tsx",
      },
      {
        timestamp: new Date(Date.now() - 5600000).toISOString(),
        type: "info",
        message: "Build complete. All tests passing.",
      },
    ],
    review_result: {
      criteria_results: [
        {
          criterion: "Sidebar collapses to hamburger menu on mobile",
          status: "pass",
          explanation:
            "Sidebar uses translate-x transform with a toggle button visible on mobile.",
        },
        {
          criterion: "Dashboard cards stack vertically on small screens",
          status: "pass",
          explanation: "Grid changes from 3-column to single-column below 768px.",
        },
        {
          criterion: "No horizontal scrollbar on mobile",
          status: "pass",
          explanation: "overflow-x-hidden applied, all elements fit within viewport.",
        },
        {
          criterion: "Touch-friendly tap targets",
          status: "pass",
          explanation: "All interactive elements have minimum 44px dimensions.",
        },
      ],
      summary:
        "All criteria met. Clean responsive implementation using Tailwind breakpoints.",
      raw_review_text:
        "Good mobile-first approach. The sidebar transition is smooth and the hamburger button is well-positioned.",
      files_changed: 4,
      risk_level: "low",
    },
    outputs: {
      before_screenshots: {
        "mobile-view": "/outputs/TKT-004/before/mobile-view.png",
        "desktop-view": "/outputs/TKT-004/before/desktop-view.png",
      },
      after_screenshots: {
        "mobile-view": "/outputs/TKT-004/after/mobile-view.png",
        "desktop-view": "/outputs/TKT-004/after/desktop-view.png",
        "mobile-menu-open": "/outputs/TKT-004/after/mobile-menu-open.png",
      },
      diff_heatmaps: {
        "mobile-view": "/outputs/TKT-004/diff/mobile-view.png",
      },
      video_path: null,
      markdown_path: null,
    },
    current_phase: "done",
    codex_thread_id: "thread_ghi789",
    worktree_path: null,
  },
];
