import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye, ShoppingBag, Star, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Range = "day" | "week" | "month";

interface EventRow {
  event_type: "view" | "cart_add" | "category_view";
  dish_id: string | null;
  category_id: string | null;
  created_at: string;
}

interface DishMeta {
  id: string;
  name: string;
  rating: number;
  likes_count: number;
}

interface CategoryMeta {
  id: string;
  name: string;
  emoji: string | null;
}

const rangeLabel: Record<Range, string> = {
  day: "Hoy",
  week: "Últimos 7 días",
  month: "Últimos 30 días",
};

export default function DashboardStats() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [range, setRange] = useState<Range>("week");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [dishes, setDishes] = useState<DishMeta[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    const days = range === "day" ? 1 : range === "week" ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    setLoading(true);
    Promise.all([
      supabase
        .from("dish_events")
        .select("event_type, dish_id, category_id, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("dishes")
        .select("id, name, rating, likes_count")
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("categories")
        .select("id, name, emoji")
        .eq("restaurant_id", restaurant.id),
    ]).then(([eRes, dRes, cRes]) => {
      setEvents((eRes.data ?? []) as EventRow[]);
      setDishes((dRes.data ?? []) as DishMeta[]);
      setCategories((cRes.data ?? []) as CategoryMeta[]);
      setLoading(false);
    });
  }, [restaurant?.id, range]);

  const totals = useMemo(() => {
    let views = 0;
    let cartAdds = 0;
    let catViews = 0;
    for (const e of events) {
      if (e.event_type === "view") views++;
      else if (e.event_type === "cart_add") cartAdds++;
      else if (e.event_type === "category_view") catViews++;
    }
    return { views, cartAdds, catViews };
  }, [events]);

  const topViewed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "view" && e.dish_id) {
        counts.set(e.dish_id, (counts.get(e.dish_id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, dish: dishes.find((d) => d.id === id) }))
      .filter((x) => x.dish)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events, dishes]);

  const topCart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "cart_add" && e.dish_id) {
        counts.set(e.dish_id, (counts.get(e.dish_id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, dish: dishes.find((d) => d.id === id) }))
      .filter((x) => x.dish)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events, dishes]);

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "category_view" && e.category_id) {
        counts.set(e.category_id, (counts.get(e.category_id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, cat: categories.find((c) => c.id === id) }))
      .filter((x) => x.cat)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events, categories]);

  const [ratingOrder, setRatingOrder] = useState<"top" | "bottom">("top");
  const [likesOrder, setLikesOrder] = useState<"top" | "bottom">("top");

  const ratedDishes = useMemo(
    () =>
      [...dishes].sort((a, b) =>
        ratingOrder === "top" ? b.rating - a.rating : a.rating - b.rating,
      ).slice(0, 5),
    [dishes, ratingOrder],
  );

  const likedDishes = useMemo(
    () =>
      [...dishes].sort((a, b) =>
        likesOrder === "top" ? b.likes_count - a.likes_count : a.likes_count - b.likes_count,
      ).slice(0, 5),
    [dishes, likesOrder],
  );

  const totalLikes = useMemo(
    () => dishes.reduce((sum, d) => sum + (d.likes_count ?? 0), 0),
    [dishes],
  );

  if (loadingR) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no tienes un restaurante asignado.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Estadísticas
          </h2>
          <p className="text-sm text-muted-foreground">
            Cómo interactúan los clientes con tu menú — {rangeLabel[range].toLowerCase()}
          </p>
        </div>
        <div className="flex gap-1 border rounded-md p-1">
          {(["day", "week", "month"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              onClick={() => setRange(r)}
              className="h-7 px-3 text-xs"
            >
              {rangeLabel[r]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="space-y-6">
          {/* Totales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={<Eye className="h-4 w-4" />} label="Vistas a platillos" value={totals.views} />
            <StatCard
              icon={<ShoppingBag className="h-4 w-4" />}
              label="Agregados al carrito"
              value={totals.cartAdds}
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Vistas a categorías"
              value={totals.catViews}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard
              title="Platillos más visitados"
              icon={<Eye className="h-4 w-4" />}
              empty="Sin vistas en este período"
              items={topViewed.map((x) => ({ name: x.dish!.name, value: `${x.count}` }))}
            />
            <ListCard
              title="Más agregados al carrito"
              icon={<ShoppingBag className="h-4 w-4" />}
              empty="Sin agregados en este período"
              items={topCart.map((x) => ({ name: x.dish!.name, value: `${x.count}` }))}
            />
            <ListCard
              title="Categorías más visitadas"
              icon={<BarChart3 className="h-4 w-4" />}
              empty="Sin vistas a categorías"
              items={topCategories.map((x) => ({
                name: `${x.cat!.emoji ?? "🍽️"} ${x.cat!.name}`,
                value: `${x.count}`,
              }))}
            />
            <ListCard
              title="Mejor calificados"
              icon={<Star className="h-4 w-4" />}
              empty="Sin calificaciones"
              items={topRated.map((d) => ({ name: d.name, value: d.rating.toFixed(1) }))}
            />
            <ListCard
              title="Con más likes"
              icon={<Heart className="h-4 w-4" />}
              empty="Sin likes"
              items={topLiked.map((d) => ({ name: d.name, value: `${d.likes_count}` }))}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Las estadísticas se calculan en base a las interacciones reales del menú público.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon} {label}
        </div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; value: string }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{empty}</p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] shrink-0">
                    {i + 1}
                  </Badge>
                  <span className="truncate">{it.name}</span>
                </span>
                <span className="font-semibold tabular-nums shrink-0">{it.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
