import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

interface TitleCardProps {
  title: string;
  id: string;
  description: string;
  buildDuration: string;
}

export const TitleCard = ({title, id, description, buildDuration}: TitleCardProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrance = spring({
    fps,
    frame,
    config: {damping: 20, mass: 0.8, stiffness: 100},
  });

  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(entrance, [0, 1], [40, 0]);
  const scale = interpolate(entrance, [0, 1], [0.97, 1]);

  const badgeOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 100,
        background: 'linear-gradient(145deg, #F8F9FA 0%, #EEF0F4 50%, #E8EBF0 100%)',
        fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      }}
    >
      {/* Subtle geometric accent */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,106,210,0.08), transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)',
        }}
      />

      <div
        style={{
          width: 1300,
          padding: '64px 80px',
          borderRadius: 28,
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Shipped badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: badgeOpacity,
          }}
        >
          <div
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#10B981',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Feature Delivered
          </div>
          <div
            style={{
              color: '#9CA3AF',
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            {id}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            lineHeight: 1.08,
            fontWeight: 800,
            color: '#1C2024',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.5,
            color: '#6B7280',
            maxWidth: 1000,
          }}
        >
          {description}
        </div>

        {/* Delivery time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#5E6AD2',
            }}
          />
          <div
            style={{
              fontSize: 24,
              color: '#5E6AD2',
              fontWeight: 600,
            }}
          >
            Delivered in {buildDuration}
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            fontSize: 18,
            color: '#D1D5DB',
            fontWeight: 500,
            letterSpacing: '0.04em',
            marginTop: 4,
          }}
        >
          Powered by CodexBoard
        </div>
      </div>
    </AbsoluteFill>
  );
};
