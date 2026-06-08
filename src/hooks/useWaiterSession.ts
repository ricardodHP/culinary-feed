import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface WaiterInfo {
  id: string;
  display_name: string;
  username: string;
  restaurant_id: string;
  restaurant_name?: string;
  restaurant_slug?: string;
}

export function useWaiterSession(redirectIfMissing = true) {
  const navigate = useNavigate();
  const [waiter, setWaiter] = useState<WaiterInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("waiter_token");
    if (!t) {
      if (redirectIfMissing) navigate("/mesero/login", { replace: true });
      setLoading(false);
      return;
    }
    setToken(t);
    (async () => {
      const { data, error } = await supabase.functions.invoke("waiter-auth", {
        body: { action: "me", token: t },
      });
      if (error || (data as { error?: string })?.error) {
        localStorage.removeItem("waiter_token");
        localStorage.removeItem("waiter_info");
        if (redirectIfMissing) navigate("/mesero/login", { replace: true });
        setLoading(false);
        return;
      }
      const w = (data as { waiter: WaiterInfo }).waiter;
      setWaiter(w);
      localStorage.setItem("waiter_info", JSON.stringify(w));
      setLoading(false);
    })();
  }, [navigate, redirectIfMissing]);

  return { waiter, token, loading };
}
