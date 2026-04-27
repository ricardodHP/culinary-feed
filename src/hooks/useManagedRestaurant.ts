import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];

/**
 * Returns the restaurant the current user can manage.
 * - If ?restaurant=<id> is in the URL and the user is admin, loads that one.
 * - Otherwise loads the restaurant where owner_id = current user.
 */
export function useManagedRestaurant() {
  const { user, isAdmin } = useAuth();
  const [params] = useSearchParams();
  const overrideId = params.get("restaurant");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      let query = supabase.from("restaurants").select("*").limit(1);
      if (overrideId && isAdmin) {
        query = query.eq("id", overrideId);
      } else {
        query = query.eq("owner_id", user.id);
      }
      const { data, error } = await query.maybeSingle();
      if (cancelled) return;
      if (error) console.error(error);
      setRestaurant((data as Restaurant) ?? null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, overrideId, reloadKey]);

  return {
    restaurant,
    loading,
    reload: () => setReloadKey((k) => k + 1),
  };
}
