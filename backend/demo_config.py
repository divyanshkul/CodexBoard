DEMO_PROJECT = {
    "dev_server_command": "npm run dev",
    "base_port": 4173,       # Before screenshots (original code)
    "worktree_port": 4174,   # After screenshots + video (worktree code)
    "startup_timeout": 30,
    "default_routes": ["/"],
}
# NOTE: Ports 5173/5174 conflict with the CodexBoard frontend dev server.
# Using 4173/4174 to avoid port collisions.
