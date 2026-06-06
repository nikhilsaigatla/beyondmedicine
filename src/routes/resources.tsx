import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { BookOpen, GraduationCap, Library, Microscope, Stethoscope, Users } from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Beyond Medicine" },
      { name: "description", content: "Curated resources for healthcare career exploration, medical education, and research." },
      { property: "og:title", content: "Resources — Beyond Medicine" },
      { property: "og:description", content: "Curated educational and research resources." },
    ],
  }),
  component: Resources,
});

const groups = [
  { icon: Stethoscope, title: "Healthcare careers", body: "Guides to clinical, research, and public health pathways." },
  { icon: GraduationCap, title: "Medical education", body: "Pre‑med, med school, and continuing education roadmaps." },
  { icon: Microscope, title: "Research guides", body: "Designing studies, writing papers, and presenting work." },
  { icon: Users, title: "Student opportunities", body: "Conferences, fellowships, scholarships, and internships." },
  { icon: BookOpen, title: "Scientific literacy", body: "Resources for reading, evaluating, and discussing science." },
  { icon: Library, title: "Reading lists", body: "Curated books and journals across medical disciplines." },
];

function Resources() {
  return (
    <div>
      <PageHero
        eyebrow="Resources"
        title="A library for the curious."
        description="Thoughtful, accessible resources to support your journey in medicine, science, and beyond."
      />
      <section className="container-bm py-24 md:py-32">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border border-border bg-background p-8 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.18)]"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mist/70 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-xl text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}