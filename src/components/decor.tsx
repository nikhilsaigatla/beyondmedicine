/**
 * Minimal hand-drawn-style scientific motifs used as quiet background
 * accents. All strokes use currentColor so opacity / color is controlled
 * by the parent.
 */

type Props = { className?: string };

/**
 * Build two sine-wave strands and the base-pair rungs that connect them.
 * `cx` is the helix center, `amp` the amplitude, `period` the full turn in y units.
 * Strand B is 180° out of phase with Strand A — that's what makes it read as DNA.
 */
function buildDoubleHelix({
  height,
  cx,
  amp,
  period,
  step = 2,
}: {
  height: number;
  cx: number;
  amp: number;
  period: number;
  step?: number;
}) {
  const ptsA: string[] = [];
  const ptsB: string[] = [];
  for (let y = 0; y <= height; y += step) {
    const phase = (2 * Math.PI * y) / period;
    const xA = cx + amp * Math.sin(phase);
    const xB = cx - amp * Math.sin(phase);
    ptsA.push(`${xA.toFixed(2)},${y}`);
    ptsB.push(`${xB.toFixed(2)},${y}`);
  }
  // Base pair rungs: sample within each half-turn, denser near the midpoint
  // (where the strands are farthest apart) so they look like real base pairs.
  const rungs: { x1: number; x2: number; y: number; opacity: number }[] = [];
  const halfTurn = period / 2;
  const halfTurns = Math.floor(height / halfTurn);
  for (let h = 0; h < halfTurns; h++) {
    // 5 rungs per half-turn, skipping the crossover endpoints
    for (let k = 1; k <= 5; k++) {
      const t = k / 6; // 0 < t < 1 within this half-turn
      const y = h * halfTurn + t * halfTurn;
      const phase = (2 * Math.PI * y) / period;
      const xA = cx + amp * Math.sin(phase);
      const xB = cx - amp * Math.sin(phase);
      // Fade near crossovers so rungs don't poke out of the strands
      const opacity = Math.sin(t * Math.PI);
      rungs.push({ x1: xA, x2: xB, y, opacity });
    }
  }
  return {
    pathA: "M " + ptsA.join(" L "),
    pathB: "M " + ptsB.join(" L "),
    rungs,
  };
}

export function DnaIcon({ className }: Props) {
  const { pathA, pathB, rungs } = buildDoubleHelix({
    height: 200,
    cx: 60,
    amp: 34,
    period: 96,
  });
  return (
    <svg
      viewBox="0 0 120 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Back strand first so the front strand visually overlaps at crossovers */}
      <path d={pathB} opacity="0.55" />
      {rungs.map((r, i) => (
        <line
          key={i}
          x1={r.x1}
          y1={r.y}
          x2={r.x2}
          y2={r.y}
          strokeWidth="0.9"
          opacity={r.opacity * 0.85}
        />
      ))}
      <path d={pathA} />
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

export function CellIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.2" className={className}>
      <circle cx="100" cy="100" r="78" />
      <circle cx="100" cy="100" r="28" />
      <circle cx="100" cy="100" r="10" fill="currentColor" />
      <circle cx="60" cy="70" r="4" />
      <circle cx="148" cy="78" r="3" />
      <circle cx="140" cy="138" r="5" />
      <circle cx="64" cy="142" r="3" />
      <circle cx="44" cy="108" r="2.5" />
    </svg>
  );
}

export function HelixIcon({ className }: Props) {
  const { pathA, pathB, rungs } = buildDoubleHelix({
    height: 200,
    cx: 30,
    amp: 18,
    period: 80,
  });
  return (
    <svg
      viewBox="0 0 60 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={pathB} opacity="0.55" />
      {rungs.map((r, i) => (
        <line
          key={i}
          x1={r.x1}
          y1={r.y}
          x2={r.x2}
          y2={r.y}
          strokeWidth="0.8"
          opacity={r.opacity * 0.8}
        />
      ))}
      <path d={pathA} />
    </svg>
  );
}

export function PetriIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 200 140" fill="none" stroke="currentColor" strokeWidth="1.2" className={className}>
      <ellipse cx="100" cy="70" rx="86" ry="46" />
      <ellipse cx="100" cy="62" rx="86" ry="46" />
      <circle cx="78" cy="58" r="6" />
      <circle cx="118" cy="66" r="9" />
      <circle cx="96" cy="78" r="4" />
      <circle cx="138" cy="50" r="3" />
    </svg>
  );
}

export function NeuronIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className}>
      <circle cx="100" cy="100" r="18" />
      <path d="M100 82 l-10 -32 l-22 -10" />
      <path d="M100 82 l14 -34 l24 -6" />
      <path d="M82 96 l-32 -8 l-18 -22" />
      <path d="M82 110 l-36 8 l-14 22" />
      <path d="M118 102 l40 -2 l16 -18" />
      <path d="M114 116 l30 22 l28 6" />
      <path d="M100 118 l-6 30 l-22 18" />
      <path d="M100 118 l10 28 l28 14" />
    </svg>
  );
}

export function HeartbeatIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 240 80" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M0 40 H50 L62 18 L82 62 L100 28 L116 52 L132 40 H240" />
    </svg>
  );
}