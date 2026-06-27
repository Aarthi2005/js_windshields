import { createFileRoute, Outlet, Link, useParams, useRouterState, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Boxes, History, Home, Warehouse, Table as TableIcon } from "lucide-react";
import { MonthYearSelector } from "@/components/MonthYearSelector";
import { useMonthYear } from "@/contexts/MonthYearContext";

export const Route = createFileRoute("/$location")({
  beforeLoad: ({ params }) => {
    const loc = params.location?.toUpperCase();
    if (loc !== "TVM" && loc !== "DPI") throw notFound();
    return { location: loc as "TVM" | "DPI" };
  },
  component: LocationLayout,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Unknown location</h1>
        <Link to="/" className="mt-3 inline-block text-primary underline">Go home</Link>
      </div>
    </div>
  ),
});

function LocationLayout() {
  const { location } = useParams({ from: "/$location" });
  const loc = location.toUpperCase() as "TVM" | "DPI";
  const { location: routerLoc } = useRouterState();
  const { year, month, ensureSnapshot } = useMonthYear();

  // Materialise the snapshot for the active month whenever it changes.
  useEffect(() => {
    ensureSnapshot(loc).catch(() => { /* tolerated */ });
  }, [loc, year, month, ensureSnapshot]);

  const nav: { to: "/$location" | "/$location/browse" | "/$location/overview" | "/$location/history"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
    { to: "/$location", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/$location/browse", label: "Stock", icon: Boxes },
    { to: "/$location/overview", label: "Overview", icon: TableIcon },
    { to: "/$location/history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground" title="Home">
                <Home className="h-4 w-4" />
              </Link>
              <Link to="/$location" params={{ location: loc }} className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight text-foreground">JS WindShields</div>
                  <div className="text-xs leading-tight text-muted-foreground">{loc} Inventory</div>
                </div>
              </Link>
            </div>

            <nav className="flex items-center gap-1 sm:gap-2">
              {nav.map((item) => {
                const Icon = item.icon;
                const path = item.to.replace("$location", loc);
                const active = item.exact
                  ? routerLoc.pathname === path
                  : routerLoc.pathname.startsWith(path);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    params={{ location: loc }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex justify-end print:hidden">
            <MonthYearSelector />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
