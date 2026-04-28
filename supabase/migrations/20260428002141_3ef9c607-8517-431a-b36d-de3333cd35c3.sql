
CREATE OR REPLACE FUNCTION public._seed_create_owner(_email text, _name text, _password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = _email;
  IF uid IS NOT NULL THEN
    RETURN uid;
  END IF;

  uid := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    _email, crypt(_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', _name),
    now(), now(), '', '', '', ''
  );

  INSERT INTO public.profiles (id, display_name)
  VALUES (uid, _name)
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.user_roles WHERE user_id = uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'owner');

  RETURN uid;
END;
$$;

DO $$
DECLARE
  owner_it uuid;
  owner_cn uuid;
  owner_jp uuid;
  owner_generic uuid;
  rid_it uuid := '00000000-0000-0000-0000-000000000002';
  rid_cn uuid := '00000000-0000-0000-0000-000000000003';
  rid_jp uuid := '00000000-0000-0000-0000-000000000004';
  rid_gn uuid := '00000000-0000-0000-0000-000000000005';
  cat_id uuid;
BEGIN
  owner_it := public._seed_create_owner('owner.italia@demo.com', 'Marco Italiano', 'demo1234');
  owner_cn := public._seed_create_owner('owner.china@demo.com', 'Li Wei', 'demo1234');
  owner_jp := public._seed_create_owner('owner.japon@demo.com', 'Hiroshi Tanaka', 'demo1234');
  SELECT id INTO owner_generic FROM auth.users WHERE email = 'test2@test.com';
  IF owner_generic IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (owner_generic, 'owner') ON CONFLICT DO NOTHING;
  END IF;

  -- Italian
  INSERT INTO public.restaurants (id, owner_id, slug, name, bio, cuisine_template, status, address, phone, hours, whatsapp_link, instagram_link)
  VALUES (rid_it, owner_it, 'pasta-bella', 'Pasta Bella', 'Auténtica cocina italiana al estilo de la nonna 🇮🇹', 'italian', 'published',
          'Av. Reforma 123, CDMX', '+525511112222', 'Lun-Dom 13:00-23:00',
          'https://wa.me/525511112222', 'https://instagram.com/pastabella')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.categories (restaurant_id, name, emoji, image_url, position) VALUES
    (rid_it, 'Pastas', '🍝', '/seed/dishes/enchiladas.jpg', 0),
    (rid_it, 'Pizzas', '🍕', '/seed/dishes/quesadillas.jpg', 1),
    (rid_it, 'Postres', '🍰', '/seed/dishes/churros.jpg', 2);

  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_it AND name='Pastas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_it, cat_id, 'Spaghetti Carbonara', 'Pasta con huevo, panceta, pecorino y pimienta negra', 185, '/seed/dishes/mole.jpg', 4.8, 120, ARRAY['clásico','italiano'], true),
    (rid_it, cat_id, 'Lasagna Bolognese', 'Capas de pasta con ragú casero y bechamel', 210, '/seed/dishes/enchiladas.jpg', 4.7, 95, ARRAY['horneado'], false);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_it AND name='Pizzas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_it, cat_id, 'Margherita', 'Tomate San Marzano, mozzarella fior di latte y albahaca', 175, '/seed/dishes/quesadillas.jpg', 4.9, 200, ARRAY['vegetariano'], true);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_it AND name='Postres' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_it, cat_id, 'Tiramisú', 'Bizcocho con café, mascarpone y cacao', 95, '/seed/dishes/churros.jpg', 4.6, 80, ARRAY['café'], false);

  -- Chinese
  INSERT INTO public.restaurants (id, owner_id, slug, name, bio, cuisine_template, status, address, phone, hours, whatsapp_link, instagram_link)
  VALUES (rid_cn, owner_cn, 'dragon-dorado', 'Dragón Dorado', 'Sabores tradicionales de China en el corazón de la ciudad 🐉', 'chinese', 'published',
          'Calle Hidalgo 45, Guadalajara', '+523312345678', 'Mar-Dom 12:00-22:00',
          'https://wa.me/523312345678', 'https://instagram.com/dragondorado')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.categories (restaurant_id, name, emoji, image_url, position) VALUES
    (rid_cn, 'Entradas', '🥟', '/seed/dishes/guacamole.jpg', 0),
    (rid_cn, 'Platos fuertes', '🥡', '/seed/dishes/carne-asada.jpg', 1),
    (rid_cn, 'Sopas', '🍜', '/seed/dishes/pozole.jpg', 2);

  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_cn AND name='Entradas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_cn, cat_id, 'Dumplings al vapor', '8 piezas rellenas de cerdo y cebollín', 140, '/seed/dishes/guacamole.jpg', 4.7, 110, ARRAY['vapor'], true),
    (rid_cn, cat_id, 'Rollos primavera', 'Crujientes rollos vegetarianos con salsa agridulce', 95, '/seed/dishes/elote.jpg', 4.5, 70, ARRAY['vegetariano'], false);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_cn AND name='Platos fuertes' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_cn, cat_id, 'Pollo Kung Pao', 'Pollo salteado con cacahuates y chile', 195, '/seed/dishes/carne-asada.jpg', 4.8, 150, ARRAY['picante'], true),
    (rid_cn, cat_id, 'Arroz frito Yangzhou', 'Arroz salteado con camarones, jamón y huevo', 165, '/seed/dishes/mole.jpg', 4.6, 100, ARRAY['arroz'], false);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_cn AND name='Sopas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_cn, cat_id, 'Sopa Wonton', 'Caldo claro con dumplings rellenos', 120, '/seed/dishes/pozole.jpg', 4.6, 60, ARRAY['caldo'], false);

  -- Japanese
  INSERT INTO public.restaurants (id, owner_id, slug, name, bio, cuisine_template, status, address, phone, hours, whatsapp_link, instagram_link)
  VALUES (rid_jp, owner_jp, 'sakura-sushi', 'Sakura Sushi', 'Sushi fresco y ramen casero, técnica japonesa 🌸', 'japanese', 'published',
          'Av. Insurgentes 800, CDMX', '+525599998888', 'Lun-Sab 13:00-22:30',
          'https://wa.me/525599998888', 'https://instagram.com/sakurasushi')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.categories (restaurant_id, name, emoji, image_url, position) VALUES
    (rid_jp, 'Sushi', '🍣', '/seed/dishes/tacos-pastor.jpg', 0),
    (rid_jp, 'Ramen', '🍜', '/seed/dishes/pozole.jpg', 1),
    (rid_jp, 'Bebidas', '🍵', '/seed/dishes/agua-fresca.jpg', 2);

  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_jp AND name='Sushi' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_jp, cat_id, 'Sake Nigiri', '5 piezas de salmón fresco sobre arroz avinagrado', 180, '/seed/dishes/tacos-pastor.jpg', 4.9, 220, ARRAY['salmón'], true),
    (rid_jp, cat_id, 'California Roll', '8 piezas con cangrejo, aguacate y pepino', 160, '/seed/dishes/quesadillas.jpg', 4.5, 140, ARRAY['clásico'], false);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_jp AND name='Ramen' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_jp, cat_id, 'Tonkotsu Ramen', 'Caldo de cerdo cocido 18 horas, chashu, huevo marinado', 230, '/seed/dishes/pozole.jpg', 4.9, 180, ARRAY['cerdo'], true);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_jp AND name='Bebidas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_jp, cat_id, 'Té matcha', 'Té verde japonés ceremonial', 65, '/seed/dishes/agua-fresca.jpg', 4.6, 50, ARRAY['caliente'], false);

  -- Generic
  INSERT INTO public.restaurants (id, owner_id, slug, name, bio, cuisine_template, status, address, phone, hours, whatsapp_link, instagram_link)
  VALUES (rid_gn, owner_generic, 'el-buen-bocado', 'El Buen Bocado', 'Cocina internacional para toda la familia 🍽️', 'generic', 'published',
          'Plaza Central 10, Monterrey', '+528112223333', 'Lun-Dom 8:00-22:00',
          'https://wa.me/528112223333', 'https://instagram.com/elbuenbocado')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.categories (restaurant_id, name, emoji, image_url, position) VALUES
    (rid_gn, 'Desayunos', '🍳', '/seed/dishes/elote.jpg', 0),
    (rid_gn, 'Hamburguesas', '🍔', '/seed/dishes/carne-asada.jpg', 1),
    (rid_gn, 'Ensaladas', '🥗', '/seed/dishes/guacamole.jpg', 2);

  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_gn AND name='Desayunos' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_gn, cat_id, 'Hot cakes con tocino', 'Tres hot cakes esponjosos con miel de maple', 110, '/seed/dishes/elote.jpg', 4.5, 90, ARRAY['dulce'], true);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_gn AND name='Hamburguesas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_gn, cat_id, 'Burger Clásica', 'Carne 180g, queso cheddar, lechuga, jitomate y papas', 165, '/seed/dishes/carne-asada.jpg', 4.7, 130, ARRAY['res'], true),
    (rid_gn, cat_id, 'Burger BBQ', 'Carne con tocino, cebolla caramelizada y salsa BBQ', 185, '/seed/dishes/mole.jpg', 4.6, 100, ARRAY['bbq'], false);
  SELECT id INTO cat_id FROM public.categories WHERE restaurant_id = rid_gn AND name='Ensaladas' LIMIT 1;
  INSERT INTO public.dishes (restaurant_id, category_id, name, description, price, image_url, rating, likes_count, tags, is_featured) VALUES
    (rid_gn, cat_id, 'Ensalada César', 'Lechuga romana, croutones, parmesano y aderezo césar', 130, '/seed/dishes/guacamole.jpg', 4.4, 65, ARRAY['ligero'], false);
END $$;

DROP FUNCTION public._seed_create_owner(text, text, text);
