import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ArrowUpRight, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { DnaIcon, MoleculeIcon, AtomIcon } from "@/components/decor";
import nikhilImage from "@/assets/nikhil-gatla.jpeg.asset.json";
import aadhyaImage from "@/assets/aadhya-polkam.jpeg.asset.json";
import sruthiImage from "@/assets/sruthi-kalapatapu.jpeg.asset.json";
import evaImage from "@/assets/eva-sharma.jpeg.asset.json";
import niaImage from "@/assets/nia-tilokani.jpeg.asset.json";
import rileyImage from "@/assets/riley-del-rosario.png.asset.json";
import yuktaImage from "@/assets/yukta-bhutoria.jpeg.asset.json";

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

/** A person card: photo placeholder + name + position title + description. */
function PersonCard({
  name = "Open Position",
  title,
  desc,
  image,
  compact = false,
}: {
  name?: string;
  title: string;
  desc?: string;
  image?: string;
  compact?: boolean;
}) {
  const isOpen = name === "Open Position";
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5">
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-cream via-muted to-cream ${
          compact ? "aspect-[5/3]" : "aspect-[4/3]"
        }`}
      >
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div
              className={`flex items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur ${
                compact ? "h-10 w-10" : "h-16 w-16"
              }`}
            >
              <User
                className={compact ? "h-5 w-5 text-muted-foreground" : "h-7 w-7 text-muted-foreground"}
                strokeWidth={1.25}
              />
            </div>
          </div>
        )}
        {isOpen && (
          <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/85 px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            Vacant
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "p-4" : "p-6"}`}>
        <p
          className={`font-display leading-tight ${compact ? "text-lg" : "text-2xl"} ${
            isOpen ? "text-muted-foreground/70 italic" : "text-ink"
          }`}
        >
          {isOpen ? "To be announced" : name}
        </p>
        <p className={`mt-2 font-medium uppercase tracking-[0.18em] text-primary ${compact ? "text-[10px]" : "text-xs"}`}>
          {title}
        </p>
        {desc && (
          <p className={`mt-3 leading-relaxed text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            {desc}
          </p>
        )}
      </div>
    </div>
  );
}

/** Horizontal feature card for a single highlighted person (e.g. Founding President). */
function FeaturePersonCard({
  name,
  title,
  desc,
  image,
}: {
  name: string;
  title: string;
  desc: string;
  image?: string;
}) {
  return (
    <div className="group grid overflow-hidden rounded-2xl border border-border bg-background transition-all hover:shadow-xl hover:shadow-ink/5 md:grid-cols-[260px_1fr]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-cream via-muted to-cream md:aspect-auto">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-background/60 backdrop-blur">
              <User className="h-9 w-9 text-muted-foreground" strokeWidth={1.25} />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center p-8 md:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">{title}</p>
        <h3 className="mt-3 font-display text-3xl leading-tight text-ink md:text-4xl">{name}</h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{desc}</p>
      </div>
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
function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

/** "Function:" callout used at the end of each division block. */
function FunctionNote({ children }: { children: ReactNode }) {
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
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSfbssRMbo8pSMh3khEvWM5ZEQTIRbH7Mi6E19rMD29oT4-WpQ/viewform?usp=header" target="_blank" rel="noopener noreferrer" className="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-ink hover:bg-muted inline-flex items-center gap-2">
                  Leadership Application <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-background p-8">
              <h3 className="font-display text-2xl text-ink">A few tips</h3>
              <ul className="mt-5 space-y-3 text-muted-foreground">
                <li>• Be authentic — share who you actually are.</li>
                <li>• Highlight meaningful experiences, projects, leadership, research, or initiatives that have shaped you.</li>
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
              <div className="mt-6">
                <FeaturePersonCard
                  name="Nikhil Sai Gatla"
                  title="Founder & President"
                  image={nikhilImage.url}
                  desc="Nikhil Sai Gatla is the Founder and President of Beyond Medicine, a student-led organization dedicated to expanding access to research and mentorship opportunities for aspiring healthcare professionals. Inspired by a passion for medicine and scientific discovery, he created Beyond Medicine to help students develop research skills, connect with mentors, and explore meaningful careers in healthcare. His mission is to make research more accessible and empower the next generation of medical innovators."
                />
              </div>
            </div>

            {/* II. Executive Division */}
            <div className="rounded-3xl border border-border bg-background p-8 md:p-10">
              <DivisionHeader roman="II" title="Executive Division" />
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <PersonCard
                  title="Deputy Chair of the President"
                  desc="Second-in-command of the organization. Shadows all operations, assists in executive decision-making, coordinates across all divisions, and serves as the primary successor to the President."
                />
                <PersonCard
                  name="Sruthi Kalapatapu"
                  title="Vice Chair of Administration"
                  image={sruthiImage.url}
                  desc="Oversees internal operations, task delegation, and coordination of administrative workflows."
                />
                <PersonCard
                  name="Nia Tilokani"
                  title="Vice Chair of Mentorship"
                  image={niaImage.url}
                  desc="Oversees all mentorship programs and training pipelines, ensuring proper mentor development and discipline-specific support."
                />
                <PersonCard
                  name="Eva Sharma"
                  title="Vice Chair of Public Relations"
                  image={evaImage.url}
                  desc="Oversees all external communication, branding, outreach, applications, and public-facing materials."
                />
              </div>
            </div>

            {/* III. Administrative Division */}
            <div className="rounded-3xl border border-border bg-background p-8 md:p-10">
              <DivisionHeader roman="III" title="Administrative Division" />

              <div className="mt-8">
                <SubLabel>Administrative Chairs</SubLabel>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <PersonCard name="Aadhya Sri Polkam" title="Communications Chair" image={aadhyaImage.url} desc="Manages internal and external messaging, announcements, and member communications." />
                  <PersonCard title="Outreach Chair" desc="Coordinates partnerships, collaborations, and community engagement initiatives." />
                  <PersonCard title="Treasury Chair" desc="Oversees budgeting, finances, and fund allocation across the organization." />
                  <PersonCard name="Yukta Bhutoria" title="Secretary Chair" image={yuktaImage.url} desc="Maintains records, meeting notes, and organizational documentation." />
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
              <div className="mt-4 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
                  <PersonCard name="Sohni Pathan" title="Social Media Chair" desc="Leads social channels, content calendars, and digital presence." />
                  <PersonCard title="Website Chair" desc="Maintains and improves the Beyond Medicine website and digital experience." />
                  <PersonCard name="Tanush Ram Rachakonda" title="Applications Chair" desc="Manages the membership and leadership application processes." />
                  <PersonCard name="Riley Del Rosario" title="Welcome Chair" image={rileyImage.url} desc="Onboards new members and ensures a strong first experience with the organization." />
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
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <PersonCard title="Mentor of Biological Sciences" desc="Guides research in biology, biomedical sciences, and related disciplines." />
                  <PersonCard title="Mentor of Physical Sciences" desc="Guides research in physics, chemistry, and the physical sciences." />
                  <PersonCard title="Mentor of Social Sciences" desc="Guides research in psychology, sociology, and related social fields." />
                  <PersonCard title="Mentor of Quantitative Sciences" desc="Guides research in mathematics, statistics, and quantitative methods." />
                  <PersonCard title="Mentor of Computational Sciences" desc="Guides research in computer science, data science, and computational methods." />
                  <PersonCard title="General Mentor" desc="Provides cross-disciplinary mentorship and research guidance." />
                </div>
              </div>

              <div className="mt-8">
                <SubLabel>Training Pipeline</SubLabel>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                  <PersonCard title="Mentor in Training" desc="Developing mentorship skills through structured training and guided practice." />
                  <PersonCard title="Mentor in Training" desc="Developing mentorship skills through structured training and guided practice." />
                  <PersonCard title="Mentor in Training" desc="Developing mentorship skills through structured training and guided practice." />
                  <PersonCard title="Shadow Mentor" desc="Shadows senior mentors to learn discipline-specific mentorship practices." />
                  <PersonCard title="Shadow Mentor" desc="Shadows senior mentors to learn discipline-specific mentorship practices." />
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