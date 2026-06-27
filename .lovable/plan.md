## Month-Year Inventory System

Add per-month inventory snapshots so each Month-Year has its own independent stock, auto-seeded from the previous month, plus a global Monthly Stock Overview page.

### 1. Database changes (migration)

New table `monthly_stock`:
- `id`, `vehicle_model_id` (FK), `location` (TVM/DPI), `glass_type` (text)
- `year` (int), `month` (int 1-12)
- `quantity` (int, default 0), `opening_quantity` (int, for reference)
- `updated_at`
- Unique index on (`vehicle_model_id`, `glass_type`, `year`, `month`, `location`)

Add to `stock_history`: `year`, `month` columns (so history is scoped per month).

RPC `ensure_month_snapshot(p_location, p_year, p_month)`:
- If rows exist for that month → return.
- Else copy from the most recent prior month's `monthly_stock` (per model+glass).
- If no prior month exists → seed from current `glass_stock` (one-time bootstrap).

Grants + public RLS policies matching current `glass_stock` (since app is currently public-write).

### 2. Global Month-Year context

New `src/contexts/MonthYearContext.tsx`:
- State: `{ year, month }`, defaults to current month.
- Persists to `localStorage`.
- On change, calls `ensure_month_snapshot` RPC.

Provider mounted in `__root.tsx`.

### 3. Month-Year selector component

`src/components/MonthYearSelector.tsx`:
- Month dropdown + Year dropdown
- Prev / Current / Next buttons
- Rendered in `$location.tsx` header (visible across all location pages).

### 4. Update existing stock pages to use monthly data

- `src/routes/$location.models.$id.tsx`: read/write `monthly_stock` filtered by selected year+month instead of `glass_stock`. +/− buttons update that month's row; history rows include `year`/`month`.
- `$location.index.tsx` dashboard: KPIs, low-stock, recent updates all scoped to selected month. Show selected Month-Year prominently with Prev/Current/Next buttons.
- `$location.browse.tsx`: stock totals scoped to selected month.
- `$location.history.tsx`: filter by selected month.

### 5. Monthly Stock Overview page

New route `src/routes/$location.overview.tsx`:
- Summary cards: Total Products, Total Quantity, Car/Bus/Commercial stock, Low Stock, Out of Stock — all for selected Month-Year.
- Filters: Month, Year, Category, Brand, Model, Glass Type + global search.
- Table with all rows (Category, Brand, Model, Glass Type, Quantity) — sortable columns, pagination, search.
- Export to CSV, Export to Excel (via `xlsx`), Print (window.print with print stylesheet).
- Link added to location nav.

### 6. Reports

Reuse Overview filters; add a "Reports" tab/section on the same page or small subpage with:
- Total Inventory, Category-wise, Brand-wise, Low Stock, Out of Stock — all for selected month.

### Technical notes

- Snapshot strategy: lazy — first access to a month triggers RPC to materialize rows for that (location, year, month). Keeps cost proportional to months actually used.
- Edits write only to the selected (year, month) row → previous months immutable by design.
- `xlsx` package added via `bun add xlsx` for Excel export.
- All new tables get public RLS policies to match current app behaviour (no auth). Security can be re-tightened later when login is added.

### Files to create
- `supabase/migrations/<ts>_monthly_stock.sql`
- `src/contexts/MonthYearContext.tsx`
- `src/components/MonthYearSelector.tsx`
- `src/routes/$location.overview.tsx`

### Files to edit
- `src/routes/__root.tsx` (provider)
- `src/routes/$location.tsx` (selector + Overview nav link)
- `src/routes/$location.index.tsx` (month-scoped KPIs, prev/current/next)
- `src/routes/$location.models.$id.tsx` (read/write monthly_stock)
- `src/routes/$location.browse.tsx` (month-scoped totals)
- `src/routes/$location.history.tsx` (month filter)
