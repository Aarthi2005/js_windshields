import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Loc = "TVM" | "DPI";

type Ctx = {
  year: number;
  month: number; // 1-12
  setYearMonth: (y: number, m: number) => void;
  goPrev: () => void;
  goNext: () => void;
  goCurrent: () => void;
  ensureSnapshot: (loc: Loc) => Promise<void>;
  label: string;
};

const MonthYearCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "jsw_month_year_v1";

function getInitial(): { year: number; month: number } {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.year === "number" && typeof p.month === "number") return p;
      }
    } catch {
      /* ignore */
    }
  }
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function MonthYearProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ year: number; month: number }>(() => getInitial());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value: Ctx = useMemo(() => ({
    year: state.year,
    month: state.month,
    setYearMonth: (y, m) => setState({ year: y, month: m }),
    goPrev: () => setState((s) => {
      const m = s.month === 1 ? 12 : s.month - 1;
      const y = s.month === 1 ? s.year - 1 : s.year;
      return { year: y, month: m };
    }),
    goNext: () => setState((s) => {
      const m = s.month === 12 ? 1 : s.month + 1;
      const y = s.month === 12 ? s.year + 1 : s.year;
      return { year: y, month: m };
    }),
    goCurrent: () => {
      const d = new Date();
      setState({ year: d.getFullYear(), month: d.getMonth() + 1 });
    },
    ensureSnapshot: async (loc: Loc) => {
      await supabase.rpc("ensure_month_snapshot" as any, {
        p_location: loc,
        p_year: state.year,
        p_month: state.month,
      });
    },
    label: `${MONTH_NAMES[state.month - 1]} ${state.year}`,
  }), [state]);

  return <MonthYearCtx.Provider value={value}>{children}</MonthYearCtx.Provider>;
}

export function useMonthYear() {
  const ctx = useContext(MonthYearCtx);
  if (!ctx) throw new Error("useMonthYear must be used within MonthYearProvider");
  return ctx;
}

export function yearOptions(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now - 3; y <= now + 2; y++) years.push(y);
  return years;
}
