import { Link } from "@tanstack/react-router";
import bmLogo from "@/assets/bm-logo.png.asset.json";
import { Instagram, Linkedin, Mail, Youtube } from "lucide-react";
import { Brand } from "@/components/brand";
import { DnaIcon, MoleculeIcon } from "@/components/decor";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.89A2.89 2.89 0 0 1 9.38 12.5V8.92a6.92 6.92 0 1 0 6.83 6.92V9.62a8.63 8.63 0 0 0 5.01 1.59V7.3a5.28 5.28 0 0 1-1.63-.61z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border/60 bg-cream">
      <DnaIcon className="pointer-events-none absolute -left-10 top-12 h-64 w-40 text-ink/[0.06]" />
      <MoleculeIcon className="pointer-events-none absolute -right-12 bottom-12 h-56 w-56 text-ink/[0.06]" />
      <div className="container-bm relative py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img src={bmLogo.url} alt="Beyond Medicine" className="h-12 w-auto" />
              <Brand className="text-3xl text-ink" />
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              <Brand /> is a 100% student‑led interdisciplinary medical research
              initiative — making research, mentorship, and publication
              accessible to high school and early college students.
            </p>
            <form className="mt-6 flex max-w-md gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 rounded-full border border-border bg-background px-5 py-3 text-sm outline-none transition focus:border-primary"
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-ink">
              Explore
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Home</Link></li>
              <li><Link to="/research-process" className="hover:text-ink">Research Process</Link></li>
              <li><Link to="/journal" className="hover:text-ink">Journal</Link></li>
              <li><Link to="/leadership" className="hover:text-ink">Leadership</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-ink">
              Join
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/apply" className="hover:text-ink">Apply</Link></li>
              <li><Link to="/leadership" className="hover:text-ink">Leadership Application</Link></li>
            </ul>
            <div className="mt-5 flex gap-3">
              <a href="#" aria-label="Instagram" className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-ink"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="YouTube" className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-ink"><Youtube className="h-4 w-4" /></a>
              <a href="#" aria-label="TikTok" className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-ink"><TikTokIcon className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Beyond Medicine. All rights reserved.</p>
          <p>An interdisciplinary medical research initiative.</p>
        </div>
      </div>
    </footer>
  );
}