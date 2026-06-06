import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { AlertTriangle, ArrowUpRight } from "lucide-react";

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
        title="Join Beyond Medicine."
        description="Applications are reviewed on a rolling basis. We welcome students who are curious, motivated, collaborative, and interested in interdisciplinary learning."
      />

      <section className="container-bm py-20 md:py-24">
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
                <Link to="/" className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-ink hover:bg-muted">
                  Review Home
                </Link>
                <Link to="/research-process" className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-ink hover:bg-muted">
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
              <span className="w-fit rounded-full border border-border bg-cream px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
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
            Submit the General Researcher Application below. We'll be in touch
            as your application is reviewed.
          </p>
          <a
            href="#"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Start application <ArrowUpRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            Application link coming soon — share the form URL and we'll wire it up.
          </p>
        </div>
      </section>
    </div>
  );
}