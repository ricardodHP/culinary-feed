import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Pencil, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { slugify } from "@/lib/slug";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CuisineTemplate = Database["public"]["Enums"]["cuisine_template"];
type RestaurantStatus = Database["public"]["Enums"]["restaurant_status"];

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  status: RestaurantStatus;
  cuisine_template: CuisineTemplate;
  owner_id: string | null;
}

const TEMPLATES: { value: CuisineTemplate; label: string }[] = [
  { value: "generic", label: "Genérica" },
  { value: "mexican", label: "Mexicana" },
  { value: "italian", label: "Italiana" },
  { value: "chinese", label: "China" },
  { value: "japanese", label: "Japonesa" },
];

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<RestaurantRow | null>(null);

  // form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<CuisineTemplate>("generic");
  const [status, setStatus] = useState<RestaurantStatus>("draft");
  const [saving, setSaving] = useState(false);

  // assign form
  const [assignEmail, setAssignEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, status, cuisine_template, owner_id")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRestaurants((data ?? []) as RestaurantRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setTemplate("generic");
    setStatus("draft");
    setOpen(true);
  };

  const openEdit = (r: RestaurantRow) => {
    setEditing(r);
    setName(r.name);
    setSlug(r.slug);
    setTemplate(r.cuisine_template);
    setStatus(r.status);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nombre y slug son obligatorios");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          slug: slug.trim(),
          cuisine_template: template,
          status,
        })
        .eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Restaurante actualizado");
    } else {
      const { error } = await supabase.from("restaurants").insert({
        name: name.trim(),
        slug: slug.trim(),
        cuisine_template: template,
        status,
      });
      if (error) toast.error(error.message);
      else toast.success("Restaurante creado");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Restaurante eliminado");
      load();
    }
  };

  const handleAssignOwner = async () => {
    if (!assignFor) return;
    setAssigning(true);
    let newOwnerId: string | null = null;
    if (assignEmail.trim()) {
      const { data, error } = await supabase.rpc("get_user_id_by_email", {
        _email: assignEmail.trim(),
      });
      if (error) {
        toast.error(error.message);
        setAssigning(false);
        return;
      }
      if (!data) {
        toast.error("No existe ningún usuario con ese email. Pídele que se registre primero.");
        setAssigning(false);
        return;
      }
      newOwnerId = data as string;
      // also ensure they have the 'owner' role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: newOwnerId, role: "owner" });
      // ignore unique violation
      if (roleErr && !roleErr.message.includes("duplicate")) {
        toast.error(roleErr.message);
      }
    }
    const { error: updErr } = await supabase
      .from("restaurants")
      .update({ owner_id: newOwnerId })
      .eq("id", assignFor.id);
    if (updErr) toast.error(updErr.message);
    else toast.success(newOwnerId ? "Dueño asignado" : "Dueño removido");
    setAssigning(false);
    setAssignFor(null);
    setAssignEmail("");
    load();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Restaurantes</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona todos los restaurantes de la plataforma
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay restaurantes todavía. Crea el primero con el botón "Nuevo".
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{r.name}</h3>
                  <Badge variant={r.status === "published" ? "default" : "secondary"}>
                    {r.status === "published" ? "Publicado" : "Borrador"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>/r/{r.slug}</p>
                  <p>Plantilla: {TEMPLATES.find((t) => t.value === r.cuisine_template)?.label}</p>
                  <p>{r.owner_id ? "Con dueño asignado" : "Sin dueño"}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/r/${r.slug}`} target="_blank">
                      <ExternalLink className="h-3 w-3" /> Ver
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignFor(r);
                      setAssignEmail("");
                    }}
                  >
                    <UserPlus className="h-3 w-3" /> Dueño
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar restaurante?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará "{r.name}" junto con sus categorías y platillos. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar restaurante" : "Nuevo restaurante"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editing) setSlug(slugify(e.target.value));
                }}
                placeholder="Ej. La Casa del Sabor"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="la-casa-del-sabor"
              />
              <p className="text-xs text-muted-foreground mt-1">URL pública: /r/{slug || "..."}</p>
            </div>
            <div>
              <Label>Plantilla</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as CuisineTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RestaurantStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign owner dialog */}
      <Dialog open={!!assignFor} onOpenChange={(v) => !v && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar dueño a {assignFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email del dueño</Label>
              <Input
                id="email"
                type="email"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="dueno@correo.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deja vacío para remover el dueño actual. El usuario debe estar registrado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignOwner} disabled={assigning}>
              {assigning ? "Asignando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
