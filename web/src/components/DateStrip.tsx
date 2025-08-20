import { useMemo } from "react";

export type DateStripProps = {
  selected?: string; // YYYY-MM-DD
  days?: number; // how many days from today to show
  onChange?: (date: string) => void;
};

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(d: Date, idx: number) {
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const wd = weekdays[d.getDay()];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  // First pill can just show Today
  const prefix = idx === 0 ? "TODAY" : wd;
  return { line1: prefix, line2: `${day} ${mon}` };
}

export default function DateStrip({ selected, days = 7, onChange }: DateStripProps) {
  const items = useMemo(() => {
    const arr: { key: string; date: Date }[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({ key: toISODate(d), date: d });
    }
    return arr;
  }, [days]);

  const selectedKey = selected || items[0]?.key;

  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {items.map((it, idx) => {
        const isActive = it.key === selectedKey;
        const { line1, line2 } = formatDayLabel(it.date, idx);
        return (
          <button
            key={it.key}
            className={`min-w-[84px] px-3 py-2 rounded-md border text-center leading-tight focus:outline-none focus:ring-2 focus:ring-rose-500 whitespace-nowrap ${
              isActive ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => onChange?.(it.key)}
          >
            <div className="text-[10px] tracking-wide">{line1}</div>
            <div className="text-sm font-semibold">{line2}</div>
          </button>
        );
      })}
    </div>
  );
}
