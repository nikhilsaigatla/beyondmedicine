import { createFileRoute, Link } from "@tanstack/react-router";
import bmTitle from "@/assets/bm-banner-hires.png.asset.json";
import { ArrowUpRight, ChevronDown, Sprout, Telescope, Trophy } from "lucide-react";
import { Brand } from "@/components/brand";
import { AtomIcon, CellIcon, DnaIcon, FlaskIcon, HeartbeatIcon, HelixIcon, MicroscopeIcon, MoleculeIcon, NeuronIcon, PetriIcon, PipetteIcon } from "@/components/decor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beyond Medicine — Interdisciplinary Medical Research Initiative" },
      { name: "description", content: "Free research mentorship and publication for high school and early college students in medicine, public health, biology, and interdisciplinary STEM." },
      { property: "og:title", content: "Beyond Medicine" },
      { property: "og:description", content: "Research mentorship and publication at no cost." },
    ],
  }),
  component: Index,
});

const cohorts = [
  {
    icon: Sprout,
    tag: "No experience required",
    title: "Beginner Cohort",
    blurb: "For students with little to no research experience. Build confidence and foundational skills, step by step.",
    points: [
      "Scientific literature analysis",
      "Research fundamentals",
      "Citation practices",
      "Literature review",
      "Scientific writing",
      "Revision & peer feedback",
    ],
  },
  {
    icon: Telescope,
    tag: "Some prior experience",
    title: "Intermediate Cohort",
    blurb: "For students with some background in research or scientific writing, ready to go deeper.",
    points: [
      "Independent review projects",
      "Collaborative research work",
      "Deeper scientific analysis",
      "Structured peer review",
      "Prior work may be submitted for placement",
    ],
  },
  {
    icon: Trophy,
    tag: "Experienced researchers",
    title: "Advanced Cohort",
    blurb: "For experienced student researchers ready for high‑level projects and leadership.",
    points: [
      "Publication‑quality work",
      "Mentor newer students",
      "Assist with peer review",
      "Contribute to research leadership",
      "Prior work required for evaluation",
    ],
  },
];

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-mist/50 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-[-6rem] h-[28rem] w-[28rem] rounded-full bg-sage/20 blur-3xl" />
          <DnaIcon className="absolute left-6 top-32 hidden h-72 w-32 text-ink/[0.08] md:block" />
          <MicroscopeIcon className="absolute right-10 top-40 hidden h-56 w-44 text-ink/[0.08] md:block" />
          <MoleculeIcon className="absolute bottom-24 left-1/4 hidden h-40 w-40 text-ink/[0.06] lg:block" />
          <PipetteIcon className="absolute bottom-16 right-1/4 hidden h-44 w-20 text-ink/[0.08] lg:block" />
          <CellIcon className="absolute right-[18%] top-16 hidden h-24 w-24 text-ink/[0.05] md:block" />
          <HelixIcon className="absolute left-[42%] top-8 hidden h-40 w-16 text-ink/[0.05] lg:block" />
          <HeartbeatIcon className="absolute bottom-8 left-1/2 hidden h-10 w-72 -translate-x-1/2 text-ink/[0.07] md:block" />
        </div>
        <div className="relative pt-12 pb-16 md:pt-16 md:pb-24">
          <div className="flex justify-center bm-float px-4">
            <img
              src={bmTitle.url}
              alt="Beyond Medicine — an interdisciplinary medical research initiative"
              className="w-full"
            />
          </div>
          <div className="container-bm relative">
            <div className="mx-auto max-w-4xl text-center bm-fade-up">
            <div className="mx-auto mt-10 max-w-3xl">
              <p className="font-display text-3xl leading-tight text-ink md:text-5xl">
                research mentorship <span className="text-muted-foreground">and</span> publication —
                <br className="hidden sm:block" />
                <span className="relative inline-block">
                  <span className="relative z-10 px-2 font-display italic">100% free.</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-sage/40" aria-hidden />
                </span>
              </p>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              say less — we've got you covered.
              <br />
              scroll and learn to see if we're worth it.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to="/apply"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Apply now
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/research-process"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-medium text-ink transition hover:bg-muted"
              >
                Our research process
              </Link>
            </div>
            <div className="mt-16 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <span>Scroll</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* FREE band */}
      <section className="relative overflow-hidden border-y border-border/60 bg-ink text-cream">
        <div className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-sage/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-mist/20 blur-3xl" />
        <div className="container-bm relative py-16 md:py-20">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-cream/70">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" />
              Always &amp; Forever
            </span>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-[6.5rem]">
              This program is
              <br />
              <span className="italic text-sage">100% free.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-cream/75 md:text-lg">
              No tuition. No application fees. No hidden costs. Mentorship,
              peer review, and the chance to publish — all completely free for
              every student in the program.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.22em] text-cream/60">
              <span>$0 to apply</span>
              <span className="h-1 w-1 rounded-full bg-cream/30" />
              <span>$0 to join</span>
              <span className="h-1 w-1 rounded-full bg-cream/30" />
              <span>$0 to publish</span>
            </div>
          </div>
        </div>
      </section>

      {/* Who Are We */}
      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm relative grid gap-12 py-24 md:grid-cols-12 md:py-32">
          <AtomIcon className="pointer-events-none absolute -right-6 top-10 hidden h-40 w-40 text-ink/[0.06] md:block" />
          <PetriIcon className="pointer-events-none absolute left-6 bottom-10 hidden h-28 w-40 text-ink/[0.06] lg:block" />
          <HelixIcon className="pointer-events-none absolute right-1/3 bottom-16 hidden h-32 w-12 text-ink/[0.05] lg:block" />
          <div className="md:col-span-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Who Are We
            </p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              A student‑led initiative making research accessible.
            </h2>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> 100% student‑led
            </p>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <p className="text-lg leading-relaxed text-muted-foreground">
              <Brand /> is a student‑led initiative designed to make
              research more accessible to high school and early college students
              interested in medicine, public health, biology, and other
              interdisciplinary STEM fields.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Our mission isn't simply to publish papers — it's to help students
              learn how to think critically, analyze scientific literature,
              communicate ideas effectively, and grow through the research
              process itself.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Through mentorship, peer review, collaborative learning, and
              structured cohort systems, students can explore research
              regardless of previous experience level.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" />
              No prior research experience required
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="container-bm relative py-24 md:py-32">
        <FlaskIcon className="pointer-events-none absolute left-4 top-16 hidden h-32 w-24 text-ink/[0.08] lg:block" />
        <DnaIcon className="pointer-events-none absolute right-4 bottom-16 hidden h-56 w-24 text-ink/[0.08] lg:block" />
        <NeuronIcon className="pointer-events-none absolute left-1/3 bottom-8 hidden h-28 w-28 text-ink/[0.05] lg:block" />
        <CellIcon className="pointer-events-none absolute right-1/4 top-10 hidden h-24 w-24 text-ink/[0.05] md:block" />
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Our Mission</p>
          <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
            Bridging the gap into research.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Research opportunities can feel inaccessible to students without
            mentorship, institutional connections, or prior experience.{" "}
            <Brand /> was created to help bridge that gap — a welcoming and
            intellectually driven environment where students can grow.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2">
          {[
            "Learn scientific writing and literature review",
            "Develop research and analytical skills",
            "Collaborate with peers across disciplines",
            "Receive constructive feedback and mentorship",
            "Explore medicine beyond traditional pre‑med pathways",
            "Grow through revision, curiosity, and interdisciplinary thinking",
          ].map((t) => (
            <div key={t} className="rounded-2xl border border-border bg-background p-6 text-base text-ink">
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* Why Different */}
      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm relative py-24 md:py-32">
          <MoleculeIcon className="pointer-events-none absolute right-6 top-10 hidden h-48 w-48 text-ink/[0.07] md:block" />
          <PetriIcon className="pointer-events-none absolute left-2 bottom-6 hidden h-24 w-36 text-ink/[0.06] md:block" />
          <HeartbeatIcon className="pointer-events-none absolute right-10 bottom-10 hidden h-8 w-56 text-ink/[0.07] md:block" />
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Why We're Different
              </p>
              <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
                Beginners are encouraged, not excluded.
              </h2>
            </div>
            <div className="md:col-span-7 md:pl-12">
              <p className="text-lg leading-relaxed text-muted-foreground">
                We believe research is a skill that can be developed over time —
                through guidance, practice, collaboration, revision, and
                curiosity. Rather than expecting students to already know how to
                conduct research, we help build those skills step by step.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {["guidance", "practice", "collaboration", "revision", "curiosity"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-background px-5 py-2 text-sm text-ink"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program Structure */}
      <section className="container-bm relative py-24 md:py-32">
        <PipetteIcon className="pointer-events-none absolute -left-2 top-20 hidden h-48 w-20 text-ink/[0.08] lg:block" />
        <AtomIcon className="pointer-events-none absolute -right-6 bottom-10 hidden h-40 w-40 text-ink/[0.07] md:block" />
        <NeuronIcon className="pointer-events-none absolute right-1/3 top-4 hidden h-28 w-28 text-ink/[0.05] lg:block" />
        <HelixIcon className="pointer-events-none absolute left-1/4 bottom-2 hidden h-32 w-12 text-ink/[0.05] lg:block" />
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Program Structure</p>
          <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
            Three cohorts. One supportive community.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Whatever your starting point, there's a place for you to grow.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {cohorts.map(({ icon: Icon, tag, title, blurb, points }) => (
            <div
              key={title}
              className="flex flex-col rounded-3xl border border-border bg-background p-8 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.18)]"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mist/70 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-cream px-3 py-1 text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
                  {tag}
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
              <ul className="mt-6 space-y-2 text-sm text-ink">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sage" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-bm py-24 md:py-32">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary px-8 py-20 text-center text-primary-foreground md:px-16">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sage/20 blur-3xl" />
          <h2 className="relative text-balance text-4xl leading-tight md:text-5xl">
            Ready to start your research journey?
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80">
            Applications are reviewed on a rolling basis. No experience required
            for the Beginner Cohort.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/apply"
              className="rounded-full bg-background px-7 py-3.5 text-sm font-medium text-ink transition hover:bg-cream"
            >
              Apply now
            </Link>
            <Link
              to="/research-process"
              className="rounded-full border border-primary-foreground/30 px-7 py-3.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              Learn the process
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
