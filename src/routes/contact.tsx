import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { Instagram, Linkedin, Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Beyond Medicine" },
      { name: "description", content: "Get in touch with the Beyond Medicine team." },
      { property: "og:title", content: "Contact — Beyond Medicine" },
      { property: "og:description", content: "Reach the Beyond Medicine team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div>
      <PageHero
        eyebrow="Contact"
        title="Let's start a conversation."
        description="Questions, collaborations, or media — we'd love to hear from you."
      />
      <section className="container-bm py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-5">
          <form
            className="md:col-span-3 rounded-3xl border border-border bg-background p-10"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" />
              <Field label="Last name" />
              <Field label="Email" type="email" className="sm:col-span-2" />
              <Field label="Subject" className="sm:col-span-2" />
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-medium text-ink">Message</span>
              <textarea
                rows={6}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-5 py-3 text-sm outline-none transition focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="mt-6 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Send message
            </button>
          </form>
          <aside className="md:col-span-2 space-y-6">
            <div className="rounded-3xl border border-border bg-cream p-8">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Email</p>
              <p className="mt-3 font-display text-2xl text-ink">hello@beyondmedicine.org</p>
            </div>
            <div className="rounded-3xl border border-border bg-cream p-8">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Follow</p>
              <div className="mt-4 flex gap-3">
                {[Instagram, Linkedin, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="rounded-full border border-border bg-background p-3 text-muted-foreground transition hover:border-primary hover:text-ink">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Field({ label, type = "text", className = "" }: { label: string; type?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        className="mt-2 w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none transition focus:border-primary"
      />
    </label>
  );
}