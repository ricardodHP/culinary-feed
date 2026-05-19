
-- shared_carts table
CREATE TABLE public.shared_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  host_device_id text NOT NULL,
  host_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_shared_carts_code ON public.shared_carts(code);

-- shared_cart_items table
CREATE TABLE public.shared_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  dish_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  added_by_name text,
  added_by_device text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, dish_id)
);

CREATE INDEX idx_shared_cart_items_cart ON public.shared_cart_items(cart_id);

-- Validation trigger: expires_at must be in the future on insert
CREATE OR REPLACE FUNCTION public.validate_shared_cart_expiration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shared_carts_validate_expiration
BEFORE INSERT OR UPDATE ON public.shared_carts
FOR EACH ROW EXECUTE FUNCTION public.validate_shared_cart_expiration();

-- updated_at trigger for items
CREATE TRIGGER trg_shared_cart_items_updated_at
BEFORE UPDATE ON public.shared_cart_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.shared_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cart_items ENABLE ROW LEVEL SECURITY;

-- RLS: shared_carts — open while not expired
CREATE POLICY shared_carts_select_active
  ON public.shared_carts FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY shared_carts_insert_public
  ON public.shared_carts FOR INSERT
  TO anon, authenticated
  WITH CHECK (expires_at > now());

CREATE POLICY shared_carts_update_active
  ON public.shared_carts FOR UPDATE
  TO anon, authenticated
  USING (expires_at > now())
  WITH CHECK (expires_at > now());

CREATE POLICY shared_carts_delete_active
  ON public.shared_carts FOR DELETE
  TO anon, authenticated
  USING (expires_at > now());

-- RLS: shared_cart_items — gated by parent cart being active
CREATE POLICY shared_cart_items_select_active
  ON public.shared_cart_items FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shared_carts c
    WHERE c.id = shared_cart_items.cart_id AND c.expires_at > now()
  ));

CREATE POLICY shared_cart_items_insert_active
  ON public.shared_cart_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shared_carts c
    WHERE c.id = shared_cart_items.cart_id AND c.expires_at > now()
  ));

CREATE POLICY shared_cart_items_update_active
  ON public.shared_cart_items FOR UPDATE
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shared_carts c
    WHERE c.id = shared_cart_items.cart_id AND c.expires_at > now()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shared_carts c
    WHERE c.id = shared_cart_items.cart_id AND c.expires_at > now()
  ));

CREATE POLICY shared_cart_items_delete_active
  ON public.shared_cart_items FOR DELETE
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shared_carts c
    WHERE c.id = shared_cart_items.cart_id AND c.expires_at > now()
  ));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_carts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_cart_items;
ALTER TABLE public.shared_carts REPLICA IDENTITY FULL;
ALTER TABLE public.shared_cart_items REPLICA IDENTITY FULL;
