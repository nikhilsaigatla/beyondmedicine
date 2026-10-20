import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
export function usePortalNotifications() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const userId = me?.user.id;
  const query = useQuery({
    queryKey: ["portal-notifications", me?.user.id],
    enabled: !!me,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", me!.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => void qc.invalidateQueries({ queryKey: ["portal-notifications"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
  return query;
}
