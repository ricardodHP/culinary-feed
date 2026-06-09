import { useParams, Link } from "react-router-dom";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import RestaurantView from "@/components/RestaurantView";
import { Button } from "@/components/ui/button";
import { useTableSession } from "@/hooks/useTableSession";
import { Users, X } from "lucide-react";

export default function RestaurantPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { loading, notFound, restaurant, categories, dishes } = useRestaurantData(slug);
  const { session, leave } = useTableSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando menú...
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold">Restaurante no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          El menú "/r/{slug}" no existe o aún no está publicado.
        </p>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const showBanner = session && session.restaurant_slug === slug;

  return (
    <>
      {showBanner && (
        <div className="sticky top-0 z-40 bg-primary text-primary-foreground text-xs px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Estás en <strong>{session.table_label}</strong> · {session.alias}
            </span>
          </div>
          <button
            onClick={leave}
            className="flex items-center gap-1 opacity-90 hover:opacity-100"
            aria-label="Salir de la mesa"
          >
            Salir <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <RestaurantView restaurant={restaurant} categories={categories} dishes={dishes} />
    </>
  );
}
