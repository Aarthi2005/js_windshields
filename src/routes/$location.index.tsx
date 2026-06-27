import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Boxes, AlertTriangle, Layers, Activity, ArrowRight, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { glassLabel } from "@/lib/constants";
import { useMonthYear } from "@/contexts/MonthYearContext";

export const Route = createFileRoute("/$location/")({
  head: () => ({ meta: [{ title: "Dashboard | JS WindShields" }] }),
  component: Dashboard,
});

type LowRow = {
  vehicle_model_id: string;
  glass_type: string;
  quantity: number;
  vehicle_models: { name: string; brand: string | null; category: string; low_stock_threshold: number } | null;
};

type RecentRow = {
  id: string;
  vehicle_model_id: string;
  glass_type: string;
  previous_quantity: number;
  new_quantity: number;
  change: number;
  created_at: string;
  vehicle_models: { name: string; brand: string | null } | null;
};

function Dashboard() {
  const { location } = useParams({ from: "/$location/" });
  const loc = location.toUpperCase() as "TVM" | "DPI";
  const { year, month, label, goPrev, goNext, goCurrent, ensureSnapshot } = useMonthYear();
  const [stats, setStats] = useState({ totalModels: 0, totalStock: 0, lowCount: 0 });
  const [low, setLow] = useState<LowRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);

  useEffect(() => {
    const load = async () => {
      await ensureSnapshot(loc);
      const [{ data: models }, { data: stock }, { data: history }] = await Promise.all([
        supabase.from("vehicle_models").select("id, low_stock_threshold").eq("location", loc),
        supabase
          .from("monthly_stock" as any)
          .select("vehicle_model_id, glass_type, quantity, vehicle_models!inner(name, brand, category, location, low_stock_threshold)")
          .eq("location", loc)
          .eq("year", year)
          .eq("month", month),
        supabase
          .from("stock_history")
          .select("id, vehicle_model_id, glass_type, previous_quantity, new_quantity, change, created_at, vehicle_models(name, brand)")
          .eq("location", loc)
          .eq("year", year)
          .eq("month", month)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      let total = 0;
      const lows: LowRow[] = [];
      ((stock as any[]) ?? []).forEach((s: any) => {
        total += s.quantity;
        const threshold = s.vehicle_models?.low_stock_threshold ?? 2;
        if (s.quantity < 2 || s.quantity <= threshold) lows.push(s);
      });
      lows.sort((a, b) => a.quantity - b.quantity);
      setStats({
        totalModels: models?.length ?? 0,
        totalStock: total,
        lowCount: lows.length,
      });
      setLow(lows.slice(0, 10));
      setRecent((history ?? []) as RecentRow[]);
    };
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loc, year, month]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: `${loc} Stocks` }]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{loc} Dashboard</h1>
          <p className="text-sm text-muted-foreground">📅 {label} inventory</p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={goPrev} className="gap-1"><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Button size="sm" variant="outline" onClick={goCurrent} className="gap-1"><CalendarDays className="h-4 w-4" /> Current</Button>
          <Button size="sm" variant="outline" onClick={goNext} className="gap-1">Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Link to="/$location/browse" params={{ location: loc }}>
        <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-base font-semibold">Browse stock by category</div>
              <div className="text-sm text-muted-foreground">Cars, Buses, Commercial vehicles</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KPI label="Total Stock" value={stats.totalStock} Icon={Boxes} tone="primary" />
        <KPI label="Total Models" value={stats.totalModels} Icon={Layers} tone="muted" />
        <KPI label="Low Stock Items" value={stats.lowCount} Icon={AlertTriangle} tone="warning" />
        <KPI label="Recent Updates" value={recent.length} Icon={Activity} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {low.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All stock healthy 🎉</p>
            ) : (
              <ul className="divide-y divide-border">
                {low.map((r) => (
                  <li key={`${r.vehicle_model_id}-${r.glass_type}`} className="flex items-center justify-between gap-3 py-3">
                    <Link to="/$location/models/$id" params={{ location: loc, id: r.vehicle_model_id }} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-sm font-medium">{r.vehicle_models?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.vehicle_models?.brand} · {glassLabel(r.glass_type)}
                      </div>
                    </Link>
                    <Badge variant="destructive">{r.quantity === 0 ? "OUT" : `LOW · ${r.quantity}`}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" /> Recently Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No updates yet</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <Link to="/$location/models/$id" params={{ location: loc, id: r.vehicle_model_id }} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-sm font-medium">{r.vehicle_models?.name ?? "(deleted)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {glassLabel(r.glass_type)} · {r.previous_quantity} → {r.new_quantity}
                      </div>
                    </Link>
                    <Badge variant={r.change >= 0 ? "secondary" : "destructive"} className="shrink-0">
                      {r.change > 0 ? "+" : ""}{r.change}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, Icon, tone }: { label: string; value: number; Icon: typeof Boxes; tone: "primary" | "muted" | "warning" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
    warning: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-bold sm:text-2xl">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {it.to ? <Link to={it.to} className="hover:text-foreground hover:underline">{it.label}</Link> : <span className="font-medium text-foreground">{it.label}</span>}
          {i < items.length - 1 && <span>›</span>}
        </span>
      ))}
    </nav>
  );
}
