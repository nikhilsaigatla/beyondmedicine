import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ArrowUpRight, Crown } from "lucide-react";
import { Brand } from "@/components/brand";
import { DnaIcon, MoleculeIcon, AtomIcon } from "@/components/decor";

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

/** A single role row inside a division. */
function Role({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      {desc && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      )}
    </div>
  );
}

/** A division heading block with the Roman numeral + title. */
function DivisionHeader({ roman, title }: { roman: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-display text-3xl text-muted-foreground">{roman}.</span>
      <h2 className="font-display text-3xl text-ink md:text-4xl">{title}</h2>
    </div>
  );
}

/** A small label that introduces a subgroup (e.g. "Chairs"). */
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

/** "Function:" callout used at the end of each division block. */
function FunctionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-cream p-6">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Function
      </p>
      <p className="mt-2 text-base leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function Leadership() {
  return (
    <div>
      <PageHero
        eyebrow="Leadership"
        title="The structure behind Beyond Medicine."
        description="A student-led leadership team organized into divisions for executive direction, administration, public relations, and mentorship."
      />

      {/* Apply for leadership */}
      <section className="container-bm relative py-20 md:py-24">
        <DnaIcon className="pointer-events-none absolute -left-6 top-12 hidden h-56 w-24 text-ink/[0.07] lg:block" />
        <AtomIcon className="pointer-events-none absolute -right-8 bottom-6 hidden h-40 w-40 text-ink/[0.07] md:block" />
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
                Researcher Application and be registered <Brand /> members.
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

      {/* Org structure — exactly as described */}
      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm relative py-24 md:py-32">
          <MoleculeIcon className="pointer-events-none absolute right-2 top-10 hidden h-48 w-48 text-ink/[0.06] md:block" />
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Organizational Structure</p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              How <Brand /> is organized.
            </h2>
          </div>

          <div className="mt-16 space-y-10">
            {/* I. Founding President */}
            <div className="rounded-3xl border border-primary/30 bg-background p-8 md:p-10">
              <DivisionHeader roman="I" title="Founding President" />
              <div className="mt-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl text-ink">Founding President</p>
                  <p className="mt-2 text-muted-foreground">
                    Oversees the entire organization and holds final
                    decision‑making authority across all divisions.
                  </p>
                </div>
              </div>
            </div>

            {/* II. Executive Division */}
            <div className="rounded-3xl border border-border bg-background p-8 md:p-10">
              <DivisionHeader roman="II" title="Executive Division" />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Role
                  title="Deputy Chair of the President"
                  desc="Second-in-command of the organization. Shadows all operations, assists in executive decision-making, coordinates across all divisions, and serves as the primary successor to the President."
                />
                <Role
                  title="Vice Chair of Administration"
                  desc="Oversees internal operations, task delegation, and coordination of administrative workflows."
                />
                <Role
                  title="Vice Chair of Mentorship"
                  desc="Oversees all mentorship programs and training pipelines, ensuring proper mentor development and discipline-specific support."
                />
                <Role
                  title="Vice Chair of Public Relations"
                  desc="Oversees all external communication, branding, outreach, applications, and public-facing materials."
                />
              </div>
            </div>

            {/* III. Administrative Division */}
            <div className="rounded-3xl border border-border bg-background p-8 md:p-10">
              <DivisionHeader roman="III" title="Administrative Division" />

              <div className="mt-8">
                <SubLabel>Administrative Chairs</SubLabel>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Role title="Communications Chair" />
                  <Role title="Outreach Chair" />
                  <Role title="Treasury Chair" />
                  <Role title="Secretary Chair" />
                </div>
              </div>

              <div className="mt-8">
                <SubLabel>Administrative Support</SubLabel>
                <div className="mt-4">
                  <Role title="General Board Members of Administration" />
                </div>
              </div>

              <div className="mt-8">
                <FunctionNote>
                  Handles internal operations, logistics, documentation, and
                  organizational coordination under the Vice Chair of
                  Administration.
                </FunctionNote>
              </div>
            </div>

            {/* IV. Public Relations Division */}
            <div className="rounded-3xl border border-border bg-background p-8 md:p-10">
              <DivisionHeader roman="IV" title="Public Relations Division" />

              <div className="mt-8">
                <SubLabel>Public Relations Chairs</SubLabel>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Role title="Social Media Chair" />
                  <Role title="Website Chair" />
                  <Role title="Applications Chair" />
                  <Role title="Welcome Chair" />
                  <Role title="Public Image Chair" />
                </div>
              </div>

              <div className="mt-8">
                <SubLabel>Public Relations Support</SubLabel>
                <div className="mt-4">
                  <Role title="General Board Members of Public Relations" />
                </div>
              </div>

              <div className="mt-8">
                <FunctionNote>
                  Manages outreach, branding, recruitment, and public
                  communication under the Vice Chair of Public Relations.
                </FunctionNote>
              </div>
            </div>

            {/* V. Mentorship & Training Division */}
            <div className="rounded-3xl border border-border bg-background p-8 md:p-10">
              <DivisionHeader roman="V" title="Mentorship and Training Division" />

              <div className="mt-8">
                <SubLabel>Mentorship Tracks</SubLabel>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Role title="Mentors of Biological Sciences" />
                  <Role title="Mentors of Physical Sciences" />
                  <Role title="Mentors of Social Sciences" />
                  <Role title="Mentors of Quantitative Sciences" />
                  <Role title="Mentors of Computational Sciences" />
                  <Role title="General Mentors" />
                </div>
              </div>

              <div className="mt-8">
                <SubLabel>Training Pipeline</SubLabel>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Role title="Mentors in Training" />
                  <Role title="Shadow Mentors" />
                </div>
              </div>

              <div className="mt-8">
                <FunctionNote>
                  Provides structured academic mentorship and leadership
                  development. The training pipeline prepares future mentors
                  and officers through shadowing, guided instruction, and
                  progressive responsibility under the Vice Chair of Mentorship.
                </FunctionNote>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}