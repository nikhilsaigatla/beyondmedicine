import { motion, useInView, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface ElementProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "span";
}

export interface RevealProps extends ElementProps {
  delay?: number;
  y?: number;
  once?: boolean;
}

/** Fade + rise on scroll into view. Replays every time it re-enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
  once = false,
  as = "div",
}: RevealProps) {
  const Component = as === "span" ? motion.span : motion.div;

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-8% 0px -8% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}

const groupVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export interface StaggerProps extends ElementProps {
  once?: boolean;
}

/** Staggers direct <StaggerItem> children into view, replaying on re-entry. */
export function Stagger({
  children,
  className = "",
  once = false,
  as = "div",
}: StaggerProps) {
  const Component = as === "span" ? motion.span : motion.div;

  return (
    <Component
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-6% 0px -6% 0px" }}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className = "", as = "div" }: ElementProps) {
  const Component = as === "span" ? motion.span : motion.div;

  return (
    <Component className={className} variants={itemVariants}>
      {children}
    </Component>
  );
}

/** Thin reading-progress bar for the top of the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const width = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX: width }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-pine"
    />
  );
}

/** Vertical parallax for decorative layers. */
export function Parallax({
  children,
  distance = 80,
  className = "",
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/** Word-by-word entrance for headlines. Replays on re-entry. */
export function WordsUp({ text, className = "", once = false }: { text: string; className?: string; once?: boolean }) {
  const words = text.split(" ");

  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-5% 0px -5% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%", opacity: 0 },
              show: { y: "0%", opacity: 1, transition: { duration: 0.75, ease: EASE } },
            }}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

export interface TypeLineProps {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
  caret?: boolean;
  loop?: boolean;
  pause?: number;
  replay?: boolean;
  keepCaretOnFinish?: boolean;
}

/**
 * Typewriter effect using requestAnimationFrame clock for smooth frame-accurate timing.
 * Reserves full layout height invisibly to prevent layout shift during animation.
 */
export function TypeLine({
  text,
  className = "",
  speed = 26,
  startDelay = 180,
  caret = true,
  loop = false,
  pause = 2200,
  replay = true,
  keepCaretOnFinish = false,
}: TypeLineProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) {
      if (replay) {
        setCount(0);
        setDone(false);
      }
      return;
    }

    let frameId: number;
    let timeoutId: number;
    let start: number | null = null;
    const total = text.length;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start - startDelay;
      const nextCount = elapsed <= 0 ? 0 : Math.min(total, Math.round(elapsed / speed));

      setCount(nextCount);

      if (nextCount < total) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      setDone(true);

      if (loop) {
        timeoutId = window.setTimeout(() => {
          setCount(0);
          setDone(false);
          start = null;
          frameId = requestAnimationFrame(tick);
        }, pause);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [inView, loop, pause, replay, speed, startDelay, text]);

  const showCaret = caret && (!done || keepCaretOnFinish);

  return (
    <span ref={ref} className={`relative inline-block align-top ${className}`}>
      {/* Invisible spacer reserves exact layout dimensions and prevents user highlight conflict */}
      <span aria-hidden className="invisible select-none">
        {text}
      </span>
      <span className="sr-only">{text}</span>

      {/* Visible typed content */}
      <span aria-hidden className="absolute inset-0 flex items-center whitespace-pre">
        <span>{text.slice(0, count)}</span>
        {showCaret && <Caret />}
      </span>
    </span>
  );
}

function Caret() {
  return (
    <span
      className="ml-0.5 inline-block h-[1.05em] w-[2px] rounded-full bg-current align-middle animate-pulse"
      style={{ animationDuration: "0.8s" }}
    />
  );
}

export interface BreatheProps extends ElementProps {
  glow?: boolean;
}

/** Soft floating blob-free motion with optional glow that follows scroll. */
export function Breathe({ children, className = "", glow = false, as = "div" }: BreatheProps) {
  const Component = as === "span" ? motion.span : motion.div;

  return (
    <Component
      className={`relative ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      {glow && (
        <span
          className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-current opacity-[0.04] blur-xl"
          aria-hidden
        />
      )}
      {children}
    </Component>
  );
}