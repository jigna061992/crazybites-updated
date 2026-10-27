// src/components/CoinMascot.jsx
// Original CrazyBits coin mascot: glossy 3D-style cartoon coin that floats, blinks and waves.
// <CoinMascot size={320} />
export default function CoinMascot({ size = 300, className = "" }) {
  return (
    <svg
      className={`cb-mascot ${className}`}
      width={size}
      height={size * (270 / 260)}
      viewBox="0 0 260 270"
      role="img"
      aria-label="CrazyBits coin mascot"
    >
      <defs>
        <radialGradient id="mc-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2ee06f" stopOpacity=".28" />
          <stop offset="1" stopColor="#2ee06f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mc-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1a8" />
          <stop offset=".45" stopColor="#e0a912" />
          <stop offset="1" stopColor="#8a5a05" />
        </linearGradient>
        <radialGradient id="mc-face" cx=".35" cy=".28" r=".85">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset=".45" stopColor="#f7c52d" />
          <stop offset="1" stopColor="#d9971a" />
        </radialGradient>
        <linearGradient id="mc-limb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="1" stopColor="#d9971a" />
        </linearGradient>
      </defs>

      {/* aura + orbit */}
      <circle cx="130" cy="130" r="125" fill="url(#mc-aura)" />
      <g className="mc-orbit">
        <circle cx="130" cy="130" r="118" fill="none" stroke="#2ee06f" strokeOpacity=".35" strokeDasharray="2 7" strokeLinecap="round" />
        <circle cx="130" cy="12" r="4.5" fill="#2ee06f" />
        <circle cx="248" cy="130" r="3.2" fill="#f7c52d" />
        <circle cx="46" cy="214" r="3.5" fill="#4fb8ff" />
      </g>

      {/* sparkles */}
      <path className="mc-twinkle" d="M34 58 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#ffe58a" />
      <path className="mc-twinkle d2" d="M226 40 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5z" fill="#8ff3b5" />

      {/* ground shadow */}
      <ellipse className="mc-shadow" cx="130" cy="252" rx="62" ry="9" fill="#000" opacity=".4" />

      {/* floating character */}
      <g className="mc-float">
        {/* feet */}
        <ellipse cx="104" cy="219" rx="19" ry="10" fill="url(#mc-limb)" stroke="#8a5a05" strokeWidth="2" />
        <ellipse cx="156" cy="219" rx="19" ry="10" fill="url(#mc-limb)" stroke="#8a5a05" strokeWidth="2" />

        {/* left arm */}
        <path d="M54 140 Q30 160 38 190" fill="none" stroke="#8a5a05" strokeWidth="15" strokeLinecap="round" />
        <path d="M54 140 Q30 160 38 190" fill="none" stroke="url(#mc-limb)" strokeWidth="11" strokeLinecap="round" />
        <circle cx="38" cy="194" r="12" fill="url(#mc-limb)" stroke="#8a5a05" strokeWidth="2" />

        {/* coin body: rim + face */}
        <circle cx="130" cy="130" r="84" fill="#7a4d04" />
        <circle cx="130" cy="130" r="82" fill="url(#mc-rim)" />
        <circle cx="130" cy="130" r="72" fill="url(#mc-face)" stroke="#a8740a" strokeWidth="2" />
        <circle cx="130" cy="130" r="65" fill="none" stroke="#fff1a8" strokeOpacity=".55" strokeWidth="1.5" />
        {/* rim ticks */}
        {Array.from({ length: 24 }).map((_, i) => (
          <line key={i} x1="130" y1="49" x2="130" y2="54" stroke="#8a5a05" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" transform={`rotate(${i * 15} 130 130)`} />
        ))}

        {/* emblem */}
        <text x="130" y="94" textAnchor="middle" fontFamily="Space Grotesk, Inter, sans-serif" fontWeight="700" fontSize="24" fill="#a8740a" opacity=".85">B</text>

        {/* eyes */}
        <g className="mc-eyes">
          <ellipse cx="104" cy="124" rx="15" ry="19" fill="#fff" stroke="#8a5a05" strokeWidth="1.5" />
          <ellipse cx="156" cy="124" rx="15" ry="19" fill="#fff" stroke="#8a5a05" strokeWidth="1.5" />
          <circle cx="106" cy="128" r="10" fill="#0a1a38" />
          <circle cx="154" cy="128" r="10" fill="#0a1a38" />
          <circle cx="102" cy="123" r="3.6" fill="#fff" />
          <circle cx="150" cy="123" r="3.6" fill="#fff" />
          <circle cx="109" cy="132" r="1.8" fill="#fff" />
          <circle cx="157" cy="132" r="1.8" fill="#fff" />
        </g>

        {/* cheeks */}
        <ellipse cx="86" cy="154" rx="11" ry="6.5" fill="#ff8a5c" opacity=".55" />
        <ellipse cx="174" cy="154" rx="11" ry="6.5" fill="#ff8a5c" opacity=".55" />

        {/* mouth */}
        <path d="M106 150 Q130 184 154 150 Q130 156 106 150 Z" fill="#5a1a10" stroke="#5a1a10" strokeWidth="2" strokeLinejoin="round" />
        <path d="M117 165 Q130 155 143 165 Q130 177 117 165 Z" fill="#ff6b7a" />

        {/* gloss */}
        <ellipse cx="92" cy="86" rx="30" ry="12" transform="rotate(-32 92 86)" fill="#fff" opacity=".5" />
        <ellipse cx="170" cy="196" rx="22" ry="6" transform="rotate(-28 170 196)" fill="#fff" opacity=".18" />

        {/* waving right arm */}
        <g className="mc-wave">
          <path d="M206 140 Q238 124 234 92" fill="none" stroke="#8a5a05" strokeWidth="15" strokeLinecap="round" />
          <path d="M206 140 Q238 124 234 92" fill="none" stroke="url(#mc-limb)" strokeWidth="11" strokeLinecap="round" />
          <circle cx="234" cy="84" r="13" fill="url(#mc-limb)" stroke="#8a5a05" strokeWidth="2" />
          <ellipse cx="222" cy="86" rx="5" ry="8" transform="rotate(-25 222 86)" fill="url(#mc-limb)" stroke="#8a5a05" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}
