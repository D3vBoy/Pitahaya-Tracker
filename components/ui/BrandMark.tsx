"use client";

interface BrandMarkProps {
  size?: number;
}

export default function BrandMark({ size = 40 }: BrandMarkProps) {
  return (
    <div
      className="relative grid place-items-center rounded-2xl bg-gradient-primary shadow-glow-cerise"
      style={{ width: size, height: size }}
      aria-label="Pitahaya Tracker"
    >
      <svg width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3.2c4.65 0 8.4 3.75 8.4 8.4S16.65 20 12 20s-8.4-3.75-8.4-8.4 3.75-8.4 8.4-8.4Z" fill="rgba(255,255,255,0.18)" />
        <path d="M12 5.2c3.52 0 6.4 2.88 6.4 6.4S15.52 18 12 18 5.6 15.12 5.6 11.6s2.88-6.4 6.4-6.4Z" fill="rgba(255,255,255,0.9)" />
        <circle cx="9.2" cy="10" r="0.9" fill="#9E2F62" />
        <circle cx="12.3" cy="8.7" r="0.9" fill="#9E2F62" />
        <circle cx="14.8" cy="10.9" r="0.9" fill="#9E2F62" />
        <circle cx="10.9" cy="13.4" r="0.9" fill="#9E2F62" />
        <circle cx="13.6" cy="14.7" r="0.9" fill="#9E2F62" />
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/22" />
    </div>
  );
}