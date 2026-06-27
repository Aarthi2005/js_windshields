import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, Plus, Save, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { type Category } from "@/lib/constants";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMonthYear } from "@/contexts/MonthYearContext";

export const Route = createFileRoute("/$location/models/$id")({
  head: () => ({ meta: [{ title: "Model Stock | JS WindShields" }] }),
  component: ModelDetail,
});

type Model = { id: string; name: string; brand: string | null; category: Category; location: "TVM" | "DPI"; low_stock_threshold: number };
type Stock = { id: string; glass_type: string; quantity: number };

const LOW_THRESHOLD = 2;

function ModelDetail() {
  const { location, id } = useParams({ from: "/$location/models/$id" });
  const loc = location.toUpperCase() as "TVM" | "DPI";
  const navigate = useNavigate();
  const { year, month, label, ensureSnapshot } = useMonthYear();
  const [model, setModel] = useState<Model | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    await ensureSnapshot(loc);
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from("vehicle_models").select("id, name, brand, category, location, low_stock_threshold").eq("id", id).single(),
      supabase
        .from("monthly_stock" as any)
        .select("id, glass_type, quantity")
        .eq("vehicle_model_id", id)
        .eq("location", loc)
        .eq("year", year)
        .eq("month", month),
    ]);
    setModel(m as any);
    setStocks(((s as any[]) ?? []) as Stock[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, year, month, loc]);

  const persist = async (stock: Stock, newQty: number): Promise<void> => {
    if (newQty < 0) return;
    const previous = stock.quantity;
    const { error } = await supabase.from("monthly_stock" as any).update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", stock.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("stock_history").insert({
      vehicle_model_id: id,
      glass_type: stock.glass_type as any,
      previous_quantity: previous,
      new_quantity: newQty,
      change: newQty - previous,
      user_id: null,
      location: loc as any,
      year, month,
    } as any);
    setStocks((prev) => prev.map((p) => (p.id === stock.id ? { ...p, quantity: newQty } : p)));
  };

  const deleteModel = async () => {
    await supabase.from("monthly_stock" as any).delete().eq("vehicle_model_id", id);
    await supabase.from("glass_stock").delete().eq("vehicle_model_id", id);
    const { error } = await supabase.from("vehicle_models").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Model deleted");
    navigate({ to: "/$location/browse", params: { location: loc } });
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!model) return <div className="py-12 text-center text-muted-foreground">Model not found</div>;

  const totalStock = stocks.reduce((s, x) => s + x.quantity, 0);

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground hover:underline">Home</Link>
        <span>›</span>
        <Link to="/$location" params={{ location: loc }} className="hover:text-foreground hover:underline">{loc} Stocks</Link>
        <span>›</span>
        <Link to="/$location/browse" params={{ location: loc }} search={{ category: model.category }} className="hover:text-foreground hover:underline">{model.category}</Link>
        {model.brand && <>
          <span>›</span>
          <Link to="/$location/browse" params={{ location: loc }} search={{ category: model.category, brand: model.brand }} className="hover:text-foreground hover:underline">{model.brand}</Link>
        </>}
        <span>›</span>
        <span className="font-medium text-foreground">{model.name}</span>
      </nav>

      <Button
        variant="ghost" size="sm"
        onClick={() => navigate({ to: "/$location/browse", params: { location: loc }, search: { category: model.category, brand: model.brand ?? undefined } })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{loc}</Badge>
            <Badge variant="secondary">{model.category}</Badge>
            {model.brand && <Badge variant="outline">{model.brand}</Badge>}
            <Badge variant="outline" className="border-primary text-primary">📅 {label}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{model.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Total stock for {label}: <span className="font-semibold text-foreground">{totalStock}</span> pieces
          </p>
        </div>
        <div className="flex gap-2">
          <EditModelDialog model={model} onSaved={setModel} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this model?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently removes "{model.name}" from {loc} along with its stock and history (all months).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteModel}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stocks.map((s) => (
          <StockCard key={s.id} label={s.glass_type} stock={s} onSave={persist} />
        ))}
      </div>
    </div>
  );
}

function StockCard({ label, stock, onSave }: { label: string; stock: Stock; onSave: (s: Stock, n: number) => Promise<void> | void }) {
  const [val, setVal] = useState(String(stock.quantity));
  useEffect(() => setVal(String(stock.quantity)), [stock.quantity]);

  const isLow = stock.quantity < LOW_THRESHOLD;
  const isOut = stock.quantity === 0;

  const save = async () => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) return toast.error("Enter a valid number");
    if (n === stock.quantity) return toast.message("No change");
    await onSave(stock, n);
    toast.success(`${label} updated`);
  };

  return (
    <Card className={`overflow-hidden border-2 ${isOut ? "border-destructive/40" : isLow ? "border-destructive/30" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          {isOut ? (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> OUT</Badge>
          ) : isLow ? (
            <Badge variant="destructive">LOW STOCK</Badge>
          ) : null}
        </div>

        <div className="mt-3 text-center">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Current Stock</div>
          <div className="text-5xl font-extrabold text-foreground">{stock.quantity}</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline" size="lg" className="h-12"
            onClick={() => onSave(stock, Math.max(0, stock.quantity - 1))}
            disabled={stock.quantity === 0}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Button size="lg" className="h-12" onClick={() => onSave(stock, stock.quantity + 1)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            type="number" min={0} value={val}
            onChange={(e) => setVal(e.target.value)}
            className="h-11 text-center text-base font-semibold"
          />
          <Button variant="secondary" className="h-11 gap-2" onClick={save}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditModelDialog({ model, onSaved }: { model: Model; onSaved: (m: Model) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(model.name);
  const [brand, setBrand] = useState(model.brand ?? "");
  const [threshold, setThreshold] = useState(String(model.low_stock_threshold));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("vehicle_models")
      .update({ name: name.trim(), brand: brand.trim().toUpperCase() || null, low_stock_threshold: parseInt(threshold, 10) || 2 })
      .eq("id", model.id).select("id, name, brand, category, location, low_stock_threshold").single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    onSaved(data as any);
    toast.success("Saved");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Pencil className="h-4 w-4" /> Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Model</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Brand</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Low stock threshold</Label><Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
