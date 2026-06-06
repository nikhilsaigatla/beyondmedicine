import { createFileRoute, Link } from "@tanstack/react-router";
import bmTitle from "@/assets/bm-title.png.asset.json";
import { ArrowUpRight, BookOpen, FlaskConical, HeartPulse, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beyond Medicine — Interdisciplinary Medical Research Initiative" },
      { name: "description", content: "Advancing medical education, research, and human-centered healthcare through interdisciplinary student-led collaboration." },
      { property: "og:title", content: "Beyond Medicine" },
      { property: "og:description", content: "An interdisciplinary medical research initiative." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-mist/50 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-[-6rem] h-[28rem] w-[28rem] rounded-full bg-sage/20 blur-3xl" />
        </div>
        <div className="container-bm relative pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="mx-auto max-w-4xl text-center bm-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" />
              Interdisciplinary Medical Research Initiative
            </span>
            <div className="mt-10 flex justify-center bm-float">
              <img
                src={bmTitle.url}
                alt="Beyond Medicine — an interdisciplinary medical research initiative"
                className="w-full max-w-2xl"
              />
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              A community of students, researchers, and clinicians advancing
              medicine through curiosity, compassion, and interdisciplinary
              collaboration.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to="/get-involved"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Join the initiative
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/research"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-medium text-ink transition hover:bg-muted"
              >
                Explore our research
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-border/60 bg-cream">
        <div className="container-bm grid gap-12 py-24 md:grid-cols-12 md:py-32">
          <div className="md:col-span-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Our Mission
            </p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              Medicine, reimagined through curiosity and collaboration.
            </h2>
          </div>
          <div className="md:col-span-7 md:pl-12">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Beyond Medicine bridges disciplines — clinical practice,
              scientific research, public health, technology, and the
              humanities — to prepare a new generation of thinkers committed to
              advancing human‑centered care.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              We support student researchers, publish original work, and create
              accessible educational pathways into medicine and the sciences.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Research", "Education", "Mentorship", "Outreach"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-ink"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Impact stats */}
      <section className="container-bm py-24 md:py-32">
        <div className="grid gap-8 md:grid-cols-4">
          {[
            { k: "20+", v: "Student researchers" },
            { k: "12", v: "Active projects" },
            { k: "8", v: "Partner institutions" },
            { k: "100%", v: "Student‑led" },
          ].map((s) => (
            <div
              key={s.v}
              className="rounded-3xl border border-border bg-background p-8 transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.18)]"
            >
              <p className="font-display text-5xl text-ink">{s.k}</p>
              <p className="mt-3 text-sm text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured opportunities */}
      <section className="border-t border-border/60 bg-gradient-to-b from-background to-cream">
        <div className="container-bm py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Opportunities
            </p>
            <h2 className="mt-4 text-4xl leading-tight text-ink md:text-5xl">
              Pathways into medicine, science, and beyond.
            </h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FlaskConical, title: "Research", body: "Join interdisciplinary projects spanning biomedical sciences, public health, and clinical innovation." },
              { icon: Users, title: "Leadership", body: "Develop your voice as a future leader through officer roles, committees, and partnerships." },
              { icon: HeartPulse, title: "Volunteering", body: "Serve your community through health outreach, education, and direct service initiatives." },
              { icon: BookOpen, title: "Education", body: "Access curated curricula, workshops, and mentorship from researchers and clinicians." },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-3xl border border-border bg-background p-8 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.2)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mist/70 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <Link
                  to="/get-involved"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  Learn more
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-bm py-24 md:py-32">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary px-8 py-20 text-center text-primary-foreground md:px-16">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sage/20 blur-3xl" />
          <h2 className="relative text-balance text-4xl leading-tight md:text-5xl">
            Help shape the future of medicine.
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80">
            Whether you're a student, researcher, or partner — there's a place
            for you at Beyond Medicine.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/get-involved"
              className="rounded-full bg-background px-7 py-3.5 text-sm font-medium text-ink transition hover:bg-cream"
            >
              Get involved
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-primary-foreground/30 px-7 py-3.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
