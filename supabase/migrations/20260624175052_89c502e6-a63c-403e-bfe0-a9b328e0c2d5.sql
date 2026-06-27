
DROP POLICY IF EXISTS "Staff can insert stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Staff can update stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Staff can delete stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Public write stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Public update stock" ON public.glass_stock;
DROP POLICY IF EXISTS "Public delete stock" ON public.glass_stock;
REVOKE INSERT, UPDATE, DELETE ON public.glass_stock FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.glass_stock TO authenticated;
CREATE POLICY "Staff can insert stock" ON public.glass_stock FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update stock" ON public.glass_stock FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete stock" ON public.glass_stock FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff can insert models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Staff can update models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Staff can delete models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Public write models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Public update models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Public delete models" ON public.vehicle_models;
REVOKE INSERT, UPDATE, DELETE ON public.vehicle_models FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_models TO authenticated;
CREATE POLICY "Staff can insert models" ON public.vehicle_models FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update models" ON public.vehicle_models FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete models" ON public.vehicle_models FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff insert history" ON public.stock_history;
DROP POLICY IF EXISTS "Authenticated read history" ON public.stock_history;
DROP POLICY IF EXISTS "Public insert history" ON public.stock_history;
DROP POLICY IF EXISTS "Public read history" ON public.stock_history;
REVOKE SELECT, INSERT ON public.stock_history FROM anon;
GRANT SELECT, INSERT ON public.stock_history TO authenticated;
CREATE POLICY "Staff insert history" ON public.stock_history FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
    AND user_id = auth.uid()
  );
CREATE POLICY "Authenticated read history" ON public.stock_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Users view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile or admins view all" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
