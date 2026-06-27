
-- Restore public write/update/delete on glass_stock
DROP POLICY IF EXISTS "Staff can insert stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Staff can update stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Staff can delete stock" ON public.glass_stock;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glass_stock TO anon, authenticated;
CREATE POLICY "Public write stock" ON public.glass_stock FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update stock" ON public.glass_stock FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete stock" ON public.glass_stock FOR DELETE TO anon, authenticated USING (true);

-- Restore public write on vehicle_models
DROP POLICY IF EXISTS "Staff can insert models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Staff can update models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Staff can delete models" ON public.vehicle_models;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_models TO anon, authenticated;
CREATE POLICY "Public write models" ON public.vehicle_models FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update models" ON public.vehicle_models FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete models" ON public.vehicle_models FOR DELETE TO anon, authenticated USING (true);

-- Restore public read/insert on stock_history; allow null user_id since no auth
DROP POLICY IF EXISTS "Staff insert history" ON public.stock_history;
DROP POLICY IF EXISTS "Authenticated read history" ON public.stock_history;
GRANT SELECT, INSERT ON public.stock_history TO anon, authenticated;
CREATE POLICY "Public read history" ON public.stock_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert history" ON public.stock_history FOR INSERT TO anon, authenticated WITH CHECK (true);
