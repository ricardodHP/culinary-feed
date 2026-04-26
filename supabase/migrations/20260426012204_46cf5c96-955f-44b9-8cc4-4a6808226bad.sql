
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'customer');
CREATE TYPE public.restaurant_status AS ENUM ('draft', 'published');
CREATE TYPE public.cuisine_template AS ENUM ('mexican', 'italian', 'chinese', 'japanese', 'generic');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RESTAURANTS
CREATE TABLE public.restaurants (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  hours TEXT,
  whatsapp_link TEXT,
  instagram_link TEXT,
  cuisine_template public.cuisine_template NOT NULL DEFAULT 'generic',
  status public.restaurant_status NOT NULL DEFAULT 'draft',
  show_by_rating BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);

-- DISHES
CREATE TABLE public.dishes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dishes_restaurant ON public.dishes(restaurant_id);
CREATE INDEX idx_dishes_category ON public.dishes(category_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dishes_updated BEFORE UPDATE ON public.dishes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- handle_new_user: profile + first user becomes admin, otherwise customer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =================== RLS POLICIES ===================

-- profiles: own profile readable/updatable; admin can read all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_roles: users read their own roles; admin reads all; only admin writes
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- restaurants: published readable by anyone; owner reads own; admin reads all; admin writes; owner updates own
CREATE POLICY "restaurants_select_public" ON public.restaurants
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "restaurants_admin_insert" ON public.restaurants
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "restaurants_owner_or_admin_update" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "restaurants_admin_delete" ON public.restaurants
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- categories: visible if restaurant published OR owner/admin; written by owner/admin
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = categories.restaurant_id
        AND (r.status = 'published' OR r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "categories_owner_admin_write" ON public.categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = categories.restaurant_id
        AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = categories.restaurant_id
        AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- dishes: same pattern as categories
CREATE POLICY "dishes_select_public" ON public.dishes
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = dishes.restaurant_id
        AND (r.status = 'published' OR r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "dishes_owner_admin_write" ON public.dishes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = dishes.restaurant_id
        AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = dishes.restaurant_id
        AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
