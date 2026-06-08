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

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), waiter_token: z.string().min(10) }),
  z.object({
    action: z.literal("create"),
    waiter_token: z.string().min(10),
    label: z.string().trim().min(1).max(40),
    capacity: z.number().int().positive().max(50).optional(),
  }),
  z.object({
    action: z.literal("update"),
    waiter_token: z.string().min(10),
    table_id: z.string().uuid(),
    label: z.string().trim().min(1).max(40).optional(),
    capacity: z.number().int().positive().max(50).nullable().optional(),
    is_active: z.boolean().optional(),
  }),
]);

const hashToken = async (t: string) => {
  const d = new TextEncoder().encode(t);
  const buf = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

async function validateWaiter(admin: any, waiter_token: string) {
  const token_hash = await hashToken(waiter_token);
  const { data: session } = await admin
    .from("waiter_sessions")
    .select("waiter_id, expires_at, revoked_at")
    .eq("token_hash", token_hash)
    .maybeSingle();
  if (
    !session ||
    session.revoked_at ||
    new Date(session.expires_at).getTime() < Date.now()
  ) return null;
  const { data: waiter } = await admin
    .from("waiters")
    .select("id, restaurant_id, is_active")
    .eq("id", session.waiter_id)
    .maybeSingle();
  if (!waiter || !waiter.is_active) return null;
  return waiter as { id: string; restaurant_id: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const waiter = await validateWaiter(admin, body.waiter_token);
    if (!waiter) return json({ error: "Sesión de mesero inválida" }, 401);

    if (body.action === "list") {
      const { data: tables } = await admin
        .from("tables")
        .select("id, label, capacity, is_active, created_at")
        .eq("restaurant_id", waiter.restaurant_id)
        .order("label", { ascending: true });
      const ids = (tables ?? []).map((t) => t.id);
      let sessions: any[] = [];
      if (ids.length) {
        const { data } = await admin
          .from("table_sessions")
          .select("id, table_id, code, opened_at")
          .eq("status", "open")
          .in("table_id", ids);
        sessions = data ?? [];
      }
      // counts per session
      const sids = sessions.map((s) => s.id);
      const counts: Record<string, number> = {};
      if (sids.length) {
        const { data: diners } = await admin
          .from("diners")
          .select("session_id")
          .in("session_id", sids);
        for (const d of diners ?? []) counts[d.session_id] = (counts[d.session_id] ?? 0) + 1;
      }
      const merged = (tables ?? []).map((t) => {
        const s = sessions.find((x) => x.table_id === t.id);
        return {
          ...t,
          active_session: s
            ? { id: s.id, code: s.code, opened_at: s.opened_at, diner_count: counts[s.id] ?? 0 }
            : null,
        };
      });
      return json({ tables: merged });
    }

    if (body.action === "create") {
      const { data, error } = await admin
        .from("tables")
        .insert({
          restaurant_id: waiter.restaurant_id,
          label: body.label,
          capacity: body.capacity ?? null,
          created_by_waiter_id: waiter.id,
        })
        .select("id, label, capacity, is_active, created_at")
        .single();
      if (error) {
        if ((error as any).code === "23505") {
          return json({ error: "Ya existe una mesa con ese nombre" }, 409);
        }
        return json({ error: error.message }, 400);
      }
      return json({ table: data });
    }

    if (body.action === "update") {
      // ensure table belongs to waiter's restaurant
      const { data: t } = await admin
        .from("tables")
        .select("restaurant_id")
        .eq("id", body.table_id)
        .maybeSingle();
      if (!t || t.restaurant_id !== waiter.restaurant_id) {
        return json({ error: "Mesa no encontrada" }, 404);
      }
      const patch: Record<string, unknown> = {};
      if (body.label !== undefined) patch.label = body.label;
      if (body.capacity !== undefined) patch.capacity = body.capacity;
      if (body.is_active !== undefined) patch.is_active = body.is_active;
      const { data, error } = await admin
        .from("tables")
        .update(patch)
        .eq("id", body.table_id)
        .select("id, label, capacity, is_active")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ table: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("waiter-tables error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
