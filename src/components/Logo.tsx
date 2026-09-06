// /** Tally brand mark: four tally strokes with a gold strike-through (a counted five). */
// export default function Logo({ className }: { className?: string }) {
//   return (
//     <svg viewBox="0 0 128 128" className={className} role="img" aria-label="Tally logo">
//       <rect width="128" height="128" rx="30" fill="var(--accent)" />
//       <g stroke="var(--accent-ink)" strokeWidth="9" strokeLinecap="round">
//         <line x1="38" y1="38" x2="38" y2="90" />
//         <line x1="56" y1="38" x2="56" y2="90" />
//         <line x1="74" y1="38" x2="74" y2="90" />
//         <line x1="92" y1="38" x2="92" y2="90" />
//       </g>
//       <line x1="28" y1="86" x2="102" y2="44" stroke="#e8b84b" strokeWidth="9" strokeLinecap="round" />
//     </svg>
//   )
// }
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label="Tally logo"
    >
      <defs>
        <linearGradient id="tally-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#238c80" />
          <stop offset="100%" stopColor="#0e504f" />
        </linearGradient>

        <linearGradient id="tally-logo-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7fffb" />
          <stop offset="100%" stopColor="#b6e3d5" />
        </linearGradient>
      </defs>

      <rect
        width="128"
        height="128"
        rx="30"
        fill="url(#tally-logo-bg)"
      />

      <path
        d="M29 95L49 75L66 88L101 39"
        fill="none"
        stroke="#e8bd68"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g
        stroke="url(#tally-logo-mark)"
        strokeWidth="9"
        strokeLinecap="round"
      >
        <line x1="31" y1="35" x2="31" y2="78" />
        <line x1="49" y1="35" x2="49" y2="69" />
        <line x1="67" y1="35" x2="67" y2="78" />
        <line x1="85" y1="35" x2="85" y2="55" />
      </g>
    </svg>
  )
}