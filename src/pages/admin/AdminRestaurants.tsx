import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  cuisine_template: string;
  owner_id: string | null;
}

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, slug, status, cuisine_template, owner_id")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRestaurants((data ?? []) as RestaurantRow[]);
        setLoading(false);
      });
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Restaurantes</h2>
          <p className="text-sm text-muted-foreground">Gestiona todos los restaurantes de la plataforma</p>
        </div>
        <Button disabled title="Disponible en la siguiente entrega">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay restaurantes todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <Badge variant={r.status === "published" ? "default" : "secondary"}>
                    {r.status === "published" ? "Publicado" : "Borrador"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">/r/{r.slug}</p>
                <p className="text-xs">Plantilla: {r.cuisine_template}</p>
                <p className="text-xs text-muted-foreground">{r.owner_id ? "Con dueño asignado" : "Sin dueño"}</p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/r/${r.slug}`} target="_blank">
                    <ExternalLink className="h-3 w-3" /> Ver menú
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
