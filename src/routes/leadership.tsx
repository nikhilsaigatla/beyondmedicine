import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "Leadership — Beyond Medicine" },
      { name: "description", content: "Meet the executive leadership, officers, and advisors of Beyond Medicine." },
      { property: "og:title", content: "Leadership — Beyond Medicine" },
      { property: "og:description", content: "Our executive team, officers, and advisors." },
    ],
  }),
  component: Leadership,
});

const sections: { heading: string; people: { name: string; role: string }[] }[] = [
  {
    heading: "Executive Leadership",
    people: [
      { name: "Name", role: "Founder & President" },
      { name: "Name", role: "Vice President" },
      { name: "Name", role: "Director of Research" },
    ],
  },
  {
    heading: "Officers",
    people: [
      { name: "Name", role: "Education Chair" },
      { name: "Name", role: "Outreach Chair" },
      { name: "Name", role: "Publications Chair" },
      { name: "Name", role: "Operations Chair" },
    ],
  },
  {
    heading: "Advisors",
    people: [
      { name: "Name", role: "Faculty Advisor" },
      { name: "Name", role: "Clinical Advisor" },
    ],
  },
];

function Initials({ name }: { name: string }) {
  const i = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mist text-2xl font-display text-primary">
      {i}
    </div>
  );
}

function Leadership() {
  return (
    <div>
      <PageHero
        eyebrow="Leadership"
        title="The people behind Beyond Medicine."
        description="A student-led team supported by advisors from medicine, research, and the humanities."
      />
      <div className="container-bm space-y-24 py-24 md:py-32">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-3xl text-ink md:text-4xl">{s.heading}</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {s.people.map((p, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-border bg-background p-8 transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.18)]"
                >
                  <Initials name={p.name} />
                  <h3 className="mt-6 text-xl text-ink">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.role}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <p className="text-center text-sm text-muted-foreground">
          Full team details coming soon — share your bios and we'll add them here.
        </p>
      </div>
    </div>
  );
}