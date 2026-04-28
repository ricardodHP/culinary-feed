import { supabase } from "@/integrations/supabase/client";

type EventType = "view" | "cart_add" | "category_view";

export async function trackEvent(params: {
  restaurantId: string;
  eventType: EventType;
  dishId?: string;
  categoryId?: string;
}) {
  try {
    await supabase.from("dish_events").insert({
      restaurant_id: params.restaurantId,
      dish_id: params.dishId ?? null,
      category_id: params.categoryId ?? null,
      event_type: params.eventType,
    });
  } catch {
    // analytics is best-effort, never block UI
  }
}
