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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Table2 } from "lucide-react";

interface TableRow {
  id: string;
  label: string;
  capacity: number | null;
  is_active: boolean;
}

export default function DashboardTables() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TableRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TableRow | null>(null);
  const [form, setForm] = useState({ label: "", capacity: "" });

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tables")
      .select("id, label, capacity, is_active")
      .eq("restaurant_id", restaurant.id)
      .order("label");
    if (error) toast.error(error.message);
    setTables((data as TableRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurant) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  const openCreate = () => {
    setForm({ label: "", capacity: "" });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!restaurant) return;
    const label = form.label.trim();
    if (!label) return toast.error("Nombre requerido");
    setBusy(true);
    const payload: Record<string, unknown> = { restaurant_id: restaurant.id, label };
    if (form.capacity) payload.capacity = Number(form.capacity);
    const { error } = await supabase.from("tables").insert(payload);
    setBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("Ya existe una mesa con ese nombre");
      else toast.error(error.message);
      return;
    }
    toast.success("Mesa creada");
    setCreateOpen(false);
    load();
  };

  const openEdit = (t: TableRow) => {
    setEditTarget(t);
    setForm({ label: t.label, capacity: t.capacity ? String(t.capacity) : "" });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setBusy(true);
    const { error } = await supabase
      .from("tables")
      .update({
        label: form.label.trim(),
        capacity: form.capacity ? Number(form.capacity) : null,
      })
      .eq("id", editTarget.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mesa actualizada");
    setEditTarget(null);
    load();
  };

  const toggleActive = async (t: TableRow) => {
    const { error } = await supabase
      .from("tables")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const { error } = await supabase.from("tables").delete().eq("id", deleteTarget.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mesa eliminada");
    setDeleteTarget(null);
    load();
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
            <Table2 className="h-6 w-6" /> Mesas
          </h2>
          <p className="text-sm text-muted-foreground">
            Define las mesas del restaurante. El mesero abre sesiones sobre cada una y genera el QR para los clientes.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva mesa
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Aún no hay mesas. Crea la primera con el botón "Nueva mesa".
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {tables.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{t.label}</p>
                    <Badge variant={t.is_active ? "default" : "outline"} className="text-[10px]">
                      {t.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  {t.capacity && (
                    <p className="text-xs text-muted-foreground">Capacidad: {t.capacity}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen || !!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar mesa" : "Nueva mesa"}</DialogTitle>
            <DialogDescription>
              Ejemplos: "Mesa 5", "Barra 1", "Terraza A".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre / etiqueta</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Mesa 5"
                maxLength={40}
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
                min={1}
                max={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditTarget(null);
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={editTarget ? handleEdit : handleCreate} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
              {editTarget ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminarás <strong>{deleteTarget?.label}</strong>. Si tiene sesiones cerradas previas, también se borrarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
