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
  alias: z.string().trim().min(1).max(40).optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const code = parsed.data.code.toUpperCase();
    const { device_id } = parsed.data;
    const alias = parsed.data.alias?.trim() || null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session } = await admin
      .from("table_sessions")
      .select("id, status, table_id, restaurant_id")
      .eq("code", code).maybeSingle();
    if (!session) return json({ error: "Código no válido" }, 404);
    if (session.status !== "open") return json({ error: "Mesa cerrada" }, 410);

    const [{ data: table }, { data: restaurant }] = await Promise.all([
      admin.from("tables").select("id, label, capacity").eq("id", session.table_id).maybeSingle(),
      admin.from("restaurants").select("id, name, slug, logo_url")
        .eq("id", session.restaurant_id).maybeSingle(),
    ]);

    // Upsert diner
    const { data: existing } = await admin
      .from("diners")
      .select("id, alias")
      .eq("session_id", session.id)
      .eq("device_id", device_id)
      .maybeSingle();

    let diner;
    if (existing) {
      if (alias && alias !== existing.alias) {
        const { data } = await admin
          .from("diners")
          .update({ alias })
          .eq("id", existing.id)
          .select("id, alias").single();
        diner = data;
      } else {
        diner = existing;
      }
    } else {
      const { data, error } = await admin
        .from("diners")
        .insert({ session_id: session.id, device_id, alias })
        .select("id, alias").single();
      if (error) return json({ error: error.message }, 400);
      diner = data;
    }

    // Compute display alias (Invitado #N if null)
    let displayAlias = diner?.alias as string | null;
    if (!displayAlias) {
      const { data: all } = await admin
        .from("diners")
        .select("id, joined_at")
        .eq("session_id", session.id)
        .order("joined_at", { ascending: true });
      const idx = (all ?? []).findIndex((d) => d.id === diner!.id);
      displayAlias = `Invitado #${idx + 1}`;
    }

    return json({
      session: { id: session.id, code },
      table,
      restaurant,
      diner: { id: diner!.id, alias: diner!.alias, display_alias: displayAlias },
    });
  } catch (e: any) {
    console.error("session-join error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
