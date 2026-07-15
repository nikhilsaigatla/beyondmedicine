import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/portal/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const { data: me } = useCurrentUser();

  const { data: courses } = useQuery({
    queryKey: ["courses-all", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, profiles:mentor_id(full_name, email)");
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every mentor runs their own course. You see the ones you're enrolled in or teach.</p>
      </div>
      {courses && courses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => {
            const p = c.profiles as unknown as { full_name: string | null; email: string } | null;
            return (
              <Card key={c.id} className="p-6">
                <h2 className="font-display text-xl text-ink">{c.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Mentor: {p?.full_name || p?.email}</p>
                {c.description && <p className="mt-3 text-sm leading-relaxed text-foreground">{c.description}</p>}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No courses available. Once a mentor is assigned to you, their course appears here.
        </Card>
      )}
    </div>
  );
}
