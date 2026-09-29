import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, ChevronDown, Sprout, Telescope, Trophy, Globe2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { BackdropCarousel } from "@/components/backdrop-carousel";
import { Reveal, Stagger, StaggerItem, WordsUp, TypeLine } from "@/components/motion-primitives";
import { ArcOrb, Medallion, OrbitRing, Squiggle, SquiggleOrb } from "@/components/orbs";
import { WorldHeatMap, type WorldHeatMapPoint } from "@/components/world-heat-map";
import { supabase } from "@/integrations/supabase/client";
import {
  AtomIcon,
  HeartbeatIcon,
  HelixIcon,
  MoleculeIcon,
  PetriIcon,
  PipetteIcon,
} from "@/components/decor";

const bannerLight = "/images/bm-banner-white.png";
const bannerFlowMap = "/images/bm-banner-flow-map.png";
const bannerWordMap = "/images/bm-banner-word-map.png";
const bannerSubMap = "/images/bm-banner-sub-map.png";

type SignupCountryCount = {
  country: string;
  member_count: number;
};

type CountryPoint = {
  label: string;
  x: number;
  y: number;
};

type PublicMapPoint = WorldHeatMapPoint & {
  key: string;
  count: number;
};

const countryPoints: Record<string, CountryPoint> = {
  australia: { label: "Australia", x: 81, y: 72 },
  bangladesh: { label: "Bangladesh", x: 72, y: 47 },
  brazil: { label: "Brazil", x: 36, y: 67 },
  canada: { label: "Canada", x: 22, y: 23 },
  china: { label: "China", x: 75, y: 39 },
  egypt: { label: "Egypt", x: 56, y: 47 },
  france: { label: "France", x: 49, y: 37 },
  germany: { label: "Germany", x: 51, y: 34 },
  hungary: { label: "Hungary", x: 53, y: 37 },
  india: { label: "India", x: 70, y: 50 },
  indonesia: { label: "Indonesia", x: 77, y: 61 },
  italy: { label: "Italy", x: 52, y: 40 },
  japan: { label: "Japan", x: 84, y: 40 },
  kenya: { label: "Kenya", x: 58, y: 58 },
  mexico: { label: "Mexico", x: 22, y: 49 },
  netherlands: { label: "Netherlands", x: 50, y: 33 },
  nigeria: { label: "Nigeria", x: 51, y: 55 },
  pakistan: { label: "Pakistan", x: 66, y: 46 },
  philippines: { label: "Philippines", x: 78, y: 52 },
  singapore: { label: "Singapore", x: 74, y: 59 },
  "south africa": { label: "South Africa", x: 54, y: 77 },
  "south korea": { label: "South Korea", x: 80, y: 41 },
  spain: { label: "Spain", x: 48, y: 41 },
  "united arab emirates": { label: "United Arab Emirates", x: 62, y: 49 },
  "united kingdom": { label: "United Kingdom", x: 48, y: 31 },
  "united states": { label: "United States", x: 23, y: 40 },
  vietnam: { label: "Vietnam", x: 75, y: 51 },
};

const countryAliases: Record<string, string> = {
  america: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  uk: "united kingdom",
  usa: "united states",
  us: "united states",
  "united states of america": "united states",
  "viet nam": "vietnam",
};

function normalizeCountry(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return countryAliases[normalized] ?? normalized;
}

function buildPublicMapPoints(counts: SignupCountryCount[]) {
  const grouped = new Map<string, PublicMapPoint>();
  for (const item of counts) {
    const key = normalizeCountry(item.country);
    const point = countryPoints[key];
    const count = Number(item.member_count);
    const existing = grouped.get(key);

    if (existing) {
      existing.count += count;
      continue;
    }

    grouped.set(key, {
      key,
      label: point?.label ?? item.country.trim(),
      x: point?.x,
      y: point?.y,
      count,
    });
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

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
      {
        name: "description",
        content:
          "Free research mentorship and publication for high school and early college students in medicine, public health, biology, and interdisciplinary STEM.",
      },
      { property: "og:title", content: "Beyond Medicine" },
      { property: "og:description", content: "Research mentorship and publication at no cost." },
    ],
  }),
  component: Index,
});

// Edit this for later
const cohorts = [
  {
    icon: Sprout,
    tag: "No experience required",
    title: "Beginner Cohort",
    blurb:
      "For students with little to no research experience. Build confidence and foundational skills, step by step.",
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
    blurb:
      "For students with some background in research or scientific writing, ready to go deeper.",
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

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const markScale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const markY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const markOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden border-b border-border">
      <BackdropCarousel />

      {/* Edit this later as this is important to fix. More room should go into the header of the page so that people are interested */}
      <div className="relative">
        {/* First screen: wordmark centered, nothing else */}
        <div className="relative flex min-h-[calc(100svh-5rem)] flex-col items-center justify-center">
          <motion.div
            style={{ scale: markScale, y: markY, opacity: markOpacity }}
            className="flex justify-center px-4"
          >
            <motion.div
              className="w-full"
              initial={{ opacity: 0, scale: 1 }}
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
            <h1 className="sr-only">
              Beyond Medicine, an interdisciplinary medical research initiative
            </h1>
            <div className="mx-auto max-w-3xl">
              <p className="font-display text-3xl leading-tight text-ink md:text-5xl py-5">
                <WordsUp text="Already know about our organization?" />{" "}
              </p>
            </div>
            <span className="relative inline-block">
              <span className="relative z-10 font-display italic"> </span>
              <TypeLine
                text="Jump straight in, or scroll down to explore our free research programs."
                speed={12}
                startDelay={300}
                caret={false}
              />
            </span>
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
                  to="/portal"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-8 py-3.5 text-sm font-medium tracking-wide text-ink transition-colors hover:bg-ink hover:text-background"
                >
                  Member Portal
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact cohort comparison grid. */
function CohortScroller() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-background" id="cohorts">
      <div className="bm-grid pointer-events-none absolute inset-0 opacity-[0.16]" />
      <div className="container-bm relative py-16 md:py-20">
        <div className="grid items-end gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,32rem)] md:gap-12">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Program Structure
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl leading-[1.05] text-ink sm:text-5xl md:text-6xl">
              Three paths. <span className="italic text-primary">One community.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              Start at the level that fits your experience. Every cohort receives structured
              guidance, practical research experience, and support from the same community.
            </p>
          </Reveal>
        </div>

        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
          {cohorts.map(({ icon: Icon, tag, title, blurb, points }, i) => (
            <Reveal key={title} delay={i * 0.06} className="h-full">
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="group relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card/95 p-6 shadow-[0_18px_45px_rgba(6,47,53,0.06)] md:p-7"
              >
                <span
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${
                    i === 0 ? "bg-sage" : i === 1 ? "bg-pine" : "bg-slate"
                  }`}
                />
                <SquiggleOrb className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 text-primary/[0.09] transition-transform duration-700 group-hover:rotate-12" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <Medallion
                      className="h-12 w-12 shrink-0"
                      tone={i === 0 ? "primary" : i === 1 ? "pine" : "slate"}
                    >
                      <Icon className="h-5 w-5" />
                    </Medallion>
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Cohort {i + 1}
                      </p>
                      <h3 className="mt-1 font-display text-2xl leading-none text-ink">{title}</h3>
                    </div>
                  </div>
                  <span className="font-display text-4xl leading-none text-ink/[0.09]">
                    0{i + 1}
                  </span>
                </div>

                <p className="relative mt-5 min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground">
                  {blurb}
                </p>

                <div className="relative mt-5 border-t border-border pt-5">
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
                    {tag}
                  </span>
                </div>

                <Stagger className="relative mt-4 grid content-start gap-1.5 text-sm text-ink">
                  {points.map((p) => (
                    <StaggerItem
                      key={p}
                      className="flex items-start gap-2.5 rounded-lg py-1.5 transition-colors hover:text-primary"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-sage/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <span className="min-w-0 leading-snug">{p}</span>
                    </StaggerItem>
                  ))}
                </Stagger>
              </motion.article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12}>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-secondary/45 px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-semibold text-ink">Not sure where you fit?</span> Your
              application helps us place you in the cohort where you can grow most.
            </p>
            <Link
              to="/apply"
              className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-primary transition-colors hover:text-pine"
            >
              Apply for placement
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function PublicCommunityMap() {
  const [counts, setCounts] = useState<SignupCountryCount[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("public_signup_location_counts").then(({ data }) => {
      if (!cancelled) setCounts((data ?? []) as SignupCountryCount[]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const points = useMemo(() => buildPublicMapPoints(counts), [counts]);
  const totalLocated = counts.reduce((sum, item) => sum + Number(item.member_count), 0);

  return (
    <section className="relative overflow-hidden border-y border-border bg-background">
      <div className="bm-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="container-bm relative grid items-center gap-12 py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:py-32">
        <Reveal>
          <div className="max-w-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <Globe2 className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Our global reach
            </p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              Research connects us across borders.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              <Brand /> brings together students and mentors from around the world to learn,
              collaborate, and make meaningful research opportunities accessible wherever curiosity
              begins.
            </p>

            <div className="mt-9 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7">
              <div>
                <p className="font-display text-3xl text-ink">
                  {points.length > 0 ? points.length : "Growing"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {points.length === 1 ? "country represented" : "countries represented"}
                </p>
              </div>
              <div>
                <p className="font-display text-3xl text-ink">
                  {totalLocated > 0 ? totalLocated.toLocaleString() : "Worldwide"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">community connections</p>
              </div>
            </div>

            <p className="mt-7 text-sm text-muted-foreground">
              Hover, tap, or focus a highlighted country to explore our reach.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <WorldHeatMap
            points={points}
            className="border-border/70 bg-muted/70 shadow-[0_28px_90px_rgba(6,47,53,0.18)]"
          />
        </Reveal>
      </div>
    </section>
  );
}

function Index() {
  return (
    <div>
      <Hero />
      {/* 100% free */}
      <section className="relative overflow-hidden border-b border-border bg-band text-band-foreground">
        <div className="container-bm relative pb-24 pt-10 md:pb-26 md:pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto max-w-3xl">
              <p className="font-display text-3xl leading-tight text-ink md:text-5xl">
                <div className="container-bm relative py-3 md:py-3">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h2 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-7xl lg:text-[6.5rem]">
                      <TypeLine text="This program is" speed={55} caret={false} />
                      <br />
                      <span className="italic text-sage">
                        <TypeLine text="100% free." speed={70} startDelay={1000} />
                      </span>
                    </h2>
                    <Squiggle className="h-5 w-40 text-sage/70 md:w-56" />
                  </div>
                </div>
                <Reveal delay={0.1}>
                  <p className="mx-auto max-w-2xl text-base leading-relaxed text-band-foreground/75 md:text-lg">
                    No tuition, application fees, or hidden costs. Beyond Medicine provides
                    mentorship, peer review, and the chance to publish, all completely free for
                    every student in the program.
                  </p>
                </Reveal>
                <Stagger className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.22em] text-band-foreground/60">
                  {["$0 to apply", "$0 to join", "$0 to publish"].map((t) => (
                    <StaggerItem key={t}>{t}</StaggerItem>
                  ))}
                </Stagger>
              </p>
            </div>
          </div>
        </div>

        <div className="bm-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
      </section>

      <section className="border-b border-border bg-cream">
        <div className="container-bm relative grid gap-12 py-24 md:grid-cols-12 md:py-32">
          <PetriIcon className="pointer-events-none absolute left-6 bottom-10 hidden h-28 w-40 text-ink/[0.06] lg:block" />
          <div className="md:col-span-5">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Who Are We
              </p>
              <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
                A student-led initiative making research accessible.
              </h2>
            </Reveal>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <Stagger className="space-y-5">
              <StaggerItem>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  <Brand /> is a student-led initiative designed to make research more accessible to
                  high school and early college students interested in medicine, public health,
                  biology, and other interdisciplinary STEM fields.
                </p>
              </StaggerItem>
              <StaggerItem>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Our mission isn't simply to publish papers, it's to help students learn how to
                  think critically, analyze scientific literature, communicate ideas effectively,
                  and grow through the research process itself.
                </p>
              </StaggerItem>
              <StaggerItem>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Through mentorship, peer review, collaborative learning, and structured cohort
                  systems, students can explore research regardless of previous experience level.
                </p>
              </StaggerItem>
            </Stagger>
          </div>
        </div>
      </section>

      <PublicCommunityMap />

      {/* Why Different */}
      <section className="border-y border-border bg-cream">
        <div className="container-bm relative py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Why we stand out
                </p>
                <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
                  All are welcome, no matter the experience.
                </h2>
              </Reveal>
            </div>
            <div className="md:col-span-7 md:pl-12">
              <Reveal delay={0.1}>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  At Beyond Medicine, we understand that research is a learned skill, not an innate
                  talent. For many students, getting started can feel overwhelming. Through
                  structured programs, mentorship, and hands-on collaboration, we help students
                  build their research capabilities and gain the confidence to pursue real-world
                  impact. Our approach focuses on five core philosophies:
                </p>
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 text-primary/15 transition-transform duration-700 group-hover:rotate-12 md:h-52 md:w-52" />
              </Reveal>
              <p className="text-lg leading-relaxed text-muted-foreground flex flex-wrap items-center gap-x-1.5">
                <Stagger as="span" className="inline-flex flex-wrap gap-x-1.5">
                  <StaggerItem as="span" className="font-medium text-foreground">
                    guidance,
                  </StaggerItem>
                  <StaggerItem as="span" className="font-medium text-foreground">
                    practice,
                  </StaggerItem>
                  <StaggerItem as="span" className="font-medium text-foreground">
                    collaboration,
                  </StaggerItem>
                  <StaggerItem as="span" className="font-medium text-foreground">
                    revision,
                  </StaggerItem>
                  <StaggerItem as="span" className="font-medium text-foreground">
                    and curiosity.
                  </StaggerItem>
                </Stagger>
              </p>
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
              Applications are reviewed on a rolling basis. No experience required for the Beginner
              Cohort.
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
