import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, ChevronDown, Sprout, Telescope, Trophy } from "lucide-react";
import { Brand } from "@/components/brand";
import { BackdropCarousel } from "@/components/backdrop-carousel";
import { Reveal, Stagger, StaggerItem, Parallax, WordsUp } from "@/components/motion-primitives";
import {
  AtomIcon, CellIcon, DnaIcon, FlaskIcon, HeartbeatIcon, HelixIcon,
  MicroscopeIcon, MoleculeIcon, NeuronIcon, PetriIcon, PipetteIcon,
} from "@/components/decor";

const bannerSrc = "/images/bm-banner-transparent.png";

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
    blurb: "For experienced student researchers ready for high-level projects and leadership.",
    points: [
      "Publication-quality work",
      "Mentor newer students",
      "Assist with peer review",
      "Contribute to research leadership",
      "Prior work required for evaluation",
    ],
  },
];

const missionPoints = [
  "Learn scientific writing and literature review",
  "Develop research and analytical skills",
  "Collaborate with peers across disciplines",
  "Receive constructive feedback and mentorship",
  "Explore medicine beyond traditional pre-med pathways",
  "Grow through revision, curiosity, and interdisciplinary thinking",
];

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const markScale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const markY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const markOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden border-b border-border">
      <BackdropCarousel />
      <div className="pointer-events-none absolute inset-0">
        <DnaIcon className="absolute left-6 top-32 hidden h-72 w-32 text-ink/[0.07] md:block" />
        <MicroscopeIcon className="absolute right-10 top-40 hidden h-56 w-44 text-ink/[0.07] md:block" />
        <MoleculeIcon className="absolute bottom-24 left-1/4 hidden h-40 w-40 text-ink/[0.05] lg:block" />
        <PipetteIcon className="absolute bottom-16 right-1/4 hidden h-44 w-20 text-ink/[0.07] lg:block" />
        <CellIcon className="absolute right-[18%] top-16 hidden h-24 w-24 text-ink/[0.05] md:block" />
        <HelixIcon className="absolute left-[42%] top-8 hidden h-40 w-16 text-ink/[0.05] lg:block" />
        <HeartbeatIcon className="absolute bottom-8 left-1/2 hidden h-10 w-72 -translate-x-1/2 text-ink/[0.06] md:block" />
      </div>

      <div className="relative pt-2 pb-10 md:pt-3 md:pb-14">
        <motion.div
          style={{ scale: markScale, y: markY, opacity: markOpacity }}
          className="flex justify-center px-4"
        >
          <motion.img
            src={bannerSrc}
            alt="Beyond Medicine, an interdisciplinary medical research initiative"
            width={646}
            height={365}
            className="logo-art h-[100vh] max-h-[1100px] w-full max-w-[96rem] object-contain"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        <div className="container-bm relative">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="sr-only">Beyond Medicine, an interdisciplinary medical research initiative</h1>
            <div className="mx-auto max-w-3xl">
              <p className="font-display text-3xl leading-tight text-ink md:text-5xl">
                <WordsUp text="research mentorship and publication," />{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 font-display italic">100% free.</span>
                  <motion.span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 z-0 h-[0.35em] origin-left bg-sage/45"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.9, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              </p>
            </div>
            <Reveal delay={0.15}>
              <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
                say less, we've got you covered.
                <br />
                scroll and learn to see if we're worth it.
              </p>
            </Reveal>
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                  to="/apply"
                  className="group inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-pine"
                >
                  Apply now
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  to="/research-process"
                  className="inline-flex items-center gap-2 border border-ink/25 px-7 py-3.5 text-sm font-medium tracking-wide text-ink transition-colors hover:bg-ink hover:text-background"
                >
                  Our research process
                </Link>
              </div>
            </Reveal>
            <div className="mt-16 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <span>Scroll</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Sticky headline with cohort panels scrolling past it. */
function CohortScroller() {
  return (
    <section className="container-bm relative py-24 md:py-32" id="cohorts">
      <PipetteIcon className="pointer-events-none absolute -left-2 top-20 hidden h-48 w-20 text-ink/[0.07] lg:block" />
      <AtomIcon className="pointer-events-none absolute -right-6 bottom-10 hidden h-40 w-40 text-ink/[0.06] md:block" />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Program Structure
            </p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              Three cohorts.
              <br />
              One supportive community.
            </h2>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground">
              Whatever your starting point, there's a place for you to grow.
            </p>
            <div className="bm-rule mt-8 w-24" />
            <Parallax distance={40} className="mt-8 hidden lg:block">
              <DnaIcon className="h-56 w-24 text-ink/[0.10]" />
            </Parallax>
          </div>
        </div>
        <div className="lg:col-span-8 lg:space-y-6">
          {cohorts.map(({ icon: Icon, tag, title, blurb, points }, i) => (
            <Reveal key={title} delay={i * 0.05} className="mb-6 lg:mb-0">
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="border border-border bg-card p-8 md:p-10"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center border border-border bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-2xl text-ink">{title}</h3>
                  </div>
                  <span className="whitespace-nowrap border-b border-border pb-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {tag}
                  </span>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
                <ul className="mt-6 grid gap-x-8 gap-y-2 text-sm text-ink sm:grid-cols-2">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2 border-b border-border/60 py-1.5">
                      <span className="mt-2 h-1 w-1 shrink-0 bg-sage" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Index() {
  return (
    <div>
      <Hero />

      {/* FREE band */}
      <section className="relative overflow-hidden border-b border-border bg-band text-band-foreground">
        <div className="bm-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
        <div className="container-bm relative py-16 md:py-20">
          <div className="flex flex-col items-center gap-5 text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 border border-band-foreground/25 px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-band-foreground/70">
                <span className="h-1.5 w-1.5 bg-sage" />
                Always &amp; Forever
              </span>
            </Reveal>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-[6.5rem]">
              <WordsUp text="This program is" />
              <br />
              <span className="italic text-sage">
                <WordsUp text="100% free." />
              </span>
            </h2>
            <Reveal delay={0.1}>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-band-foreground/75 md:text-lg">
                No tuition. No application fees. No hidden costs. Mentorship,
                peer review, and the chance to publish, all completely free for
                every student in the program.
              </p>
            </Reveal>
            <Stagger className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.22em] text-band-foreground/60">
              {["$0 to apply", "$0 to join", "$0 to publish"].map((t) => (
                <StaggerItem key={t}>{t}</StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Who Are We */}
      <section className="border-b border-border bg-cream">
        <div className="container-bm relative grid gap-12 py-24 md:grid-cols-12 md:py-32">
          <AtomIcon className="pointer-events-none absolute -right-6 top-10 hidden h-40 w-40 text-ink/[0.06] md:block" />
          <PetriIcon className="pointer-events-none absolute left-6 bottom-10 hidden h-28 w-40 text-ink/[0.06] lg:block" />
          <HelixIcon className="pointer-events-none absolute right-1/3 bottom-16 hidden h-32 w-12 text-ink/[0.05] lg:block" />
          <div className="md:col-span-5">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Who Are We
              </p>
              <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
                A student-led initiative making research accessible.
              </h2>
              <p className="mt-6 inline-flex items-center gap-2 border border-border bg-background px-4 py-2 text-sm font-medium text-ink">
                <span className="h-1.5 w-1.5 bg-sage" /> 100% student-led
              </p>
            </Reveal>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <Stagger className="space-y-5">
              <StaggerItem>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  <Brand /> is a student-led initiative designed to make research
                  more accessible to high school and early college students
                  interested in medicine, public health, biology, and other
                  interdisciplinary STEM fields.
                </p>
              </StaggerItem>
              <StaggerItem>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Our mission isn't simply to publish papers, it's to help students
                  learn how to think critically, analyze scientific literature,
                  communicate ideas effectively, and grow through the research
                  process itself.
                </p>
              </StaggerItem>
              <StaggerItem>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Through mentorship, peer review, collaborative learning, and
                  structured cohort systems, students can explore research
                  regardless of previous experience level.
                </p>
              </StaggerItem>
              <StaggerItem>
                <p className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2 text-sm font-medium text-ink">
                  <span className="h-1.5 w-1.5 bg-sage" />
                  No prior research experience required
                </p>
              </StaggerItem>
            </Stagger>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="container-bm relative py-24 md:py-32">
        <FlaskIcon className="pointer-events-none absolute left-4 top-16 hidden h-32 w-24 text-ink/[0.07] lg:block" />
        <DnaIcon className="pointer-events-none absolute right-4 bottom-16 hidden h-56 w-24 text-ink/[0.07] lg:block" />
        <NeuronIcon className="pointer-events-none absolute left-1/3 bottom-8 hidden h-28 w-28 text-ink/[0.05] lg:block" />
        <CellIcon className="pointer-events-none absolute right-1/4 top-10 hidden h-24 w-24 text-ink/[0.05] md:block" />
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Our Mission</p>
          <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
            Bridging the gap into research.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Research opportunities can feel inaccessible to students without
            mentorship, institutional connections, or prior experience.{" "}
            <Brand /> was created to help bridge that gap, a welcoming and
            intellectually driven environment where students can grow.
          </p>
        </Reveal>
        <Stagger className="mx-auto mt-14 grid max-w-5xl gap-px border border-border bg-border sm:grid-cols-2">
          {missionPoints.map((t) => (
            <StaggerItem key={t} className="bg-background p-6 text-base text-ink transition-colors hover:bg-secondary">
              {t}
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Why Different */}
      <section className="border-y border-border bg-cream">
        <div className="container-bm relative py-24 md:py-32">
          <MoleculeIcon className="pointer-events-none absolute right-6 top-10 hidden h-48 w-48 text-ink/[0.07] md:block" />
          <PetriIcon className="pointer-events-none absolute left-2 bottom-6 hidden h-24 w-36 text-ink/[0.06] md:block" />
          <HeartbeatIcon className="pointer-events-none absolute right-10 bottom-10 hidden h-8 w-56 text-ink/[0.07] md:block" />
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Why We're Different
                </p>
                <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
                  Beginners are encouraged, not excluded.
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-7 md:pl-12">
              <Reveal delay={0.1}>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  We believe research is a skill that can be developed over time,
                  through guidance, practice, collaboration, revision, and
                  curiosity. Rather than expecting students to already know how to
                  conduct research, we help build those skills step by step.
                </p>
              </Reveal>
              <Stagger className="mt-8 flex flex-wrap gap-3">
                {["guidance", "practice", "collaboration", "revision", "curiosity"].map((t) => (
                  <StaggerItem
                    key={t}
                    className="border border-ink/20 bg-background px-5 py-2 text-sm text-ink"
                  >
                    {t}
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </div>
      </section>

      <CohortScroller />

      {/* CTA */}
      <section className="container-bm py-24 md:py-32">
        <Reveal>
          <div className="relative overflow-hidden border border-ink bg-primary px-8 py-20 text-center text-primary-foreground md:px-16">
            <div className="bm-grid pointer-events-none absolute inset-0 opacity-[0.3]" />
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
                className="bg-background px-7 py-3.5 text-sm font-medium tracking-wide text-ink transition-colors hover:bg-cream"
              >
                Apply now
              </Link>
              <Link
                to="/research-process"
                className="border border-primary-foreground/40 px-7 py-3.5 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                Learn the process
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
