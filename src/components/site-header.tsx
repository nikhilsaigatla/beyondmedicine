import { Link } from "@tanstack/react-router";
import { useState } from "react";
import bmLogo from "@/assets/bm-logo.png.asset.json";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";

const nav = [
  { to: "/", label: "Home" },
  { to: "/research-process", label: "Research Process" },
  { to: "/apply", label: "Apply" },
  { to: "/journal", label: "Journal" },
  { to: "/leadership", label: "Leadership" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-bm flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src={bmLogo.url} alt="Beyond Medicine" className="h-10 w-auto" />
          <Brand className="hidden text-2xl text-ink sm:inline" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-ink"
              activeProps={{ className: "rounded-full px-4 py-2 text-sm font-medium bg-muted text-ink" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <Link
            to="/apply"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Apply now
          </Link>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full p-2 text-ink lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <nav className="container-bm flex flex-col gap-1 py-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-ink"
                activeProps={{ className: "rounded-2xl px-4 py-3 text-base font-medium bg-muted text-ink" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/apply"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-sm font-medium text-primary-foreground"
            >
              Apply now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}