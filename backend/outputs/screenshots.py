"""Screenshot capture via Playwright.

Navigates to each route on a running dev server and takes a full-page
screenshot.  Falls back to a 1x1 placeholder PNG when Playwright is not
installed or the server URL is not provided.
"""
from __future__ import annotations

import base64
import logging
from pathlib import Path

from models import Ticket
from outputs import ensure_ticket_output_dir, extract_routes, route_to_filename

logger = logging.getLogger(__name__)

# Tiny transparent PNG used as placeholder when real capture is unavailable.
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z2ioAAAAASUVORK5CYII="
)

try:
    from playwright.async_api import async_playwright

    _PLAYWRIGHT_OK = True
except ImportError:  # pragma: no cover
    _PLAYWRIGHT_OK = False


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def capture_before_screenshots(
    ticket: Ticket,
    server_url: str | None = None,
    routes: list[str] | None = None,
) -> dict[str, str]:
    """Capture *before* screenshots (original code, pre-build)."""
    return await _capture(ticket, "before", server_url, routes)


async def capture_after_screenshots(
    ticket: Ticket,
    server_url: str | None = None,
    routes: list[str] | None = None,
) -> dict[str, str]:
    """Capture *after* screenshots (worktree code, post-build)."""
    return await _capture(ticket, "after", server_url, routes)


# ------------------------------------------------------------------
# Internal
# ------------------------------------------------------------------

async def _capture(
    ticket: Ticket,
    phase: str,
    server_url: str | None,
    routes: list[str] | None,
) -> dict[str, str]:
    resolved_routes = routes or extract_routes(ticket.description)
    ticket_dir = ensure_ticket_output_dir(ticket.id)
    output_dir = ticket_dir / phase
    output_dir.mkdir(parents=True, exist_ok=True)

    if server_url and _PLAYWRIGHT_OK:
        return await _capture_with_playwright(
            server_url, resolved_routes, output_dir, phase
        )

    # Fallback: write placeholder PNGs
    return _write_placeholders(resolved_routes, output_dir, phase)


async def _capture_with_playwright(
    server_url: str,
    routes: list[str],
    output_dir: Path,
    phase: str,
) -> dict[str, str]:
    """Use Playwright to visit each route and take a screenshot."""
    results: dict[str, str] = {}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})

        for route in routes:
            url = f"{server_url.rstrip('/')}{route}"
            filename = route_to_filename(route)
            filepath = output_dir / filename
            try:
                await page.goto(url, wait_until="networkidle", timeout=15_000)
                await page.screenshot(path=str(filepath), full_page=True)
                results[route] = str(Path(phase) / filename)
                logger.info("Screenshot captured: %s -> %s", url, filepath)
            except Exception:
                logger.warning("Screenshot failed for %s, writing placeholder", url, exc_info=True)
                filepath.write_bytes(PNG_1X1)
                results[route] = str(Path(phase) / filename)

        await browser.close()

    return results


def _write_placeholders(
    routes: list[str],
    output_dir: Path,
    phase: str,
) -> dict[str, str]:
    """Write 1x1 placeholder PNGs (when no server URL is available)."""
    results: dict[str, str] = {}
    for route in routes:
        filename = route_to_filename(route)
        filepath = output_dir / filename
        filepath.write_bytes(PNG_1X1)
        results[route] = str(Path(phase) / filename)
    return results
