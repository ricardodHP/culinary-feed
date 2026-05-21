import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

interface WaiterInfo {
  id: string;
  display_name: string;
  username: string;
  restaurant_name?: string;
  restaurant_slug?: string;
}

export default function WaiterHome() {
  const navigate = useNavigate();
  const [waiter, setWaiter] = useState<WaiterInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("waiter_token");
    if (!token) {
      navigate("/mesero/login", { replace: true });
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("waiter-auth", {
        body: { action: "me", token },
      });
      if (error || (data as { error?: string })?.error) {
        localStorage.removeItem("waiter_token");
        localStorage.removeItem("waiter_info");
        navigate("/mesero/login", { replace: true });
        return;
      }
      const w = (data as { waiter: WaiterInfo }).waiter;
      setWaiter(w);
      localStorage.setItem("waiter_info", JSON.stringify(w));
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => {
    const token = localStorage.getItem("waiter_token");
    if (token) {
      await supabase.functions.invoke("waiter-auth", {
        body: { action: "logout", token },
      });
    }
    localStorage.removeItem("waiter_token");
    localStorage.removeItem("waiter_info");
    toast.success("Sesión cerrada");
    navigate("/mesero/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Bienvenido, {waiter?.display_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Restaurante: <strong>{waiter?.restaurant_name}</strong>
            </p>
            <p className="text-muted-foreground">
              Usuario: <span className="font-mono">{waiter?.username}</span>
            </p>
            <p className="text-xs text-muted-foreground pt-4 border-t">
              Próximamente podrás abrir mesas y generar el QR de cada sesión desde aquí.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
