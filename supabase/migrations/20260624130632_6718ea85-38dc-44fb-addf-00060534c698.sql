-- Add location (TVM/DPI) to vehicle_models so each location keeps independent stock
DO $$ BEGIN
  CREATE TYPE public.inventory_location AS ENUM ('TVM', 'DPI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vehicle_models
  ADD COLUMN IF NOT EXISTS location public.inventory_location NOT NULL DEFAULT 'TVM';

ALTER TABLE public.stock_history
  ADD COLUMN IF NOT EXISTS location public.inventory_location NOT NULL DEFAULT 'TVM';

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_models_location ON public.vehicle_models(location);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_loc_cat_brand ON public.vehicle_models(location, category, brand);
CREATE INDEX IF NOT EXISTS idx_stock_history_location ON public.stock_history(location);

-- Drop the legacy unique-by-(category,name) constraint if it exists, so the same model can live in both locations
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.vehicle_models'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.vehicle_models DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.vehicle_models
  ADD CONSTRAINT vehicle_models_loc_cat_brand_name_key UNIQUE (location, category, brand, name);

-- Seed brands/models for both TVM and DPI (idempotent)
DO $$
DECLARE
  loc public.inventory_location;
  rec record;
  new_id uuid;
  glass text;
  glass_types text[] := ARRAY[
    'front_windshield','beeding','backlite_defogger','backlite_non_defogger',
    'front_right_door','front_left_door','rear_right_door','rear_left_door',
    'last_fix_rh','last_fix_lh'
  ];
  seed_data record;
BEGIN
  FOR loc IN SELECT unnest(ARRAY['TVM','DPI']::public.inventory_location[]) LOOP
    FOR seed_data IN
      SELECT * FROM (VALUES
        ('CAR'::vehicle_category,'TATA','Tata Indica'),
        ('CAR','TATA','Tata Vista'),
        ('CAR','TATA','Tata Nexon'),
        ('CAR','TATA','Tata Punch'),
        ('CAR','TATA','Tata Altroz'),
        ('CAR','TATA','Tata Tiago'),
        ('CAR','MARUTI','Maruti Swift'),
        ('CAR','MARUTI','Maruti Baleno'),
        ('CAR','MARUTI','Maruti Alto'),
        ('CAR','MARUTI','Maruti Wagon R'),
        ('CAR','HYUNDAI','Hyundai i10'),
        ('CAR','HYUNDAI','Hyundai i20'),
        ('CAR','HYUNDAI','Hyundai Creta'),
        ('CAR','HONDA','Honda City'),
        ('CAR','HONDA','Honda Amaze'),
        ('CAR','TOYOTA','Toyota Innova'),
        ('CAR','TOYOTA','Toyota Etios'),
        ('CAR','MAHINDRA','Mahindra XUV300'),
        ('CAR','MAHINDRA','Mahindra Scorpio'),
        ('BUS','ASHOK LEYLAND','Ashok Leyland Viking'),
        ('BUS','ASHOK LEYLAND','Ashok Leyland Cheetah'),
        ('BUS','TATA BUS','Tata Starbus'),
        ('BUS','TATA BUS','Tata LP 909'),
        ('BUS','EICHER','Eicher Skyline'),
        ('COMMERCIAL','TATA COMMERCIAL','Tata Ace'),
        ('COMMERCIAL','TATA COMMERCIAL','Tata 407'),
        ('COMMERCIAL','ASHOK LEYLAND COMMERCIAL','Dost'),
        ('COMMERCIAL','ASHOK LEYLAND COMMERCIAL','Bada Dost'),
        ('COMMERCIAL','MAHINDRA COMMERCIAL','Mahindra Bolero Pickup'),
        ('COMMERCIAL','MAHINDRA COMMERCIAL','Mahindra Jeeto')
      ) AS t(category, brand, name)
    LOOP
      INSERT INTO public.vehicle_models (location, category, brand, name, low_stock_threshold)
      VALUES (loc, seed_data.category::vehicle_category, seed_data.brand, seed_data.name, 2)
      ON CONFLICT (location, category, brand, name) DO NOTHING
      RETURNING id INTO new_id;

      IF new_id IS NOT NULL THEN
        FOREACH glass IN ARRAY glass_types LOOP
          INSERT INTO public.glass_stock (vehicle_model_id, glass_type, quantity)
          VALUES (new_id, glass::glass_type, 0);
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;
