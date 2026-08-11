import type { ReactNode } from "react";
import { motion } from "motion/react";
import { DnaIcon, HelixIcon, MoleculeIcon, AtomIcon } from "@/components/decor";
import { TypeLine } from "@/components/motion-primitives";
import { ArcOrb, DotField, OrbitRing, Squiggle } from "@/components/orbs";

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
      <ArcOrb className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 text-primary/20 md:h-72 md:w-72" />
      <OrbitRing className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 text-sage/30 md:h-64 md:w-64" duration={65} reverse />
      <DotField className="pointer-events-none absolute bottom-6 right-6 h-16 w-16 text-ink/25 md:h-24 md:w-24" />
      <div className="container-bm relative py-16 md:py-32">
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
          <h1 className="text-balance text-3xl leading-[1.15] text-ink sm:text-4xl md:text-6xl">
            <TypeLine text={title} speed={24} startDelay={250} />
          </h1>
          <Squiggle className="mx-auto mt-4 h-5 w-32 text-sage/70 md:w-44" />
          {description && (
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  );
}