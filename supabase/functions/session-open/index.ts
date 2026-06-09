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
  table_id: z.string().uuid(),
});

const hashToken = async (t: string) => {
  const d = new TextEncoder().encode(t);
  const buf = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(len = 6) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { waiter_token, table_id } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token_hash = await hashToken(waiter_token);
    const { data: session } = await admin
      .from("waiter_sessions")
      .select("waiter_id, expires_at, revoked_at")
      .eq("token_hash", token_hash)
      .maybeSingle();
    if (!session || session.revoked_at ||
        new Date(session.expires_at).getTime() < Date.now()) {
      return json({ error: "Sesión de mesero inválida" }, 401);
    }
    const { data: waiter } = await admin
      .from("waiters")
      .select("id, restaurant_id, is_active")
      .eq("id", session.waiter_id)
      .maybeSingle();
    if (!waiter || !waiter.is_active) return json({ error: "Mesero inactivo" }, 401);

    const { data: table } = await admin
      .from("tables")
      .select("id, restaurant_id, is_active, label")
      .eq("id", table_id)
      .maybeSingle();
    if (!table || table.restaurant_id !== waiter.restaurant_id) {
      return json({ error: "Mesa no encontrada" }, 404);
    }
    if (!table.is_active) return json({ error: "Mesa inactiva" }, 400);

    // If already has open session, return it
    const { data: existing } = await admin
      .from("table_sessions")
      .select("id, code, opened_at")
      .eq("table_id", table.id)
      .eq("status", "open")
      .maybeSingle();
    if (existing) {
      return json({ session: existing, table: { id: table.id, label: table.label } });
    }

    // Insert with retries on code collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode(6);
      const { data, error } = await admin
        .from("table_sessions")
        .insert({
          restaurant_id: waiter.restaurant_id,
          table_id: table.id,
          code,
          opened_by_waiter_id: waiter.id,
        })
        .select("id, code, opened_at")
        .single();
      if (!error) {
        return json({ session: data, table: { id: table.id, label: table.label } });
      }
      if ((error as any).code !== "23505") {
        return json({ error: error.message }, 400);
      }
    }
    return json({ error: "No se pudo generar un código único" }, 500);
  } catch (e: any) {
    console.error("session-open error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
