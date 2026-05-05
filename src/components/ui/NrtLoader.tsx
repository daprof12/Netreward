import React from 'react';

interface NrtLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Premium NetReward splash / loading screen built around the NRT logo.
 * Uses pure CSS animations so no extra dependencies are needed.
 */
const NrtLoader: React.FC<NrtLoaderProps> = ({
  message = 'Loading…',
  size = 'lg',
}) => {
  const dim = size === 'sm' ? 48 : size === 'md' ? 72 : 100;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        background: 'var(--bg-primary, #0d0d1a)',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}
    >
      {/* ── Glowing ring + spinning logo ── */}
      <div style={{ position: 'relative', width: dim + 40, height: dim + 40 }}>
        {/* Outer pulsing glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
            animation: 'nrt-pulse 2s ease-in-out infinite',
          }}
        />

        {/* Spinning arc track */}
        <svg
          viewBox="0 0 120 120"
          width={dim + 40}
          height={dim + 40}
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'nrt-spin 1.6s linear infinite',
          }}
        >
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
              <stop offset="50%" stopColor="#A78BFA" stopOpacity="1" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="120 220"
          />
        </svg>

        {/* Counter-spinning inner arc */}
        <svg
          viewBox="0 0 120 120"
          width={dim + 40}
          height={dim + 40}
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'nrt-spin-reverse 2.4s linear infinite',
          }}
        >
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="rgba(167,139,250,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="60 300"
          />
        </svg>

        {/* Logo image */}
        <img
          src="/nrt-logo.svg"
          alt="NetReward"
          width={dim}
          height={dim}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '18%',
            animation: 'nrt-logo-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        />
      </div>

      {/* ── Brand name ── */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
          }}
        >
          NetReward
        </p>
        <p
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '4px',
            letterSpacing: '0.04em',
            animation: 'nrt-fade 1.2s ease-in-out infinite alternate',
          }}
        >
          {message}
        </p>
      </div>

      {/* ── Dot progress bar ── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#7C3AED',
              animation: `nrt-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Keyframe styles injected once ── */}
      <style>{`
        @keyframes nrt-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes nrt-spin-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes nrt-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.15); opacity: 1; }
        }
        @keyframes nrt-logo-pop {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.7); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes nrt-fade {
          from { opacity: 0.3; }
          to   { opacity: 0.8; }
        }
        @keyframes nrt-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
};

export default NrtLoader;
