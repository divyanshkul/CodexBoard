"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { resolveOutputPath } from "../lib/api";
import { FileText } from "lucide-react";

export function MarkdownViewer({
  content,
  ticketId,
  path,
}: {
  content?: string;
  ticketId: string;
  path?: string | null;
}) {
  const [resolvedContent, setResolvedContent] = useState(content ?? "");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (content || !path) {
      setResolvedContent(content ?? "");
      setLoadError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const outputPath = resolveOutputPath(ticketId, path);
    if (!outputPath) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    fetch(outputPath, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load markdown (${response.status})`);
        }
        return response.text();
      })
      .then((text) => {
        setResolvedContent(text);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Unable to load markdown.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [content, path, ticketId]);

  if (!content && !path) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center flex flex-col items-center gap-2">
        <FileText size={20} />
        No markdown available
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        Loading markdown summary...
      </div>
    );
  }

  if (loadError && !resolvedContent) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        {loadError}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none text-text-primary prose-headings:text-text-primary prose-p:text-text-secondary prose-code:text-accent prose-code:bg-[var(--accent-bg)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px]">
      <ReactMarkdown>{resolvedContent}</ReactMarkdown>
    </div>
  );
}
