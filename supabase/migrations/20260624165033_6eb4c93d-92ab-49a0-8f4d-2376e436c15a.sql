
-- Convert glass_type from enum to free text so we can store arbitrary glass variants from the master CSV
ALTER TABLE public.stock_history ALTER COLUMN glass_type TYPE text USING glass_type::text;
ALTER TABLE public.glass_stock ALTER COLUMN glass_type TYPE text USING glass_type::text;
DROP TYPE IF EXISTS public.glass_type;

-- Wipe all inventory data so we can reload from the master CSV
TRUNCATE TABLE public.stock_history;
DELETE FROM public.glass_stock;
DELETE FROM public.vehicle_models;
