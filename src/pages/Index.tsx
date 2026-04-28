import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getDefaultRouteForRoles } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, ChefHat, Search, MapPin } from "lucide-react";

interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  cuisine_template: "generic" | "mexican" | "italian" | "chinese" | "japanese";
  address: string | null;
}

const CUISINE_LABELS: Record<PublicRestaurant["cuisine_template"], { label: string; emoji: string }> = {
  generic: { label: "Variada", emoji: "🍽️" },
  mexican: { label: "Mexicana", emoji: "🌮" },
  italian: { label: "Italiana", emoji: "🍝" },
  chinese: { label: "China", emoji: "🥡" },
  japanese: { label: "Japonesa", emoji: "🍣" },
};

const Index = () => {
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCuisine, setActiveCuisine] = useState<string>("all");
  const { user, roles } = useAuth();
  const accountHref = user ? getDefaultRouteForRoles(roles) : "/login";

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id, name, slug, bio, logo_url, cuisine_template, address")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRestaurants((data ?? []) as PublicRestaurant[]);
        setLoading(false);
      });
  }, []);

  const availableCuisines = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.cuisine_template));
    return Array.from(set);
  }, [restaurants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (activeCuisine !== "all" && r.cuisine_template !== activeCuisine) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.bio ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [restaurants, search, activeCuisine]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
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

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-1">Descubre menús</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Explora restaurantes por tipo de cocina o ubicación
        </p>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ciudad…"
            className="pl-9"
          />
        </div>

        {/* Cuisine filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <button
            onClick={() => setActiveCuisine("all")}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeCuisine === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            🌎 Todas
          </button>
          {availableCuisines.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCuisine(c)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCuisine === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {CUISINE_LABELS[c].emoji} {CUISINE_LABELS[c].label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Cargando…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <p>
                {restaurants.length === 0
                  ? "Aún no hay restaurantes publicados."
                  : "No encontramos restaurantes con esos filtros."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((r) => (
              <Link key={r.id} to={`/r/${r.slug}`} className="group">
                <Card className="overflow-hidden hover:shadow-elevated transition-shadow h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0">
                      {r.logo_url ? (
                        <img src={r.logo_url} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {CUISINE_LABELS[r.cuisine_template].emoji}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                          {r.name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {CUISINE_LABELS[r.cuisine_template].emoji} {CUISINE_LABELS[r.cuisine_template].label}
                        </Badge>
                      </div>
                      {r.address && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {r.address}
                        </p>
                      )}
                      {r.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{r.bio}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
