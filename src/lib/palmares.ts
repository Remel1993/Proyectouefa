// @ts-nocheck
// src/lib/palmares.ts

export interface WinnerRow {
  teamName: string;
  titles: number;
  color1?: string;
  color2?: string;
  isFlag?: boolean;
  seasons: number[];
}

export interface TitleEntry {
  id?: string | number;
  compId: string;
  compName: string;
  type?: 'league' | 'cup';
  div: number;
  winner: { name: string; color1?: string; color2?: string; isFlag?: boolean; pts?: number; gf?: number; ga?: number; w?: number; d?: number; l?: number };
  runnerUp?: { name: string; color1?: string; color2?: string; isFlag?: boolean; pts?: number } | null;
  thirdPlace?: { name: string; color1?: string; color2?: string; isFlag?: boolean; pts?: number } | null;
  finalMatch?: {
    homeName: string;
    awayName: string;
    homeScore: number;
    awayScore: number;
    penH?: number | null;
    penA?: number | null;
  } | null;
  records?: {
    topScoring: { name: string; value: number };
    bestDefense: { name: string; value: number };
    bestGoalDiff: { name: string; value: number };
    mostWins: { name: string; value: number };
  };
  season: number;
  date?: string;
}

export const PALMARES_STORAGE_KEY = 'dice-football-hub-elite-v8_palmares';
export const PALMARES_VERSION_KEY = 'dice-football-hub-elite-v8_palmares_version';
const LEGACY_STORAGE_KEYS = [
  'dice-football-hub-elite-v7_palmares',
  'dice-football-hub-elite-v6_palmares'
];

const isDuplicate = (existing: TitleEntry, candidate: TitleEntry) => {
  if (candidate.id && existing.id && candidate.id === existing.id) return true;
  if (candidate.type === 'league' || (!candidate.type && candidate.compId !== 'C1' && candidate.compId !== 'C2' && candidate.compId !== 'C3')) {
    return existing.compId === candidate.compId &&
      Number(existing.div || 1) === Number(candidate.div || 1) &&
      Number(existing.season) === Number(candidate.season);
  }
  return existing.compId === candidate.compId &&
    Number(existing.div || 1) === Number(candidate.div || 1) &&
    Number(existing.season) === Number(candidate.season) &&
    existing.winner?.name === candidate.winner?.name;
};

// Obtener todos los títulos guardados (con soporte de migración automática de versiones anteriores)
export const getTitles = (): TitleEntry[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PALMARES_STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);

    // Si no hay datos en la clave v8, intentar migrar desde versiones anteriores
    if (typeof window !== 'undefined') {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem(PALMARES_STORAGE_KEY, legacyRaw);
            return parsed;
          }
        }
      }
    }
    return [];
  } catch {
    return [];
  }
};

// Guardar un único título (actualiza si trae récords más completos)
export const registerTitle = (entry: TitleEntry) => {
  if (!entry || !entry.winner || !entry.winner.name) return;
  const all = getTitles();
  const existingIdx = all.findIndex((e) => isDuplicate(e, entry));
  if (existingIdx === -1) {
    all.push(entry);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PALMARES_STORAGE_KEY, JSON.stringify(all));
    }
    notifySubscribers();
  } else {
    // Si ya existe pero el nuevo trae más datos (records, runnerUp, finalMatch), actualizarlo
    const existing = all[existingIdx];
    if (entry.records || entry.runnerUp || entry.finalMatch || (entry.winner?.pts && !existing.winner?.pts)) {
      all[existingIdx] = {
        ...existing,
        ...entry,
        winner: { ...existing.winner, ...entry.winner },
        records: entry.records || existing.records,
        runnerUp: entry.runnerUp !== undefined ? entry.runnerUp : existing.runnerUp,
        thirdPlace: entry.thirdPlace !== undefined ? entry.thirdPlace : existing.thirdPlace,
        finalMatch: entry.finalMatch || existing.finalMatch
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(PALMARES_STORAGE_KEY, JSON.stringify(all));
      }
      notifySubscribers();
    }
  }
};

// Guardar múltiples títulos de una vez (para temporadas completas)
export const registerTitles = (entries: TitleEntry[]) => {
  if (!Array.isArray(entries) || !entries.length) return;
  const all = getTitles();
  let changed = false;
  entries.forEach((entry) => {
    if (!entry || !entry.winner || !entry.winner.name) return;
    const existingIdx = all.findIndex((e) => isDuplicate(e, entry));
    if (existingIdx === -1) {
      all.push(entry);
      changed = true;
    } else {
      const existing = all[existingIdx];
      if (entry.records || entry.runnerUp || entry.finalMatch || (entry.winner?.pts && !existing.winner?.pts)) {
        all[existingIdx] = {
          ...existing,
          ...entry,
          winner: { ...existing.winner, ...entry.winner },
          records: entry.records || existing.records,
          runnerUp: entry.runnerUp !== undefined ? entry.runnerUp : existing.runnerUp,
          thirdPlace: entry.thirdPlace !== undefined ? entry.thirdPlace : existing.thirdPlace,
          finalMatch: entry.finalMatch || existing.finalMatch
        };
        changed = true;
      }
    }
  });
  if (changed) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PALMARES_STORAGE_KEY, JSON.stringify(all));
    }
    notifySubscribers();
  }
};

// Obtener los máximos ganadores de una competición y división
export const getTopWinners = (compId: string, div: number): WinnerRow[] => {
  const all = getTitles();
  const filtered = all.filter((t) => t.compId === compId && t.div === div);
  const map = new Map<string, WinnerRow>();
  filtered.forEach((t) => {
    const name = t.winner.name;
    const row = map.get(name) || {
      teamName: name,
      titles: 0,
      color1: t.winner.color1,
      color2: t.winner.color2,
      isFlag: t.winner.isFlag,
      seasons: [],
    };
    row.titles += 1;
    if (!row.seasons.includes(t.season)) row.seasons.push(t.season);
    map.set(name, row);
  });
  return Array.from(map.values()).sort((a, b) => b.titles - a.titles || a.teamName.localeCompare(b.teamName));
};

// Sistema de suscripción para actualizar la UI cuando cambien los títulos
type Listener = () => void;
const listeners: Listener[] = [];

export const subscribeTitles = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getPalmaresVersion = (): string => {
  try {
    return typeof window !== 'undefined'
      ? (localStorage.getItem(PALMARES_VERSION_KEY) || localStorage.getItem(PALMARES_STORAGE_KEY) || '0')
      : '0';
  } catch {
    return '0';
  }
};

const notifySubscribers = () => {
  // Incrementar una versión en localStorage para forzar re-render
  const version = Date.now().toString();
  if (typeof window !== 'undefined') {
    localStorage.setItem(PALMARES_VERSION_KEY, version);
  }
  listeners.forEach((fn) => fn());
};