import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, History } from "lucide-react";
import { glassLabel } from "@/lib/constants";
import { useMonthYear } from "@/contexts/MonthYearContext";

export const Route = createFileRoute("/$location/history")({
  head: () => ({ meta: [{ title: "History | JS WindShields" }] }),
  component: HistoryPage,
});

type Row = {
  id: string;
  vehicle_model_id: string;
  glass_type: string;
  previous_quantity: number;
  new_quantity: number;
  change: number;
  created_at: string;
  vehicle_models: { name: string; brand: string | null; category: string } | null;
};

function HistoryPage() {
  const { location } = useParams({ from: "/$location/history" });
  const loc = location.toUpperCase() as "TVM" | "DPI";
  const { year, month, label } = useMonthYear();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("stock_history")
        .select("id, vehicle_model_id, glass_type, previous_quantity, new_quantity, change, created_at, vehicle_models(name, brand, category)")
        .eq("location", loc)
        .eq("year", year)
        .eq("month", month)
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    };
    load();
  }, [loc, year, month]);


  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground hover:underline">Home</Link>
        <span>›</span>
        <Link to="/$location" params={{ location: loc }} className="hover:text-foreground hover:underline">{loc} Stocks</Link>
        <span>›</span>
        <span className="font-medium text-foreground">History</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{loc} Stock History</h1>
        <p className="text-sm text-muted-foreground">📅 {label} — changes scoped to selected month</p>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" /> Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No changes yet</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const positive = r.change > 0;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      positive ? "bg-primary/10 text-primary" : "bg-destructive/15 text-destructive"
                    }`}>
                      {positive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </div>
                    <Link to="/$location/models/$id" params={{ location: loc, id: r.vehicle_model_id }} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-sm font-medium">
                        {r.vehicle_models?.name ?? "(deleted)"}
                        {r.vehicle_models?.brand && <span className="ml-2 text-xs text-muted-foreground">{r.vehicle_models.brand}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {glassLabel(r.glass_type)} · {r.previous_quantity} → {r.new_quantity}
                      </div>
                    </Link>
                    <Badge variant={positive ? "secondary" : "destructive"} className="shrink-0">
                      {positive ? "+" : ""}{r.change}
                    </Badge>
                    <div className="w-full text-xs text-muted-foreground sm:w-auto sm:text-right">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}