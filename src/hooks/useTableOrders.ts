import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string;
  dish_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
}

export interface SessionOrder {
  id: string;
  status: OrderStatus;
  notes: string | null;
  created_by_alias: string | null;
  created_by_diner_id: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  items: OrderItem[];
}

export function useTableOrders(code: string | undefined | null, enabled = true) {
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!code) return;
    const { data } = await supabase.functions.invoke("session-orders", {
      body: { code },
    });
    const o = (data as { orders?: SessionOrder[] })?.orders ?? [];
    setOrders(o);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    if (!enabled || !code) return;
    refresh();
    const id = setInterval(refresh, 8000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [code, enabled, refresh]);

  return { orders, loading, refresh };
}
