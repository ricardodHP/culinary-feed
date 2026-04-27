import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getDefaultRouteForRoles } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChefHat } from "lucide-react";

interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  cuisine_template: string;
}

const Index = () => {
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, roles } = useAuth();
  const accountHref = user ? getDefaultRouteForRoles(roles) : "/login";

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, slug, bio, logo_url, cuisine_template")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRestaurants((data ?? []) as PublicRestaurant[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  // If only one restaurant published, redirect to it directly.
  if (restaurants.length === 1) {
    return <Navigate to={`/r/${restaurants[0].slug}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            <h1 className="font-bold">Menús</h1>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={accountHref}>
              <User className="w-4 h-4" /> {user ? "Mi cuenta" : "Iniciar sesión"}
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {restaurants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <p>Aún no hay restaurantes publicados.</p>
              {user && (
                <Button asChild>
                  <Link to={accountHref}>Ir a mi panel</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1">Descubre menús</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Explora los restaurantes disponibles
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {restaurants.map((r) => (
                <Link key={r.id} to={`/r/${r.slug}`} className="group">
                  <Card className="overflow-hidden hover:shadow-elevated transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🍽️
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                          {r.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">/r/{r.slug}</p>
                        {r.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {r.bio}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
