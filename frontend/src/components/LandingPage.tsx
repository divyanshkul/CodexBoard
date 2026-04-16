import {
  ArrowUpRight,
  Camera,
  Clapperboard,
  FileText,
} from "lucide-react";

type LandingPageProps = {
  onOpenDashboard: () => void;
};

const PM_SIGNALS = [
  {
    icon: Camera,
    label: "Screenshots",
    value: "Before and after captures make product changes immediately legible.",
  },
  {
    icon: Clapperboard,
    label: "Videos",
    value: "Walkthrough clips turn implementation into something teams can share.",
  },
  {
    icon: FileText,
    label: "Reports",
    value: "Decision-ready summaries bundle evidence, progress, and review context.",
  },
];

export function LandingPage({ onOpenDashboard }: LandingPageProps) {
  return (
    <main className="landing-shell">
      <div className="landing-orb landing-orb-left" aria-hidden="true" />
      <div className="landing-orb landing-orb-right" aria-hidden="true" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-8">
          <div className="landing-copy animate-slide-up">
            <div className="landing-kicker">
              <span className="landing-kicker-dot" />
              CodexBoard
            </div>

            <h1 className="landing-title">
              <span>An IDE for PMs</span>
              <span className="landing-title-accent">
                the format you know, on steroids
              </span>
            </h1>

            <p className="landing-body">
              Turn a PM brief into assets people can actually react to:
              polished screenshots, walkthrough videos, and concise reports
              that make progress obvious without a status meeting.
            </p>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="landing-cta focus-ring"
              >
                Open dashboard page
                <ArrowUpRight size={18} strokeWidth={2.2} />
              </button>

              <p className="landing-caption">
                Outputs your whole team can see, review, and circulate.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {PM_SIGNALS.map(({ icon: Icon, label, value }, index) => (
                <article
                  key={label}
                  className={`landing-signal-card animate-slide-up animate-stagger-${index + 1}`}
                >
                  <div className="landing-signal-icon">
                    <Icon size={16} strokeWidth={2.15} />
                  </div>
                  <p className="landing-signal-label">{label}</p>
                  <p className="landing-signal-value">{value}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative animate-slide-up lg:justify-self-end">
            <div className="landing-preview-shell">
              <div className="landing-preview-note landing-preview-note-top">
                The brief stays attached, but the payoff is visible output your
                team can consume right away.
              </div>

              <div className="landing-preview">
                <div className="landing-preview-topbar">
                  <div className="flex items-center gap-2">
                    <span className="landing-window-dot bg-[#d8705b]" />
                    <span className="landing-window-dot bg-[#d3aa4d]" />
                    <span className="landing-window-dot bg-[#6ca08f]" />
                  </div>
                  <span className="landing-preview-path">
                    workspace / roadmap / sprint-alpha
                  </span>
                </div>

                <div className="landing-preview-content">
                  <div className="landing-preview-heading">
                    <div>
                      <p className="landing-preview-eyebrow">Output package</p>
                      <h2>Shareable build recap</h2>
                    </div>
                    <span className="landing-preview-badge">Ready to review</span>
                  </div>

                  <div className="landing-preview-grid">
                    <div className="landing-preview-column">
                      <p className="landing-preview-column-label">Screenshots</p>
                      <div className="landing-preview-card tall landing-shot-stack">
                        <div className="landing-shot before">
                          <span>Before</span>
                        </div>
                        <div className="landing-shot after">
                          <span>After</span>
                        </div>
                      </div>
                      <div className="landing-preview-card">
                        Pixel-level diffs highlight what changed.
                      </div>
                    </div>

                    <div className="landing-preview-column featured">
                      <p className="landing-preview-column-label">Walkthrough</p>
                      <div className="landing-preview-card strong">
                        38s product video with transitions, cursor path, and
                        approval-ready narrative
                      </div>
                      <div className="landing-output-list">
                        <div className="landing-output-pill">MP4 export</div>
                        <div className="landing-output-pill">Annotated highlights</div>
                        <div className="landing-output-pill">Async-friendly</div>
                      </div>
                    </div>

                    <div className="landing-preview-column">
                      <p className="landing-preview-column-label">Summary</p>
                      <div className="landing-preview-metric">
                        <span>Screens captured</span>
                        <strong>12</strong>
                      </div>
                      <div className="landing-preview-metric">
                        <span>Walkthrough length</span>
                        <strong>00:38</strong>
                      </div>
                      <div className="landing-preview-metric accent">
                        <span>Report bundle</span>
                        <strong>Ready</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-preview-note landing-preview-note-bottom">
                Less “trust me, it changed.” More “here’s the video, screenshots,
                and summary.”
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
