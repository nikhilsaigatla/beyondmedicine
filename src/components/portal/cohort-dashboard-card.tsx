import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function CohortDashboardCard() {
  const { data: me } = useCurrentUser();
  const query = useQuery({
    queryKey: ["my-cohort", me?.user.id],
    enabled: !!me?.hasFullAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cohort_applications")
        .select("*")
        .eq("user_id", me!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!query.data) return null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-primary/5 p-6">
      <div>
        <p className="text-sm text-muted-foreground">Your next step</p>
        <h2 className="font-display text-2xl">{query.data.cohort} cohort application</h2>
        <p className="mt-1 text-sm">Status: {query.data.status}</p>
      </div>
      <Button asChild>
        <Link to="/portal/cohorts">
          {query.data.status === "Not Started" ? "Apply now" : "View application"}
        </Link>
      </Button>
    </Card>
  );
}
