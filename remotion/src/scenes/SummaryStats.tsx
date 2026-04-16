import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

interface SummaryStatsProps {
  buildDuration: string;
  pagesAffected: number;
  completionRate: number;
  riskLevel: string;
}

const riskColor = (level: string) => {
  const l = level.toLowerCase();
  if (l === 'low') return '#10B981';
  if (l === 'medium') return '#F59E0B';
  return '#EF4444';
};

export const SummaryStats = ({
  buildDuration,
  pagesAffected,
  completionRate,
  riskLevel,
}: SummaryStatsProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const card1 = spring({fps, frame: Math.max(0, frame - 6), config: {damping: 18, stiffness: 110}});
  const card2 = spring({fps, frame: Math.max(0, frame - 16), config: {damping: 18, stiffness: 110}});
  const card3 = spring({fps, frame: Math.max(0, frame - 26), config: {damping: 18, stiffness: 110}});

  const displayedPages = Math.round(interpolate(card2, [0, 1], [0, pagesAffected]));
  const displayedRate = Math.round(interpolate(card3, [0, 1], [0, completionRate]));
  const durationLength = Math.max(1, Math.round(interpolate(card1, [0, 1], [0, buildDuration.length])));

  const cards = [
    {
      label: 'Delivery Time',
      value: buildDuration.slice(0, durationLength),
      subtitle: 'End-to-end',
      icon: '\u23F1',
      progress: card1,
      accent: '#5E6AD2',
    },
    {
      label: 'Pages Affected',
      value: String(displayedPages),
      subtitle: 'Routes updated',
      icon: '\u25A6',
      progress: card2,
      accent: '#5E6AD2',
    },
    {
      label: 'Completion',
      value: `${displayedRate}%`,
      subtitle: 'Criteria met',
      icon: '\u2713',
      progress: card3,
      accent: displayedRate === 100 ? '#10B981' : '#F59E0B',
    },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        padding: '80px 120px',
        background: 'linear-gradient(180deg, #F8F9FA 0%, #F0F2F5 100%)',
        fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{marginBottom: 44}}>
        <div
          style={{
            color: '#5E6AD2',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Delivery Snapshot
        </div>
        <div
          style={{
            color: '#1C2024',
            fontSize: 56,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          Impact at a glance
        </div>
      </div>

      {/* Cards */}
      <div style={{display: 'flex', gap: 24}}>
        {cards.map((card) => {
          const opacity = interpolate(card.progress, [0, 1], [0, 1]);
          const translateY = interpolate(card.progress, [0, 1], [20, 0]);
          const cardScale = interpolate(card.progress, [0, 1], [0.96, 1]);

          return (
            <div
              key={card.label}
              style={{
                flex: 1,
                padding: '36px 32px',
                borderRadius: 24,
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                opacity,
                transform: `translateY(${translateY}px) scale(${cardScale})`,
              }}
            >
              {/* Icon + label */}
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${card.accent}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  {card.icon}
                </div>
                <div
                  style={{
                    color: '#9CA3AF',
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </div>
              </div>

              {/* Value */}
              <div
                style={{
                  color: card.accent,
                  fontSize: 80,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value}
              </div>

              {/* Subtitle */}
              <div style={{color: '#6B7280', fontSize: 22, fontWeight: 500}}>
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk badge */}
      <div style={{marginTop: 28, display: 'flex', alignItems: 'center', gap: 12}}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: riskColor(riskLevel),
          }}
        />
        <div style={{color: '#9CA3AF', fontSize: 20, fontWeight: 500}}>
          Release readiness:
        </div>
        <div
          style={{
            color: riskColor(riskLevel),
            fontSize: 20,
            fontWeight: 700,
            textTransform: 'capitalize',
          }}
        >
          {riskLevel} risk
        </div>
      </div>
    </AbsoluteFill>
  );
};
