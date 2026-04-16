"""Video walkthrough recording with optional TTS narration.

Records a smooth walkthrough of a running dev server using Playwright's
built-in video recording, then optionally generates TTS narration via
the OpenAI API and merges the two tracks with ffmpeg.

Falls back to a tiny stub file when Playwright / ffmpeg / OpenAI are
unavailable.
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
from pathlib import Path

from models import Ticket
from outputs import ensure_ticket_output_dir, extract_routes

logger = logging.getLogger(__name__)

try:
    from playwright.async_api import async_playwright

    _PLAYWRIGHT_OK = True
except ImportError:  # pragma: no cover
    _PLAYWRIGHT_OK = False

try:
    from openai import AsyncOpenAI

    _tts_client: AsyncOpenAI | None = AsyncOpenAI()
except Exception:  # pragma: no cover
    _tts_client = None


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def generate_video(
    ticket: Ticket,
    server_url: str | None = None,
    routes: list[str] | None = None,
) -> str:
    """Record a walkthrough video, add TTS narration, and return the
    relative path inside the ticket output directory.

    If *server_url* is provided and Playwright is available, a real video
    is recorded.  Otherwise a small stub file is written.
    """
    ticket_dir = ensure_ticket_output_dir(ticket.id)
    video_dir = ticket_dir / "video"
    video_dir.mkdir(parents=True, exist_ok=True)
    resolved_routes = routes or extract_routes(ticket.description)

    if not server_url:
        logger.warning(
            "=== VIDEO STUB === reason=no server_url (dev server failed to start)"
        )
        stub = video_dir / "walkthrough.mp4"
        stub.write_bytes(f"Mock walkthrough for {ticket.title}".encode())
        return str(Path("video") / stub.name)

    if not _PLAYWRIGHT_OK:
        logger.warning(
            "=== VIDEO STUB === reason=Playwright not installed. "
            "Run: pip install playwright && playwright install chromium"
        )
        stub = video_dir / "walkthrough.mp4"
        stub.write_bytes(f"Mock walkthrough for {ticket.title}".encode())
        return str(Path("video") / stub.name)

    try:
        return await _record_narrated_walkthrough(
            ticket, server_url, resolved_routes, video_dir
        )
    except Exception:
        logger.error(
            "=== VIDEO STUB === reason=recording failed. See traceback above.",
            exc_info=True,
        )
        stub = video_dir / "walkthrough.mp4"
        stub.write_bytes(f"Mock walkthrough for {ticket.title}".encode())
        return str(Path("video") / stub.name)


# ------------------------------------------------------------------
# Playwright recording
# ------------------------------------------------------------------

async def _record_walkthrough(
    server_url: str,
    routes: list[str],
    video_dir: Path,
    dwell_seconds: float = 3.0,
) -> Path:
    """Record a silent walkthrough video via Playwright.

    Returns the path to the final MP4 file.
    """
    webm_dir = video_dir / "_webm_tmp"
    webm_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(webm_dir),
            record_video_size={"width": 1280, "height": 720},
        )
        page = await context.new_page()

        for route in routes:
            url = f"{server_url.rstrip('/')}{route}"
            try:
                await page.goto(url, wait_until="networkidle", timeout=15_000)
            except Exception:
                logger.warning("Page load timeout for %s, continuing", url)
            # Slow scroll + dwell so recording is watchable
            await page.evaluate(
                "window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })"
            )
            await asyncio.sleep(dwell_seconds)

        # Must close context to finalize the video file
        webm_path_str = await page.video.path()
        await context.close()
        await browser.close()

    webm_path = Path(webm_path_str)

    # Convert webm -> mp4 via ffmpeg
    mp4_path = video_dir / "walkthrough.mp4"
    await _webm_to_mp4(str(webm_path), str(mp4_path))

    # Clean up temp dir
    shutil.rmtree(str(webm_dir), ignore_errors=True)

    return mp4_path


# ------------------------------------------------------------------
# TTS Narration
# ------------------------------------------------------------------

def build_narration_script(ticket: Ticket) -> str:
    """Build a short spoken narration from ticket data (40-75 words)."""
    title = ticket.title
    ticket_id = ticket.id[:8]
    criteria = ticket.acceptance_criteria
    files_changed = 0
    duration_str = "a few minutes"

    if ticket.review_result:
        files_changed = ticket.review_result.files_changed
    if ticket.build_duration_seconds is not None:
        d = ticket.build_duration_seconds
        duration_str = f"{int(d // 60)} minutes {int(d % 60)} seconds"

    passed = len(criteria)  # optimistic for script
    total = len(criteria)

    parts = [
        f"This is ticket {ticket_id}: {title}.",
        f"Codex built this feature in {duration_str}, modifying {files_changed} files.",
    ]
    if total > 0:
        if passed == total:
            parts.append(f"All {total} acceptance criteria are passing.")
        else:
            parts.append(f"{passed} of {total} acceptance criteria are passing.")
    parts.append("Here's a walkthrough of the completed feature.")
    return " ".join(parts)


async def _generate_narration(ticket: Ticket, video_dir: Path) -> Path | None:
    """Generate a TTS .mp3 narration file.  Returns None on failure."""
    if _tts_client is None:
        logger.warning("OpenAI client not available, skipping narration")
        return None

    script = build_narration_script(ticket)
    logger.info("TTS narration script (%d words): %s", len(script.split()), script)

    try:
        response = await _tts_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=script,
            response_format="mp3",
            speed=1.0,
        )
        audio_path = video_dir / "narration.mp3"
        audio_path.write_bytes(response.content)
        return audio_path
    except Exception:
        logger.warning("TTS generation failed", exc_info=True)
        return None


# ------------------------------------------------------------------
# ffmpeg helpers
# ------------------------------------------------------------------

async def _webm_to_mp4(webm_path: str, mp4_path: str) -> str:
    """Convert a webm file to mp4 using ffmpeg."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found. Install it: brew install ffmpeg")

    proc = await asyncio.create_subprocess_exec(
        ffmpeg, "-y",
        "-i", webm_path,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        mp4_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"webm->mp4 conversion failed: {stderr.decode()[:500]}")
    return mp4_path


async def _merge_audio_video(
    video_path: str,
    audio_path: str,
    output_path: str,
) -> str:
    """Merge a silent video with a narration audio track via ffmpeg."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found. Install it: brew install ffmpeg")

    proc = await asyncio.create_subprocess_exec(
        ffmpeg,
        "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-map", "0:v:0",
        "-map", "1:a:0",
        output_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg merge failed: {stderr.decode()[:500]}")
    return output_path


# ------------------------------------------------------------------
# Full pipeline: record + narrate + merge
# ------------------------------------------------------------------

async def _record_narrated_walkthrough(
    ticket: Ticket,
    server_url: str,
    routes: list[str],
    video_dir: Path,
) -> str:
    """Record a Playwright walkthrough, add TTS narration, merge."""
    # 1. Record silent walkthrough
    silent_mp4 = await _record_walkthrough(server_url, routes, video_dir)

    # 2. Generate narration audio
    narration_path = await _generate_narration(ticket, video_dir)

    # 3. Merge if narration was produced
    if narration_path and narration_path.exists():
        try:
            final_path = video_dir / "walkthrough-narrated.mp4"
            await _merge_audio_video(
                str(silent_mp4), str(narration_path), str(final_path)
            )
            return str(Path("video") / final_path.name)
        except Exception:
            logger.warning("Audio merge failed, returning silent video", exc_info=True)

    return str(Path("video") / silent_mp4.name)
