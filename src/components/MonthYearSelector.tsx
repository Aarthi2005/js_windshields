import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { MONTH_NAMES, useMonthYear, yearOptions } from "@/contexts/MonthYearContext";

export function MonthYearSelector({ compact = false }: { compact?: boolean }) {
  const { year, month, setYearMonth, goPrev, goNext, goCurrent } = useMonthYear();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={String(month)} onValueChange={(v) => setYearMonth(year, Number(v))}>
          <SelectTrigger className="h-8 w-[110px] border-0 bg-transparent px-1 text-sm focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, idx) => (
              <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYearMonth(Number(v), month)}>
          <SelectTrigger className="h-8 w-[80px] border-0 bg-transparent px-1 text-sm focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions().map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!compact && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={goPrev} title="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goCurrent} title="Current month" className="gap-1">
            <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Current</span>
          </Button>
          <Button size="sm" variant="outline" onClick={goNext} title="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
