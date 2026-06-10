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
  device_id: z.string().uuid(),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        dish_id: z.string().uuid(),
        quantity: z.number().int().positive().max(50),
        notes: z.string().trim().max(200).optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const code = parsed.data.code.toUpperCase();
    const { device_id, items } = parsed.data;
    const notes = parsed.data.notes?.trim() || null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve session
    const { data: session } = await admin
      .from("table_sessions")
      .select("id, status, table_id, restaurant_id")
      .eq("code", code)
      .maybeSingle();
    if (!session) return json({ error: "Sesión no encontrada" }, 404);
    if (session.status !== "open") return json({ error: "Mesa cerrada" }, 410);

    // Resolve diner
    const { data: diner } = await admin
      .from("diners")
      .select("id, alias, joined_at")
      .eq("session_id", session.id)
      .eq("device_id", device_id)
      .maybeSingle();
    if (!diner) return json({ error: "No estás unido a la mesa" }, 403);

    let alias = diner.alias as string | null;
    if (!alias) {
      const { data: all } = await admin
        .from("diners")
        .select("id, joined_at")
        .eq("session_id", session.id)
        .order("joined_at", { ascending: true });
      const idx = (all ?? []).findIndex((d) => d.id === diner.id);
      alias = `Invitado #${idx + 1}`;
    }

    // Fetch dishes for snapshot, validate they belong to restaurant
    const dishIds = items.map((i) => i.dish_id);
    const { data: dishes } = await admin
      .from("dishes")
      .select("id, name, price, restaurant_id")
      .in("id", dishIds);
    const dishMap = new Map((dishes ?? []).map((d) => [d.id, d]));
    for (const i of items) {
      const d = dishMap.get(i.dish_id);
      if (!d || d.restaurant_id !== session.restaurant_id) {
        return json({ error: "Plato inválido" }, 400);
      }
    }

    // Insert order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        restaurant_id: session.restaurant_id,
        session_id: session.id,
        table_id: session.table_id,
        notes,
        created_by_diner_id: diner.id,
        created_by_alias: alias,
      })
      .select("id, status, created_at")
      .single();
    if (orderErr || !order) return json({ error: orderErr?.message ?? "Error" }, 400);

    const rows = items.map((i) => {
      const d = dishMap.get(i.dish_id)!;
      return {
        order_id: order.id,
        dish_id: i.dish_id,
        dish_name: d.name,
        unit_price: d.price,
        quantity: i.quantity,
        notes: i.notes?.trim() || null,
      };
    });
    const { error: itemsErr } = await admin.from("order_items").insert(rows);
    if (itemsErr) {
      await admin.from("orders").delete().eq("id", order.id);
      return json({ error: itemsErr.message }, 400);
    }

    return json({ order: { ...order, created_by_alias: alias } });
  } catch (e: any) {
    console.error("order-create error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
