import { ImageResponse } from "next/og";

function star(cx: number, cy: number, R: number, r: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`;
  }).join(" ");
}

/** Icône de l'application (étincelle), rendue en PNG à la demande. */
export function iconImage(size: number, { maskable = false } = {}) {
  const pad = maskable ? size * 0.12 : 0;
  const radius = maskable ? 0 : size * 0.22;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const R = inner * 0.3;
  const r = R * 0.28;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8a8aff" />
              <stop offset="1" stopColor="#5b5be6" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={size} height={size} rx={radius} fill="url(#g)" />
          <polygon points={star(cx - inner * 0.04, cy + inner * 0.04, R, r)} fill="#ffffff" />
          <polygon points={star(cx + inner * 0.22, cy - inner * 0.22, R * 0.38, r * 0.38)} fill="#ffffff" opacity="0.95" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
