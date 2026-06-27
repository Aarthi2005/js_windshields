-- Mirror all TVM vehicle models into DPI (independent rows), initialize glass stock at 0
DO $$
DECLARE
  r RECORD;
  new_id uuid;
  glass_types text[] := ARRAY[
    'front_windshield','beeding','backlite_defogger','backlite_non_defogger',
    'front_right_door','front_left_door','rear_right_door','rear_left_door',
    'last_fix_rh','last_fix_lh'
  ];
  g text;
BEGIN
  FOR r IN
    SELECT category, brand, name, low_stock_threshold
    FROM public.vehicle_models
    WHERE location = 'TVM'
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_models d
        WHERE d.location = 'DPI'
          AND d.category = vehicle_models.category
          AND COALESCE(d.brand,'') = COALESCE(vehicle_models.brand,'')
          AND d.name = vehicle_models.name
      )
  LOOP
    INSERT INTO public.vehicle_models (location, category, brand, name, low_stock_threshold)
    VALUES ('DPI', r.category, r.brand, r.name, r.low_stock_threshold)
    RETURNING id INTO new_id;

    FOREACH g IN ARRAY glass_types LOOP
      INSERT INTO public.glass_stock (vehicle_model_id, glass_type, quantity)
      VALUES (new_id, g::glass_type, 0);
    END LOOP;
  END LOOP;

  -- Safety net: ensure every DPI model has all 10 glass_stock rows
  FOR r IN SELECT id FROM public.vehicle_models WHERE location = 'DPI' LOOP
    FOREACH g IN ARRAY glass_types LOOP
      INSERT INTO public.glass_stock (vehicle_model_id, glass_type, quantity)
      SELECT r.id, g::glass_type, 0
      WHERE NOT EXISTS (
        SELECT 1 FROM public.glass_stock
        WHERE vehicle_model_id = r.id AND glass_type = g::glass_type
      );
    END LOOP;
  END LOOP;
END $$;