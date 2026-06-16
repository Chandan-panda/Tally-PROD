/** Tally brand mark: four tally strokes with a gold strike-through (a counted five). */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} role="img" aria-label="Tally logo">
      <rect width="128" height="128" rx="30" fill="var(--accent)" />
      <g stroke="var(--accent-ink)" strokeWidth="9" strokeLinecap="round">
        <line x1="38" y1="38" x2="38" y2="90" />
        <line x1="56" y1="38" x2="56" y2="90" />
        <line x1="74" y1="38" x2="74" y2="90" />
        <line x1="92" y1="38" x2="92" y2="90" />
      </g>
      <line x1="28" y1="86" x2="102" y2="44" stroke="#e8b84b" strokeWidth="9" strokeLinecap="round" />
    </svg>
  )
}