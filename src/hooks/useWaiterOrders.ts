import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OrderItem, OrderStatus } from "./useTableOrders";

export interface WaiterOrder {
  id: string;
  status: OrderStatus;
  notes: string | null;
  created_by_alias: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  session_id: string;
  table_id: string;
  table_label: string;
  items: OrderItem[];
}

export function useWaiterOrders(token: string | null) {
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    const { data } = await supabase.functions.invoke("orders-list", {
      body: { waiter_token: token },
    });
    setOrders((data as { orders?: WaiterOrder[] })?.orders ?? []);
    setLoading(false);
  }, [token]);

  const updateStatus = useCallback(
    async (order_id: string, status: OrderStatus) => {
      if (!token) return;
      const { data, error } = await supabase.functions.invoke("order-update-status", {
        body: { waiter_token: token, order_id, status },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? error?.message ?? "Error");
      }
      await refresh();
    },
    [token, refresh],
  );

  useEffect(() => {
    if (!token) return;
    refresh();
    const id = setInterval(refresh, 5000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, refresh]);

  return { orders, loading, refresh, updateStatus };
}
