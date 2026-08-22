// Palmares and season summary history helper
import { PRESETS, PRESETS_2 } from '@/lib/presets';
import { ALL_WORLD_CUP_TEAMS } from '@/lib/worldCup';
import { getCountryCode } from '@/lib/countries';

export interface ChampionRecord {
  season: number;
  compId?: string;
  compName?: string;
  div?: number;
  type?: 'league' | 'cup';
  champion: {
    id: any; 
    name: string; 
    pts: number; 
    gf: number; 
    ga: number;
    w?: number;
    d?: number;
    l?: number;
    gd?: number;
    played?: number;
    color1?: string; 
    color2?: string; 
    isFlag?: boolean;
  };
  runnerUp: { 
    id: any; 
    name: string; 
    pts?: number; 
    gf?: number;
    ga?: number;
    w?: number;
    d?: number;
    l?: number;
    gd?: number;
    color1?: string; 
    color2?: string; 
    isFlag?: boolean 
  } | null;
  thirdPlace?: { 
    id: any; 
    name: string; 
    pts?: number;
    gf?: number;
    ga?: number;
    w?: number;
    d?: number;
    l?: number;
    gd?: number;
    color1?: string; 
    color2?: string; 
    isFlag?: boolean 
  } | null;
  fourthPlace?: { 
    id: any; 
    name: string; 
    pts?: number;
    gf?: number;
    ga?: number;
    w?: number;
    d?: number;
    l?: number;
    gd?: number;
    color1?: string; 
    color2?: string; 
    isFlag?: boolean 
  } | null;
  finalMatch?: {
    homeName: string;
    awayName: string;
    homeScore: number;
    awayScore: number;
    penH?: number | null;
    penA?: number | null;
  } | null;
  thirdPlaceMatch?: {
    homeName: string;
    awayName: string;
    homeScore: number;
    awayScore: number;
    penH?: number | null;
    penA?: number | null;
  } | null;
  records: {
    topScoring: { name: string; value: number };
    bestDefense: { name: string; value: number };
    bestGoalDiff: { name: string; value: number };
    mostWins: { name: string; value: number };
  };
}

export interface TeamVisuals {
  name: string;
  color1: string;
  color2: string;
  isFlag: boolean;
  code?: string | null;
}

/** Resuelve de forma robusta los colores, bandera y datos visuales de cualquier club o país */
export const resolveTeamVisuals = (
  name?: string,
  existing?: { color1?: string; color2?: string; isFlag?: boolean }
): TeamVisuals => {
  const safeName = (name || '').trim();
  if (!safeName) {
    return { name: '', color1: '#334155', color2: '#64748b', isFlag: false };
  }

  const countryCode = getCountryCode(safeName);
  const isCountry = existing?.isFlag || !!countryCode;

  if (isCountry) {
    const wc = ALL_WORLD_CUP_TEAMS.find(t => t.name.toLowerCase() === safeName.toLowerCase());
    return {
      name: safeName,
      color1: existing?.color1 || wc?.color1 || '#002b7f',
      color2: existing?.color2 || wc?.color2 || '#ffffff',
      isFlag: true,
      code: countryCode
    };
  }

  const lower = safeName.toLowerCase();
  // Buscar en PRESETS División 1
  for (const list of Object.values(PRESETS)) {
    const found = list.find(t => t.name.toLowerCase() === lower);
    if (found) {
      return {
        name: safeName,
        color1: existing?.color1 || found.color1,
        color2: existing?.color2 || found.color2,
        isFlag: existing?.isFlag !== undefined ? existing.isFlag : !!found.isFlag
      };
    }
  }

  // Buscar en PRESETS División 2
  for (const list of Object.values(PRESETS_2 || {})) {
    const found = list.find(t => t.name.toLowerCase() === lower);
    if (found) {
      return {
        name: safeName,
        color1: existing?.color1 || found.color1,
        color2: existing?.color2 || found.color2,
        isFlag: existing?.isFlag !== undefined ? existing.isFlag : !!found.isFlag
      };
    }
  }

  return {
    name: safeName,
    color1: existing?.color1 || '#1e293b',
    color2: existing?.color2 || '#475569',
    isFlag: !!existing?.isFlag
  };
};

export const leaderBy = (teams: any[], pick: (t: any) => number, mode: 'max' | 'min' = 'max') => {
  if (!Array.isArray(teams) || !teams.length) return { name: '—', value: 0 };
  const best = teams.reduce((acc, t) =>
    mode === 'max' ? (pick(t) > pick(acc) ? t : acc) : (pick(t) < pick(acc) ? t : acc)
  , teams[0]);
  return { name: best?.name || '—', value: pick(best) || 0 };
};

// Construye el resumen (campeón + récords) de una división concreta
export const buildSeasonRecord = (teams: any[], currentSeason: number): ChampionRecord | null => {
  if (!Array.isArray(teams) || teams.length < 2) return null;
  const table = [...teams].sort(
    (a, b) => (b.pts || 0) - (a.pts || 0)
      || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0))
      || (b.gf || 0) - (a.gf || 0)
  );
  const [champ, second, third, fourth] = table;
  if (!champ) return null;
  return {
    season: currentSeason,
    type: 'league',
    champion: {
      id: champ.id ?? champ.name, 
      name: champ.name, 
      pts: champ.pts || 0,
      gf: champ.gf || 0, 
      ga: champ.ga || 0,
      w: champ.w || 0,
      d: champ.d || 0,
      l: champ.l || 0,
      gd: (champ.gf || 0) - (champ.ga || 0),
      played: (champ.w || 0) + (champ.d || 0) + (champ.l || 0) || (teams.length - 1) * 2,
      color1: champ.color1, 
      color2: champ.color2, 
      isFlag: champ.isFlag
    },
    runnerUp: second ? { 
      id: second.id ?? second.name, 
      name: second.name, 
      pts: second.pts || 0,
      gf: second.gf || 0,
      ga: second.ga || 0,
      w: second.w || 0,
      d: second.d || 0,
      l: second.l || 0,
      gd: (second.gf || 0) - (second.ga || 0),
      color1: second.color1,
      color2: second.color2,
      isFlag: second.isFlag
    } : null,
    thirdPlace: third ? {
      id: third.id ?? third.name,
      name: third.name,
      pts: third.pts || 0,
      gf: third.gf || 0,
      ga: third.ga || 0,
      w: third.w || 0,
      d: third.d || 0,
      l: third.l || 0,
      gd: (third.gf || 0) - (third.ga || 0),
      color1: third.color1,
      color2: third.color2,
      isFlag: third.isFlag
    } : null,
    fourthPlace: fourth ? {
      id: fourth.id ?? fourth.name,
      name: fourth.name,
      color1: fourth.color1,
      color2: fourth.color2,
      isFlag: fourth.isFlag
    } : null,
    records: {
      topScoring: leaderBy(teams, t => t.gf || 0, 'max'),
      bestDefense: leaderBy(teams, t => t.ga || 0, 'min'),
      bestGoalDiff: leaderBy(teams, t => (t.gf || 0) - (t.ga || 0), 'max'),
      mostWins: leaderBy(teams, t => t.w || 0, 'max')
    }
  };
};

// Construye el resumen de torneo para copas/mundiales (campeón + subcampeón + 3er puesto)
export const buildCupSeasonRecord = (comp: any, currentSeason: number, customWinner?: any): ChampionRecord | null => {
  if (!comp) return null;
  const final = Array.isArray(comp.bracket?.Final) ? comp.bracket?.Final[0] : (comp.bracket?.Final || null);
  const tp = Array.isArray(comp.bracket?.TercerPuesto) ? comp.bracket?.TercerPuesto[0] : (comp.bracket?.TercerPuesto || null);
  const t = comp.teams || [];
  let champ = customWinner || null;
  let second = null;
  let finalMatchInfo: any = null;

  if (final && final.sh !== null && final.sh !== undefined) {
    const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
    const loseId = winId === final.hId ? final.aId : final.hId;
    if (!champ) {
      champ = t.find((x: any) => x.id === winId);
    }
    second = t.find((x: any) => x.id === loseId);
    const homeTeam = t.find((x: any) => x.id === final.hId);
    const awayTeam = t.find((x: any) => x.id === final.aId);
    finalMatchInfo = {
      homeName: homeTeam?.name || 'Local',
      awayName: awayTeam?.name || 'Visitante',
      homeScore: final.sh,
      awayScore: final.sa,
      penH: final.penH ?? null,
      penA: final.penA ?? null
    };
  }
  if (!champ && t.length) {
    champ = t[0];
  }
  if (!champ) return null;

  let third = null;
  let fourth = null;
  let tpMatchInfo: any = null;
  if (tp && tp.sh !== null && tp.sh !== undefined) {
    const tpWinId = (tp.sh > tp.sa) ? tp.hId : (tp.sa > tp.sh) ? tp.aId : (((tp.penH || 0) > (tp.penA || 0)) ? tp.hId : tp.aId);
    const tpLoseId = tpWinId === tp.hId ? tp.aId : tp.hId;
    third = t.find((x: any) => x.id === tpWinId);
    fourth = t.find((x: any) => x.id === tpLoseId);
    const homeTeam = t.find((x: any) => x.id === tp.hId);
    const awayTeam = t.find((x: any) => x.id === tp.aId);
    tpMatchInfo = {
      homeName: homeTeam?.name || 'Local',
      awayName: awayTeam?.name || 'Visitante',
      homeScore: tp.sh,
      awayScore: tp.sa,
      penH: tp.penH ?? null,
      penA: tp.penA ?? null
    };
  }

  const topScoring = leaderBy(t, (x: any) => x.gf || 0, 'max');
  const bestDefense = leaderBy(t, (x: any) => x.ga || 0, 'min');
  const bestGoalDiff = leaderBy(t, (x: any) => (x.gf || 0) - (x.ga || 0), 'max');
  const mostWins = leaderBy(t, (x: any) => x.w || 0, 'max');

  return {
    season: currentSeason,
    type: 'cup',
    champion: {
      id: champ.id ?? champ.name, 
      name: champ.name, 
      pts: champ.pts || 0,
      gf: champ.gf || 0, 
      ga: champ.ga || 0,
      w: champ.w || 0,
      d: champ.d || 0,
      l: champ.l || 0,
      color1: champ.color1, 
      color2: champ.color2, 
      isFlag: champ.isFlag
    },
    runnerUp: second ? { 
      id: second.id ?? second.name, 
      name: second.name, 
      pts: second.pts || 0,
      gf: second.gf || 0,
      ga: second.ga || 0,
      w: second.w || 0,
      d: second.d || 0,
      l: second.l || 0,
      color1: second.color1,
      color2: second.color2,
      isFlag: second.isFlag
    } : null,
    thirdPlace: third ? { 
      id: third.id ?? third.name, 
      name: third.name,
      pts: third.pts || 0,
      gf: third.gf || 0,
      ga: third.ga || 0,
      color1: third.color1,
      color2: third.color2,
      isFlag: third.isFlag
    } : null,
    fourthPlace: fourth ? { 
      id: fourth.id ?? fourth.name, 
      name: fourth.name,
      color1: fourth.color1,
      color2: fourth.color2,
      isFlag: fourth.isFlag
    } : null,
    finalMatch: finalMatchInfo,
    thirdPlaceMatch: tpMatchInfo,
    records: {
      topScoring: topScoring.value > 0 ? topScoring : { name: champ.name, value: champ.gf || 14 },
      bestDefense: bestDefense.value > 0 ? bestDefense : { name: champ.name, value: champ.ga || 5 },
      bestGoalDiff: bestGoalDiff.name !== '—' ? bestGoalDiff : { name: champ.name, value: (champ.gf || 14) - (champ.ga || 5) },
      mostWins: mostWins.value > 0 ? mostWins : { name: champ.name, value: champ.w || 6 }
    }
  };
};

/**
 * Enriquece un registro histórico para garantizar que SIEMPRE tenga datos extras completos:
 * Récord de victorias, goles, mejor defensa, diferencial de gol, subcampeón y estadísticas.
 */
export const enrichChampionRecord = (r: any, compId?: string | null, div: number = 1): ChampionRecord => {
  const champName = r.champion?.name || r.winner?.name || 'Campeón';
  const champVis = resolveTeamVisuals(champName, r.champion || r.winner);
  const runnerVis = r.runnerUp ? resolveTeamVisuals(r.runnerUp.name, r.runnerUp) : null;
  const thirdVis = r.thirdPlace ? resolveTeamVisuals(r.thirdPlace.name, r.thirdPlace) : null;

  const isCup = r.type === 'cup' || compId === 'C1' || compId === 'C2' || compId === 'C3';

  // Extraer o generar datos base del campeón
  const pts = r.champion?.pts || r.winner?.pts || (isCup ? 0 : 38 + ((r.season || 1) * 3) % 15);
  const gf = r.champion?.gf || r.winner?.gf || (isCup ? 16 + (r.season || 1) % 6 : 46 + ((r.season || 1) * 5) % 20);
  const ga = r.champion?.ga || r.winner?.ga || (isCup ? 6 + (r.season || 1) % 4 : 18 + ((r.season || 1) * 3) % 12);
  const w = r.champion?.w || r.winner?.w || (isCup ? 6 + (r.season || 1) % 2 : 12 + ((r.season || 1) * 2) % 6);
  const d = r.champion?.d || r.winner?.d || (isCup ? 1 : 3 + (r.season || 1) % 3);
  const l = r.champion?.l || r.winner?.l || (isCup ? 0 : 1 + (r.season || 1) % 3);
  const gd = (r.champion?.gd !== undefined) ? r.champion.gd : (gf - ga);

  // Extraer o reconstruir récords (Datos Extras)
  let topScoring = r.records?.topScoring;
  if (!topScoring || topScoring.value <= 0 || topScoring.name === '—') {
    topScoring = { name: champVis.name, value: gf };
  }

  let bestDefense = r.records?.bestDefense;
  if (!bestDefense || bestDefense.value <= 0 || bestDefense.name === '—') {
    bestDefense = { name: champVis.name, value: ga };
  }

  let bestGoalDiff = r.records?.bestGoalDiff;
  if (!bestGoalDiff || bestGoalDiff.name === '—') {
    bestGoalDiff = { name: champVis.name, value: gd };
  }

  let mostWins = r.records?.mostWins;
  if (!mostWins || mostWins.value <= 0 || mostWins.name === '—') {
    mostWins = { name: champVis.name, value: w };
  }

  return {
    season: r.season || 1,
    compId: compId || r.compId,
    div: div || r.div || 1,
    type: isCup ? 'cup' : 'league',
    champion: {
      id: r.champion?.id || champVis.name,
      name: champVis.name,
      pts,
      gf,
      ga,
      w,
      d,
      l,
      gd,
      played: r.champion?.played || (w + d + l),
      color1: champVis.color1,
      color2: champVis.color2,
      isFlag: champVis.isFlag
    },
    runnerUp: r.runnerUp ? {
      id: r.runnerUp.id || runnerVis?.name || 'Subcampeón',
      name: runnerVis?.name || r.runnerUp.name,
      pts: r.runnerUp.pts || Math.max(0, pts - 3),
      gf: r.runnerUp.gf || Math.max(0, gf - 6),
      ga: r.runnerUp.ga || ga + 4,
      w: r.runnerUp.w || Math.max(0, w - 2),
      d: r.runnerUp.d || d + 1,
      l: r.runnerUp.l || l + 1,
      gd: r.runnerUp.gd !== undefined ? r.runnerUp.gd : (Math.max(0, gf - 6) - (ga + 4)),
      color1: runnerVis?.color1,
      color2: runnerVis?.color2,
      isFlag: runnerVis?.isFlag
    } : null,
    thirdPlace: r.thirdPlace ? {
      id: r.thirdPlace.id || thirdVis?.name || '3º Puesto',
      name: thirdVis?.name || r.thirdPlace.name,
      pts: r.thirdPlace.pts || Math.max(0, pts - 6),
      color1: thirdVis?.color1,
      color2: thirdVis?.color2,
      isFlag: thirdVis?.isFlag
    } : null,
    fourthPlace: r.fourthPlace || null,
    finalMatch: r.finalMatch || null,
    thirdPlaceMatch: r.thirdPlaceMatch || null,
    records: {
      topScoring,
      bestDefense,
      bestGoalDiff,
      mostWins
    }
  };
};

export const pushRecord = (record: ChampionRecord | null, history?: ChampionRecord[]) =>
  record ? [record, ...(history || [])].slice(0, 10) : (history || []);

// Registra el resumen de la temporada de AMBAS divisiones y devuelve la liga actualizada
export const registerSeasonSummary = (comp: any, currentSeason: number) => {
  if (!comp) return comp;
  const r1 = buildSeasonRecord(comp.teams, currentSeason);
  const r2 = buildSeasonRecord(comp.teams2, currentSeason);
  if (!r1 && !r2) return comp;
  return {
    ...comp,
    championsHistory: pushRecord(r1, comp.championsHistory),
    championsHistory2: pushRecord(r2, comp.championsHistory2)
  };
};

/**
 * Filtra y asegura que en el archivo/historial scroleable SÓLO exista 
 * la última edición registrada de cada campeonato y división:
 * - Cada liga con su 1ª y 2ª división (1 registro por división)
 * - Champions League (1 registro)
 * - UEFA Europa League (1 registro)
 * - Copa del Mundo (1 registro / solo un campeón)
 * Conforme avanza el tiempo, las nuevas ediciones actualizan y reemplazan a las antiguas.
 */
export const sanitizeArchive = (entries: any[]): any[] => {
  if (!Array.isArray(entries)) return [];
  const map = new Map<string, any>();

  entries.forEach(entry => {
    if (!entry || !entry.compId) return;
    const compId = String(entry.compId);
    const div = Number(entry.div) === 2 ? 2 : 1;
    const key = `${compId}_div${div}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, entry);
    } else {
      const existingSeason = Number(existing.season) || 0;
      const currentSeason = Number(entry.season) || 0;
      if (currentSeason > existingSeason) {
        map.set(key, entry);
      } else if (currentSeason === existingSeason) {
        if (entry.winner && !existing.winner) {
          map.set(key, entry);
        }
      }
    }
  });

  const priorityOrder: Record<string, number> = {
    'C1_div1': 1, // Champions League
    'C3_div1': 2, // Europa League
    'C2_div1': 3, // Copa del Mundo
  };

  return Array.from(map.values()).sort((a, b) => {
    const keyA = `${a.compId}_div${Number(a.div) === 2 ? 2 : 1}`;
    const keyB = `${b.compId}_div${Number(b.div) === 2 ? 2 : 1}`;
    
    const pA = priorityOrder[keyA] ?? 99;
    const pB = priorityOrder[keyB] ?? 99;
    if (pA !== pB) return pA - pB;

    const sA = Number(a.season) || 0;
    const sB = Number(b.season) || 0;
    if (sB !== sA) return sB - sA;
    return (a.name || '').localeCompare(b.name || '');
  });
};

