"use client";

import { TicketOutputs } from "../lib/types";
import { Image } from "lucide-react";

export function ScreenshotViewer({ outputs }: { outputs: TicketOutputs }) {
  const beforeKeys = Object.keys(outputs.before_screenshots);
  const afterKeys = Object.keys(outputs.after_screenshots);
  const diffKeys = Object.keys(outputs.diff_heatmaps);

  if (beforeKeys.length === 0 && afterKeys.length === 0) {
    return (
      <div className="text-[13px] text-text-muted py-4 text-center flex flex-col items-center gap-2">
        <Image size={20} />
        No screenshots available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {afterKeys.map((key) => (
        <div key={key} className="space-y-2">
          <div className="text-[12px] font-medium text-text-secondary">
            {key}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {outputs.before_screenshots[key] && (
              <div>
                <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
                  Before
                </div>
                <div className="border border-border-card rounded-md overflow-hidden bg-card-bg aspect-video flex items-center justify-center text-[11px] text-text-muted">
                  <Image size={16} className="mr-1" />
                  {key}
                </div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
                After
              </div>
              <div className="border border-border-card rounded-md overflow-hidden bg-card-bg aspect-video flex items-center justify-center text-[11px] text-text-muted">
                <Image size={16} className="mr-1" />
                {key}
              </div>
            </div>
          </div>
          {diffKeys.includes(key) && (
            <div>
              <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">
                Diff heatmap
              </div>
              <div className="border border-border-card rounded-md overflow-hidden bg-card-bg aspect-video flex items-center justify-center text-[11px] text-text-muted">
                <Image size={16} className="mr-1" />
                diff: {key}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
