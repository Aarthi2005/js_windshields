import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Warehouse, Building2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JS WindShields Inventory Management" },
      { name: "description", content: "Manage windshield and auto glass stock across TVM and DPI locations." },
      { property: "og:title", content: "JS WindShields Inventory Management" },
      { property: "og:description", content: "Independent inventory management for TVM and DPI." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <header className="mb-10 text-center sm:mb-16">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Warehouse className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            JS WindShields
          </h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            Inventory Management System
          </p>
          <p className="mt-4 text-sm text-muted-foreground">Select a location to manage its stock</p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          <LocationCard
            to="TVM"
            title="TVM STOCKS"
            subtitle="TVM inventory"
            accent="from-primary to-primary/70"
            Icon={Warehouse}
          />
          <LocationCard
            to="DPI"
            title="DPI STOCKS"
            subtitle="DPI inventory"
            accent="from-accent-foreground to-accent-foreground/70"
            Icon={Building2}
          />
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          TVM and DPI stock are stored separately — updates in one location never affect the other.
        </p>
      </div>
    </div>
  );
}

function LocationCard({
  to, title, subtitle, accent, Icon,
}: { to: "TVM" | "DPI"; title: string; subtitle: string; accent: string; Icon: typeof Warehouse }) {
  return (
    <Link to="/$location" params={{ location: to }}>
      <Card className="group h-full cursor-pointer overflow-hidden border-2 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-2xl">
        <CardContent className="p-0">
          <div className={`bg-gradient-to-br ${accent} p-8 text-primary-foreground`}>
            <Icon className="h-12 w-12" />
          </div>
          <div className="flex items-center justify-between gap-4 p-6">
            <div>
              <div className="text-xl font-bold text-foreground sm:text-2xl">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
