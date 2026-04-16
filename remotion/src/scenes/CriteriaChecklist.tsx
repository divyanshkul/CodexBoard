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
  completionRate: number;
}

const getStatusMeta = (status: TicketVideoProps['criteria'][number]['status']) => {
  if (status === 'pass') {
    return {
      icon: '\u2713',
      color: '#10B981',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.2)',
    };
  }
  if (status === 'fail') {
    return {
      icon: '\u2717',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.2)',
    };
  }
  return {
    icon: '?',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
  };
};

export const CriteriaChecklist = ({criteria, completionRate}: CriteriaChecklistProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headingOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const passCount = criteria.filter(c => c.status === 'pass').length;

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          opacity: headingOpacity,
          marginBottom: 40,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#5E6AD2',
              fontWeight: 700,
            }}
          >
            Acceptance Criteria
          </div>
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              background: completionRate === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${completionRate === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
              color: completionRate === 100 ? '#10B981' : '#F59E0B',
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {passCount}/{criteria.length} Complete
          </div>
        </div>

        <div
          style={{
            fontSize: 56,
            lineHeight: 1.1,
            color: '#1C2024',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          What was delivered
        </div>
      </div>

      {/* Criteria list */}
      <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
        {criteria.map((item, index) => {
          const delay = 18 + index * 26;
          const reveal = spring({
            fps,
            frame: Math.max(0, frame - delay),
            config: {damping: 16, mass: 0.8, stiffness: 120},
          });

          const opacity = interpolate(reveal, [0, 1], [0, 1]);
          const translateY = interpolate(reveal, [0, 1], [24, 0]);
          const status = getStatusMeta(item.status);

          return (
            <div
              key={`${item.criterion}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '24px 28px',
                borderRadius: 20,
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                opacity,
                transform: `translateY(${translateY}px)`,
              }}
            >
              {/* Status icon */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: status.bg,
                  border: `1px solid ${status.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: status.color,
                  fontSize: 30,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {status.icon}
              </div>

              {/* Criterion text */}
              <div
                style={{
                  color: '#1C2024',
                  fontSize: 32,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {item.criterion}
              </div>

              {/* Status label */}
              <div
                style={{
                  color: status.color,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {item.status === 'pass' ? 'Passed' : item.status === 'fail' ? 'Failed' : 'Pending'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion bar */}
      <div style={{marginTop: 32, opacity: headingOpacity}}>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: '#E5E7EB',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${completionRate}%`,
              borderRadius: 999,
              background: completionRate === 100
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 20,
            color: '#9CA3AF',
            fontWeight: 500,
            textAlign: 'right',
          }}
        >
          {completionRate}% Delivered
        </div>
      </div>
    </AbsoluteFill>
  );
};
