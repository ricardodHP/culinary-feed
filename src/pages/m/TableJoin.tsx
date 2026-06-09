import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateDeviceId } from "@/lib/device";
import { useTableSession } from "@/hooks/useTableSession";

interface JoinResponse {
  session: { id: string; code: string };
  table: { id: string; label: string };
  restaurant: { id: string; name: string; slug: string };
  diner: { id: string; alias: string | null; display_alias: string };
}

export default function TableJoin() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode ?? "").toUpperCase();
  const navigate = useNavigate();
  const { save } = useTableSession();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<{
    table: { label: string };
    restaurant: { name: string; slug: string };
  } | null>(null);
  const [alias, setAlias] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First, fetch session state to confirm code is valid.
  useEffect(() => {
    if (!code || code.length !== 6) {
      setError("Código no válido");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("session-state", {
        body: { code },
      });
      if (error || (data as { error?: string })?.error) {
        setError((data as { error?: string })?.error ?? "Mesa no encontrada");
        setLoading(false);
        return;
      }
      const d = data as { table: { label: string }; restaurant: { name: string; slug: string }; session: { status: string } };
      if (d.session.status !== "open") {
        setError("Esta mesa ya está cerrada");
      } else {
        setInfo({ table: d.table, restaurant: d.restaurant });
      }
      setLoading(false);
    })();
  }, [code]);

  const join = async (withAlias: string | null) => {
    setSubmitting(true);
    const device_id = getOrCreateDeviceId();
    const { data, error } = await supabase.functions.invoke("session-join", {
      body: { code, device_id, alias: withAlias },
    });
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? "No se pudo unirse");
      setSubmitting(false);
      return;
    }
    const r = data as JoinResponse;
    save({
      code: r.session.code,
      session_id: r.session.id,
      diner_id: r.diner.id,
      alias: r.diner.display_alias,
      table_label: r.table.label,
      restaurant_slug: r.restaurant.slug,
      restaurant_name: r.restaurant.name,
    });
    toast.success(`Bienvenido, ${r.diner.display_alias}`);
    navigate(`/r/${r.restaurant.slug}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold">{error ?? "Mesa no disponible"}</h1>
        <p className="text-sm text-muted-foreground">
          Pídele al mesero que abra la mesa nuevamente o verifica el código.
        </p>
        <Button asChild variant="outline">
          <a href="/">Ir al inicio</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-lg font-bold">{info.restaurant.name}</h1>
            <p className="text-sm text-muted-foreground">
              Te estás uniendo a la <strong>{info.table.label}</strong>
            </p>
          </div>
          <div>
            <Label>¿Cómo te llamamos? (opcional)</Label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Tu nombre o alias"
              maxLength={40}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Sirve para que el mesero identifique tus pedidos.
            </p>
          </div>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => join(alias.trim() || null)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {alias.trim() ? `Entrar como ${alias.trim()}` : "Entrar"}
            </Button>
            {alias.trim() && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => join(null)}
                disabled={submitting}
              >
                Continuar como invitado
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
