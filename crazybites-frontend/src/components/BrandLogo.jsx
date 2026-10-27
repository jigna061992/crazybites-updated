// src/components/BrandLogo.jsx
// CrazyBits logo (PNG: CrazyBits + Decentralize + Build Grow Earn).
import logo from "../assets/crazybits-logo.png";

export default function BrandLogo({ width, size, className = "" }) {
  // If width is given, use it; otherwise size * 2.4; otherwise 220
  const w = width ?? (size ? size * 2.4 : 220);

  return (
    <div className="flex items-center justify-center">
      <img
        src={logo}
        alt="CrazyBits — Decentralize, Build, Grow, Earn"
        width={w}
        draggable={false}
        className={`h-auto max-w-full select-none ${className}`}
      />
    </div>
  );
}