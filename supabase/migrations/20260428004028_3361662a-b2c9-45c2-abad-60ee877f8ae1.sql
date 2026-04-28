
-- 1) is_active flag on dishes
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Analytics events table
CREATE TYPE public.dish_event_type AS ENUM ('view', 'cart_add', 'category_view');

CREATE TABLE public.dish_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  dish_id uuid,
  category_id uuid,
  event_type public.dish_event_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dish_events_restaurant_time ON public.dish_events(restaurant_id, created_at DESC);
CREATE INDEX idx_dish_events_dish ON public.dish_events(dish_id);
CREATE INDEX idx_dish_events_category ON public.dish_events(category_id);

ALTER TABLE public.dish_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + auth) can insert events for any restaurant — needed for public menu tracking
CREATE POLICY "dish_events_insert_public"
ON public.dish_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only owner of the restaurant or an admin can read events
CREATE POLICY "dish_events_select_owner_admin"
ON public.dish_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = dish_events.restaurant_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
