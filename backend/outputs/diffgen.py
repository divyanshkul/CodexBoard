"""Pixel-diff heatmap generation.

Compares before/after screenshot pairs using ``pixelmatch`` and produces
a red-highlighted diff image showing exactly which pixels changed.
Falls back to a 1x1 placeholder PNG when the dependencies are missing.
"""
from __future__ import annotations

import logging
from pathlib import Path

from outputs import ensure_ticket_output_dir, get_outputs_root, route_to_filename
from outputs.screenshots import PNG_1X1

logger = logging.getLogger(__name__)

try:
    from PIL import Image
    from pixelmatch.contrib.PIL import pixelmatch as pil_pixelmatch

    _PIXELMATCH_OK = True
except ImportError:  # pragma: no cover
    _PIXELMATCH_OK = False


async def generate_diff_heatmaps(
    ticket_id: str,
    before_screenshots: dict[str, str],
    after_screenshots: dict[str, str],
) -> dict[str, str]:
    """Generate pixel-diff heatmaps for each before/after screenshot pair.

    Only generates a diff for routes that have both a before and after
    screenshot.

    Returns:
        dict mapping route -> relative file path inside the ticket output dir.
    """
    shared_routes = set(before_screenshots.keys()) & set(after_screenshots.keys())
    if not shared_routes:
        return {}

    ticket_dir = ensure_ticket_output_dir(ticket_id)
    diff_dir = ticket_dir / "diff"
    diff_dir.mkdir(parents=True, exist_ok=True)
    outputs_root = get_outputs_root()

    results: dict[str, str] = {}

    for route in shared_routes:
        before_path = outputs_root / ticket_id / before_screenshots[route]
        after_path = outputs_root / ticket_id / after_screenshots[route]
        filename = route_to_filename(route).replace(".png", "-diff.png")
        diff_path = diff_dir / filename

        if _PIXELMATCH_OK and before_path.exists() and after_path.exists():
            try:
                _generate_diff(before_path, after_path, diff_path)
                results[route] = str(Path("diff") / filename)
                logger.info("Diff heatmap generated for route %s", route)
                continue
            except Exception:
                logger.warning(
                    "pixelmatch failed for %s, writing placeholder",
                    route,
                    exc_info=True,
                )

        # Fallback: write placeholder
        diff_path.write_bytes(PNG_1X1)
        results[route] = str(Path("diff") / filename)

    return results


def _generate_diff(before_path: Path, after_path: Path, diff_path: Path) -> int:
    """Run pixelmatch on two image files and save the diff."""
    img_before = Image.open(before_path).convert("RGBA")
    img_after = Image.open(after_path).convert("RGBA")

    # Resize to match if needed (take the larger dimensions)
    width = max(img_before.width, img_after.width)
    height = max(img_before.height, img_after.height)
    if img_before.size != (width, height):
        img_before = img_before.resize((width, height), Image.LANCZOS)
    if img_after.size != (width, height):
        img_after = img_after.resize((width, height), Image.LANCZOS)

    img_diff = Image.new("RGBA", (width, height))
    mismatch = pil_pixelmatch(img_before, img_after, img_diff, includeAA=True)
    img_diff.save(str(diff_path))
    logger.info("pixelmatch: %d mismatched pixels", mismatch)
    return mismatch
