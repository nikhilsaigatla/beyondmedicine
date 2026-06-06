import { cn } from "@/lib/utils";

/**
 * Renders the words "beyond medicine" in the script-serif wordmark style
 * that matches the logo. Use this anywhere the brand name appears in copy.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("brand-name", className)}>beyond medicine</span>
  );
}