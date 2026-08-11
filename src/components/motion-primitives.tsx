import { motion, useInView, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise on scroll into view. Replays every time it re-enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = false,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-8% 0px -8% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
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

/** Staggers direct <StaggerItem> children into view, replaying on re-entry. */
export function Stagger({
  children,
  className,
  once = false,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-6% 0px -6% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
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
  className,
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
export function WordsUp({ text, className, once = false }: { text: string; className?: string; once?: boolean }) {
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

/**
 * Typewriter effect. Types the text out character by character once the element
 * scrolls into view, with a soft blinking caret.
 */
export function TypeLine({
  text,
  className,
  speed = 42,
  startDelay = 250,
  caret = true,
  loop = false,
  pause = 2200,
}: {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
  caret?: boolean;
  loop?: boolean;
  pause?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    if (!deleting && count >= text.length) {
      if (!loop) return;
      const t = window.setTimeout(() => setDeleting(true), pause);
      return () => window.clearTimeout(t);
    }
    if (deleting && count === 0) {
      const t = window.setTimeout(() => setDeleting(false), 400);
      return () => window.clearTimeout(t);
    }
    const delay = count === 0 && !deleting ? startDelay : deleting ? speed / 2 : speed;
    const t = window.setTimeout(() => setCount((c) => c + (deleting ? -1 : 1)), delay);
    return () => window.clearTimeout(t);
  }, [active, count, deleting, loop, pause, speed, startDelay, text.length]);

  const done = !loop && count >= text.length;

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{text.slice(0, count)}</span>
      <span className="sr-only">{text}</span>
      {caret && !done && (
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[0.08em] bg-current align-baseline"
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}
    </span>
  );
}

/** Soft floating blob-free glow that follows scroll, used for warmth. */
export function Breathe({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
