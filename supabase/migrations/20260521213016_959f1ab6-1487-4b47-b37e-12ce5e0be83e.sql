
CREATE TABLE public.waiters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  username text NOT NULL,
  display_name text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waiters_restaurant_username_uniq
  ON public.waiters (restaurant_id, lower(username));

CREATE INDEX waiters_restaurant_idx ON public.waiters (restaurant_id);

CREATE TRIGGER waiters_set_updated_at
  BEFORE UPDATE ON public.waiters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

CREATE POLICY waiters_owner_admin_all
ON public.waiters
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = waiters.restaurant_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = waiters.restaurant_id
      AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE TABLE public.waiter_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id uuid NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX waiter_sessions_waiter_idx ON public.waiter_sessions (waiter_id);

ALTER TABLE public.waiter_sessions ENABLE ROW LEVEL SECURITY;
-- no policies: only service-role (edge functions) accesses this table.
