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

const PinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "El PIN debe tener entre 4 y 6 dígitos");

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    restaurant_id: z.string().uuid(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_.-]+$/i, "Usuario inválido"),
    display_name: z.string().trim().min(1).max(80),
    pin: PinSchema,
  }),
  z.object({
    action: z.literal("set_pin"),
    waiter_id: z.string().uuid(),
    pin: PinSchema,
  }),
  z.object({
    action: z.literal("set_active"),
    waiter_id: z.string().uuid(),
    is_active: z.boolean(),
  }),
  z.object({
    action: z.literal("delete"),
    waiter_id: z.string().uuid(),
  }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten() }, 400);
    }
    const body = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Helper: check that userId is admin OR owner of given restaurant
    const canManageRestaurant = async (restaurantId: string) => {
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (isAdmin === true) return true;
      const { data: r } = await admin
        .from("restaurants")
        .select("owner_id")
        .eq("id", restaurantId)
        .maybeSingle();
      return r?.owner_id === userId;
    };

    if (body.action === "create") {
      if (!(await canManageRestaurant(body.restaurant_id))) {
        return json({ error: "Forbidden" }, 403);
      }
      // unique check (case-insensitive)
      const { data: existing } = await admin
        .from("waiters")
        .select("id")
        .eq("restaurant_id", body.restaurant_id)
        .ilike("username", body.username)
        .maybeSingle();
      if (existing) {
        return json({ error: "Ese nombre de usuario ya existe" }, 409);
      }
      const pin_hash = await bcrypt.hash(body.pin, 10);
      const { data, error } = await admin
        .from("waiters")
        .insert({
          restaurant_id: body.restaurant_id,
          username: body.username.toLowerCase(),
          display_name: body.display_name,
          pin_hash,
          created_by: userId,
        })
        .select("id, username, display_name, is_active, created_at")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ waiter: data });
    }

    // For set_pin / set_active / delete we need to know the waiter's restaurant first
    const { data: waiter, error: waiterErr } = await admin
      .from("waiters")
      .select("id, restaurant_id")
      .eq("id", body.waiter_id)
      .maybeSingle();
    if (waiterErr || !waiter) return json({ error: "Mesero no encontrado" }, 404);
    if (!(await canManageRestaurant(waiter.restaurant_id))) {
      return json({ error: "Forbidden" }, 403);
    }

    if (body.action === "set_pin") {
      const pin_hash = await bcrypt.hash(body.pin, 10);
      const { error } = await admin
        .from("waiters")
        .update({ pin_hash })
        .eq("id", waiter.id);
      if (error) return json({ error: error.message }, 400);
      // revoke active sessions for safety
      await admin
        .from("waiter_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("waiter_id", waiter.id)
        .is("revoked_at", null);
      return json({ ok: true });
    }

    if (body.action === "set_active") {
      const { error } = await admin
        .from("waiters")
        .update({ is_active: body.is_active })
        .eq("id", waiter.id);
      if (error) return json({ error: error.message }, 400);
      if (!body.is_active) {
        await admin
          .from("waiter_sessions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("waiter_id", waiter.id)
          .is("revoked_at", null);
      }
      return json({ ok: true });
    }

    if (body.action === "delete") {
      const { error } = await admin.from("waiters").delete().eq("id", waiter.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("waiter-admin error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
