import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { z } from "zod";

const Schema = z.object({
  restaurant_slug: z.string().trim().min(1, "Requerido"),
  username: z.string().trim().min(1, "Requerido"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN de 4 a 6 dígitos"),
});

export default function WaiterLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ restaurant_slug: "", username: "", pin: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("waiter_token")) navigate("/mesero", { replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.errors.forEach((er) => {
        map[er.path[0] as string] = er.message;
      });
      setErrs(map);
      return;
    }
    setErrs({});
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("waiter-auth", {
        body: { action: "login", ...parsed.data },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? error?.message ?? "Error");
      }
      const { token, waiter } = data as {
        token: string;
        waiter: { display_name: string };
      };
      localStorage.setItem("waiter_token", token);
      localStorage.setItem("waiter_info", JSON.stringify(waiter));
      toast.success(`Bienvenido, ${waiter.display_name}`);
      navigate("/mesero", { replace: true });
    } catch (er) {
      toast.error((er as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Acceso meseros</CardTitle>
          <p className="text-xs text-muted-foreground">
            Ingresa con el usuario y PIN que te dio el restaurante.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Restaurante (slug)</Label>
              <Input
                value={form.restaurant_slug}
                onChange={(e) =>
                  setForm({ ...form, restaurant_slug: e.target.value.toLowerCase().trim() })
                }
                placeholder="mi-restaurante"
                autoCapitalize="none"
              />
              {errs.restaurant_slug && (
                <p className="text-xs text-destructive mt-1">{errs.restaurant_slug}</p>
              )}
            </div>
            <div>
              <Label>Usuario</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value.toLowerCase().trim() })
                }
                autoCapitalize="none"
              />
              {errs.username && <p className="text-xs text-destructive mt-1">{errs.username}</p>}
            </div>
            <div>
              <Label>PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) =>
                  setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
              />
              {errs.pin && <p className="text-xs text-destructive mt-1">{errs.pin}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
