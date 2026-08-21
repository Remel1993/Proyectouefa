// League engine constants and calculation helpers
import { getAuthenticTeamStats } from '@/lib/teamStats';

export const APP_ID = 'dice-football-hub-elite-v8';
export const LEAGUE_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
export const SEASON_KEY = `${APP_ID}_season`;
export const DEFAULT_SEASON_STATE = { 
  season: 1, 
  currentWeek: 1, 
  globalMatchday: 1, 
  phase: 'leagues' as 'leagues' | 'champions' 
};

// Snapshot independiente de una tabla final (posición, equipo, PJ, PG, PE, PP, GF, GC, DG, Pts)
export const buildStandingsSnapshot = (teams: any[]) => {
  if (!Array.isArray(teams) || teams.length === 0) return null;
  return [...teams]
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
    .map((t, i) => ({
      pos: i + 1,
      id: t.id, 
      name: t.name, 
      color1: t.color1, 
      color2: t.color2, 
      isFlag: t.isFlag, 
      league: t.league,
      att: t.att, 
      opp: t.opp, 
      def: t.def,
      p: t.p, 
      w: t.w, 
      d: t.d, 
      l: t.l, 
      gf: t.gf, 
      ga: t.ga, 
      dg: t.gf - t.ga, 
      pts: t.pts
    }));
};

export const isLeagueFinished = (comp: any) => {
  if (!comp || !Array.isArray(comp.teams) || comp.teams.length < 2) return false;
  const totalRounds = (comp.teams.length - 1) * 2;
  return comp.showWinner === true || (comp.matchday || 0) >= totalRounds;
};

// Jornadas totales de una división según su número de equipos (ida y vuelta)
export const divTotalRounds = (teams: any[]) =>
  Array.isArray(teams) && teams.length >= 2 && teams.length % 2 === 0 ? (teams.length - 1) * 2 : 0;

// Jornadas totales de la liga (la división más larga define su calendario)
export const leagueTotalRounds = (comp: any) => Math.max(divTotalRounds(comp?.teams), divTotalRounds(comp?.teams2));

// ¿Esta división debe todavía resolver partidos para llegar a la jornada global?
export const divPendingAt = (teams: any[], matchday: number, globalMatchday: number) => {
  const total = divTotalRounds(teams);
  if (!total) return false;
  const md = matchday || 0;
  return md < total && md < globalMatchday;
};

export const leaguePendingAt = (comp: any, globalMatchday: number) =>
  !!comp && comp.type === 'league' &&
  (divPendingAt(comp.teams, comp.matchday, globalMatchday) || 
   divPendingAt(comp.teams2, comp.matchday2, globalMatchday));

// La liga ya completó su propio calendario (🏁 Temporada finalizada)
export const leagueSeasonOver = (comp: any) => {
  if (!comp || comp.type !== 'league') return true;
  const r1 = divTotalRounds(comp.teams);
  const r2 = divTotalRounds(comp.teams2);
  if (!r1 && !r2) return true;
  return (comp.matchday || 0) >= r1 && (comp.matchday2 || 0) >= r2;
};

// Progreso mostrable de una liga dentro de la temporada global
export const leagueProgressLabel = (comp: any, globalMatchday: number) => {
  const total = leagueTotalRounds(comp);
  if (!total) return 'No Inicializada';
  if (leagueSeasonOver(comp)) return '🏁 Temporada finalizada';
  return `Jornada ${Math.min(globalMatchday, total)}/${total}`;
};

// Ascensos / descensos limpios:
// Los equipos ascienden y descienden manteniendo exactamente sus estadísticas reales a nivel europeo de la app
export const computeLeagueNewSeason = (comp: any) => {
  if (!comp || comp.type !== 'league') return null;
  const sorted1 = [...(comp.teams || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  const sorted2 = [...(comp.teams2 || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  
  const resetStats = (t: any) => {
    const authentic = getAuthenticTeamStats(t);
    return {
      ...t,
      att: authentic.att,
      opp: authentic.opp,
      def: authentic.def,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0
    };
  };

  if (sorted1.length < 4 || sorted2.length < 4) {
    return { teams: sorted1.map(resetStats), teams2: sorted2.map(resetStats) };
  }

  const bottom3 = sorted1.slice(-3); // Descienden a 2ª División (puestos 18, 19, 20)
  const top3 = sorted2.slice(0, 3);   // Ascienden a 1ª División (puestos 1, 2, 3)
  const remaining1 = sorted1.slice(0, -3);
  const remaining2 = sorted2.slice(3);

  // Los 3 que ascienden pasan a 1ª División con sus estadísticas reales europeas de club
  // Los 3 que descienden pasan a 2ª División con sus estadísticas reales europeas de club
  return {
    teams: [...remaining1, ...top3].map(resetStats),
    teams2: [...remaining2, ...bottom3].map(resetStats)
  };
};

export const generateLeagueSchedule = (teams: any[], twoLegged = true) => {
  if (!Array.isArray(teams)) return [];
  const n = teams.length;
  if (n % 2 !== 0) return [];
  const teamIds = teams.map(t => t.id);
  const rounds: any[][] = [];
  const totalRounds = twoLegged ? (n - 1) * 2 : (n - 1);
  for (let j = 0; j < totalRounds; j++) {
    const round: any[] = [];
    const isReturn = j >= (n - 1);
    const r = isReturn ? j - (n - 1) : j;
    for (let i = 0; i < n / 2; i++) {
      const home = i === 0 ? teamIds[n - 1] : teamIds[(r + i) % (n - 1)];
      const away = teamIds[(n - 1 - i + r) % (n - 1)];
      if (isReturn) round.push({ homeId: away, awayId: home });
      else round.push({ homeId: home, awayId: away });
    }
    rounds.push(round);
  }
  return rounds;
};
