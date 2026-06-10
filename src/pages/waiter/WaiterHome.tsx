import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, LogOut, Plus, QrCode, Users, Table2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useWaiterSession } from "@/hooks/useWaiterSession";
import TableQrModal from "@/components/TableQrModal";
import OrderCard from "@/components/OrderCard";
import { useWaiterOrders } from "@/hooks/useWaiterOrders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderStatus } from "@/hooks/useTableOrders";

interface TableItem {
  id: string;
  label: string;
  capacity: number | null;
  is_active: boolean;
  active_session: {
    id: string;
    code: string;
    opened_at: string;
    diner_count: number;
  } | null;
}

export default function WaiterHome() {
  const navigate = useNavigate();
  const { waiter, token, loading: loadingAuth } = useWaiterSession();
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ label: "", capacity: "" });
  const [qrTarget, setQrTarget] = useState<{ code: string; label: string } | null>(null);
  const [closeTarget, setCloseTarget] = useState<TableItem | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const { orders, updateStatus } = useWaiterOrders(token);

  const pendingByTable = orders.reduce<Record<string, number>>((acc, o) => {
    if (o.status !== "delivered" && o.status !== "cancelled") {
      acc[o.table_id] = (acc[o.table_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  const handleAdvance = async (orderId: string, status: OrderStatus) => {
    setBusyOrder(orderId);
    try {
      await updateStatus(orderId, status);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyOrder(null);
    }
  };

  const invoke = useCallback(
    async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("waiter-tables", {
        body: { ...body, waiter_token: token },
      });
      if (error) throw new Error((data as { error?: string })?.error ?? error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { tables?: TableItem[]; table?: TableItem };
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await invoke({ action: "list" });
      setTables(data.tables ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, invoke]);

  useEffect(() => {
    if (token && !loadingAuth) load();
  }, [token, loadingAuth, load]);

  const handleCreate = async () => {
    const label = form.label.trim();
    if (!label) return toast.error("Nombre requerido");
    setBusy("create");
    try {
      await invoke({
        action: "create",
        label,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      toast.success("Mesa creada");
      setCreateOpen(false);
      setForm({ label: "", capacity: "" });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openTable = async (t: TableItem) => {
    setBusy(t.id);
    try {
      const { data, error } = await supabase.functions.invoke("session-open", {
        body: { waiter_token: token, table_id: t.id },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? error?.message);
      }
      const code = (data as { session: { code: string } }).session.code;
      setQrTarget({ code, label: t.label });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const closeSession = async () => {
    if (!closeTarget?.active_session) return;
    setBusy(closeTarget.id);
    try {
      const { data, error } = await supabase.functions.invoke("session-close", {
        body: { waiter_token: token, session_id: closeTarget.active_session.id },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error ?? error?.message);
      }
      toast.success("Mesa cerrada");
      setCloseTarget(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    if (token) {
      await supabase.functions.invoke("waiter-auth", { body: { action: "logout", token } });
    }
    localStorage.removeItem("waiter_token");
    localStorage.removeItem("waiter_info");
    navigate("/mesero/login", { replace: true });
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card border-b">
        <div className="container max-w-3xl mx-auto h-14 px-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">{waiter?.display_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {waiter?.restaurant_name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Table2 className="h-5 w-5" /> Mesas
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva mesa
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tables.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No hay mesas. Crea la primera con "Nueva mesa".
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {tables.map((t) => {
              const open = !!t.active_session;
              return (
                <Card key={t.id} className={open ? "border-primary" : ""}>
                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold truncate">{t.label}</p>
                      <Badge variant={open ? "default" : "outline"} className="text-[10px]">
                        {open ? "Ocupada" : "Libre"}
                      </Badge>
                    </div>
                    {t.capacity && (
                      <p className="text-[11px] text-muted-foreground">Cap. {t.capacity}</p>
                    )}
                    {open && t.active_session && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {t.active_session.diner_count} comensal(es)
                      </div>
                    )}
                    {!t.is_active ? (
                      <p className="text-[11px] text-muted-foreground italic">Mesa inactiva</p>
                    ) : open ? (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            setQrTarget({ code: t.active_session!.code, label: t.label })
                          }
                        >
                          <QrCode className="h-3.5 w-3.5" /> QR
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => setCloseTarget(t)}
                          disabled={busy === t.id}
                        >
                          Cerrar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => openTable(t)}
                        disabled={busy === t.id}
                      >
                        {busy === t.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <QrCode className="h-3.5 w-3.5" />
                        )}{" "}
                        Abrir mesa
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva mesa</DialogTitle>
            <DialogDescription>Ejemplo: "Mesa 5", "Terraza A".</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                maxLength={40}
                placeholder="Mesa 5"
              />
            </div>
            <div>
              <Label>Capacidad (opcional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value.replace(/\D/g, "") })}
                placeholder="4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy === "create"}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={busy === "create"}>
              {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" />} Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closeTarget} onOpenChange={(o) => !o && setCloseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará la sesión de <strong>{closeTarget?.label}</strong>. Los clientes ya no podrán unirse con el código.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={closeSession}>Cerrar mesa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TableQrModal
        open={!!qrTarget}
        onClose={() => setQrTarget(null)}
        code={qrTarget?.code ?? ""}
        tableLabel={qrTarget?.label}
        restaurantName={waiter?.restaurant_name}
      />
    </div>
  );
}
