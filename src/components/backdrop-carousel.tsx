import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const SLIDES = [
  "/images/bg-lab-1.jpg",
  "/images/bg-lab-2.jpg",
  "/images/bg-lab-3.jpg",
  "/images/bg-lab-4.jpg",
];

/**
 * Slow cross-fading photographic backdrop. Sits behind hero content at low
 * opacity so the wordmark stays the focus.
 */
export function BackdropCarousel({
  interval = 6500,
  className = "",
}: {
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % SLIDES.length), interval);
    return () => window.clearInterval(id);
  }, [interval]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 2.2, ease: "easeInOut" }, scale: { duration: 9, ease: "linear" } }}
        >
          <img
            src={SLIDES[i]}
            alt=""
            className="h-full w-full object-cover opacity-[0.55] grayscale-[0.15] dark:opacity-[0.5]"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-background/20 dark:bg-background/35" />
      <div className="bm-grid absolute inset-0 opacity-30" />
    </div>
  );
}
