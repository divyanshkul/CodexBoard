import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

interface SummaryStatsProps {
  filesChanged: number;
  buildDuration: string;
  riskLevel: string;
}

const cardStyle = {
  flex: 1,
  minHeight: 360,
  borderRadius: 34,
  padding: '38px 40px',
  background:
    'linear-gradient(180deg, rgba(30,41,59,0.82), rgba(15,23,42,0.96))',
  border: '1px solid rgba(148,163,184,0.16)',
  boxShadow: '0 22px 64px rgba(15, 23, 42, 0.32)',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
};

const riskPalette = (riskLevel: string) => {
  const lowered = riskLevel.toLowerCase();

  if (lowered === 'low') {
    return {color: '#22c55e', surface: 'rgba(34,197,94,0.14)'};
  }

  if (lowered === 'medium') {
    return {color: '#f59e0b', surface: 'rgba(245,158,11,0.14)'};
  }

  return {color: '#f87171', surface: 'rgba(248,113,113,0.14)'};
};

export const SummaryStats = ({
  filesChanged,
  buildDuration,
  riskLevel,
}: SummaryStatsProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const buildReveal = spring({
    fps,
    frame: Math.max(0, frame - 8),
    config: {damping: 18, stiffness: 120},
  });
  const durationReveal = spring({
    fps,
    frame: Math.max(0, frame - 18),
    config: {damping: 18, stiffness: 120},
  });
  const riskReveal = spring({
    fps,
    frame: Math.max(0, frame - 28),
    config: {damping: 18, stiffness: 120},
  });

  const displayedFiles = Math.round(interpolate(buildReveal, [0, 1], [0, filesChanged]));
  const durationLength = Math.max(
    1,
    Math.round(interpolate(durationReveal, [0, 1], [0, buildDuration.length])),
  );
  const riskColors = riskPalette(riskLevel);

  const cards = [
    {
      label: 'Files Changed',
      value: String(displayedFiles),
      note: 'Implementation surface',
      progress: buildReveal,
      color: '#38bdf8',
    },
    {
      label: 'Build Duration',
      value: buildDuration.slice(0, durationLength),
      note: 'End-to-end execution',
      progress: durationReveal,
      color: '#38bdf8',
    },
    {
      label: 'Risk Level',
      value: riskLevel,
      note: 'Release readiness',
      progress: riskReveal,
      color: riskColors.color,
      surface: riskColors.surface,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        padding: '96px 120px',
        background:
          'radial-gradient(circle at top center, rgba(56,189,248,0.16), transparent 34%), #0f172a',
        fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          marginBottom: 42,
        }}
      >
        <div
          style={{
            color: '#38bdf8',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Delivery Snapshot
        </div>
        <div
          style={{
            color: '#e2e8f0',
            fontSize: 76,
            lineHeight: 1.02,
            fontWeight: 800,
          }}
        >
          Final checks at a glance
        </div>
      </div>

      <div style={{display: 'flex', gap: 28}}>
        {cards.map((card) => {
          const opacity = interpolate(card.progress, [0, 1], [0, 1]);
          const scale = interpolate(card.progress, [0, 1], [0.9, 1]);
          const translateY = interpolate(card.progress, [0, 1], [26, 0]);

          return (
            <div
              key={card.label}
              style={{
                ...cardStyle,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    color: '#94a3b8',
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    color: '#e2e8f0',
                    fontSize: 24,
                    lineHeight: 1.4,
                  }}
                >
                  {card.note}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    color: card.color,
                    fontSize: 94,
                    fontWeight: 800,
                    lineHeight: 0.95,
                    textTransform: 'capitalize',
                  }}
                >
                  {card.value}
                </div>
                {card.surface ? (
                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: 999,
                      background: card.surface,
                      border: `1px solid ${card.color}44`,
                      color: card.color,
                      fontSize: 24,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    Stable
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
