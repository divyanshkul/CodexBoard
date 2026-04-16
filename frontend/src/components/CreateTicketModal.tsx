"use client";

import { useState } from "react";
import { CreateTicketRequest } from "../lib/types";
import { X, Plus, Trash2 } from "lucide-react";

interface CreateTicketModalProps {
  onClose: () => void;
  onCreate: (data: CreateTicketRequest) => void;
  projectName?: string;
}

export function CreateTicketModal({
  onClose,
  onCreate,
  projectName,
}: CreateTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [screenshots, setScreenshots] = useState(true);
  const [pixelDiff, setPixelDiff] = useState(true);
  const [video, setVideo] = useState(false);
  const [markdown, setMarkdown] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      acceptance_criteria: criteria.filter((c) => c.trim()),
      target_repo: "",  // Board injects the active project path
      output_preferences: {
        screenshots,
        pixel_diff: pixelDiff,
        video,
        markdown,
      },
    });
  };

  const addCriterion = () => setCriteria([...criteria, ""]);
  const removeCriterion = (i: number) =>
    setCriteria(criteria.filter((_, idx) => idx !== i));
  const updateCriterion = (i: number, val: string) =>
    setCriteria(criteria.map((c, idx) => (idx === i ? val : c)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card-bg rounded-xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto animate-modal"
        style={{ boxShadow: "var(--shadow-modal)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-divider">
          <h2 className="text-[15px] font-semibold text-text-primary tracking-[-0.02em]">
            New ticket
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--status-todo-bg)] text-text-muted hover:text-text-secondary transition-all duration-100"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should be built?"
              className="w-full px-3.5 py-2.5 text-[13px] border border-border-input rounded-lg bg-card-bg text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-[var(--accent-bg)] transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the task in detail..."
              className="w-full px-3.5 py-2.5 text-[13px] border border-border-input rounded-lg bg-card-bg text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-[var(--accent-bg)] transition-all resize-none"
            />
          </div>

          {/* Project indicator (read-only, set by project selector in header) */}
          {projectName && (
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-1.5">
                Project
              </label>
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] border rounded-lg font-medium"
                style={{
                  borderColor: "var(--accent)",
                  background: "var(--accent-bg)",
                  color: "var(--accent)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "var(--status-review)" }}
                />
                {projectName}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-1.5">
              Acceptance criteria
            </label>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 text-[10px] font-semibold text-text-faint">
                    {i + 1}.
                  </div>
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => updateCriterion(i, e.target.value)}
                    placeholder={`Criterion ${i + 1}`}
                    className="flex-1 px-3 py-2 text-[13px] border border-border-input rounded-lg bg-card-bg text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-[var(--accent-bg)] transition-all"
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(i)}
                      className="p-1.5 text-text-faint hover:text-[var(--status-failed)] transition-colors rounded-md hover:bg-[var(--status-failed-bg)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCriterion}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              <Plus size={12} strokeWidth={2.5} /> Add criterion
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-2">
              Output preferences
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Screenshots", val: screenshots, set: setScreenshots },
                { label: "Pixel diff", val: pixelDiff, set: setPixelDiff },
                { label: "Video", val: video, set: setVideo },
                { label: "Markdown", val: markdown, set: setMarkdown },
              ].map(({ label, val, set }) => (
                <label
                  key={label}
                  className="flex items-center gap-2 text-[12px] text-text-secondary cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => set(e.target.checked)}
                    className="rounded border-border-input accent-[var(--accent)] w-3.5 h-3.5"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border-divider">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-text-secondary font-medium border border-border-card rounded-lg hover:bg-[var(--status-todo-bg)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !title.trim() || !description.trim()
              }
              className="px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              Create ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
