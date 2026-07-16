import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ClipboardEdit, XCircle } from "lucide-react";

export function RegistrationGate({ status }: { status: "incomplete" | "pending" | "approved" | "rejected" }) {
  if (status === "pending") {
    return (
      <Card className="mx-auto mt-16 max-w-xl p-10 text-center">
        <Clock className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-3xl text-ink">Application under review</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks for applying to Beyond Medicine. The Founding President will review your
          application shortly. You'll get full portal access as soon as it's approved.
        </p>
      </Card>
    );
  }
  if (status === "rejected") {
    return (
      <Card className="mx-auto mt-16 max-w-xl p-10 text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-display text-3xl text-ink">Application not accepted</h1>
        <p className="mt-3 text-muted-foreground">
          Please reach out to Beyond Medicine leadership if you believe this is a mistake.
        </p>
      </Card>
    );
  }
  return (
    <Card className="mx-auto mt-16 max-w-xl p-10 text-center">
      <ClipboardEdit className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-display text-3xl text-ink">Complete your registration</h1>
      <p className="mt-3 text-muted-foreground">
        Your account is created, but a few details are needed before you get full access to
        the Beyond Medicine Member Portal. Your progress saves automatically.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/portal/complete-registration">Complete Registration</Link>
      </Button>
    </Card>
  );
}