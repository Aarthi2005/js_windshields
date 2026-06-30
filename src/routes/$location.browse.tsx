import { createFileRoute, Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Bus, Truck, Search, Plus, ChevronRight, ArrowLeft } from "lucide-react";
import { CATEGORIES, type Category } from "@/lib/constants";
import { toast } from "sonner";
import { useMonthYear } from "@/contexts/MonthYearContext";

const searchSchema = z.object({
  category: z.enum(["CAR", "BUS", "COMMERCIAL"]).optional(),
  brand: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/$location/browse")({
  head: () => ({ meta: [{ title: "Browse Stock | JS WindShields" }] }),
  validateSearch: searchSchema,
  component: Browse,
});

const CAT_META: Record<Category, { icon: typeof Car }> = {
  CAR: { icon: Car },
  BUS: { icon: Bus },
  COMMERCIAL: { icon: Truck },
};

type Model = {
  id: string;
  name: string;
  brand: string | null;
  category: Category;
  total: number;
  lowCount: number;
};

function Browse() {
  const { location } = useParams({ from: "/$location/browse" });
  const loc = location.toUpperCase() as "TVM" | "DPI";
  const { category, brand, q } = useSearch({ from: "/$location/browse" });
  const navigate = useNavigate();
  const { year, month, ensureSnapshot } = useMonthYear();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(q ?? "");

  useEffect(() => setQuery(q ?? ""), [q]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await ensureSnapshot(loc);
      const [{ data: modelsData, error: mErr }, { data: stockData }] = await Promise.all([
        supabase
          .from("vehicle_models")
          .select("id, name, brand, category, low_stock_threshold")
          .eq("location", loc)
          .order("name"),
        supabase
          .from("monthly_stock" as any)
          .select("vehicle_model_id, quantity")
          .eq("location", loc)
          .eq("year", year)
          .eq("month", month),
      ]);
      if (mErr) toast.error(mErr.message);
      const stockMap = new Map<string, { total: number; lowCount: number; items: number[] }>();
      ((stockData as any[]) ?? []).forEach((s) => {
        const cur = stockMap.get(s.vehicle_model_id) ?? { total: 0, lowCount: 0, items: [] as number[] };
        cur.total += s.quantity;
        cur.items.push(s.quantity);
        stockMap.set(s.vehicle_model_id, cur);
      });
      setModels(
        (modelsData ?? []).map((m: any) => {
          const agg = stockMap.get(m.id) ?? { total: 0, lowCount: 0, items: [] as number[] };
          const threshold = m.low_stock_threshold ?? 2;
          const lowCount = agg.items.filter((q) => q < 2 || q <= threshold).length;
          return { id: m.id, name: m.name, brand: m.brand, category: m.category, total: agg.total, lowCount };
        })
      );
      setLoading(false);
    };
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loc, year, month]);


  const setSearch = (next: { category?: Category; brand?: string; q?: string }) => {
    navigate({ to: "/$location/browse", params: { location: loc }, search: next });
  };

  // Global search across all brands/models within location
  const filteredBySearch = useMemo(() => {
    const ql = query.trim().toLowerCase();
    if (!ql) return null;
    return models.filter((m) => `${m.name} ${m.brand ?? ""}`.toLowerCase().includes(ql));
  }, [models, query]);

  // Derive brand list for category
  const brandsForCategory = useMemo(() => {
    if (!category) return [];
    const set = new Map<string, { count: number; low: number }>();
    models.filter((m) => m.category === category).forEach((m) => {
      const b = m.brand ?? "OTHER";
      const cur = set.get(b) ?? { count: 0, low: 0 };
      cur.count += 1;
      if (m.lowCount > 0) cur.low += 1;
      set.set(b, cur);
    });
    return Array.from(set.entries()).map(([b, v]) => ({ brand: b, ...v })).sort((a, b) => a.brand.localeCompare(b.brand));
  }, [models, category]);

  const modelsForBrand = useMemo(() => {
    if (!category || !brand) return [];
    return models.filter((m) => m.category === category && (m.brand ?? "OTHER") === brand);
  }, [models, category, brand]);

  const onSearchChange = (v: string) => {
    setQuery(v);
    navigate({
      to: "/$location/browse",
      params: { location: loc },
      search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, q: v || undefined }),
    });
  };

  const crumbs: { label: string; onClick?: () => void }[] = [
    { label: "Home" },
    { label: `${loc} Stocks`, onClick: () => setSearch({}) },
  ];
  if (category) crumbs.push({ label: category, onClick: () => setSearch({ category }) });
  if (brand) crumbs.push({ label: brand });

  return (
    <div className="space-y-5">
      <Breadcrumbs loc={loc} items={crumbs} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{loc} Stock</h1>
          <p className="text-sm text-muted-foreground">
            {brand ? `${brand} models` : category ? `Select a brand in ${category}` : "Select a category"}
          </p>
        </div>
        <AddModelDialog
          loc={loc}
          defaultCategory={category}
          defaultBrand={brand}
          onCreated={(m) => setModels((prev) => [m, ...prev])}
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search brand or model (e.g. Tata, Swift)..."
          className="h-12 pl-10 text-base"
        />
      </div>

      {/* Global search overrides hierarchy */}
      {filteredBySearch ? (
        <ModelGrid loc={loc} models={filteredBySearch} loading={loading} emptyText="No matches" />
      ) : !category ? (
        <CategoryButtons onPick={(c) => setSearch({ category: c })} />
      ) : !brand ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSearch({})} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to categories
          </Button>
          <BrandButtons brands={brandsForCategory} onPick={(b) => setSearch({ category, brand: b })} />
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSearch({ category })} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to {category} brands
          </Button>
          <ModelGrid loc={loc} models={modelsForBrand} loading={loading} emptyText="No models yet — add one" />
        </>
      )}
    </div>
  );
}

function CategoryButtons({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CATEGORIES.map((c) => {
        const Icon = CAT_META[c].icon;
        return (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="group rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-8 w-8" />
            </div>
            <div className="mt-4 text-xl font-bold text-foreground">{c}</div>
            <div className="mt-1 text-sm text-muted-foreground">Browse {c.toLowerCase()} brands</div>
          </button>
        );
      })}
    </div>
  );
}

function BrandButtons({
  brands, onPick,
}: { brands: { brand: string; count: number; low: number }[]; onPick: (b: string) => void }) {
  if (brands.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No brands yet — add a model to begin</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {brands.map((b) => (
        <button
          key={b.brand}
          onClick={() => onPick(b.brand)}
          className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow"
        >
          <div className="text-base font-bold text-foreground">{b.brand}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{b.count} models</span>
            {b.low > 0 && <Badge variant="destructive" className="px-1.5 py-0">{b.low} low</Badge>}
          </div>
        </button>
      ))}
    </div>
  );
}

function ModelGrid({
  loc, models, loading, emptyText,
}: { loc: "TVM" | "DPI"; models: Model[]; loading: boolean; emptyText: string }) {
  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (models.length === 0) return <div className="py-12 text-center text-muted-foreground">{emptyText}</div>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((m) => (
        <Link key={m.id} to="/$location/models/$id" params={{ location: loc, id: m.id }}>
          <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {(() => { const Icon = CAT_META[m.category].icon; return <Icon className="h-6 w-6" />; })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {m.brand && <span>{m.brand}</span>}
                  <Badge variant="secondary" className="px-1.5 py-0">{m.total} pcs</Badge>
                  {m.lowCount > 0 && <Badge variant="destructive" className="px-1.5 py-0">{m.lowCount} low</Badge>}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function Breadcrumbs({ loc, items }: { loc: "TVM" | "DPI"; items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <Link to="/" className="hover:text-foreground hover:underline">Home</Link>
      <span>›</span>
      <Link to="/$location" params={{ location: loc }} className="hover:text-foreground hover:underline">{loc} Stocks</Link>
      {items.slice(2).map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>›</span>
          {it.onClick ? (
            <button onClick={it.onClick} className="hover:text-foreground hover:underline">{it.label}</button>
          ) : (
            <span className="font-medium text-foreground">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function AddModelDialog({
  loc, defaultCategory, defaultBrand, onCreated,
}: { loc: "TVM" | "DPI"; defaultCategory?: Category; defaultBrand?: string; onCreated: (m: Model) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState(defaultBrand ?? "");
  const [cat, setCat] = useState<Category>(defaultCategory ?? "CAR");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCat(defaultCategory ?? "CAR");
      setBrand(defaultBrand ?? "");
    }
  }, [open, defaultCategory, defaultBrand]);

  const { year, month, ensureSnapshot } = useMonthYear();

  const submit = async () => {
    if (!name.trim() || !brand.trim()) return toast.error("Brand and model name are required");
    setBusy(true);
    const { data, error } = await supabase
      .from("vehicle_models")
      .insert({ name: name.trim(), brand: brand.trim().toUpperCase(), category: cat, location: loc as any })
      .select("id, name, brand, category")
      .single();
    if (error || !data) { setBusy(false); return toast.error(error?.message ?? "Failed"); }
    let glassTypes: string[];

if (cat === "BUS") {
  glassTypes = ["Toughened"];
} else {
  glassTypes = [
    "front_windshield",
    "beeding",
    "backlite_defogger",
    "backlite_non_defogger",
    "front_right_door",
    "front_left_door",
    "rear_right_door",
    "rear_left_door",
    "last_fix_rh",
    "last_fix_lh",
  ];
}
    await supabase.from("glass_stock").insert(glassTypes.map((g) => ({ vehicle_model_id: data.id, glass_type: g as any, quantity: 0 })));
    // Seed monthly_stock for the currently viewed month so the model has editable rows immediately.
    await ensureSnapshot(loc);
    await supabase.from("monthly_stock" as any).insert(glassTypes.map((g) => ({
      vehicle_model_id: data.id, glass_type: g, location: loc, year, month, quantity: 0, opening_quantity: 0,
    })));
    onCreated({ id: data.id, name: data.name, brand: data.brand, category: data.category as Category, total: 0, lowCount: 10 });
    toast.success("Model added");
    setBusy(false); setOpen(false); setName("");
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2"><Plus className="h-5 w-5" /> Add Model</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Vehicle Model ({loc})</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={cat} onValueChange={(v) => setCat(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. TATA" />
          </div>
          <div className="space-y-2">
            <Label>Model Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tata Nexon" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Adding..." : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}