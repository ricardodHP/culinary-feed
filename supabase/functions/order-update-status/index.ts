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

const STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"] as const;
type Status = typeof STATUSES[number];

const Schema = z.object({
  waiter_token: z.string().min(10),
  order_id: z.string().uuid(),
  status: z.enum(STATUSES),
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

const ALLOWED: Record<Status, Status[]> = {
  pending: ["preparing", "cancelled", "delivered"],
  preparing: ["ready", "cancelled", "delivered"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { waiter_token, order_id, status } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const waiter = await validateWaiter(admin, waiter_token);
    if (!waiter) return json({ error: "Sesión de mesero inválida" }, 401);

    const { data: order } = await admin
      .from("orders")
      .select("id, status, restaurant_id")
      .eq("id", order_id).maybeSingle();
    if (!order || order.restaurant_id !== waiter.restaurant_id) {
      return json({ error: "Pedido no encontrado" }, 404);
    }
    const current = order.status as Status;
    if (current === status) {
      return json({ order });
    }
    if (!ALLOWED[current].includes(status)) {
      return json({ error: `Transición no permitida (${current} → ${status})` }, 400);
    }

    const patch: Record<string, unknown> = { status };
    if (status === "delivered") patch.delivered_at = new Date().toISOString();

    const { data, error } = await admin
      .from("orders").update(patch).eq("id", order_id)
      .select("id, status, delivered_at, updated_at").single();
    if (error) return json({ error: error.message }, 400);
    return json({ order: data });
  } catch (e: any) {
    console.error("order-update-status error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
