import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = ["admin", "owner", "customer"];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<{ userId: string; role: AppRole } | null>(null);

  const load = async () => {
    setLoading(true);
    // Function is not yet in generated types — use a typed cast.
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: UserRow[] | null; error: { message: string } | null }>)(
      "list_users_with_roles",
    );
    if (error) toast.error(error.message);
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addRole = async (userId: string, role: AppRole) => {
    setAdding({ userId, role });
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    setAdding(null);
    if (error) {
      if (error.message.includes("duplicate")) toast.info("El usuario ya tiene ese rol");
      else toast.error(error.message);
      return;
    }
    toast.success(`Rol ${role} agregado`);
    load();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) toast.error(error.message);
    else {
      toast.success(`Rol ${role} eliminado`);
      load();
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Usuarios</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona los roles de las personas registradas en la plataforma
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay usuarios registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const missingRoles = ALL_ROLES.filter((r) => !u.roles.includes(r));
            const isMe = u.id === me?.id;
            return (
              <Card key={u.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{u.display_name ?? u.email}</p>
                        {isMe && <Badge variant="outline">Tú</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Registrado: {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {u.roles.length === 0 && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sin roles
                        </Badge>
                      )}
                      {u.roles.map((r) => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="gap-1">
                          {r === "admin" && <ShieldCheck className="h-3 w-3" />}
                          {r}
                          {!(isMe && r === "admin") && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="ml-1 hover:text-destructive" title="Quitar rol">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Quitar rol "{r}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le quitarás el rol "{r}" a {u.email}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removeRole(u.id, r)}>
                                    Quitar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {missingRoles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(v) => addRole(u.id, v as AppRole)}
                        disabled={adding?.userId === u.id}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue placeholder="+ Agregar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {missingRoles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-xs text-muted-foreground">
        <p>
          <strong>Nota:</strong> El primer usuario registrado fue admin automáticamente. Los demás
          se registran como "customer" por defecto. Asignar el rol "owner" desde aquí no asigna
          ningún restaurante; usa la sección Restaurantes → "Dueño" para vincularlo.
        </p>
      </div>

      <Button variant="outline" size="sm" className="mt-4" onClick={load}>
        Recargar
      </Button>
    </AdminLayout>
  );
}
