"use client";

import ReactMarkdown from "react-markdown";
import { FileText } from "lucide-react";

export function MarkdownViewer({
  content,
  path,
}: {
  content?: string;
  path?: string | null;
}) {
  if (!content && !path) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center flex flex-col items-center gap-2">
        <FileText size={20} />
        No markdown available
      </div>
    );
  }

  if (path && !content) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        Markdown available at: <code className="font-mono text-[12px]">{path}</code>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none text-text-primary prose-headings:text-text-primary prose-p:text-text-secondary prose-code:text-accent prose-code:bg-[var(--accent-bg)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px]">
      <ReactMarkdown>{content || ""}</ReactMarkdown>
    </div>
  );
}
