/**
 * Minimal hand-drawn-style scientific motifs used as quiet background
 * accents. All strokes use currentColor so opacity / color is controlled
 * by the parent.
 */

type Props = { className?: string };

export function DnaIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 120 200" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className}>
      <path d="M30 5 C 90 35, 30 65, 90 95 C 30 125, 90 155, 30 195" />
      <path d="M90 5 C 30 35, 90 65, 30 95 C 90 125, 30 155, 90 195" />
      {[20, 40, 60, 80, 100, 120, 140, 160, 180].map((y) => (
        <line key={y} x1="34" y1={y} x2="86" y2={y} />
      ))}
    </svg>
  );
}

export function MoleculeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.2" className={className}>
      <circle cx="100" cy="40" r="6" />
      <circle cx="40" cy="100" r="6" />
      <circle cx="160" cy="100" r="6" />
      <circle cx="70" cy="160" r="6" />
      <circle cx="130" cy="160" r="6" />
      <circle cx="100" cy="100" r="9" />
      <line x1="100" y1="100" x2="100" y2="46" />
      <line x1="100" y1="100" x2="46" y2="100" />
      <line x1="100" y1="100" x2="154" y2="100" />
      <line x1="100" y1="100" x2="74" y2="156" />
      <line x1="100" y1="100" x2="126" y2="156" />
    </svg>
  );
}

export function MicroscopeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 160 200" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M70 20 l30 0 l8 16 l-46 0 z" />
      <line x1="84" y1="36" x2="84" y2="92" />
      <circle cx="84" cy="100" r="14" />
      <path d="M84 114 v18" />
      <path d="M60 140 q24 -18 48 0" />
      <path d="M40 168 h100" />
      <path d="M50 168 l-6 16 h72 l-6 -16" />
      <line x1="108" y1="60" x2="140" y2="60" />
      <line x1="120" y1="60" x2="120" y2="92" />
    </svg>
  );
}

export function PipetteIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 80 200" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="30" y="10" width="20" height="36" rx="3" />
      <line x1="40" y1="46" x2="40" y2="150" />
      <path d="M28 150 h24 l-12 30 z" />
      <line x1="34" y1="60" x2="46" y2="60" />
      <line x1="34" y1="80" x2="46" y2="80" />
      <line x1="34" y1="100" x2="46" y2="100" />
      <line x1="34" y1="120" x2="46" y2="120" />
    </svg>
  );
}

export function AtomIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.2" className={className}>
      <ellipse cx="100" cy="100" rx="80" ry="30" />
      <ellipse cx="100" cy="100" rx="80" ry="30" transform="rotate(60 100 100)" />
      <ellipse cx="100" cy="100" rx="80" ry="30" transform="rotate(120 100 100)" />
      <circle cx="100" cy="100" r="6" fill="currentColor" />
    </svg>
  );
}

export function FlaskIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="45" y1="14" x2="75" y2="14" />
      <path d="M50 14 v40 l-30 70 q-4 22 22 22 h36 q26 0 22 -22 l-30 -70 v-40" />
      <line x1="32" y1="100" x2="88" y2="100" />
    </svg>
  );
}