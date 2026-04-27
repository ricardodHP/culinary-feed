import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";

const FALLBACK_DISH = "/seed/dishes/tacos-pastor.jpg";
const FALLBACK_LOGO = "/seed/restaurant-logo.png";

interface UseRestaurantDataResult {
  loading: boolean;
  notFound: boolean;
  restaurant: RestaurantInfo | null;
  categories: Category[];
  dishes: Dish[];
}

/**
 * Loads a restaurant + categories + dishes by slug.
 * If `previewMode` is true, also loads draft restaurants (for /dashboard/preview).
 */
export function useRestaurantData(slug: string | undefined): UseRestaurantDataResult {
  const [state, setState] = useState<UseRestaurantDataResult>({
    loading: true,
    notFound: false,
    restaurant: null,
    categories: [],
    dishes: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setState({ loading: false, notFound: true, restaurant: null, categories: [], dishes: [] });
        return;
      }
      setState((s) => ({ ...s, loading: true }));

      const { data: r, error: rErr } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (rErr || !r) {
        setState({ loading: false, notFound: true, restaurant: null, categories: [], dishes: [] });
        return;
      }

      const [cRes, dRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, emoji, image_url, position")
          .eq("restaurant_id", r.id)
          .order("position", { ascending: true }),
        supabase
          .from("dishes")
          .select("id, name, description, price, image_url, rating, likes_count, tags, category_id, position")
          .eq("restaurant_id", r.id)
          .order("position", { ascending: true }),
      ]);
      if (cancelled) return;

      const categories: Category[] = (cRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji ?? "🍽️",
        image: c.image_url ?? FALLBACK_DISH,
      }));

      const dishes: Dish[] = (dRes.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? "",
        price: Number(d.price),
        image: d.image_url ?? FALLBACK_DISH,
        category: d.category_id ?? "",
        rating: Number(d.rating),
        likes: d.likes_count,
        tags: d.tags ?? [],
      }));

      const restaurant: RestaurantInfo = {
        id: r.id,
        name: r.name,
        username: r.slug,
        bio: r.bio ?? "",
        posts: dishes.length,
        followers: "—",
        following: 0,
        whatsappLink: r.whatsapp_link ?? "",
        instagramLink: r.instagram_link ?? "",
        logo: r.logo_url ?? FALLBACK_LOGO,
        cuisineTemplate: r.cuisine_template,
        showByRating: r.show_by_rating,
      };

      setState({ loading: false, notFound: false, restaurant, categories, dishes });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
