import { cn } from "@/lib/utils";

/**
 * Theme-aware Beyond Medicine mark. Two pre-rendered transparent PNGs (black
 * artwork for light mode, white artwork for dark mode) are swapped with CSS so
 * we never rely on filter tricks that can fight transforms.
 */
export function LogoMark({ className, alt = "Beyond Medicine" }: { className?: string; alt?: string }) {
  return (
    <>
      <img src="/images/bm-logo-transparent.png" alt={alt} className={cn("block dark:hidden", className)} />
      <img src="/images/bm-logo-white.png" alt="" aria-hidden className={cn("hidden dark:block", className)} />
    </>
  );
}