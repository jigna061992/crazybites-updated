// src/components/RankBadge.jsx
// Real 3D spinning coin / gem (CSS 3D: front face + back face + stacked edge layers).
// <RankBadge tier="silver" | "gold" | "diamond" size={112} laurel={true} />
const PALETTE = {
  silver:  { l: "#f4f7fb", m: "#c3ccd8", d: "#7b8794", ink: "#2b3440", laurel: "#a9b4c4", edge: "#8d99a8" },
  gold:    { l: "#fff1a8", m: "#f7c52d", d: "#a8740a", ink: "#4a3000", laurel: "#e0a912", edge: "#b98007" },
  diamond: { l: "#d9f6ff", m: "#56c8ff", d: "#1d6fb8", ink: "#052b52", laurel: "#2fa3e0", edge: "#2a8fd6" },
};
const NAME = { silver: "Silver", gold: "Gold", diamond: "Diamond" };

// Laurel's 6 but  (left side); right side happen mirror 
const LEAVES = [
  [52, 105.3, -80], [33.6, 97.7, -55], [20.2, 83, -30],
  [14.2, 64, -5], [16.8, 44.3, 20], [27.5, 27.5, 45],
];

const DIAMOND_PTS = "34,46 47,30 73,30 86,46 60,92";

// only shape (for edge / thickness layer )
function Shape({ tier, fill, stroke }) {
  return tier === "diamond" ? (
    <polygon points={DIAMOND_PTS} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
  ) : (
    <circle cx="60" cy="60" r="34" fill={fill} stroke={stroke} strokeWidth="1" />
  );
}

// Full face (laurel + coin / gem + B)
function Face({ tier, p, gid, laurel }) {
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.l} />
          <stop offset="0.5" stopColor={p.m} />
          <stop offset="1" stopColor={p.d} />
        </linearGradient>
      </defs>

      {laurel && (
        <g fill={p.laurel} opacity="0.95">
          {LEAVES.map(([x, y, r], i) => (
            <g key={i}>
              <ellipse rx="5" ry="11" transform={`translate(${x} ${y}) rotate(${r})`} />
              <ellipse rx="5" ry="11" transform={`translate(${120 - x} ${y}) rotate(${-r})`} />
            </g>
          ))}
        </g>
      )}

      {tier === "diamond" ? (
        <g>
          <polygon points={DIAMOND_PTS} fill={`url(#${gid})`} stroke={p.d} strokeWidth="2" strokeLinejoin="round" />
          <path d="M34 46 H86 M47 30 L54 46 L60 92 M73 30 L66 46 L60 92 M54 46 L60 30 L66 46" fill="none" stroke={p.l} strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
          <circle cx="60" cy="60" r="34" fill={`url(#${gid})`} stroke={p.d} strokeWidth="2" />
          <circle cx="60" cy="60" r="28" fill="none" stroke={p.l} strokeWidth="1.5" />
          <text x="60" y="73" textAnchor="middle" fontFamily="Space Grotesk, Inter, sans-serif" fontWeight="700" fontSize="36" fill={p.ink}>B</text>
        </g>
      )}
    </>
  );
}

const LAYERS = 10;

export default function RankBadge({ tier = "gold", size = 112, laurel = true, spin = true }) {
  const p = PALETTE[tier] || PALETTE.gold;
  const gid = `rb-${tier}-${laurel ? "l" : "c"}`;
  const vb = laurel ? "0 0 120 120" : "22 22 76 76";
  const thick = Math.max(4, size * 0.09);          // coin ni jadai (px)
  const half = thick / 2;

  const svgStyle = { position: "absolute", inset: 0, width: "100%", height: "100%" };

  return (
    <span
      className="coin3d"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${NAME[tier] || "Gold"} rank`}
    >
      <span className={`coin3d-body${spin ? "" : " still"}`}>
        {/* Edge: stacked the shape along the Z-axis -> thickness */}
        {Array.from({ length: LAYERS }).map((_, i) => {
          const z = -half + (thick * i) / (LAYERS - 1);
          return (
            <svg key={i} viewBox={vb} style={{ ...svgStyle, transform: `translateZ(${z}px)` }} aria-hidden="true">
              <Shape tier={tier} fill={i % 2 ? p.edge : p.d} stroke={p.d} />
            </svg>
          );
        })}

        {/* Front face */}
        <svg viewBox={vb} style={{ ...svgStyle, transform: `translateZ(${half + 0.5}px)`, backfaceVisibility: "hidden" }} aria-hidden="true">
          <Face tier={tier} p={p} gid={`${gid}-f`} laurel={laurel} />
        </svg>

        {/* Back face */}
        <svg viewBox={vb} style={{ ...svgStyle, transform: `rotateY(180deg) translateZ(${half + 0.5}px)`, backfaceVisibility: "hidden" }} aria-hidden="true">
          <Face tier={tier} p={p} gid={`${gid}-b`} laurel={laurel} />
        </svg>
      </span>
    </span>
  );
}
