import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Publications — Beyond Medicine" },
      { name: "description", content: "Student-led research projects, publications, and opportunities at Beyond Medicine." },
      { property: "og:title", content: "Research — Beyond Medicine" },
      { property: "og:description", content: "Original research and publications by Beyond Medicine." },
    ],
  }),
  component: Research,
});

const projects = [
  { area: "Public Health", title: "Equity in primary care access", desc: "Mapping disparities and proposing community-based interventions." },
  { area: "Clinical Innovation", title: "Wearables in chronic disease monitoring", desc: "Evaluating consumer devices as adjuncts to clinical care." },
  { area: "Medical Humanities", title: "Narrative medicine workshops", desc: "Exploring how storytelling shapes clinical empathy." },
  { area: "Biomedical Sciences", title: "Inflammation biomarkers review", desc: "Synthesizing recent literature for student-friendly publication." },
];

function Research() {
  return (
    <div>
      <PageHero
        eyebrow="Research"
        title="Original research, led by students."
        description="We support and publish interdisciplinary work spanning clinical sciences, public health, technology, and the humanities."
      />

      <section className="container-bm py-24 md:py-32">
        <div className="flex items-end justify-between gap-6">
          <h2 className="text-3xl text-ink md:text-4xl">Current projects</h2>
          <Link to="/get-involved" className="hidden text-sm font-medium text-primary md:inline-flex items-center gap-1">
            Propose a project <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {projects.map((p) => (
            <article
              key={p.title}
              className="group rounded-3xl border border-border bg-background p-10 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.2)]"
            >
              <span className="rounded-full border border-border bg-cream px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {p.area}
              </span>
              <h3 className="mt-5 font-display text-2xl text-ink">{p.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-cream">
        <div className="container-bm grid gap-12 py-24 md:grid-cols-2 md:py-32">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Publications</p>
            <h2 className="mt-4 text-3xl text-ink md:text-4xl">Student-authored work.</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Members publish reviews, commentaries, and original studies
              through our internal journal and partner publications. New
              issues are released each semester.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background p-10">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Opportunities</p>
            <ul className="mt-5 space-y-4 text-ink">
              <li className="border-b border-border/60 pb-4">Research Fellow program</li>
              <li className="border-b border-border/60 pb-4">Peer-review training cohort</li>
              <li className="border-b border-border/60 pb-4">Summer interdisciplinary scholars</li>
              <li>Cross-institution partnership projects</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}