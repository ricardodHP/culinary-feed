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
  waiter_token: z.string().min(10),
  include_delivered: z.boolean().optional(),
  session_id: z.string().uuid().optional(),
});

const hashToken = async (t: string) => {
  const d = new TextEncoder().encode(t);
  const buf = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
};

async function validateWaiter(admin: any, waiter_token: string) {
  const token_hash = await hashToken(waiter_token);
  const { data: session } = await admin
    .from("waiter_sessions")
    .select("waiter_id, expires_at, revoked_at")
    .eq("token_hash", token_hash).maybeSingle();
  if (!session || session.revoked_at ||
      new Date(session.expires_at).getTime() < Date.now()) return null;
  const { data: waiter } = await admin
    .from("waiters")
    .select("id, restaurant_id, is_active")
    .eq("id", session.waiter_id).maybeSingle();
  if (!waiter || !waiter.is_active) return null;
  return waiter as { id: string; restaurant_id: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const waiter = await validateWaiter(admin, body.waiter_token);
    if (!waiter) return json({ error: "Sesión de mesero inválida" }, 401);

    let q = admin
      .from("orders")
      .select("id, status, notes, created_by_alias, created_at, updated_at, delivered_at, session_id, table_id")
      .eq("restaurant_id", waiter.restaurant_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (body.session_id) q = q.eq("session_id", body.session_id);
    if (!body.include_delivered) {
      q = q.not("status", "in", "(delivered,cancelled)");
    }

    const { data: orders, error } = await q;
    if (error) return json({ error: error.message }, 400);

    const ids = (orders ?? []).map((o) => o.id);
    const tableIds = Array.from(new Set((orders ?? []).map((o) => o.table_id)));
    const [{ data: items }, { data: tables }] = await Promise.all([
      ids.length
        ? admin.from("order_items")
            .select("id, order_id, dish_id, dish_name, unit_price, quantity, notes")
            .in("order_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      tableIds.length
        ? admin.from("tables").select("id, label").in("id", tableIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const itemsByOrder: Record<string, any[]> = {};
    for (const it of items ?? []) {
      (itemsByOrder[it.order_id] ||= []).push(it);
    }
    const tableLabel: Record<string, string> = {};
    for (const t of tables ?? []) tableLabel[t.id] = t.label;

    const result = (orders ?? []).map((o) => ({
      ...o,
      table_label: tableLabel[o.table_id] ?? "Mesa",
      items: itemsByOrder[o.id] ?? [],
    }));

    return json({ orders: result });
  } catch (e: any) {
    console.error("orders-list error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
