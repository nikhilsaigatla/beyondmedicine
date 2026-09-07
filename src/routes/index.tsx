import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight, ChevronDown, Sprout, Telescope, Trophy,
  PenLine, LineChart, Users, MessageSquareQuote, Compass, Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { BackdropCarousel } from "@/components/backdrop-carousel";
import { Reveal, Stagger, StaggerItem, Parallax, WordsUp, TypeLine } from "@/components/motion-primitives";
import { ArcOrb, DotField, Medallion, OrbitRing, Squiggle, SquiggleOrb } from "@/components/orbs";
import {
  AtomIcon, CellIcon, DnaIcon, FlaskIcon, HeartbeatIcon, HelixIcon,
  MoleculeIcon, NeuronIcon, PetriIcon, PipetteIcon,
} from "@/components/decor";

const bannerLight = "/images/bm-banner-white.png";
const bannerFlowMap = "/images/bm-banner-flow-map.png";
const bannerWordMap = "/images/bm-banner-word-map.png";
const bannerSubMap = "/images/bm-banner-sub-map.png";

function AnimatedBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let start = 0;
    let cancelled = false;
    const width = 646;
    const height = 365;
    const fadeDuration = 0.22;
    const totalDuration = 2.05;

    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const easeIn = (value: number) => value * value;
    const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });

    const toPixels = (image: HTMLImageElement) => {
      const buffer = document.createElement("canvas");
      buffer.width = width;
      buffer.height = height;
      const bufferContext = buffer.getContext("2d");
      if (!bufferContext) return null;
      bufferContext.drawImage(image, 0, 0, width, height);
      return bufferContext.getImageData(0, 0, width, height);
    };

    const draw = (
      time: number,
      source: ImageData,
      flowMap: ImageData,
      wordMap: ImageData,
      subMap: ImageData,
    ) => {
      if (!start) start = time;
      const elapsed = (time - start) / 1000;
      const output = context.createImageData(width, height);
      const reveal = output.data;
      const sourcePixels = source.data;
      const flowPixels = flowMap.data;
      const wordPixels = wordMap.data;
      const subPixels = subMap.data;
      const fade = clamp(elapsed / fadeDuration);
      const flowProgress = easeIn(clamp((elapsed - 0.08) / 1.08)) * 255;
      const wordProgress = easeOut(clamp((elapsed - 0.98) / 0.42)) * 255;
      const subProgress = easeIn(clamp((elapsed - 1.34) / 0.44)) * 255;
      const pulse = 1 + Math.sin(time / 150) * 0.035;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          let mask = 0;
          let progress = 0;

          if (y < 210) {
            mask = flowPixels[index];
            progress = flowProgress;
          } else if (y < 338) {
            mask = wordPixels[index];
            progress = wordProgress;
          } else {
            mask = subPixels[index];
            progress = subProgress;
          }

          if (mask && mask <= progress) {
            const edge = clamp((mask - Math.max(0, progress - 12)) / 12);
            const lift = (1 + 0.1 + edge * 0.13) * pulse * fade;
            reveal[index] = Math.min(255, sourcePixels[index] * lift);
            reveal[index + 1] = Math.min(255, sourcePixels[index + 1] * lift);
            reveal[index + 2] = Math.min(255, sourcePixels[index + 2] * lift);
            reveal[index + 3] = sourcePixels[index + 3] * fade;
          }
        }
      }

      context.putImageData(output, 0, 0);
      if (elapsed < totalDuration) {
        frame = requestAnimationFrame((nextTime) =>
          draw(nextTime, source, flowMap, wordMap, subMap),
        );
      }
    };

    Promise.all([
      loadImage(bannerLight),
      loadImage(bannerFlowMap),
      loadImage(bannerWordMap),
      loadImage(bannerSubMap),
    ])
      .then(([image, flowMap, wordMap, subMap]) => {
        if (cancelled) return;

        const source = toPixels(image);
        const flow = toPixels(flowMap);
        const word = toPixels(wordMap);
        const sub = toPixels(subMap);

        if (!source || !flow || !word || !sub) return;
        frame = requestAnimationFrame((time) => draw(time, source, flow, word, sub));
      })
      .catch(() => {
        if (cancelled) return;
        context.clearRect(0, 0, width, height);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="beyond-medicine-banner"
      width={646}
      height={365}
      aria-hidden="true"
      className="mx-auto block h-auto w-full max-w-[38rem] object-contain sm:max-w-[44rem] md:h-[46vh] md:max-h-[430px] md:max-w-[58rem]"
    />
  );
}

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
  { icon: PenLine, text: "Learn scientific writing and literature review", tone: "primary" as const },
  { icon: LineChart, text: "Develop research and analytical skills", tone: "pine" as const },
  { icon: Users, text: "Collaborate with peers across disciplines", tone: "slate" as const },
  { icon: MessageSquareQuote, text: "Receive constructive feedback and mentorship", tone: "primary" as const },
  { icon: Compass, text: "Explore medicine beyond traditional pre-med pathways", tone: "pine" as const },
  { icon: Sparkles, text: "Grow through revision, curiosity, and interdisciplinary thinking", tone: "slate" as const },
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

      <div className="relative">
        {/* First screen: wordmark centered, nothing else */}
        <div className="relative flex min-h-[calc(100svh-5rem)] flex-col items-center justify-center">
        <motion.div
          style={{ scale: markScale, y: markY, opacity: markOpacity }}
          className="flex justify-center px-4"
        >
          <motion.div
            className="w-full"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatedBanner />
          </motion.div>
        </motion.div>
          <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <span>Scroll</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>

        <div className="container-bm relative pb-24 pt-10 md:pb-32 md:pt-16">
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
                <TypeLine text="say less, we've got you covered." speed={30} />
                <br />
                <TypeLine text="scroll and learn to see if we're worth it." speed={26} startDelay={1500} />
              </p>
            </Reveal>
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                  to="/apply"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-medium tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-pine hover:shadow-md"
                >
                  Apply now
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  to="/research-process"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-8 py-3.5 text-sm font-medium tracking-wide text-ink transition-colors hover:bg-ink hover:text-background"
                >
                  Our research process
                </Link>
              </div>
            </Reveal>
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
      <OrbitRing className="pointer-events-none absolute -right-20 top-8 h-56 w-56 text-sage/25 md:h-72 md:w-72" duration={80} reverse />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Program Structure
            </p>
            <h2 className="mt-4 text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
              <TypeLine text="Three cohorts." speed={60} caret={false} />
              <br />
              <TypeLine text="One supportive community." speed={40} startDelay={900} />
            </h2>
            <Squiggle className="mt-3 h-5 w-40 text-sage/70" />
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
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 md:p-10"
              >
                {/* decorative watermarks */}
                <SquiggleOrb className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 text-primary/15 transition-transform duration-700 group-hover:rotate-12 md:h-52 md:w-52" />
                <DotField className="pointer-events-none absolute bottom-4 right-6 hidden h-16 w-16 text-ink/20 sm:block" />
                <span className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-sage/70" />
                <span className="pointer-events-none absolute right-5 top-4 font-display text-6xl leading-none text-ink/[0.07] md:text-8xl">
                  0{i + 1}
                </span>

                <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Medallion className="h-14 w-14 shrink-0 md:h-16 md:w-16" tone={i === 0 ? "primary" : i === 1 ? "pine" : "slate"}>
                      <Icon className="h-5 w-5" />
                    </Medallion>
                    <h3 className="font-display text-xl leading-tight text-ink md:text-2xl">{title}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground md:text-[0.65rem]">
                    {tag}
                  </span>
                </div>
                <p className="relative mt-5 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
                <Stagger className="relative mt-6 grid gap-x-8 gap-y-2 text-sm text-ink sm:grid-cols-2">
                  {points.map((p) => (
                    <StaggerItem key={p} className="flex items-start gap-2.5 rounded-full py-1.5 transition-colors hover:text-primary">
                      <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-sage/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                      </span>
                      <span className="min-w-0">{p}</span>
                    </StaggerItem>
                  ))}
                </Stagger>
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
        <OrbitRing className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 text-band-foreground/20 md:h-72 md:w-72" duration={70} />
        <ArcOrb className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 text-band-foreground/15 md:h-80 md:w-80" />
        <DotField className="pointer-events-none absolute bottom-6 left-8 hidden h-24 w-24 text-band-foreground/30 md:block" />
        <div className="container-bm relative py-16 md:py-20">
          <div className="flex flex-col items-center gap-5 text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-band-foreground/25 px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-band-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                Always &amp; Forever
              </span>
            </Reveal>
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-7xl lg:text-[6.5rem]">
              <TypeLine text="This program is" speed={55} caret={false} />
              <br />
              <span className="italic text-sage">
                <TypeLine text="100% free." speed={70} startDelay={1000} />
              </span>
            </h2>
            <Squiggle className="h-5 w-40 text-sage/70 md:w-56" />
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
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" /> 100% student-led
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
                <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage" />
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
        <Stagger className="mx-auto mt-14 grid max-w-5xl overflow-hidden rounded-3xl gap-px border border-border bg-border sm:grid-cols-2">
          {missionPoints.map(({ icon: Icon, text, tone }) => (
            <StaggerItem
              key={text}
              className="group flex items-start gap-4 bg-background p-6 text-base text-ink transition-colors hover:bg-secondary"
            >
              <Medallion className="h-11 w-11 shrink-0 transition-transform duration-500 group-hover:-rotate-6" tone={tone}>
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </Medallion>
              <span className="min-w-0 leading-relaxed">{text}</span>
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
                    className="rounded-full border border-ink/20 bg-background px-5 py-2 text-sm text-ink"
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
          <div className="relative overflow-hidden rounded-[2.5rem] border border-ink bg-primary px-8 py-20 text-center text-primary-foreground md:px-16">
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
                className="rounded-full bg-background px-7 py-3.5 text-sm font-medium tracking-wide text-ink transition-colors hover:bg-cream"
              >
                Apply now
              </Link>
              <Link
                to="/research-process"
                className="rounded-full border border-primary-foreground/40 px-7 py-3.5 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary-foreground/10"
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
