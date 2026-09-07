import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { AlertTriangle, ArrowUpRight, Check, Heart, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { FlaskIcon, MoleculeIcon } from "@/components/decor";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply — Beyond Medicine" },
      { name: "description", content: "Apply to join Beyond Medicine. Applications reviewed on a rolling basis. No prior research experience required for the Beginner Cohort." },
      { property: "og:title", content: "Apply — Beyond Medicine" },
      { property: "og:description", content: "Join Beyond Medicine — applications reviewed on a rolling basis." },
    ],
  }),
  component: Apply,
});

function Apply() {
  return (
    <div>
      <PageHero
        eyebrow="Apply"
        title="Join the initiative."
        description="Applications are reviewed on a rolling basis. We welcome students who are curious, motivated, collaborative, and interested in interdisciplinary learning."
      >
        <p className="inline-flex items-center gap-2 rounded-full border border-sage/40 bg-sage/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          100% Free — Always
        </p>
      </PageHero>

      <section className="container-bm relative py-20 md:py-24">
        <MoleculeIcon className="pointer-events-none absolute right-4 top-4 hidden h-40 w-40 text-ink/[0.07] md:block" />
        <FlaskIcon className="pointer-events-none absolute left-2 bottom-2 hidden h-36 w-24 text-ink/[0.08] lg:block" />
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-cream p-8 md:p-10">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background text-primary">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Before you apply</p>
              <h2 className="mt-2 font-display text-2xl text-ink">Please review the Home and Research Process pages.</h2>
              <p className="mt-3 text-muted-foreground">
                Understanding our cohort structure, format, and expectations
                will help you submit the strongest possible application.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/" className="border border-border bg-background px-5 py-2.5 text-sm font-medium text-ink hover:bg-muted">
                  Review Home
                </Link>
                <Link to="/research-process" className="border border-border bg-background px-5 py-2.5 text-sm font-medium text-ink hover:bg-muted">
                  Review Research Process
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-bm pb-24 md:pb-32">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { tag: "Beginner", body: "No prior research experience required.", note: "Open application" },
            { tag: "Intermediate", body: "Some background in research or scientific writing.", note: "Submit prior work for placement" },
            { tag: "Advanced", body: "Experienced student researchers seeking high‑level work.", note: "Submit prior work for evaluation" },
          ].map((c) => (
            <div key={c.tag} className="flex flex-col rounded-3xl border border-border bg-background p-8">
              <span className="w-fit border border-border bg-cream px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {c.tag}
              </span>
              <p className="mt-5 font-display text-xl text-ink">{c.body}</p>
              <p className="mt-4 text-sm text-muted-foreground">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-[2rem] border border-border bg-background p-10 text-center md:p-14">
          <h2 className="font-display text-3xl text-ink md:text-4xl">Ready to apply?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Submit the General Researcher Application below by creating or logging into an existing account. We'll be in touch
            as your application is reviewed.
          </p>
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open Portal <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        {/* Admissions Tips */}
        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Admissions Tips
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
              How to get selected.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Honestly? Just be yourself. We're not looking for résumés, we're
              looking for curious students who genuinely want to grow.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                icon: Heart,
                title: "Be authentic.",
                body: "Write like a person, not a college essay. Tell us who you actually are and why research interests you, even if you're brand new to it.",
              },
              {
                icon: Sparkles,
                title: "Explain your interest in research.",
                body: "What sparks your curiosity? A topic, a question, a moment? You don't need credentials, just genuine interest and a willingness to learn.",
              },
              {
                icon: Check,
                title: "Don't overthink it.",
                body: "We don't expect prior publications, lab experience, or perfect writing. Effort and honesty go further here than polish.",
              },
              {
                icon: Check,
                title: "Show up ready to learn.",
                body: "The Beginner Cohort is built for students starting from zero. If you're ready to engage, ask questions, and grow, you're already a strong fit.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-4 rounded-3xl border border-border bg-cream p-7"
              >
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-sage/40 bg-sage/10 p-8 text-center md:p-10">
            <p className="font-display text-2xl italic text-ink md:text-3xl">
              "Just be authentic and explain your interest in research."
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.22em] text-muted-foreground">
              — that's really all we ask
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}