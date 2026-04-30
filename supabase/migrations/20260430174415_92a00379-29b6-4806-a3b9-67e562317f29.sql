-- Seed 3 example reviews for each dish that has fewer than 3 reviews
DO $$
DECLARE
  d RECORD;
  samples TEXT[][] := ARRAY[
    ARRAY['Ana', '5', '¡Delicioso! Sin duda volveré a pedirlo.'],
    ARRAY['Carlos', '4', 'Muy buen sabor y presentación, recomendado.'],
    ARRAY['María', '5', 'Excelente platillo, porción generosa.']
  ];
  s TEXT[];
BEGIN
  FOR d IN
    SELECT di.id, di.restaurant_id
    FROM public.dishes di
    WHERE (SELECT COUNT(*) FROM public.reviews r WHERE r.dish_id = di.id) < 3
  LOOP
    FOREACH s SLICE 1 IN ARRAY samples
    LOOP
      INSERT INTO public.reviews (restaurant_id, dish_id, rating, author_name, comment)
      VALUES (d.restaurant_id, d.id, s[2]::smallint, s[1], s[3]);
    END LOOP;
  END LOOP;
END $$;