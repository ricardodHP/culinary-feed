-- 1. Add show_rating flags
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS show_rating boolean NOT NULL DEFAULT true;

ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS show_rating boolean NOT NULL DEFAULT true;

-- 2. Default new dishes to rating 5
ALTER TABLE public.dishes ALTER COLUMN rating SET DEFAULT 5;

-- 3. Reviews table (one row covers either a dish review or a restaurant-level review)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  dish_id uuid,
  user_id uuid,
  author_name text,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validate rating range with a trigger (avoids issues with check constraints later)
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF NEW.comment IS NOT NULL AND length(NEW.comment) > 1000 THEN
    RAISE EXCEPTION 'comment too long';
  END IF;
  IF NEW.author_name IS NOT NULL AND length(NEW.author_name) > 80 THEN
    RAISE EXCEPTION 'author_name too long';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_validate ON public.reviews;
CREATE TRIGGER reviews_validate
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE INDEX IF NOT EXISTS reviews_restaurant_idx ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS reviews_dish_idx ON public.reviews(dish_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read for reviews of published restaurants (or owner/admin)
CREATE POLICY reviews_select_public
ON public.reviews FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = reviews.restaurant_id
      AND (r.status = 'published'::restaurant_status
        OR r.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Anyone can insert a review for a published restaurant
CREATE POLICY reviews_insert_public
ON public.reviews FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = reviews.restaurant_id
      AND r.status = 'published'::restaurant_status
  )
);

-- Owner of restaurant or admin can delete
CREATE POLICY reviews_delete_owner_admin
ON public.reviews FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = reviews.restaurant_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 4. Recalc functions
CREATE OR REPLACE FUNCTION public.recalc_dish_rating(_dish_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  avg_rating numeric;
  cnt int;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*) INTO avg_rating, cnt
  FROM public.reviews WHERE dish_id = _dish_id;
  IF cnt = 0 THEN
    UPDATE public.dishes SET rating = 5 WHERE id = _dish_id;
  ELSE
    UPDATE public.dishes SET rating = ROUND(avg_rating::numeric, 2) WHERE id = _dish_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reviews_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected_dish uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_dish := OLD.dish_id;
  ELSE
    affected_dish := NEW.dish_id;
  END IF;
  IF affected_dish IS NOT NULL THEN
    PERFORM public.recalc_dish_rating(affected_dish);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_recalc ON public.reviews;
CREATE TRIGGER reviews_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_after_change();

-- 5. Initialize existing dishes with rating 5 if they have 0
UPDATE public.dishes SET rating = 5 WHERE rating = 0;
