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

const Schema = z.object({ code: z.string().trim().length(6) });

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
      .select("id, status, table_id, restaurant_id, opened_at, closed_at")
      .eq("code", code).maybeSingle();
    if (!session) return json({ error: "No encontrada" }, 404);

    const [{ data: table }, { data: restaurant }, { data: diners }] = await Promise.all([
      admin.from("tables").select("id, label, capacity").eq("id", session.table_id).maybeSingle(),
      admin.from("restaurants").select("id, name, slug").eq("id", session.restaurant_id).maybeSingle(),
      admin.from("diners").select("id, alias, joined_at")
        .eq("session_id", session.id).order("joined_at", { ascending: true }),
    ]);

    const dinersWithDisplay = (diners ?? []).map((d, i) => ({
      ...d,
      display_alias: d.alias ?? `Invitado #${i + 1}`,
    }));

    return json({ session, table, restaurant, diners: dinersWithDisplay });
  } catch (e: any) {
    console.error("session-state error", e);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});
