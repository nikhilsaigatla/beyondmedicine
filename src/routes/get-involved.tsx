import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/get-involved")({
  head: () => ({
    meta: [
      { title: "Get Involved — Beyond Medicine" },
      { name: "description", content: "Become a member, volunteer, apply for leadership, or partner with Beyond Medicine." },
      { property: "og:title", content: "Get Involved — Beyond Medicine" },
      { property: "og:description", content: "Membership, volunteering, leadership, and partnerships." },
    ],
  }),
  component: GetInvolved,
});

const paths = [
  { title: "Membership", body: "Join our community of student researchers, writers, and future clinicians.", cta: "Become a member" },
  { title: "Volunteer", body: "Support health outreach, education, and community service initiatives.", cta: "Volunteer with us" },
  { title: "Leadership", body: "Apply for officer roles and committee positions across the initiative.", cta: "Apply to lead" },
  { title: "Partnerships", body: "Collaborate with us as a school, institution, lab, or organization.", cta: "Partner with us" },
];

function GetInvolved() {
  return (
    <div>
      <PageHero
        eyebrow="Get Involved"
        title="Find your place at Beyond Medicine."
        description="Whether you're a student exploring medicine, a researcher seeking collaborators, or an organization aligned with our mission — there's a way in."
      />
      <section className="container-bm py-24 md:py-32">
        <div className="grid gap-6 md:grid-cols-2">
          {paths.map((p) => (
            <div
              key={p.title}
              className="group flex flex-col rounded-3xl border border-border bg-background p-10 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(20,30,60,0.2)]"
            >
              <h3 className="font-display text-3xl text-ink">{p.title}</h3>
              <p className="mt-4 leading-relaxed text-muted-foreground">{p.body}</p>
              <Link
                to="/contact"
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {p.cta}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}