// @ts-nocheck
import { Star, Trophy } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { getTopWinners, subscribeTitles, getPalmaresVersion, type WinnerRow } from "@/lib/palmares";
import { Shield } from "@/components/ui/GameUI";
import { resolveTeamVisuals } from "@/lib/palmaresHelper";

const useTitlesVersion = () =>
  useSyncExternalStore(
    (cb) => subscribeTitles(cb),
    () => getPalmaresVersion(),
    () => "0",
  );

const Stars = ({ count }: { count: number }) => (
  <div className="flex flex-wrap gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <Star
        key={i}
        size={11}
        className="fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]"
      />
    ))}
  </div>
);

export interface LocalChampionRecord {
  season: number;
  champion: {
    name: string;
    color1?: string | undefined;
    color2?: string | undefined;
    isFlag?: boolean | undefined;
  };
}

/** Fusiona el registro global de títulos con el historial local de la competición. */
const mergeRows = (base: WinnerRow[], records: LocalChampionRecord[]): WinnerRow[] => {
  const map = new Map<string, WinnerRow>();
  base.forEach((r) => {
    const vis = resolveTeamVisuals(r.teamName, { color1: r.color1, color2: r.color2, isFlag: r.isFlag });
    map.set(r.teamName, {
      ...r,
      color1: vis.color1,
      color2: vis.color2,
      isFlag: vis.isFlag,
      seasons: [...r.seasons]
    });
  });
  records.forEach((rec) => {
    const c = rec?.champion;
    if (!c?.name) return;
    const vis = resolveTeamVisuals(c.name, { color1: c.color1, color2: c.color2, isFlag: c.isFlag });
    const row = map.get(c.name) ?? {
      teamName: c.name,
      titles: 0,
      color1: vis.color1,
      color2: vis.color2,
      isFlag: vis.isFlag,
      seasons: [] as number[],
    };
    if (row.seasons.includes(rec.season)) return;
    row.titles += 1;
    row.seasons.push(rec.season);
    if (!row.color1) row.color1 = vis.color1;
    if (!row.color2) row.color2 = vis.color2;
    if (row.isFlag === undefined) row.isFlag = vis.isFlag;
    map.set(c.name, row);
  });
  return [...map.values()].sort(
    (a, b) => b.titles - a.titles || a.teamName.localeCompare(b.teamName),
  );
};

export const TopWinnersTable = ({
  compId,
  div = 1,
  records = [],
  emptyLabel = "Todavía no hay campeones registrados.",
}: {
  compId: string;
  div?: number;
  records?: LocalChampionRecord[];
  emptyLabel?: string;
}) => {
  const version = useTitlesVersion();
  const rows: WinnerRow[] = useMemo(
    () => mergeRows(getTopWinners(compId, div), records),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compId, div, version, records],
  );

  if (!rows.length) {
    return (
      <p className="py-10 text-center text-[11px] font-bold italic text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-400/20 bg-slate-950/70">
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-amber-500/10 px-3 py-2">
        <span className="text-[8px] font-black uppercase tracking-widest text-amber-300">
          #
        </span>
        <span className="w-9 text-[8px] font-black uppercase tracking-widest text-amber-300 text-center">
          Escudo
        </span>
        <span className="text-[8px] font-black uppercase tracking-widest text-amber-300">
          Equipo
        </span>
        <span className="text-[8px] font-black uppercase tracking-widest text-amber-300">
          Títulos
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r, i) => {
          const vis = resolveTeamVisuals(r.teamName, { color1: r.color1, color2: r.color2, isFlag: r.isFlag });
          return (
            <div
              key={`${r.teamName}-${i}`}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
            >
              <span className="w-4 text-[10px] font-black italic text-slate-400">
                {i + 1}
              </span>
              <div className="flex w-9 justify-center items-center shrink-0">
                <Shield
                  color1={vis.color1}
                  color2={vis.color2}
                  initial={vis.name}
                  size="sm"
                  isFlag={vis.isFlag}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-black uppercase italic text-white">
                  {r.teamName}
                </p>
                <Stars count={r.titles} />
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300">
                <Trophy size={10} /> {r.titles}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopWinnersTable; 
 
