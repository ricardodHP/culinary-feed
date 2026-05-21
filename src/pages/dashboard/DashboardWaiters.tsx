import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, KeyRound, Trash2, UserCog } from "lucide-react";
import { z } from "zod";

interface Waiter {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const CreateSchema = z.object({
  display_name: z.string().trim().min(1, "Nombre requerido").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, "Solo letras, números, ._-"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN de 4 a 6 dígitos"),
  pinConfirm: z.string(),
}).refine((d) => d.pin === d.pinConfirm, {
  message: "Los PIN no coinciden",
  path: ["pinConfirm"],
});

const PinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, "PIN de 4 a 6 dígitos"),
  pinConfirm: z.string(),
}).refine((d) => d.pin === d.pinConfirm, {
  message: "Los PIN no coinciden",
  path: ["pinConfirm"],
});

export default function DashboardWaiters() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<Waiter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Waiter | null>(null);
  const [busy, setBusy] = useState(false);

  // create form
  const [form, setForm] = useState({ display_name: "", username: "", pin: "", pinConfirm: "" });
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  // pin form
  const [pinForm, setPinForm] = useState({ pin: "", pinConfirm: "" });
  const [pinErr, setPinErr] = useState<Record<string, string>>({});

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("waiters")
      .select("id, username, display_name, is_active, last_login_at, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setWaiters((data as Waiter[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurant) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("waiter-admin", { body });
    if (error) {
      const msg = (data as { error?: string })?.error ?? error.message;
      throw new Error(typeof msg === "string" ? msg : "Error");
    }
    if ((data as { error?: string })?.error) {
      throw new Error((data as { error: string }).error);
    }
    return data;
  };

  const handleCreate = async () => {
    const parsed = CreateSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        errs[e.path[0] as string] = e.message;
      });
      setFormErr(errs);
      return;
    }
    setFormErr({});
    setBusy(true);
    try {
      await invoke({
        action: "create",
        restaurant_id: restaurant!.id,
        username: parsed.data.username,
        display_name: parsed.data.display_name,
        pin: parsed.data.pin,
      });
      toast.success("Mesero creado");
      setCreateOpen(false);
      setForm({ display_name: "", username: "", pin: "", pinConfirm: "" });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSetPin = async () => {
    if (!pinTarget) return;
    const parsed = PinSchema.safeParse(pinForm);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        errs[e.path[0] as string] = e.message;
      });
      setPinErr(errs);
      return;
    }
    setPinErr({});
    setBusy(true);
    try {
      await invoke({ action: "set_pin", waiter_id: pinTarget.id, pin: parsed.data.pin });
      toast.success("PIN actualizado. Se cerraron sesiones activas.");
      setPinTarget(null);
      setPinForm({ pin: "", pinConfirm: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (w: Waiter) => {
    setBusy(true);
    try {
      await invoke({ action: "set_active", waiter_id: w.id, is_active: !w.is_active });
      toast.success(w.is_active ? "Mesero desactivado" : "Mesero activado");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await invoke({ action: "delete", waiter_id: deleteTarget.id });
      toast.success("Mesero eliminado");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loadingR) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">No tienes un restaurante asignado.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" /> Meseros
          </h2>
          <p className="text-sm text-muted-foreground">
            Cuentas internas del restaurante. Inician sesión en{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/mesero</code> con su usuario y PIN.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo mesero
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : waiters.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Aún no hay meseros. Crea el primero con el botón "Nuevo mesero".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {waiters.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{w.display_name}</p>
                    <Badge variant={w.is_active ? "default" : "outline"} className="text-[10px]">
                      {w.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usuario: <span className="font-mono">{w.username}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {w.last_login_at
                      ? `Último acceso: ${new Date(w.last_login_at).toLocaleString()}`
                      : "Sin accesos aún"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch
                      checked={w.is_active}
                      onCheckedChange={() => toggleActive(w)}
                      disabled={busy}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPinTarget(w);
                      setPinForm({ pin: "", pinConfirm: "" });
                      setPinErr({});
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5" /> PIN
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(w)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo mesero</DialogTitle>
            <DialogDescription>
              El mesero usará este usuario y PIN para iniciar sesión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre para mostrar</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Ej. Juan Pérez"
              />
              {formErr.display_name && (
                <p className="text-xs text-destructive mt-1">{formErr.display_name}</p>
              )}
            </div>
            <div>
              <Label>Usuario</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })
                }
                placeholder="juan"
                autoCapitalize="none"
              />
              {formErr.username && (
                <p className="text-xs text-destructive mt-1">{formErr.username}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>PIN (4-6 dígitos)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={form.pin}
                  onChange={(e) =>
                    setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                  }
                />
                {formErr.pin && <p className="text-xs text-destructive mt-1">{formErr.pin}</p>}
              </div>
              <div>
                <Label>Confirmar PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={form.pinConfirm}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pinConfirm: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                />
                {formErr.pinConfirm && (
                  <p className="text-xs text-destructive mt-1">{formErr.pinConfirm}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set PIN dialog */}
      <Dialog open={!!pinTarget} onOpenChange={(o) => !o && setPinTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer PIN</DialogTitle>
            <DialogDescription>
              Asigna un nuevo PIN a <strong>{pinTarget?.display_name}</strong>. Las sesiones activas
              se cerrarán.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Nuevo PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={pinForm.pin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
              />
              {pinErr.pin && <p className="text-xs text-destructive mt-1">{pinErr.pin}</p>}
            </div>
            <div>
              <Label>Confirmar PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={pinForm.pinConfirm}
                onChange={(e) =>
                  setPinForm({
                    ...pinForm,
                    pinConfirm: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />
              {pinErr.pinConfirm && (
                <p className="text-xs text-destructive mt-1">{pinErr.pinConfirm}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSetPin} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mesero?</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminarás a <strong>{deleteTarget?.display_name}</strong> y todas sus sesiones. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
