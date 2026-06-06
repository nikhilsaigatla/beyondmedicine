import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { Compass, Heart, Sparkles, Telescope } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Beyond Medicine" },
      { name: "description", content: "Our story, mission, vision, and values as an interdisciplinary medical research initiative." },
      { property: "og:title", content: "About — Beyond Medicine" },
      { property: "og:description", content: "Our story, mission, vision, and values." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div>
      <PageHero
        eyebrow="About"
        title="An initiative built for the next generation of medicine."
        description="Beyond Medicine was founded on the belief that the most meaningful progress in healthcare happens when disciplines meet — when curiosity meets compassion, and when students are trusted to lead."
      />

      <section className="container-bm py-24 md:py-32">
        <div className="grid gap-16 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Our story</p>
            <h2 className="mt-4 text-3xl text-ink md:text-4xl">A community shaped by curiosity.</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Beyond Medicine began with a small group of students who wanted
              to push past the boundaries of a single classroom — to explore
              how research, the humanities, and patient care converge to shape
              modern medicine.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Today we are a growing interdisciplinary initiative supporting
              original research, publication, and educational outreach.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-cream p-10">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Our vision</p>
            <p className="mt-4 font-display text-2xl leading-snug text-ink md:text-3xl">
              A future of healthcare designed with empathy, advanced through
              science, and led by students prepared to think across boundaries.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Values</p>
            <h2 className="mt-4 text-4xl text-ink md:text-5xl">What guides our work.</h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Telescope, title: "Curiosity", body: "We follow meaningful questions wherever they lead." },
              { icon: Heart, title: "Compassion", body: "We center the humanity of patients, communities, and peers." },
              { icon: Sparkles, title: "Excellence", body: "We pursue rigor in every project, paper, and program." },
              { icon: Compass, title: "Interdisciplinarity", body: "We believe medicine grows stronger when fields collaborate." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-border bg-background p-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mist/70 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-bm py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Long‑term goals</p>
          <h2 className="mt-4 text-3xl text-ink md:text-4xl">Building something lasting.</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            From expanding research opportunities, to launching national
            partnerships, to publishing original interdisciplinary work — we
            are building a durable home for student‑led inquiry in medicine.
          </p>
        </div>
      </section>
    </div>
  );
}