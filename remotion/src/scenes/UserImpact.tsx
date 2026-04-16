import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

interface UserImpactProps {
  userImpactSummary: string;
  userJourneyBefore: string;
  userJourneyAfter: string;
  affectedUserSegment: string;
  pagesAffected: number;
}

export const UserImpact = ({
  userImpactSummary,
  userJourneyBefore,
  userJourneyAfter,
  affectedUserSegment,
  pagesAffected,
}: UserImpactProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headerReveal = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beforeReveal = spring({
    fps,
    frame: Math.max(0, frame - 14),
    config: {damping: 18, mass: 0.8, stiffness: 110},
  });

  const arrowReveal = spring({
    fps,
    frame: Math.max(0, frame - 30),
    config: {damping: 20, stiffness: 100},
  });

  const afterReveal = spring({
    fps,
    frame: Math.max(0, frame - 40),
    config: {damping: 18, mass: 0.8, stiffness: 110},
  });

  const metricsReveal = spring({
    fps,
    frame: Math.max(0, frame - 60),
    config: {damping: 18, stiffness: 100},
  });

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
      <div style={{marginBottom: 36, opacity: headerReveal}}>
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
          User Impact
        </div>
        <div
          style={{
            color: '#1C2024',
            fontSize: 50,
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            maxWidth: 1200,
          }}
        >
          {userImpactSummary}
        </div>
      </div>

      {/* Before -> After journey */}
      <div style={{display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 36}}>
        {/* Before card */}
        <div
          style={{
            flex: 1,
            padding: '32px 36px',
            borderRadius: '20px 0 0 20px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRight: 'none',
            opacity: interpolate(beforeReveal, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(beforeReveal, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              &#x2717;
            </div>
            <div
              style={{
                color: '#EF4444',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Before
            </div>
          </div>
          <div style={{color: '#1C2024', fontSize: 28, fontWeight: 600, lineHeight: 1.4}}>
            {userJourneyBefore}
          </div>
        </div>

        {/* Arrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            background: '#FFFFFF',
            borderTop: '1px solid #E5E7EB',
            borderBottom: '1px solid #E5E7EB',
            opacity: interpolate(arrowReveal, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              color: '#5E6AD2',
              fontSize: 36,
              fontWeight: 800,
              transform: `translateX(${interpolate(arrowReveal, [0, 1], [-10, 0])}px)`,
            }}
          >
            &#x2192;
          </div>
        </div>

        {/* After card */}
        <div
          style={{
            flex: 1,
            padding: '32px 36px',
            borderRadius: '0 20px 20px 0',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderLeft: 'none',
            opacity: interpolate(afterReveal, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(afterReveal, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              &#x2713;
            </div>
            <div
              style={{
                color: '#10B981',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              After
            </div>
          </div>
          <div style={{color: '#1C2024', fontSize: 28, fontWeight: 600, lineHeight: 1.4}}>
            {userJourneyAfter}
          </div>
        </div>
      </div>

      {/* Bottom metrics row */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          opacity: interpolate(metricsReveal, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(metricsReveal, [0, 1], [12, 0])}px)`,
        }}
      >
        <div
          style={{
            padding: '18px 28px',
            borderRadius: 16,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{fontSize: 28}}>&#x1F465;</div>
          <div>
            <div style={{color: '#9CA3AF', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'}}>
              Affected Users
            </div>
            <div style={{color: '#1C2024', fontSize: 24, fontWeight: 700}}>
              {affectedUserSegment}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '18px 28px',
            borderRadius: 16,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{fontSize: 28}}>&#x1F4C4;</div>
          <div>
            <div style={{color: '#9CA3AF', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'}}>
              Pages Updated
            </div>
            <div style={{color: '#1C2024', fontSize: 24, fontWeight: 700}}>
              {pagesAffected} {pagesAffected === 1 ? 'route' : 'routes'}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '18px 28px',
            borderRadius: 16,
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{fontSize: 28}}>&#x2728;</div>
          <div>
            <div style={{color: '#9CA3AF', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'}}>
              Status
            </div>
            <div style={{color: '#10B981', fontSize: 24, fontWeight: 700}}>
              Ready for users
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
