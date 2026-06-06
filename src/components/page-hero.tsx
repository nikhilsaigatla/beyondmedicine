import type { ReactNode } from "react";

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
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-cream via-background to-background">
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(closest-side,black,transparent)]">
        <div className="absolute -top-32 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-mist/40 blur-3xl" />
      </div>
      <div className="container-bm relative py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center bm-fade-up">
          {eyebrow && (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> {eyebrow}
            </p>
          )}
          <h1 className="text-balance text-5xl leading-[1.05] text-ink md:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  );
}