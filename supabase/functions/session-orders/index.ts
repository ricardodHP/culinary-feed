// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const Schema = z.object({
  code: z.string().trim().length(6),
  device_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const code = parsed.data.code.toUpperCase();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session } = await admin
      .from("table_sessions")
      .select("id, status")
      .eq("code", code).maybeSingle();
    if (!session) return json({ error: "Sesión no encontrada" }, 404);

    const { data: orders } = await admin
      .from("orders")
      .select("id, status, notes, created_by_alias, created_at, updated_at, delivered_at, created_by_diner_id")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });

    const ids = (orders ?? []).map((o) => o.id);
    const { data: items } = ids.length
      ? await admin.from("order_items")
          .select("id, order_id, dish_id, dish_name, unit_price, quantity, notes")
          .in("order_id", ids)
      : { data: [] as any[] };

    const byOrder: Record<string, any[]> = {};
    for (const it of items ?? []) (byOrder[it.order_id] ||= []).push(it);

    const result = (orders ?? []).map((o) => ({ ...o, items: byOrder[o.id] ?? [] }));
    return json({ orders: result, session_status: session.status });
  } catch (e: any) {
    console.error("session-orders error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
