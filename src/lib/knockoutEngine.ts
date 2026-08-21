// Knockout tournaments engine (Champions League, Europa League, World Cup)
import { PRESETS, PRESETS_2 } from '@/lib/presets';
import { getAuthenticTeamStats } from '@/lib/teamStats';
import { extractChampionsRepescados } from '@/lib/championsSanitizer';
import { buildDynamicWCPool } from '@/lib/worldCup';
import { isLeagueFinished, buildStandingsSnapshot } from '@/lib/leagueEngine';

// Genera los 24 clubes y el cuadro de eliminatoria directa para la UEFA Europa League
// Formato de eliminatoria directa:
// - 16 equipos de ligas (5.º, 6.º, 7.º, 8.º de España, Italia, Inglaterra, Alemania)
// - 8 Repescados de la UEFA Champions League (3.er lugar de cada uno de los 8 grupos de Champions).
// - Dieciseisavos: 8 cruces a Ida y Vuelta entre 5.ºs y 6.ºs de ligas distintas (sin cruce nacional en 1/16).
// - Octavos: Los 8 ganadores de Dieciseisavos se enfrentan a los 8 Repescados de la Champions League.
// - Cuartos, Semifinales y Gran Final.
export const buildUELKnockout = (compsState: any, forceNames: string[] = []) => {
  const leagueConfigs = [
    { id: 'L1', country: 'España', code: 'ES' },
    { id: 'L3', country: 'Inglaterra', code: 'EN' },
    { id: 'L2', country: 'Italia', code: 'IT' },
    { id: 'L4', country: 'Alemania', code: 'DE' },
    { id: 'L6', country: 'Francia', code: 'FR' },
    { id: 'L5', country: 'Países Bajos', code: 'NL' },
    { id: 'L7', country: 'Miscelánea A', code: 'MI' },
    { id: 'L8', country: 'Miscelánea B', code: 'MB' }
  ];

  const leagueTeamsByRank: Record<string, Record<number, any>> = {};

  leagueConfigs.forEach(cfg => {
    const comp = compsState?.[cfg.id];
    let sourceTeams: any[] = [];
    
    // Prioridad 1: Si la liga ha terminado en la temporada actual, usar la tabla final real
    if (isLeagueFinished(comp)) {
      sourceTeams = [...comp.teams].sort((a: any, b: any) => 
        (b.pts || 0) - (a.pts || 0) || 
        ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) ||
        (b.gf || 0) - (a.gf || 0)
      );
    } else if (Array.isArray(comp?.previousStandings) && comp.previousStandings.length >= 6) {
      // Prioridad 2: Si la nueva temporada está en juego, usar la clasificación oficial de la última temporada finalizada
      sourceTeams = [...comp.previousStandings];
    } else if (Array.isArray(comp?.teams) && comp.teams.length >= 6) {
      // Prioridad 3: Temporada 1 inicial sin historial previo, ordenar canónicamente por plantilla
      sourceTeams = [...comp.teams].sort((a: any, b: any) => {
        const authA = getAuthenticTeamStats(a);
        const authB = getAuthenticTeamStats(b);
        const pA = (authA.att || 1) + (authA.opp || 1) + (authA.def || 1);
        const pB = (authB.att || 1) + (authB.opp || 1) + (authB.def || 1);
        return pB - pA;
      });
    } else {
      sourceTeams = (PRESETS[cfg.code] || []).map((t, i) => ({ ...t, id: i + 1 }));
    }

    // Asegurar un pool completo de al menos 7 equipos con presets si fuese necesario
    if (sourceTeams.length < 7) {
      const presetPool = (PRESETS[cfg.code] || []).filter(t => !sourceTeams.some(x => x.name === t.name));
      sourceTeams = [...sourceTeams, ...presetPool];
    }

    // Extracción estricta y determinista de plazas europeas de liga:
    // Puestos 1, 2, 3, 4 (índices 0..3) van a Champions League (C1)
    // Puestos 5 y 6 (índices 4 y 5) van a UEFA Europa League (C3)
    // Puesto 7 (índice 6) sirve como reserva provisional para Octavos de UEL
    let t5 = sourceTeams[4] || sourceTeams[0];
    let t6 = sourceTeams[5] || sourceTeams[1];
    let t7 = sourceTeams[6] || sourceTeams[2];

    // Si el usuario en Modo Carrera clasificó a UEL en esta liga, asegurar su presencia en la 5.ª plaza
    (forceNames || []).forEach((fn: string) => {
      if (!fn) return;
      const foundInComp = sourceTeams.find((t: any) => t.name === fn) || (comp?.teams || []).find((t: any) => t.name === fn);
      if (foundInComp) {
        if (t5?.name !== fn && t6?.name !== fn) {
          t5 = foundInComp;
        }
      }
    });

    const wrapTeam = (raw: any, rank: number) => {
      const auth = getAuthenticTeamStats(raw);
      return {
        ...raw,
        att: auth.att,
        opp: auth.opp,
        def: auth.def,
        color1: auth.color1 || raw.color1,
        color2: auth.color2 || raw.color2,
        isFlag: raw.isFlag ?? false,
        league: cfg.code,
        leagueRank: rank,
        originCountry: cfg.country,
        clOrigin: `${cfg.country} (${rank}.º puesto)`
      };
    };

    leagueTeamsByRank[cfg.code] = {
      5: wrapTeam(t5, 5),
      6: wrapTeam(t6, 6),
      7: wrapTeam(t7, 7)
    };
  });

  // Los 16 equipos de liga (IDs 1 al 16): 5.º y 6.º de cada una de las 8 ligas europeas
  const leagueTeams: any[] = [
    { ...leagueTeamsByRank['ES'][5], id: 1 },
    { ...leagueTeamsByRank['ES'][6], id: 2 },
    { ...leagueTeamsByRank['EN'][5], id: 3 },
    { ...leagueTeamsByRank['EN'][6], id: 4 },
    { ...leagueTeamsByRank['IT'][5], id: 5 },
    { ...leagueTeamsByRank['IT'][6], id: 6 },
    { ...leagueTeamsByRank['DE'][5], id: 7 },
    { ...leagueTeamsByRank['DE'][6], id: 8 },
    { ...leagueTeamsByRank['FR'][5], id: 9 },
    { ...leagueTeamsByRank['FR'][6], id: 10 },
    { ...leagueTeamsByRank['NL'][5], id: 11 },
    { ...leagueTeamsByRank['NL'][6], id: 12 },
    { ...leagueTeamsByRank['MI'][5], id: 13 },
    { ...leagueTeamsByRank['MI'][6], id: 14 },
    { ...leagueTeamsByRank['MB'][5], id: 15 },
    { ...leagueTeamsByRank['MB'][6], id: 16 }
  ];

  // 8 Repescados de Champions League (3.º de cada grupo de Champions)
  const c1 = compsState?.['C1'];
  const repescados: any[] = [];
  const addedRepescaNames = new Set<string>();
  const extracted = extractChampionsRepescados(c1);

  extracted.forEach(t => {
    if (t && t.name && !addedRepescaNames.has(t.name)) {
      addedRepescaNames.add(t.name);
      repescados.push({ ...t, id: 17 + repescados.length });
    }
  });

  // Si Champions League aún no ha finalizado sus grupos, sembramos provisionalmente
  // con los 7.ºs puestos reales de las 8 ligas europeas (clubes 100% auténticos de la base de datos).
  const provisionalCodes = ['ES', 'EN', 'IT', 'DE', 'FR', 'NL', 'MI', 'MB'];
  let provIdx = 0;
  while (repescados.length < 8 && provIdx < provisionalCodes.length) {
    const code = provisionalCodes[provIdx];
    const cand = leagueTeamsByRank[code]?.[7] || (PRESETS[code] || [])[6] || (PRESETS[code] || [])[0];
    if (cand && cand.name && !addedRepescaNames.has(cand.name)) {
      addedRepescaNames.add(cand.name);
      const groupLetter = String.fromCharCode(65 + repescados.length);
      repescados.push({
        ...cand,
        id: 17 + repescados.length,
        isRepesca: true,
        clOrigin: `Champions League (3.º Grupo ${groupLetter})`
      });
    }
    provIdx++;
  }

  // Si hay equipos forzados (e.g. repescado del usuario tras quedar 3.º en Champions):
  (forceNames || []).forEach((name: string) => {
    if (!name) return;
    const existingIndex = repescados.findIndex(r => r.name === name);
    if (existingIndex === -1) {
      let found: any = null;
      Object.keys(compsState || {}).forEach(k => {
        const comp = compsState[k];
        if (!found && comp && Array.isArray(comp.teams)) {
          const t = comp.teams.find((x: any) => x.name === name);
          if (t) found = t;
        }
      });
      if (found) {
        repescados[0] = {
          ...found,
          id: 17,
          isRepesca: true,
          clOrigin: 'Champions League (3.º Repesca)'
        };
      }
    }
  });

  const allTeams = [...leagueTeams, ...repescados].map(t => ({
    ...t,
    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
  }));

  // Dieciseisavos: Cruces 5.º vs 6.º entre ligas europeas diferentes (garantía anti-cruce nacional en 1/16)
  const dieciseisavosMatches = [
    { id: 'D1', hId: 1,  aId: 4,  label: '5.º España vs 6.º Inglaterra', sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D2', hId: 3,  aId: 2,  label: '5.º Inglaterra vs 6.º España', sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D3', hId: 5,  aId: 8,  label: '5.º Italia vs 6.º Alemania',    sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D4', hId: 7,  aId: 6,  label: '5.º Alemania vs 6.º Italia',    sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D5', hId: 9,  aId: 12, label: '5.º Francia vs 6.º Países Bajos', sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D6', hId: 11, aId: 10, label: '5.º Países Bajos vs 6.º Francia', sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D7', hId: 13, aId: 16, label: '5.º Miscelánea A vs 6.º Miscelánea B', sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null },
    { id: 'D8', hId: 15, aId: 14, label: '5.º Miscelánea B vs 6.º Miscelánea A', sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null }
  ];

  // Octavos: Los 8 ganadores de Dieciseisavos se enfrentan a los 8 Repescados de Champions League
  const octavosMatches = Array(8).fill(null).map((_, i) => ({
    id: 'O' + (i + 1),
    hId: null,
    aId: 17 + i,
    sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null
  }));

  const cuartosMatches = Array(4).fill(null).map((_, i) => ({
    id: 'C' + (i + 1),
    hId: null, aId: null,
    sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null
  }));

  const semisMatches = Array(2).fill(null).map((_, i) => ({
    id: 'S' + (i + 1),
    hId: null, aId: null,
    sh: null, sa: null, sh2: null, sa2: null, penH: null, penA: null
  }));

  const finalMatch = [{
    id: 'F1',
    hId: null, aId: null,
    sh: null, sa: null, penH: null, penA: null
  }];

  const bracket = {
    Dieciseisavos: dieciseisavosMatches,
    Octavos: octavosMatches,
    Cuartos: cuartosMatches,
    Semis: semisMatches,
    Final: finalMatch
  };

  return {
    teams: allTeams,
    bracket,
    phase: 'Dieciseisavos',
    matchday: 0,
    history: [],
    showWinner: false,
    userTeamId: 1
  };
};

export const buildCLPool = (compsState: any, forceNames: string[] = []) => {
  const leagueConfigs = [
    { id: 'L1', country: 'España', code: 'ES' },
    { id: 'L3', country: 'Inglaterra', code: 'EN' },
    { id: 'L2', country: 'Italia', code: 'IT' },
    { id: 'L4', country: 'Alemania', code: 'DE' },
    { id: 'L6', country: 'Francia', code: 'FR' },
    { id: 'L5', country: 'Países Bajos', code: 'NL' },
    { id: 'L7', country: 'Miscelánea A', code: 'MI' },
    { id: 'L8', country: 'Miscelánea B', code: 'MB' }
  ];

  const getSource = (compKey: string) => {
    const comp = compsState?.[compKey];
    if (!comp || !Array.isArray(comp.teams) || comp.teams.length === 0) return null;
    if (isLeagueFinished(comp)) {
      return { origin: 'real', table: buildStandingsSnapshot(comp.teams), teams: comp.teams };
    }
    if (Array.isArray(comp.previousStandings) && comp.previousStandings.length > 0) {
      return { origin: 'previous', table: comp.previousStandings, teams: comp.teams };
    }
    const sim = [...comp.teams].sort((a, b) => {
      const authA = getAuthenticTeamStats(a);
      const authB = getAuthenticTeamStats(b);
      const pA = (authA.att || 1) + (authA.opp || 1) + (authA.def || 1);
      const pB = (authB.att || 1) + (authB.opp || 1) + (authB.def || 1);
      return pB - pA;
    });
    return { origin: 'sim', table: buildStandingsSnapshot(sim.map((t, i) => ({ ...t, pts: 1000 - i }))), teams: comp.teams };
  };

  const pool: any[] = [];
  const seen = new Set<string>();

  leagueConfigs.forEach(cfg => {
    const src = getSource(cfg.id);
    if (!src) return;
    const resolve = (row: any, rank: number) => {
      const live = src.teams.find((t: any) => t.id === row.id) || src.teams.find((t: any) => t.name === row.name);
      const base = live || row;
      const auth = getAuthenticTeamStats(base);
      return {
        ...base,
        att: auth.att,
        opp: auth.opp,
        def: auth.def,
        color1: auth.color1 || base.color1,
        color2: auth.color2 || base.color2,
        isFlag: base.isFlag ?? false,
        league: cfg.code,
        originCountry: cfg.country,
        clOrigin: `${cfg.country} (${rank}.º puesto)`,
        clProvisional: src.origin === 'sim'
      };
    };

    let leagueQualified = src.table.map((row: any, idx: number) => resolve(row, idx + 1)).slice(0, 4);

    (forceNames || []).forEach((forcedName: string) => {
      if (!forcedName) return;
      const foundInLeague = (src.teams || []).find((t: any) => t.name === forcedName);
      if (foundInLeague && !leagueQualified.some((t: any) => t.name === forcedName)) {
        const forcedWrapped = resolve(foundInLeague, 4);
        if (leagueQualified.length >= 4) {
          leagueQualified[3] = forcedWrapped;
        } else {
          leagueQualified.push(forcedWrapped);
        }
      }
    });

    leagueQualified.forEach((t: any) => {
      if (t && t.name && !seen.has(t.name)) {
        seen.add(t.name);
        pool.push(t);
      }
    });
  });

  return pool.slice(0, 32);
};

export const drawKnockoutGroups = (pool: any[], isWC?: boolean, randomize: boolean = true) => {
  const leagueCodeMap: Record<string, string> = { L1: 'ES', L2: 'IT', L3: 'EN', L4: 'DE', L5: 'NL', L6: 'FR', L7: 'MI', L8: 'MB' };
  
  const normalizedPool = pool.map((t) => ({
    ...t,
    league: t.league || leagueCodeMap[t.compId] || 'EU',
    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
  }));

  const sortedPool = [...normalizedPool].sort((a, b) => {
    const powerA = (a.att || 1) + (a.opp || 1) + (a.def || 1);
    const powerB = (b.att || 1) + (b.opp || 1) + (b.def || 1);
    if (powerB !== powerA) return powerB - powerA;
    return (b.pts || 0) - (a.pts || 0);
  });

  const basePots = [
    sortedPool.slice(0, 8),
    sortedPool.slice(8, 16),
    sortedPool.slice(16, 24),
    sortedPool.slice(24, 32)
  ];

  let finalGroups: any[][] | null = null;

  if (isWC) {
    for (let attempt = 0; attempt < 250; attempt++) {
      const pots = basePots.map(pot => [...pot].sort(() => Math.random() - 0.5));
      const groups: any[][] = Array.from({ length: 8 }, () => []);
      let steps = 0;
      const solveWC = (potIdx: number, teamIdx: number): boolean => {
        if (++steps > 3500) return false;
        if (potIdx === 4) return true;
        if (teamIdx === 8) return solveWC(potIdx + 1, 0);
        const team = pots[potIdx][teamIdx];
        const validGroupIndices = [0, 1, 2, 3, 4, 5, 6, 7]
          .filter(gIdx => groups[gIdx].length === potIdx)
          .filter(gIdx => {
            const regCount = groups[gIdx].filter(t => t.region === team.region).length;
            if (team.region === 'EU' && regCount >= 2) return false;
            if (team.region !== 'EU' && regCount >= 1) return false;
            return true;          })
          .sort(() => Math.random() - 0.5);
        for (const gIdx of validGroupIndices) {
          groups[gIdx].push(team);
          if (solveWC(potIdx, teamIdx + 1)) return true;
          groups[gIdx].pop();
        }
        return false;
      };
      if (solveWC(0, 0)) {
        finalGroups = groups;
        break;
      }
    }
  } else {
    for (let attempt = 0; attempt < 250; attempt++) {
      const pots = basePots.map(pot => [...pot].sort(() => Math.random() - 0.5));
      const groups: any[][] = Array.from({ length: 8 }, () => []);
      let steps = 0;
      const solveCL = (potIdx: number, teamIdx: number): boolean => {
        if (++steps > 3500) return false;
        if (potIdx === 4) return true;
        if (teamIdx === 8) return solveCL(potIdx + 1, 0);
        const team = pots[potIdx][teamIdx];
        const validGroupIndices = [0, 1, 2, 3, 4, 5, 6, 7]
          .filter(gIdx => groups[gIdx].length === potIdx)
          .filter(gIdx => !groups[gIdx].some(existing => existing.league && team.league && existing.league === team.league))
          .sort(() => Math.random() - 0.5);
        for (const gIdx of validGroupIndices) {
          groups[gIdx].push(team);
          if (solveCL(potIdx, teamIdx + 1)) return true;
          groups[gIdx].pop();
        }
        return false;
      };
      if (solveCL(0, 0)) {
        finalGroups = groups;
        break;
      }
    }
  }

  if (!finalGroups) {
    finalGroups = Array.from({ length: 8 }, (_, i) => [
      basePots[0][i],
      basePots[1][i],
      basePots[2][i],
      basePots[3][i]
    ].filter(Boolean));
  }

  finalGroups = finalGroups.map(group =>
    [...group].sort((a, b) => {
      const pA = (a.att || 1) + (a.opp || 1) + (a.def || 1);
      const pB = (b.att || 1) + (b.opp || 1) + (b.def || 1);
      return pB - pA;
    })
  );

  const allTeams = finalGroups.flat();
  const reindexedTeams = allTeams.map((t, idx) => ({ ...t, id: idx + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  let cursor = 0;
  const formattedGroups = finalGroups.map((g, i) => {
    const groupTeamIds: number[] = [];
    for (let k = 0; k < g.length; k++) {
      groupTeamIds.push(reindexedTeams[cursor].id);
      cursor++;
    }
    return {
      name: 'Grupo ' + String.fromCharCode(65 + i),
      teamIds: groupTeamIds
    };
  });

  return {
    teams: reindexedTeams,
    groups: formattedGroups,
    matchday: 0,
    history: [],
    phase: 'groups',
    showWinner: false,
    disqualified: false,
    userTeamId: reindexedTeams[0]?.id || 1,
    bracket: null,
    participantsFrozen: true,
    participantsLockedAt: Date.now(),
    participantsSources: reindexedTeams.map(t => ({
      name: t.name,
      origin: t.clOrigin || 'preset',
      provisional: !!t.clProvisional
    }))
  };
};

export const getAutoFillData = (compId: string, compsState: any, forceNames: string[] = []) => {
  const isWC = compId === 'C2';
  const isUEL = compId === 'C3';
  if (isUEL) {
    return buildUELKnockout(compsState, forceNames);
  }
  let pool = isWC ? buildDynamicWCPool({ randomize: true }) : buildCLPool(compsState, forceNames);
  pool = pool.map((t, i) => ({ ...t, id: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  return drawKnockoutGroups(pool, isWC, true);
};

// Genera el estado inicial completo de todas las ligas y torneos europeos
export const getDefaultComps = () => {
  const baseTeam = (preset: string, isDiv2 = false) => {
    const list = isDiv2 ? PRESETS_2[preset] : PRESETS[preset];
    if (!list) return [];
    const offset = isDiv2 ? 100 : 0;
    return list.map((t, i) => ({ ...t, id: i + 1 + offset, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  };
  const getLeagueData = (name: string, code: string) => {
    const t2 = baseTeam(code, true);
    return {
      type: 'league', name, 
      teams: baseTeam(code), matchday: 0, history: [], showWinner: false, 
      teams2: t2, matchday2: 0, history2: [], showWinner2: false,
      userTeamId: 1, userTeamId2: t2[0]?.id || 21, disqualified: false,
      promotionsLogs: null,
      previousStandings: null, previousStandings2: null
    };
  };

  const leagues: any = {
    'L1': getLeagueData('Liga Española', 'ES'),
    'L2': getLeagueData('Liga Italiana', 'IT'),
    'L3': getLeagueData('Liga Inglesa', 'EN'),
    'L4': getLeagueData('Liga Alemana', 'DE'),
    'L5': getLeagueData('Liga Holandesa', 'NL'),
    'L6': getLeagueData('Liga Francesa', 'FR'),
    'L7': getLeagueData('Miscelánea', 'MI'),
    'L8': getLeagueData('Miscelánea B', 'MB')
  };

  const c1Data = getAutoFillData('C1', leagues);
  const c3Data = buildUELKnockout(leagues);

  return {
    ...leagues,
    'C1': { id: 'C1', type: 'cup', name: 'Champions League', ...c1Data, disqualified: false },
    'C2': { id: 'C2', type: 'cup', name: 'Copa del Mundo', teams: [], matchday: 0, history: [], userTeamId: 1, showWinner: false, phase: 'groups', bracket: null, disqualified: false },
    'C3': { id: 'C3', type: 'cup', name: 'UEFA Europa League', ...c3Data, disqualified: false }
  };
};

export const getShuffleData = (compId: string, compsState: any) => {
  const isWC = compId === 'C2';
  const isUEL = compId === 'C3';
  if (isUEL) {
    const base = buildUELKnockout(compsState);
    const seeded5 = [1, 3, 5, 7, 9, 11, 13, 15];
    const unseeded6 = [2, 4, 6, 8, 10, 12, 14, 16];
    let shuffled6 = [...unseeded6].sort(() => Math.random() - 0.5);
    for (let attempts = 0; attempts < 100; attempts++) {
      const hasClash = seeded5.some((sId, idx) => shuffled6[idx] === sId + 1);
      if (!hasClash) break;
      shuffled6 = [...unseeded6].sort(() => Math.random() - 0.5);
    }
    const shuffledD = seeded5.map((hId, idx) => {
      const aId = shuffled6[idx];
      const hTeam = base.teams.find((t: any) => t.id === hId);
      const aTeam = base.teams.find((t: any) => t.id === aId);
      return {
        id: 'D' + (idx + 1),
        hId,
        aId,
        label: `${hTeam?.name || 'Local'} vs ${aTeam?.name || 'Visitante'}`,
        sh: null,
        sa: null,
        sh2: null,
        sa2: null,
        penH: null,
        penA: null
      };
    });
    const repIds = [17, 18, 19, 20, 21, 22, 23, 24].sort(() => Math.random() - 0.5);
    const shuffledO = Array(8).fill(null).map((_, i) => ({
      id: 'O' + (i + 1),
      hId: null,
      aId: repIds[i],
      sh: null,
      sa: null,
      sh2: null,
      sa2: null,
      penH: null,
      penA: null
    }));
    return {
      ...base,
      bracket: {
        ...base.bracket,
        Dieciseisavos: shuffledD,
        Octavos: shuffledO
      }
    };
  }
  let pool = isWC ? buildDynamicWCPool({ randomize: true }) : buildCLPool(compsState);
  pool = pool.map((t, i) => ({ ...t, id: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  return drawKnockoutGroups(pool, isWC, true);
};

export const generateKnockoutBrackets = (comp: any) => {
  if (!comp || !Array.isArray(comp.groups) || !Array.isArray(comp.teams)) return null;
  const groupResults = comp.groups.map((g: any) => {
    const teams = comp.teams.filter((t: any) => g.teamIds && g.teamIds.includes(t.id)).sort((a: any, b: any) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return { first: teams[0], second: teams[1] };
  });
  const numGroups = groupResults.length;
  const isWC = comp.id === 'C2' || numGroups === 8 || (comp.name || '').includes('Mundial') || (comp.name || '').includes('World');
  const bracket: any = {
    Octavos: [],
    Cuartos: [],
    Semis: [],
    TercerPuesto: isWC ? [{ id: 'TP1', hId: null, aId: null, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null }] : null,
    Final: [{ id: 'F1', hId: null, aId: null, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null }]
  };
  if (numGroups === 8) {
    for (let i = 0; i < 8; i += 2) {
      if (groupResults[i] && groupResults[i+1]) {
        bracket.Octavos.push({ id: 'O'+(i+1), hId: groupResults[i].first?.id, aId: groupResults[i+1].second?.id, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null });
        bracket.Octavos.push({ id: 'O'+(i+2), hId: groupResults[i+1].first?.id, aId: groupResults[i].second?.id, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null });
      }
    }
    bracket.Cuartos = Array(4).fill(null).map((_, i) => ({ id: 'Q'+(i+1), hId: null, aId: null, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null }));
    bracket.Semis = Array(2).fill(null).map((_, i) => ({ id: 'S'+(i+1), hId: null, aId: null, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null }));
  } else if (numGroups === 4) {
    for (let i = 0; i < 4; i += 2) {
      if (groupResults[i] && groupResults[i+1]) {
        bracket.Cuartos.push({ id: 'Q'+(i+1), hId: groupResults[i].first?.id, aId: groupResults[i+1].second?.id, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null });
        bracket.Cuartos.push({ id: 'Q'+(i+2), hId: groupResults[i+1].first?.id, aId: groupResults[i].second?.id, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null });
      }
    }
    bracket.Semis = Array(2).fill(null).map((_, i) => ({ id: 'S'+(i+1), hId: null, aId: null, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null }));
    bracket.Octavos = null;
  }
  return bracket;
};
