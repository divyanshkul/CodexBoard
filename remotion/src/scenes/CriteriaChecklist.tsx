import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {TicketVideoProps} from '../types';

interface CriteriaChecklistProps {
  criteria: TicketVideoProps['criteria'];
}

const getStatusMeta = (status: TicketVideoProps['criteria'][number]['status']) => {
  if (status === 'pass') {
    return {
      badge: '✓',
      color: '#22c55e',
      surface: 'rgba(34,197,94,0.1)',
      label: 'Pass',
    };
  }

  if (status === 'fail') {
    return {
      badge: '!',
      color: '#f87171',
      surface: 'rgba(248,113,113,0.1)',
      label: 'Fail',
    };
  }

  return {
    badge: '?',
    color: '#fbbf24',
    surface: 'rgba(251,191,36,0.1)',
    label: 'Unknown',
  };
};

export const CriteriaChecklist = ({criteria}: CriteriaChecklistProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headingOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        padding: '100px 140px',
        background:
          'radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 32%), #0f172a',
        fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          opacity: headingOpacity,
          marginBottom: 44,
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#38bdf8',
            fontWeight: 700,
          }}
        >
          Acceptance Criteria
        </div>
        <div
          style={{
            fontSize: 72,
            lineHeight: 1.05,
            color: '#e2e8f0',
            fontWeight: 800,
          }}
        >
          Implementation checks completed
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            color: '#94a3b8',
            maxWidth: 1100,
          }}
        >
          Each requirement is revealed in sequence to reinforce a clean, audited
          rollout.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {criteria.map((item, index) => {
          const delay = 18 + index * 26;
          const reveal = spring({
            fps,
            frame: Math.max(0, frame - delay),
            config: {
              damping: 16,
              mass: 0.8,
              stiffness: 120,
            },
          });

          const opacity = interpolate(reveal, [0, 1], [0, 1]);
          const translateY = interpolate(reveal, [0, 1], [32, 0]);
          const status = getStatusMeta(item.status);

          return (
            <div
              key={`${item.criterion}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '26px 30px',
                borderRadius: 28,
                background: 'rgba(15,23,42,0.75)',
                border: '1px solid rgba(148,163,184,0.16)',
                boxShadow: '0 18px 60px rgba(15, 23, 42, 0.28)',
                opacity,
                transform: `translateY(${translateY}px)`,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  background: status.surface,
                  border: `1px solid ${status.color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: status.color,
                  fontSize: 38,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {status.badge}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    color: '#e2e8f0',
                    fontSize: 36,
                    lineHeight: 1.2,
                    fontWeight: 650,
                  }}
                >
                  {item.criterion}
                </div>
                <div
                  style={{
                    color: status.color,
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {status.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
