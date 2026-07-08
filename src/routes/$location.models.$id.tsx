import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, Plus, Trash2, AlertTriangle, Pencil, Layers, Plus as PlusIcon } from "lucide-react";
import { type Category } from "@/lib/constants";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const persist = async (stock: Stock, newQty: number, note?: string): Promise<void> => {
    if (newQty < 0) return;
    const previous = stock.quantity;
    const { error } = await supabase.from("monthly_stock" as any).update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", stock.id);
    if (error) { toast.error(error.message); return; }
    const { data, error: rpcError } = await supabase.rpc(
  "propagate_stock_change" as any,
  {
    p_vehicle_model_id: id,
    p_glass_type: stock.glass_type,
    p_location: loc,
    p_year: year,
    p_month: month,
    p_quantity: newQty,
  }
);

console.log("RPC RESULT:", data);
console.log("RPC ERROR:", rpcError);

console.log({
  modelId: id,
  glassType: stock.glass_type,
  location: loc,
  year,
  month,
  quantity: newQty,
});

if (rpcError) {
  console.error(rpcError);
  alert(rpcError.message);
}
    await supabase.from("stock_history").insert({
      vehicle_model_id: id,
      glass_type: stock.glass_type as any,
      previous_quantity: previous,
      new_quantity: newQty,
      change: newQty - previous,
      user_id: null,
      location: loc as any,
      year, month,
      note: note && note.trim() ? note.trim() : null,
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
        <div className="flex flex-wrap gap-2">
          <EditModelDialog model={model} onSaved={setModel} />
          <ManageGlassTypesDialog modelId={id} loc={loc} year={year} month={month} onChanged={load} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" /> Delete Model
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

      {stocks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No glass types yet. Click <span className="font-medium text-foreground">Manage Glass Types</span> to add one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stocks.map((s) => (
            <StockCard key={s.id} label={s.glass_type} stock={s} modelId={id} loc={loc} year={year} month={month} onSave={persist} />
          ))}
        </div>
      )}
    </div>
  );
}

function StockCard({
  label, stock, modelId, loc, year, month, onSave,
}: {
  label: string; stock: Stock; modelId: string; loc: "TVM" | "DPI"; year: number; month: number;
  onSave: (s: Stock, n: number, note?: string) => Promise<void> | void;
}) {
  const [val, setVal] = useState(String(stock.quantity));
  const [note, setNote] = useState("");
  useEffect(() => setVal(String(stock.quantity)), [stock.quantity]);

  const loadLastNote = async () => {
    const { data } = await supabase
      .from("stock_history")
      .select("note")
      .eq("vehicle_model_id", modelId)
      .eq("glass_type", stock.glass_type as any)
      .eq("location", loc as any)
      .eq("year", year)
      .eq("month", month)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = (data as any[])?.[0];
    setNote(row?.note ?? "");
  };
  useEffect(() => { loadLastNote(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stock.id, year, month, loc]);

  const isLow = stock.quantity < LOW_THRESHOLD;
  const isOut = stock.quantity === 0;

  const commitQty = async () => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) { setVal(String(stock.quantity)); return; }
    if (n === stock.quantity) return;
    await onSave(stock, n, note);
  };

  const commitNote = async () => {
    await onSave(stock, stock.quantity, note);
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

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number" min={0} value={val}
              onChange={(e) => setVal(e.target.value)}
              onBlur={commitQty}
              className="h-11 text-center text-base font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={commitNote}
              placeholder="Enter remarks..."
              rows={3}
            />
          </div>
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
        <Button variant="outline" size="sm" className="gap-2"><Pencil className="h-4 w-4" /> Edit Model</Button>
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

type GlassRow = { glass_type: string; quantity: number };

function ManageGlassTypesDialog({
  modelId, loc, year, month, onChanged,
}: { modelId: string; loc: "TVM" | "DPI"; year: number; month: number; onChanged: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GlassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("monthly_stock" as any)
      .select("glass_type, quantity")
      .eq("vehicle_model_id", modelId)
      .eq("location", loc)
      .eq("year", year)
      .eq("month", month)
      .order("glass_type");
    setRows(((data as any[]) ?? []) as GlassRow[]);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, modelId, loc, year, month]);

  const refresh = async () => { await load(); await onChanged(); };

  const addGlass = async () => {
    const name = newName.trim();
    if (!name) return toast.error("Glass type is required");
    setBusy(true);
    const { error: e1 } = await supabase.from("glass_stock").insert({ vehicle_model_id: modelId, glass_type: name as any, quantity: 0 });
    if (e1) { setBusy(false); return toast.error(e1.message); }
    const { error: e2 } = await supabase.from("monthly_stock" as any).insert({
      vehicle_model_id: modelId, location: loc, glass_type: name, year, month, quantity: 0, opening_quantity: 0,
    });
    setBusy(false);
    if (e2) return toast.error(e2.message);
    toast.success("Glass type added");
    setNewName(""); setAddOpen(false);
    await refresh();
  };

  const saveEdit = async (oldName: string) => {
    const name = editName.trim();
    if (!name || name === oldName) { setEditing(null); return; }
    setBusy(true);
    const { error: e1 } = await supabase.from("glass_stock").update({ glass_type: name as any })
      .eq("vehicle_model_id", modelId).eq("glass_type", oldName as any);
    const { error: e2 } = await supabase.from("monthly_stock" as any).update({ glass_type: name })
      .eq("vehicle_model_id", modelId).eq("glass_type", oldName);
    setBusy(false);
    if (e1 || e2) return toast.error((e1 ?? e2)!.message);
    toast.success("Glass type updated");
    setEditing(null);
    await refresh();
  };

  const deleteGlass = async (name: string) => {
    setBusy(true);
    const { error: e1 } = await supabase.from("monthly_stock" as any)
      .delete().eq("vehicle_model_id", modelId).eq("glass_type", name);
    const { error: e2 } = await supabase.from("glass_stock")
      .delete().eq("vehicle_model_id", modelId).eq("glass_type", name as any);
    setBusy(false);
    if (e1 || e2) return toast.error((e1 ?? e2)!.message);
    toast.success("Glass type deleted");
    await refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2"><Layers className="h-4 w-4" /> Manage Glass Types</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Glass Types</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><PlusIcon className="h-4 w-4" /> Add Glass Type</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Glass Type</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Glass Type</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Windshield Green" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={addGlass} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Glass Type</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No glass types yet.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.glass_type}>
                  <TableCell className="font-medium">{r.glass_type}</TableCell>
                  <TableCell className="text-center">{r.quantity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Dialog open={editing === r.glass_type} onOpenChange={(v) => { setEditing(v ? r.glass_type : null); if (v) setEditName(r.glass_type); }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Edit Glass Type</DialogTitle></DialogHeader>
                          <div className="space-y-2">
                            <Label>Glass Type</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                            <Button onClick={() => saveEdit(r.glass_type)} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Glass Type?</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to delete this glass type?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteGlass(r.glass_type)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
