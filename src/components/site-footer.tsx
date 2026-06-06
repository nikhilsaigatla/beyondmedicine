import { Link } from "@tanstack/react-router";
import bmLogo from "@/assets/bm-logo.png.asset.json";
import { Instagram, Linkedin, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-cream">
      <div className="container-bm py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img src={bmLogo.url} alt="Beyond Medicine" className="h-12 w-auto" />
              <span className="font-display text-2xl text-ink">beyond medicine</span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              An interdisciplinary medical research initiative advancing
              education, scientific collaboration, and the next generation of
              human‑centered healthcare.
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
              <li><Link to="/about" className="hover:text-ink">About</Link></li>
              <li><Link to="/leadership" className="hover:text-ink">Leadership</Link></li>
              <li><Link to="/research" className="hover:text-ink">Research</Link></li>
              <li><Link to="/resources" className="hover:text-ink">Resources</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-ink">
              Connect
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/get-involved" className="hover:text-ink">Get Involved</Link></li>
              <li><Link to="/contact" className="hover:text-ink">Contact</Link></li>
            </ul>
            <div className="mt-5 flex gap-3">
              <a href="#" aria-label="Instagram" className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-ink"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="LinkedIn" className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-ink"><Linkedin className="h-4 w-4" /></a>
              <a href="#" aria-label="Email" className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-ink"><Mail className="h-4 w-4" /></a>
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