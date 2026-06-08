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
  session_id: z.string().uuid(),
});

const hashToken = async (t: string) => {
  const d = new TextEncoder().encode(t);
  const buf = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { waiter_token, session_id } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token_hash = await hashToken(waiter_token);
    const { data: wsess } = await admin
      .from("waiter_sessions")
      .select("waiter_id, expires_at, revoked_at")
      .eq("token_hash", token_hash)
      .maybeSingle();
    if (!wsess || wsess.revoked_at ||
        new Date(wsess.expires_at).getTime() < Date.now()) {
      return json({ error: "Sesión de mesero inválida" }, 401);
    }
    const { data: waiter } = await admin
      .from("waiters")
      .select("id, restaurant_id, is_active")
      .eq("id", wsess.waiter_id).maybeSingle();
    if (!waiter || !waiter.is_active) return json({ error: "Mesero inactivo" }, 401);

    const { data: tsess } = await admin
      .from("table_sessions")
      .select("id, restaurant_id, status")
      .eq("id", session_id).maybeSingle();
    if (!tsess || tsess.restaurant_id !== waiter.restaurant_id) {
      return json({ error: "Sesión no encontrada" }, 404);
    }
    if (tsess.status !== "open") return json({ ok: true });

    const { error } = await admin
      .from("table_sessions")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", session_id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  } catch (e: any) {
    console.error("session-close error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
