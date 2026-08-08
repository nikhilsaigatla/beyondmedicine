import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Instagram, Youtube } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const logoSrc = "/images/bm-logo-transparent.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/research-process", label: "Research Process" },
  { to: "/journal", label: "Journal" },
  { to: "/leadership", label: "Leadership" },
] as const;

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.89A2.89 2.89 0 0 1 9.38 12.5V8.92a6.92 6.92 0 1 0 6.83 6.92V9.62a8.63 8.63 0 0 0 5.01 1.59V7.3a5.28 5.28 0 0 1-1.63-.61z" />
    </svg>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-bm flex h-20 items-center justify-between">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src={logoSrc} alt="Beyond Medicine" className="logo-art h-9 w-auto transition-transform duration-500 group-hover:scale-105" />
          <Brand className="hidden text-2xl text-ink sm:inline" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100"
              activeProps={{ className: "relative px-3 py-2 text-sm font-medium text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-px after:bg-ink" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-ink data-[state=open]:text-ink">
              Social Media
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <a href="#" target="_blank" rel="noopener noreferrer" className="flex cursor-pointer items-center gap-2">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#" target="_blank" rel="noopener noreferrer" className="flex cursor-pointer items-center gap-2">
                  <Youtube className="h-4 w-4" /> YouTube
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#" target="_blank" rel="noopener noreferrer" className="flex cursor-pointer items-center gap-2">
                  <TikTokIcon className="h-4 w-4" /> TikTok
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="hidden lg:block">
          <div className="flex items-center gap-2">
            <ThemeToggle className="mr-1" />
            <Link
              to="/portal"
              className="border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-muted"
            >
              Member Portal
            </Link>
            <Link
              to="/apply"
              className="bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pine"
            >
              Apply now
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 text-ink"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <nav className="container-bm flex flex-col gap-1 py-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-ink"
                activeProps={{ className: "px-4 py-3 text-base font-medium bg-muted text-ink" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border/60 pt-2">
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Social Media
              </p>
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-ink"
              >
                <Instagram className="h-4 w-4" /> Instagram
              </a>
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-ink"
              >
                <Youtube className="h-4 w-4" /> YouTube
              </a>
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-ink"
              >
                <TikTokIcon className="h-4 w-4" /> TikTok
              </a>
            </div>
            <Link
              to="/apply"
              onClick={() => setOpen(false)}
              className="mt-2 bg-primary px-5 py-3 text-center text-sm font-medium text-primary-foreground"
            >
              Apply now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
