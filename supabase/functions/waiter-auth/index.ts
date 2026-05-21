// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    restaurant_slug: z.string().trim().min(1).max(120),
    username: z.string().trim().min(1).max(50),
    pin: z.string().regex(/^\d{4,6}$/),
  }),
  z.object({ action: z.literal("logout"), token: z.string().min(10) }),
  z.object({ action: z.literal("me"), token: z.string().min(10) }),
]);

const SESSION_HOURS = 12;

const hashToken = async (token: string) => {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const randomToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

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

    if (body.action === "login") {
      const { data: restaurant } = await admin
        .from("restaurants")
        .select("id, name, slug")
        .eq("slug", body.restaurant_slug.toLowerCase())
        .maybeSingle();
      if (!restaurant) return json({ error: "Restaurante no encontrado" }, 404);

      const { data: waiter } = await admin
        .from("waiters")
        .select("id, username, display_name, pin_hash, is_active, restaurant_id")
        .eq("restaurant_id", restaurant.id)
        .ilike("username", body.username)
        .maybeSingle();
      if (!waiter || !waiter.is_active) {
        return json({ error: "Credenciales inválidas" }, 401);
      }

      const ok = await bcrypt.compare(body.pin, waiter.pin_hash);
      if (!ok) return json({ error: "Credenciales inválidas" }, 401);

      const token = randomToken();
      const token_hash = await hashToken(token);
      const expires_at = new Date(
        Date.now() + SESSION_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const { error: sErr } = await admin.from("waiter_sessions").insert({
        waiter_id: waiter.id,
        token_hash,
        expires_at,
      });
      if (sErr) return json({ error: sErr.message }, 500);

      await admin
        .from("waiters")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", waiter.id);

      return json({
        token,
        expires_at,
        waiter: {
          id: waiter.id,
          username: waiter.username,
          display_name: waiter.display_name,
          restaurant_id: waiter.restaurant_id,
          restaurant_name: restaurant.name,
          restaurant_slug: restaurant.slug,
        },
      });
    }

    if (body.action === "logout") {
      const token_hash = await hashToken(body.token);
      await admin
        .from("waiter_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", token_hash)
        .is("revoked_at", null);
      return json({ ok: true });
    }

    if (body.action === "me") {
      const token_hash = await hashToken(body.token);
      const { data: session } = await admin
        .from("waiter_sessions")
        .select("id, waiter_id, expires_at, revoked_at")
        .eq("token_hash", token_hash)
        .maybeSingle();
      if (
        !session ||
        session.revoked_at ||
        new Date(session.expires_at).getTime() < Date.now()
      ) {
        return json({ error: "Sesión inválida" }, 401);
      }
      const { data: waiter } = await admin
        .from("waiters")
        .select("id, username, display_name, is_active, restaurant_id")
        .eq("id", session.waiter_id)
        .maybeSingle();
      if (!waiter || !waiter.is_active) {
        return json({ error: "Sesión inválida" }, 401);
      }
      const { data: restaurant } = await admin
        .from("restaurants")
        .select("name, slug")
        .eq("id", waiter.restaurant_id)
        .maybeSingle();
      return json({
        waiter: {
          ...waiter,
          restaurant_name: restaurant?.name,
          restaurant_slug: restaurant?.slug,
        },
        expires_at: session.expires_at,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("waiter-auth error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
