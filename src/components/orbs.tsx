import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative circular motifs: rings, dotted orbits and hand-drawn squiggles
 * inside a circle. Purely visual, they sit behind or beside content and use
 * currentColor / semantic tokens so both themes stay in tune.
 */

type Props = { className?: string };

/** Slowly rotating dotted orbit ring. */
export function OrbitRing({ className, duration = 44, reverse = false }: Props & { duration?: number; reverse?: boolean }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="100" cy="100" r="94" stroke="currentColor" strokeWidth="1" strokeDasharray="3 9" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="100" cy="6" r="4" fill="currentColor" />
      <circle cx="172" cy="100" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="100" cy="172" r="3" fill="currentColor" opacity="0.5" />
    </motion.svg>
  );
}

/** A circle filled with a looping squiggle, like an ink doodle. */
export function SquiggleOrb({ className }: Props) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" fill="none" className={className}>
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <motion.path
        d="M22 118 C48 62 66 156 92 100 C114 52 128 150 150 104 C164 76 172 118 182 100"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ margin: "-5% 0px" }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      />
      <motion.path
        d="M34 74 C60 40 78 96 104 62"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ margin: "-5% 0px" }}
        transition={{ duration: 1.8, delay: 0.2, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Concentric arcs, drawn like a compass sketch. */
export function ArcOrb({ className }: Props) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" fill="none" className={className}>
      {[92, 74, 56, 38, 20].map((r, i) => (
        <motion.circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          stroke="currentColor"
          strokeWidth="1.1"
          strokeDasharray={i % 2 ? "6 8" : undefined}
          opacity={0.75 - i * 0.1}
          animate={{ rotate: i % 2 ? 360 : -360 }}
          transition={{ duration: 30 + i * 12, repeat: Infinity, ease: "linear" }}
          style={{ originX: "100px", originY: "100px" }}
        />
      ))}
    </svg>
  );
}

/** Scattered dot grid, adds texture in empty corners. */
export function DotField({ className, rows = 6, cols = 6 }: Props & { rows?: number; cols?: number }) {
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({ x: 8 + c * 16, y: 8 + r * 16, o: 0.25 + ((r + c) % 4) * 0.18 });
    }
  }
  return (
    <svg aria-hidden viewBox={`0 0 ${cols * 16} ${rows * 16}`} fill="currentColor" className={className}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="1.6" opacity={d.o} />
      ))}
    </svg>
  );
}

/** Hand-drawn wave used as a section divider or underline. */
export function Squiggle({ className }: Props) {
  return (
    <svg aria-hidden viewBox="0 0 240 24" fill="none" className={className}>
      <motion.path
        d="M2 14 C24 2 36 22 58 12 C80 2 92 22 114 12 C136 2 148 22 170 12 C192 2 204 22 238 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ margin: "-5% 0px" }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
    </svg>
  );
}

/**
 * Circular medallion that frames an icon: rotating dotted orbit + soft filled
 * disc. Used for cohort cards and feature bullets.
 */
export function Medallion({
  children,
  className,
  tone = "primary",
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "pine" | "slate";
}) {
  const toneClass =
    tone === "pine" ? "text-pine" : tone === "slate" ? "text-slateblue" : "text-primary";
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <OrbitRing className={cn("absolute inset-0 h-full w-full", toneClass, "opacity-50")} duration={38} />
      <span
        className={cn(
          "relative flex h-[62%] w-[62%] items-center justify-center rounded-full bg-secondary",
          toneClass,
        )}
      >
        {children}
      </span>
    </span>
  );
}
