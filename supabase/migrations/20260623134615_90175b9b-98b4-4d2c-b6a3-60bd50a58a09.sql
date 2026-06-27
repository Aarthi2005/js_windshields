
-- Open public access: no login required
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glass_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_history TO anon;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins manage models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Models viewable by authenticated" ON public.vehicle_models;
DROP POLICY IF EXISTS "Admins manage stock rows" ON public.glass_stock;
DROP POLICY IF EXISTS "Authenticated can update stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Stock viewable by authenticated" ON public.glass_stock;
DROP POLICY IF EXISTS "Authenticated can insert history" ON public.stock_history;
DROP POLICY IF EXISTS "History viewable by authenticated" ON public.stock_history;

-- Public access policies
CREATE POLICY "Public read models" ON public.vehicle_models FOR SELECT USING (true);
CREATE POLICY "Public write models" ON public.vehicle_models FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update models" ON public.vehicle_models FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete models" ON public.vehicle_models FOR DELETE USING (true);

CREATE POLICY "Public read stock" ON public.glass_stock FOR SELECT USING (true);
CREATE POLICY "Public write stock" ON public.glass_stock FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update stock" ON public.glass_stock FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete stock" ON public.glass_stock FOR DELETE USING (true);

CREATE POLICY "Public read history" ON public.stock_history FOR SELECT USING (true);
CREATE POLICY "Public insert history" ON public.stock_history FOR INSERT WITH CHECK (true);
