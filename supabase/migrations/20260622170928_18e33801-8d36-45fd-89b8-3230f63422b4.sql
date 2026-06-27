
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.vehicle_category AS ENUM ('CAR', 'BUS', 'COMMERCIAL');
CREATE TYPE public.glass_type AS ENUM (
  'front_windshield','beeding','backlite_defogger','backlite_non_defogger',
  'front_right_door','front_left_door','rear_right_door','rear_left_door',
  'last_fix_rh','last_fix_lh'
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Vehicle models
CREATE TABLE public.vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.vehicle_category NOT NULL,
  brand TEXT,
  name TEXT NOT NULL,
  low_stock_threshold INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_models TO authenticated;
GRANT ALL ON public.vehicle_models TO service_role;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Models viewable by authenticated" ON public.vehicle_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage models" ON public.vehicle_models FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Glass stock (one row per model + glass_type)
CREATE TABLE public.glass_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  glass_type public.glass_type NOT NULL,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_model_id, glass_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glass_stock TO authenticated;
GRANT ALL ON public.glass_stock TO service_role;
ALTER TABLE public.glass_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stock viewable by authenticated" ON public.glass_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update stock" ON public.glass_stock FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage stock rows" ON public.glass_stock FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_glass_stock_model ON public.glass_stock(vehicle_model_id);

-- Stock history
CREATE TABLE public.stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  glass_type public.glass_type NOT NULL,
  previous_quantity INT NOT NULL,
  new_quantity INT NOT NULL,
  change INT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_history TO authenticated;
GRANT ALL ON public.stock_history TO service_role;
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History viewable by authenticated" ON public.stock_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert history" ON public.stock_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_history_model ON public.stock_history(vehicle_model_id);
CREATE INDEX idx_history_created ON public.stock_history(created_at DESC);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_glass_stock_updated BEFORE UPDATE ON public.glass_stock FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New user handler: first user => admin, rest => staff
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);

  IF (SELECT COUNT(*) FROM public.user_roles WHERE role='admin') = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'staff';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
