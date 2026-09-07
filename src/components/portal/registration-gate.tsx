import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ClipboardEdit, XCircle } from "lucide-react";

export function RegistrationGate({
  status,
  onSignOut,
}: {
  status: "incomplete" | "pending" | "approved" | "rejected";
  onSignOut?: () => void;
}) {
  if (status === "pending") {
    return (
      <Card className="mx-auto mt-16 max-w-xl p-10 text-center">
        <Clock className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-3xl text-ink">Application forums</h1>
        <p className="mt-3 text-muted-foreground">
          Your application is pending review. The member portal will unlock after a decision is made.
        </p>
        {onSignOut && <Button className="mt-6" onClick={onSignOut}>Sign out</Button>}
      </Card>
    );
  }
  if (status === "rejected") {
    return (
      <Card className="mx-auto mt-16 max-w-xl p-10 text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-display text-3xl text-ink">Application forums</h1>
        <p className="mt-3 text-muted-foreground">
          Your previous application was not accepted. You can create a new application for review.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/portal/complete-registration">Create application</Link>
        </Button>
        {onSignOut && <Button variant="outline" className="mt-3" onClick={onSignOut}>Sign out</Button>}
      </Card>
    );
  }
  return (
    <Card className="mx-auto mt-16 max-w-xl p-10 text-center">
      <ClipboardEdit className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-display text-3xl text-ink">Application forums</h1>
      <p className="mt-3 text-muted-foreground">
        No application was found for this account. Create one to request membership access.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/portal/complete-registration">Create application</Link>
      </Button>
      {onSignOut && <Button variant="outline" className="mt-3" onClick={onSignOut}>Sign out</Button>}
    </Card>
  );
}