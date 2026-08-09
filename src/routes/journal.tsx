import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { BookOpen } from "lucide-react";
import { Brand } from "@/components/brand";
import { DnaIcon, AtomIcon } from "@/components/decor";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal — Beyond Medicine" },
      { name: "description", content: "The Beyond Medicine student journal — original research, reviews, and commentaries from our cohorts." },
      { property: "og:title", content: "Journal — Beyond Medicine" },
      { property: "og:description", content: "Student-authored research from Beyond Medicine." },
    ],
  }),
  component: Journal,
});

function Journal() {
  return (
    <div>
      <PageHero
        eyebrow="Journal"
        title="Student‑authored research, in print."
        description="Each cohort cycle culminates in publication with reviews, original studies, and commentaries written, revised, and edited by Beyond Medicine members."
      />
      <section className="container-bm relative py-24 md:py-32">
        <DnaIcon className="pointer-events-none absolute left-4 top-6 hidden h-64 w-28 text-ink/[0.07] lg:block" />
        <AtomIcon className="pointer-events-none absolute right-4 bottom-6 hidden h-44 w-44 text-ink/[0.06] md:block" />
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-cream p-10 text-center md:p-14">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="mt-6 font-display text-3xl text-ink md:text-4xl">
            The first issue of the <Brand /> journal is on the way.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            The inaugural issue of the Beyond Medicine journal will feature
            work from our first cohorts. Check back soon, or apply to be part
            of the next cycle.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/apply" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              Apply to publish
            </Link>
            <Link to="/research-process" className="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-ink hover:bg-muted">
              How publication works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}