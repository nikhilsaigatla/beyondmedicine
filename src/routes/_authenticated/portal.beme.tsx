import { createFileRoute } from "@tanstack/react-router";
import { BemeChat } from "@/components/portal/beme-chat";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/beme")({
  component: BemePage,
});

function BemePage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-display text-4xl text-ink">
          <Sparkles className="h-8 w-8 text-primary" /> MistAI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beyond Medicine's AI research companion. Complements your mentor, not a replacement.
        </p>
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-background">
        <BemeChat />
      </div>
    </div>
  );
}