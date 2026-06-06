import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ArrowUpRight, GraduationCap, MessagesSquare, Monitor, Presentation, RotateCw, Users2 } from "lucide-react";

export const Route = createFileRoute("/research-process")({
  head: () => ({
    meta: [
      { title: "Research Process — Beyond Medicine" },
      { name: "description", content: "How Beyond Medicine runs its virtual research program: workshops, peer review, revision, and a final symposium." },
      { property: "og:title", content: "Research Process — Beyond Medicine" },
      { property: "og:description", content: "Our virtual research and mentorship process." },
    ],
  }),
  component: ResearchProcess,
});

const formatItems = [
  { icon: Monitor, t: "Virtual workshops" },
  { icon: Users2, t: "Collaborative meetings" },
  { icon: MessagesSquare, t: "Peer review systems" },
  { icon: RotateCw, t: "Structured revision cycles" },
  { icon: Presentation, t: "Final research symposium" },
  { icon: GraduationCap, t: "Independent project development" },
];

function ResearchProcess() {
  return (
    <div>
      <PageHero
        eyebrow="Research Process"
        title="A virtual program built around mentorship and revision."
        description="Beyond Medicine is primarily virtual, allowing students from different schools and communities to collaborate, learn, and publish together."
      />

      <section className="container-bm py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Program Format</p>
          <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">How students participate.</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            At the end of each research cycle, students present their work
            during a final research symposium and poster presentation event.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {formatItems.map(({ icon: Icon, t }) => (
            <div key={t} className="rounded-3xl border border-border bg-background p-8 transition hover:-translate-y-1 hover:border-primary/30">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mist/70 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 font-display text-xl text-ink">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm grid gap-12 py-24 md:grid-cols-12 md:py-32">
          <div className="md:col-span-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Peer Review & Revision</p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              Research is built on revision and feedback.
            </h2>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Students receive constructive comments and guidance throughout
              the writing process from:
            </p>
            <ul className="mt-6 space-y-3">
              {["Peers", "Student leadership", "Faculty‑supported reviewers"].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 text-ink">
                  <span className="h-2 w-2 rounded-full bg-sage" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              The goal: strengthen both research and communication skills over time.
            </p>
          </div>
        </div>
      </section>

      <section className="container-bm py-24 md:py-32">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-background p-10 md:p-14">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Faculty‑Supported Guidance</p>
          <h2 className="mt-4 text-3xl text-ink md:text-4xl">
            Mentorship rooted in real academic support.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Beyond Medicine is supported through mentorship and guidance from
            educators and faculty connections associated with{" "}
            <span className="text-ink">South Piedmont Community College</span>.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            As the initiative grows, we hope to expand outreach and mentorship
            opportunities with additional colleges, universities, and
            professionals across interdisciplinary STEM fields.
          </p>
          <Link
            to="/apply"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Apply to join <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}