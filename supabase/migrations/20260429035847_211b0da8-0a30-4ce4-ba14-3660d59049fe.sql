CREATE OR REPLACE FUNCTION public.increment_dish_likes(_dish_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.dishes
  SET likes_count = likes_count + 1
  WHERE id = _dish_id
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = dishes.restaurant_id AND r.status = 'published'
    )
  RETURNING likes_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_dish_likes(_dish_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.dishes
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = _dish_id
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = dishes.restaurant_id AND r.status = 'published'
    )
  RETURNING likes_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_dish_likes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_dish_likes(uuid) TO anon, authenticated;