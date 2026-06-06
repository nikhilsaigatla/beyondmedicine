import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ArrowUpRight, Crown } from "lucide-react";

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "Leadership — Beyond Medicine" },
      { name: "description", content: "Meet the Beyond Medicine leadership team and learn how to apply for officer roles." },
      { property: "og:title", content: "Leadership — Beyond Medicine" },
      { property: "og:description", content: "Our leadership structure and how to apply." },
    ],
  }),
  component: Leadership,
});

type Member = { name: string; role: string; open?: boolean };

const divisions: { heading: string; subheading?: string; members: Member[] }[] = [
  {
    heading: "Founding President",
    members: [{ name: "Open", role: "Founding President", open: true }],
  },
  {
    heading: "Executive Division",
    members: [
      { name: "Open", role: "Deputy Chair of the President", open: true },
      { name: "Open", role: "Vice Chair of Administration", open: true },
      { name: "Open", role: "Vice Chair of Mentorship", open: true },
      { name: "Open", role: "Vice Chair of Public Relations", open: true },
    ],
  },
  {
    heading: "Administrative Division",
    subheading: "Chairs",
    members: [
      { name: "Open", role: "Communications Chair", open: true },
      { name: "Open", role: "Outreach Chair", open: true },
      { name: "Open", role: "Treasury Chair", open: true },
      { name: "Open", role: "Secretary Chair", open: true },
    ],
  },
  {
    heading: "Administrative Division",
    subheading: "Board Members",
    members: Array.from({ length: 6 }).map(() => ({ name: "Open", role: "General Board Member", open: true })),
  },
  {
    heading: "Public Relations Division",
    subheading: "Chairs",
    members: [
      { name: "Open", role: "Social Media Chair", open: true },
      { name: "Open", role: "Website Chair", open: true },
      { name: "Open", role: "Applications Chair", open: true },
      { name: "Open", role: "Welcome Chair", open: true },
      { name: "Open", role: "Public Image Chair", open: true },
    ],
  },
  {
    heading: "Public Relations Division",
    subheading: "Board Members",
    members: Array.from({ length: 6 }).map(() => ({ name: "Open", role: "General Board Member", open: true })),
  },
  {
    heading: "Mentorship & Training Division",
    subheading: "Mentorship Tracks",
    members: [
      { name: "Open", role: "Mentors of Biological Sciences", open: true },
      { name: "Open", role: "Mentors of Physical Sciences", open: true },
      { name: "Open", role: "Mentors of Social Sciences", open: true },
      { name: "Open", role: "Mentors of Quantitative Sciences", open: true },
      { name: "Open", role: "Mentors of Computational Sciences", open: true },
      { name: "Open", role: "General Mentors", open: true },
    ],
  },
  {
    heading: "Mentorship & Training Division",
    subheading: "Training Pipeline",
    members: [
      { name: "Open", role: "Mentors in Training", open: true },
      { name: "Open", role: "Shadow Mentors", open: true },
    ],
  },
];

const structure = [
  {
    roman: "II",
    title: "Executive Division",
    items: [
      ["Deputy Chair of the President", "Second-in-command. Shadows all operations, assists in executive decision-making, coordinates across divisions, and serves as primary successor to the President."],
      ["Vice Chair of Administration", "Oversees internal operations, task delegation, and coordination of administrative workflows."],
      ["Vice Chair of Mentorship", "Oversees all mentorship programs and training pipelines, ensuring proper mentor development and discipline‑specific support."],
      ["Vice Chair of Public Relations", "Oversees all external communication, branding, outreach, applications, and public‑facing materials."],
    ],
  },
  {
    roman: "III",
    title: "Administrative Division",
    items: [
      ["Function", "Handles internal operations, logistics, documentation, and organizational coordination under the Vice Chair of Administration."],
    ],
  },
  {
    roman: "IV",
    title: "Public Relations Division",
    items: [
      ["Function", "Manages outreach, branding, recruitment, and public communication under the Vice Chair of Public Relations."],
    ],
  },
  {
    roman: "V",
    title: "Mentorship & Training Division",
    items: [
      ["Function", "Provides structured academic mentorship and leadership development. The training pipeline prepares future mentors and officers through shadowing, guided instruction, and progressive responsibility under the Vice Chair of Mentorship."],
    ],
  },
];

function MemberCard({ m }: { m: Member }) {
  const founder = /founding president/i.test(m.role);
  return (
    <div className={`rounded-3xl border p-7 transition hover:-translate-y-1 ${founder ? "border-primary/30 bg-cream" : "border-border bg-background"} ${m.open ? "" : ""}`}>
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${founder ? "bg-primary text-primary-foreground" : "bg-mist text-primary"}`}>
        {founder ? <Crown className="h-6 w-6" /> : <span className="font-display text-xl">{m.name[0]}</span>}
      </div>
      <h3 className="mt-5 font-display text-xl text-ink">{m.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{m.role}</p>
      {m.open && (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Position open
        </span>
      )}
    </div>
  );
}

function Leadership() {
  return (
    <div>
      <PageHero
        eyebrow="Leadership"
        title="Help shape Beyond Medicine."
        description="Our leadership team guides the organization's growth, mentorship programs, publications, outreach, and day‑to‑day operations."
      />

      {/* Apply for leadership */}
      <section className="container-bm py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Join Leadership</p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              Do you want to apply for leadership?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Leadership positions are for students passionate about research,
              collaboration, service, and creating opportunities for others.
            </p>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <div className="rounded-3xl border border-border bg-cream p-8">
              <h3 className="font-display text-2xl text-ink">Application Process</h3>
              <ol className="mt-5 space-y-4">
                {[
                  "Complete the General Member Application.",
                  "Submit the Leadership Application.",
                  "Selected applicants may be invited to an interview.",
                  "Placements are based on application strength, organizational needs, interview, and demonstrated commitment.",
                ].map((s, i) => (
                  <li key={i} className="flex gap-4 rounded-2xl border border-border bg-background p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground">{i + 1}</span>
                    <span className="text-ink">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm text-muted-foreground">
                All leadership applicants must first complete the General
                Researcher Application and be registered Beyond Medicine members.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/apply" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 inline-flex items-center gap-2">
                  General Application <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a href="#" className="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-ink hover:bg-muted inline-flex items-center gap-2">
                  Leadership Application <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-background p-8">
              <h3 className="font-display text-2xl text-ink">A few tips</h3>
              <ul className="mt-5 space-y-3 text-muted-foreground">
                <li>• Be authentic — share who you actually are.</li>
                <li>• Highlight meaningful experiences, projects, leadership, research, volunteer work, or initiatives that have shaped you.</li>
                <li>• Leadership isn't limited to titles — initiative, reliability, teamwork, and passion matter equally.</li>
                <li>• Not every applicant receives their first‑choice division. Strong candidates may be placed where they can make the greatest impact.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Structure */}
      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Organizational Structure</p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              How Beyond Medicine is organized.
            </h2>
          </div>
          <div className="mt-14 space-y-6">
            <div className="rounded-3xl border border-primary/30 bg-background p-8 md:p-10">
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl text-muted-foreground">I.</span>
                <h3 className="font-display text-2xl text-ink md:text-3xl">Founding President</h3>
              </div>
              <p className="mt-4 max-w-3xl text-muted-foreground">
                Oversees the entire organization and holds final decision‑making authority across all divisions.
              </p>
            </div>
            {structure.map((s) => (
              <div key={s.roman + s.title} className="rounded-3xl border border-border bg-background p-8 md:p-10">
                <div className="flex items-center gap-4">
                  <span className="font-display text-2xl text-muted-foreground">{s.roman}.</span>
                  <h3 className="font-display text-2xl text-ink md:text-3xl">{s.title}</h3>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {s.items.map(([h, b]) => (
                    <div key={h} className="rounded-2xl border border-border bg-cream p-6">
                      <p className="font-display text-lg text-ink">{h}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current team */}
      <section className="container-bm py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Current Team</p>
          <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
            Meet the team — and the open seats.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Most positions are still open. If you see yourself here, apply.
          </p>
        </div>
        <div className="mt-16 space-y-16">
          {divisions.map((d, i) => (
            <div key={i}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-display text-2xl text-ink md:text-3xl">{d.heading}</h3>
                {d.subheading && (
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{d.subheading}</span>
                )}
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {d.members.map((m, j) => (
                  <MemberCard key={j} m={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}