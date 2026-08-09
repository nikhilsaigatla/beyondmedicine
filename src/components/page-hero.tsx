import type { ReactNode } from "react";
import { motion } from "motion/react";
import { DnaIcon, HelixIcon, MoleculeIcon, AtomIcon } from "@/components/decor";
import { TypeLine } from "@/components/motion-primitives";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-cream">
      <div className="bm-grid pointer-events-none absolute inset-0 opacity-70" />
      <DnaIcon className="pointer-events-none absolute left-6 top-16 hidden h-64 w-28 text-ink/[0.08] md:block" />
      <HelixIcon className="pointer-events-none absolute right-10 top-20 hidden h-56 w-20 text-ink/[0.07] md:block" />
      <MoleculeIcon className="pointer-events-none absolute left-1/4 bottom-6 hidden h-28 w-28 text-ink/[0.05] lg:block" />
      <AtomIcon className="pointer-events-none absolute right-1/4 bottom-10 hidden h-28 w-28 text-ink/[0.05] lg:block" />
      <div className="container-bm relative py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {eyebrow && (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> {eyebrow}
            </p>
          )}
          <h1 className="text-balance text-5xl leading-[1.05] text-ink md:text-6xl">
            <TypeLine text={title} speed={26} startDelay={350} />
          </h1>
          {description && (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  );
}