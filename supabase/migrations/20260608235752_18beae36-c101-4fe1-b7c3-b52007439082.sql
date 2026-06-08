
-- Enum para estado de sesión de mesa
DO $$ BEGIN
  CREATE TYPE public.table_session_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ tables ============
CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label text NOT NULL,
  capacity integer,
  is_active boolean NOT NULL DEFAULT true,
  created_by_waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tables_restaurant_label_unique
  ON public.tables (restaurant_id, lower(label));
CREATE INDEX tables_restaurant_idx ON public.tables (restaurant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tables TO authenticated;
GRANT ALL ON public.tables TO service_role;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or owner can read tables"
  ON public.tables FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = tables.restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admin or owner can insert tables"
  ON public.tables FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = tables.restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admin or owner can update tables"
  ON public.tables FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = tables.restaurant_id AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = tables.restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admin or owner can delete tables"
  ON public.tables FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = tables.restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE TRIGGER tables_set_updated_at
  BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ table_sessions ============
CREATE TABLE public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  code text NOT NULL,
  status public.table_session_status NOT NULL DEFAULT 'open',
  opened_by_waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX table_sessions_code_unique ON public.table_sessions (code);
CREATE UNIQUE INDEX table_sessions_one_open_per_table
  ON public.table_sessions (table_id) WHERE status = 'open';
CREATE INDEX table_sessions_restaurant_idx ON public.table_sessions (restaurant_id);

GRANT ALL ON public.table_sessions TO service_role;
-- No grants para authenticated/anon: todo va vía edge functions.

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
-- Sin policies: solo service_role accede.

CREATE TRIGGER table_sessions_set_updated_at
  BEFORE UPDATE ON public.table_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ diners ============
CREATE TABLE public.diners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  device_id uuid NOT NULL,
  alias text,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX diners_session_device_unique
  ON public.diners (session_id, device_id);
CREATE INDEX diners_session_idx ON public.diners (session_id);

GRANT ALL ON public.diners TO service_role;

ALTER TABLE public.diners ENABLE ROW LEVEL SECURITY;
-- Sin policies: todo vía edge functions.
