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
  repo: string;
}

const panelStyle = {
  width: 1240,
  padding: '72px 84px',
  borderRadius: 36,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.72), rgba(15,23,42,0.92))',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 40px 120px rgba(15, 23, 42, 0.45)',
  backdropFilter: 'blur(18px)',
};

export const TitleCard = ({title, id, repo}: TitleCardProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const entrance = spring({
    fps,
    frame,
    config: {
      damping: 18,
      mass: 0.85,
      stiffness: 120,
    },
  });

  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(entrance, [0, 1], [70, 0]);
  const accentWidth = interpolate(entrance, [0, 1], [0, 180]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 36%), radial-gradient(circle at bottom right, rgba(14,165,233,0.2), transparent 30%), #0f172a',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 36,
          borderRadius: 40,
          border: '1px solid rgba(148,163,184,0.08)',
        }}
      />

      <div
        style={{
          ...panelStyle,
          opacity,
          transform: `translateY(${translateY}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div
          style={{
            width: accentWidth,
            height: 8,
            borderRadius: 999,
            background: '#38bdf8',
            boxShadow: '0 0 28px rgba(56, 189, 248, 0.45)',
          }}
        />

        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#38bdf8',
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          }}
        >
          CodexBoard Delivery Summary
        </div>

        <div
          style={{
            fontSize: 82,
            lineHeight: 1.04,
            fontWeight: 800,
            color: '#e2e8f0',
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              padding: '14px 24px',
              borderRadius: 999,
              background: 'rgba(56,189,248,0.12)',
              border: '1px solid rgba(56,189,248,0.28)',
              color: '#e2e8f0',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {id}
          </div>
          <div
            style={{
              color: '#94a3b8',
              fontSize: 30,
              fontWeight: 500,
            }}
          >
            Repository
          </div>
          <div
            style={{
              color: '#e2e8f0',
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            {repo}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
