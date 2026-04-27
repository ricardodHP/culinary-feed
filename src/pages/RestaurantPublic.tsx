import { useParams, Link } from "react-router-dom";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import RestaurantView from "@/components/RestaurantView";
import { Button } from "@/components/ui/button";

export default function RestaurantPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { loading, notFound, restaurant, categories, dishes } = useRestaurantData(slug);

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

  return <RestaurantView restaurant={restaurant} categories={categories} dishes={dishes} />;
}
