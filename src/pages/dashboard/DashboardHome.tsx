import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MyRestaurant {
  id: string;
  name: string;
  slug: string;
  status: string;
  bio: string | null;
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<MyRestaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("restaurants")
      .select("id, name, slug, status, bio")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRestaurant(data as MyRestaurant | null);
        setLoading(false);
      });
  }, [user]);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-1">Información del restaurante</h2>
      <p className="text-sm text-muted-foreground mb-6">Edita los datos generales que verán tus clientes</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !restaurant ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no tienes un restaurante asignado. Pídele al administrador que cree uno y te asigne como dueño.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{restaurant.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Slug:</span> /r/{restaurant.slug}</p>
            <p><span className="text-muted-foreground">Estado:</span> {restaurant.status}</p>
            <p className="whitespace-pre-line text-muted-foreground">{restaurant.bio}</p>
            <p className="text-xs text-muted-foreground pt-4">La edición completa estará disponible en la siguiente entrega.</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
