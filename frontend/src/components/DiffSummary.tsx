"use client";

export function DiffSummary({ diff }: { diff: string | null }) {
  if (!diff) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center">
        No diff available yet
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="rounded-md border border-border-card overflow-hidden">
      <pre className="text-[12px] leading-relaxed font-mono overflow-x-auto">
        {lines.map((line, i) => {
          let className = "px-3 py-0 block";
          if (line.startsWith("+") && !line.startsWith("+++")) {
            className += " diff-add";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            className += " diff-remove";
          } else if (
            line.startsWith("@@") ||
            line.startsWith("diff ") ||
            line.startsWith("---") ||
            line.startsWith("+++") ||
            line.startsWith("index ") ||
            line.startsWith("new file")
          ) {
            className += " diff-header";
          }
          return (
            <code key={i} className={className}>
              {line}
            </code>
          );
        })}
      </pre>
    </div>
  );
}
