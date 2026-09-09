import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BemeChat } from "./beme-chat";
import { Sparkles } from "lucide-react";

export function BemeDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-5 w-5 text-primary" /> BeMe
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Beyond Medicine AI research companion</p>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <BemeChat variant="drawer" />
        </div>
      </SheetContent>
    </Sheet>
  );
}