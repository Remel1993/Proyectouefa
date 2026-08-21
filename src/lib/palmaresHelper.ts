// Palmares and season summary history helper
export interface ChampionRecord {
  season: number;
  champion: {
    id: any; 
    name: string; 
    pts: number; 
    gf: number; 
    ga: number;
    color1?: string; 
    color2?: string; 
    isFlag?: boolean;
  };
  runnerUp: { id: any; name: string; pts: number } | null;
  thirdPlace?: { id: any; name: string } | null;
  fourthPlace?: { id: any; name: string } | null;
  records: {
    topScoring: { name: string; value: number };
    bestDefense: { name: string; value: number };
    bestGoalDiff: { name: string; value: number };
    mostWins: { name: string; value: number };
  };
}

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
  const [champ, second] = table;
  if (!champ) return null;
  return {
    season: currentSeason,
    champion: {
      id: champ.id, 
      name: champ.name, 
      pts: champ.pts || 0,
      gf: champ.gf || 0, 
      ga: champ.ga || 0,
      color1: champ.color1, 
      color2: champ.color2, 
      isFlag: champ.isFlag
    },
    runnerUp: second ? { id: second.id, name: second.name, pts: second.pts || 0 } : null,
    records: {
      topScoring: leaderBy(teams, t => t.gf || 0, 'max'),
      bestDefense: leaderBy(teams, t => t.ga || 0, 'min'),
      bestGoalDiff: leaderBy(teams, t => (t.gf || 0) - (t.ga || 0), 'max'),
      mostWins: leaderBy(teams, t => t.w || 0, 'max')
    }
  };
};

// Construye el resumen de torneo para copas/mundiales (campeón + subcampeón + 3er puesto)
export const buildCupSeasonRecord = (comp: any, currentSeason: number): ChampionRecord | null => {
  if (!comp) return null;
  const final = comp.bracket?.Final?.[0] || comp.bracket?.Final;
  const tp = comp.bracket?.TercerPuesto?.[0] || comp.bracket?.TercerPuesto;
  const t = comp.teams || [];
  let champ = null;
  let second = null;
  if (final && final.sh !== null && final.sh !== undefined) {
    const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
    const loseId = winId === final.hId ? final.aId : final.hId;
    champ = t.find((x: any) => x.id === winId);
    second = t.find((x: any) => x.id === loseId);
  }
  if (!champ) return null;
  let third = null;
  let fourth = null;
  if (tp && tp.sh !== null && tp.sh !== undefined) {
    const tpWinId = (tp.sh > tp.sa) ? tp.hId : (tp.sa > tp.sh) ? tp.aId : (((tp.penH || 0) > (tp.penA || 0)) ? tp.hId : tp.aId);
    const tpLoseId = tpWinId === tp.hId ? tp.aId : tp.hId;
    third = t.find((x: any) => x.id === tpWinId);
    fourth = t.find((x: any) => x.id === tpLoseId);
  }
  return {
    season: currentSeason,
    champion: {
      id: champ.id, 
      name: champ.name, 
      pts: champ.pts || 0,
      gf: champ.gf || 0, 
      ga: champ.ga || 0,
      color1: champ.color1, 
      color2: champ.color2, 
      isFlag: champ.isFlag
    },
    runnerUp: second ? { id: second.id, name: second.name, pts: second.pts || 0 } : null,
    thirdPlace: third ? { id: third.id, name: third.name } : null,
    fourthPlace: fourth ? { id: fourth.id, name: fourth.name } : null,
    records: {
      topScoring: leaderBy(t, (x: any) => x.gf || 0, 'max'),
      bestDefense: leaderBy(t, (x: any) => x.ga || 0, 'min'),
      bestGoalDiff: leaderBy(t, (x: any) => (x.gf || 0) - (x.ga || 0), 'max'),
      mostWins: leaderBy(t, (x: any) => x.w || 0, 'max')
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
