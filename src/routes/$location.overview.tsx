import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Boxes, Layers, Car, Bus, Truck, AlertTriangle, XCircle, FileSpreadsheet, FileDown, Printer,
  Search, ArrowUpDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useMonthYear, MONTH_NAMES, yearOptions } from "@/contexts/MonthYearContext";

export const Route = createFileRoute("/$location/overview")({
  head: () => ({ meta: [{ title: "Monthly Stock Overview | JS WindShields" }] }),
  component: Overview,
});

type Row = {
  vehicle_model_id: string;
  glass_type: string;
  quantity: number;
  category: string;
  brand: string;
  model: string;
  low_threshold: number;
};

type SortKey = "category" | "brand" | "model" | "glass_type" | "quantity";

const PAGE_SIZE = 25;

function Overview() {
  const { location } = useParams({ from: "/$location/overview" });
  const loc = location.toUpperCase() as "TVM" | "DPI";
  const { year, month, label, setYearMonth, ensureSnapshot } = useMonthYear();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("ALL");
  const [brand, setBrand] = useState<string>("ALL");
  const [modelF, setModelF] = useState<string>("ALL");
  const [glass, setGlass] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await ensureSnapshot(loc);
      const { data, error } = await supabase
        .from("monthly_stock" as any)
        .select("vehicle_model_id, glass_type, quantity, vehicle_models!inner(name, brand, category, low_stock_threshold, location)")
        .eq("location", loc)
        .eq("year", year)
        .eq("month", month);
      if (error) console.error(error);
      const mapped: Row[] = ((data as any[]) ?? []).map((r: any) => ({
        vehicle_model_id: r.vehicle_model_id,
        glass_type: r.glass_type,
        quantity: r.quantity,
        category: r.vehicle_models?.category ?? "",
        brand: r.vehicle_models?.brand ?? "—",
        model: r.vehicle_models?.name ?? "",
        low_threshold: r.vehicle_models?.low_stock_threshold ?? 2,
      }));
      setRows(mapped);
      setLoading(false);
      setPage(1);
    };
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loc, year, month]);

  // Filter options
  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);
  const brands = useMemo(() => Array.from(new Set(rows.filter((r) => category === "ALL" || r.category === category).map((r) => r.brand))).sort(), [rows, category]);
  const models = useMemo(() => Array.from(new Set(rows.filter((r) => (category === "ALL" || r.category === category) && (brand === "ALL" || r.brand === brand)).map((r) => r.model))).sort(), [rows, category, brand]);
  const glasses = useMemo(() => Array.from(new Set(rows.map((r) => r.glass_type))).sort(), [rows]);

  // Filtered + searched
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "ALL" && r.category !== category) return false;
      if (brand !== "ALL" && r.brand !== brand) return false;
      if (modelF !== "ALL" && r.model !== modelF) return false;
      if (glass !== "ALL" && r.glass_type !== glass) return false;
      if (ql) {
        const hay = `${r.category} ${r.brand} ${r.model} ${r.glass_type} ${r.quantity}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, category, brand, modelF, glass, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary
  const summary = useMemo(() => {
    const totalQty = filtered.reduce((s, r) => s + r.quantity, 0);
    const totalProducts = new Set(filtered.map((r) => r.vehicle_model_id)).size;
    const byCat = (c: string) => filtered.filter((r) => r.category === c).reduce((s, r) => s + r.quantity, 0);
    const lowItems = filtered.filter((r) => r.quantity > 0 && r.quantity <= r.low_threshold).length;
    const outItems = filtered.filter((r) => r.quantity === 0).length;
    return {
      totalProducts,
      totalQty,
      car: byCat("CAR"),
      bus: byCat("BUS"),
      commercial: byCat("COMMERCIAL"),
      lowItems,
      outItems,
    };
  }, [filtered]);

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const exportRows = () => sorted.map((r) => ({
    Category: r.category, Brand: r.brand, Model: r.model, "Glass Type": r.glass_type, Quantity: r.quantity,
  }));

  const exportCSV = () => {
    const data = exportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadBlob(csv, `${loc}_inventory_${year}_${month}.csv`, "text/csv;charset=utf-8;");
  };
  const exportXLSX = () => {
    const data = exportRows();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `${loc} ${label}`);
    XLSX.writeFile(wb, `${loc}_inventory_${year}_${month}.xlsx`);
  };
  const print = () => window.print();

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground print:hidden">
        <Link to="/" className="hover:text-foreground hover:underline">Home</Link>
        <span>›</span>
        <Link to="/$location" params={{ location: loc }} className="hover:text-foreground hover:underline">{loc} Stocks</Link>
        <span>›</span>
        <span className="font-medium text-foreground">Monthly Overview</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Monthly Stock Overview</h1>
        <p className="text-sm text-muted-foreground">📅 {label} — {loc}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <SumCard label="Products" value={summary.totalProducts} Icon={Layers} tone="muted" />
        <SumCard label="Total Qty" value={summary.totalQty} Icon={Boxes} tone="primary" />
        <SumCard label="Car" value={summary.car} Icon={Car} tone="muted" />
        <SumCard label="Bus" value={summary.bus} Icon={Bus} tone="muted" />
        <SumCard label="Commercial" value={summary.commercial} Icon={Truck} tone="muted" />
        <SumCard label="Low Stock" value={summary.lowItems} Icon={AlertTriangle} tone="warning" />
        <SumCard label="Out of Stock" value={summary.outItems} Icon={XCircle} tone="warning" />
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7">
          <Filter label="Month" value={String(month)} options={MONTH_NAMES.map((n, i) => ({ value: String(i + 1), label: n }))} onChange={(v) => setYearMonth(year, Number(v))} />
          <Filter label="Year" value={String(year)} options={yearOptions().map((y) => ({ value: String(y), label: String(y) }))} onChange={(v) => setYearMonth(Number(v), month)} />
          <Filter label="Category" value={category} options={[{ value: "ALL", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]} onChange={(v) => { setCategory(v); setBrand("ALL"); setModelF("ALL"); }} />
          <Filter label="Brand" value={brand} options={[{ value: "ALL", label: "All" }, ...brands.map((b) => ({ value: b, label: b }))]} onChange={(v) => { setBrand(v); setModelF("ALL"); }} />
          <Filter label="Model" value={modelF} options={[{ value: "ALL", label: "All" }, ...models.map((m) => ({ value: m, label: m }))]} onChange={setModelF} />
          <Filter label="Glass Type" value={glass} options={[{ value: "ALL", label: "All" }, ...glasses.map((g) => ({ value: g, label: g }))]} onChange={setGlass} />
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="All columns…" className="h-9 pl-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" onClick={exportXLSX} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2"><FileDown className="h-4 w-4" /> CSV</Button>
        <Button size="sm" variant="outline" onClick={print} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
        <div className="ml-auto self-center text-xs text-muted-foreground">Showing {paged.length} of {sorted.length}</div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTh label="Category" k="category" sortKey={sortKey} sortDir={sortDir} onClick={() => setSort("category")} />
                <SortableTh label="Brand" k="brand" sortKey={sortKey} sortDir={sortDir} onClick={() => setSort("brand")} />
                <SortableTh label="Model" k="model" sortKey={sortKey} sortDir={sortDir} onClick={() => setSort("model")} />
                <SortableTh label="Glass Type" k="glass_type" sortKey={sortKey} sortDir={sortDir} onClick={() => setSort("glass_type")} />
                <SortableTh label="Quantity" k="quantity" sortKey={sortKey} sortDir={sortDir} onClick={() => setSort("quantity")} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No items match the filters</TableCell></TableRow>
              ) : paged.map((r, i) => {
                const out = r.quantity === 0;
                const low = !out && r.quantity <= r.low_threshold;
                return (
                  <TableRow key={`${r.vehicle_model_id}-${r.glass_type}-${i}`}>
                    <TableCell><Badge variant="secondary">{r.category}</Badge></TableCell>
                    <TableCell className="font-medium">{r.brand}</TableCell>
                    <TableCell>
                      <Link to="/$location/models/$id" params={{ location: loc, id: r.vehicle_model_id }} className="hover:underline">{r.model}</Link>
                    </TableCell>
                    <TableCell>{r.glass_type}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className="mr-2">{r.quantity}</span>
                      {out ? <Badge variant="destructive">OUT</Badge> : low ? <Badge variant="destructive">LOW</Badge> : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="text-xs text-muted-foreground">Page {page} of {pageCount}</div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function SumCard({ label, value, Icon, tone }: { label: string; value: number; Icon: typeof Boxes; tone: "primary" | "muted" | "warning" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
    warning: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-2 p-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SortableTh({ label, k, sortKey, sortDir, onClick, className }: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onClick: () => void; className?: string }) {
  const active = sortKey === k;
  return (
    <TableHead className={className}>
      <button onClick={onClick} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/60"}`} />
        {active && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHead>
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
