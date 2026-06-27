
-- Monthly stock snapshots: each (location, year, month) maintains an independent inventory.
CREATE TABLE IF NOT EXISTS public.monthly_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_model_id uuid NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  location public.inventory_location NOT NULL,
  glass_type text NOT NULL,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  quantity int NOT NULL DEFAULT 0,
  opening_quantity int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monthly_stock_unique_idx
  ON public.monthly_stock (vehicle_model_id, glass_type, year, month, location);
CREATE INDEX IF NOT EXISTS monthly_stock_lookup_idx
  ON public.monthly_stock (location, year, month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_stock TO anon, authenticated;
GRANT ALL ON public.monthly_stock TO service_role;
ALTER TABLE public.monthly_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read monthly_stock" ON public.monthly_stock FOR SELECT TO public USING (true);
CREATE POLICY "Public insert monthly_stock" ON public.monthly_stock FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update monthly_stock" ON public.monthly_stock FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete monthly_stock" ON public.monthly_stock FOR DELETE TO anon, authenticated USING (true);

-- Add year/month columns to stock_history so history is scoped per month.
ALTER TABLE public.stock_history
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS month int;
CREATE INDEX IF NOT EXISTS stock_history_month_idx ON public.stock_history (location, year, month);

-- Snapshot RPC: materialize rows for (location, year, month).
-- Copies quantities from the most recent prior month's snapshot for that location.
-- If no prior snapshot exists, seeds from current glass_stock (one-time bootstrap).
-- Also fills in any (model, glass) rows missing from the target month.
CREATE OR REPLACE FUNCTION public.ensure_month_snapshot(
  p_location public.inventory_location,
  p_year int,
  p_month int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src_year int;
  src_month int;
BEGIN
  -- Find latest prior (year, month) that has snapshot rows for this location.
  SELECT year, month INTO src_year, src_month
  FROM public.monthly_stock
  WHERE location = p_location
    AND (year < p_year OR (year = p_year AND month < p_month))
  ORDER BY year DESC, month DESC
  LIMIT 1;

  IF src_year IS NOT NULL THEN
    -- Copy from prior month snapshot.
    INSERT INTO public.monthly_stock
      (vehicle_model_id, location, glass_type, year, month, quantity, opening_quantity)
    SELECT ms.vehicle_model_id, p_location, ms.glass_type, p_year, p_month,
           ms.quantity, ms.quantity
    FROM public.monthly_stock ms
    WHERE ms.location = p_location AND ms.year = src_year AND ms.month = src_month
    ON CONFLICT (vehicle_model_id, glass_type, year, month, location) DO NOTHING;
  END IF;

  -- Bootstrap / fill missing rows from glass_stock for any (model, glass) not present yet.
  INSERT INTO public.monthly_stock
    (vehicle_model_id, location, glass_type, year, month, quantity, opening_quantity)
  SELECT gs.vehicle_model_id, p_location, gs.glass_type, p_year, p_month,
         CASE WHEN src_year IS NULL THEN gs.quantity ELSE 0 END,
         CASE WHEN src_year IS NULL THEN gs.quantity ELSE 0 END
  FROM public.glass_stock gs
  JOIN public.vehicle_models vm ON vm.id = gs.vehicle_model_id
  WHERE vm.location = p_location
  ON CONFLICT (vehicle_model_id, glass_type, year, month, location) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_month_snapshot(public.inventory_location, int, int) TO anon, authenticated, service_role;
