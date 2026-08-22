/**
 * Utilidades para sanitización y cálculo de llaves de Champions League (formato clásico: ida y vuelta en Octavos/Cuartos/Semis, partido único en Final).
 */

import { simMatchGoals } from './career';
import { PRESETS, PRESETS_2 } from './presets';

export interface ChampionsBracketMatch {
  id: string;
  hId: number | null;
  aId: number | null;
  sh: number | null;
  sa: number | null;
  sh2?: number | null;
  sa2?: number | null;
  penH?: number | null;
  penA?: number | null;
}

export interface ChampionsBracket {
  Dieciseisavos?: ChampionsBracketMatch[];
  Octavos?: ChampionsBracketMatch[];
  Cuartos?: ChampionsBracketMatch[];
  Semis?: ChampionsBracketMatch[];
  Final?: ChampionsBracketMatch[] | ChampionsBracketMatch;
}

/**
 * Sanitiza y auto-repara el bracket de Champions League y Europa League para asegurar que no existan
 * estados corruptos, incompletos o filtraciones prematuras de equipos en rondas futuras
 * antes de que se hayan disputado y concluido las eliminatorias previas.
 */
export const sanitizeChampionsBracket = (
  bracket: any,
  teams: any[] = []
): ChampionsBracket | null => {
  if (!bracket || typeof bracket !== 'object') return null;

  const newBracket: any = {
    Dieciseisavos: Array.isArray(bracket.Dieciseisavos) ? bracket.Dieciseisavos.map((m: any) => ({ ...m })) : undefined,
    Octavos: Array.isArray(bracket.Octavos) ? bracket.Octavos.map((m: any) => ({ ...m })) : [],
    Cuartos: Array.isArray(bracket.Cuartos) ? bracket.Cuartos.map((m: any) => ({ ...m })) : [],
    Semis: Array.isArray(bracket.Semis) ? bracket.Semis.map((m: any) => ({ ...m })) : [],
    Final: Array.isArray(bracket.Final)
      ? bracket.Final.map((m: any) => ({ ...m }))
      : bracket.Final
      ? [{ ...bracket.Final }]
      : [{ id: 'F1', hId: null, aId: null, sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null }]
  };

  const phases = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis'];

  phases.forEach((p, pIdx) => {
    if (!Array.isArray(newBracket[p]) || newBracket[p].length === 0) return;
    const nextPhase = p === 'Dieciseisavos' ? 'Octavos' : p === 'Octavos' ? 'Cuartos' : p === 'Cuartos' ? 'Semis' : 'Final';
    const nextRound = Array.isArray(newBracket[nextPhase]) ? newBracket[nextPhase] : [newBracket[nextPhase]].filter(Boolean);
    const hasAdvancedTeams = p === 'Dieciseisavos'
      ? nextRound.some((nm: any) => nm && nm.hId !== null && nm.hId !== undefined)
      : nextRound.some((nm: any) => nm && ((nm.hId !== null && nm.hId !== undefined) || (nm.aId !== null && nm.aId !== undefined)));

    newBracket[p] = newBracket[p].map((m: any, mIdx: number) => {
      if (!m) return m;

      // Si el partido no tiene equipos definidos en ambos lados, no puede tener goles ni penaltis registrados
      if (m.hId === null || m.hId === undefined || m.aId === null || m.aId === undefined) {
        return {
          ...m,
          sh: null,
          sa: null,
          sh2: null,
          sa2: null,
          penH: null,
          penA: null
        };
      }

      // Determinar el equipo que avanzó a la siguiente ronda
      let advancedTeamId: number | null = null;
      if (p === 'Dieciseisavos') {
        advancedTeamId = nextRound[mIdx]?.hId ?? null;
      } else {
        const pairIdx = Math.floor(mIdx / 2);
        const isHomeInNext = mIdx % 2 === 0;
        const targetNext = nextRound[pairIdx];
        advancedTeamId = targetNext ? (isHomeInNext ? targetNext.hId : targetNext.aId) : null;
      }

      // Si tiene ida registrada pero la vuelta quedó null y ya se avanzó a la siguiente ronda
      if (
        m.sh !== null &&
        m.sh !== undefined &&
        (m.sh2 === null || m.sh2 === undefined) &&
        hasAdvancedTeams
      ) {
        const h = teams.find((t: any) => t.id === m.hId);
        const a = teams.find((t: any) => t.id === m.aId);

        const { sh: simH, sa: simA } = simMatchGoals(a?.opp || 2, a?.att || 2, h?.def || 2, h?.opp || 2, h?.att || 2, a?.def || 2);

        // En la vuelta, m.aId es local (simH) y m.hId es visitante (simA)
        let sh2 = simA; // Goles de m.hId en la vuelta
        let sa2 = simH; // Goles de m.aId en la vuelta

        if (advancedTeamId === m.hId) {
          // El equipo Local avanzó
          if (m.sh + sh2 < m.sa + sa2) {
            sh2 = Math.max(0, m.sa + sa2 - m.sh + 1);
          }
        } else if (advancedTeamId === m.aId) {
          // El equipo Visitante avanzó
          if (m.sa + sa2 < m.sh + sh2) {
            sa2 = Math.max(0, m.sh + sh2 - m.sa + 1);
          }
        }

        let penH = m.penH ?? null;
        let penA = m.penA ?? null;
        if (m.sh + sh2 === m.sa + sa2) {
          if (advancedTeamId === m.hId) {
            penH = 5; penA = 4;
          } else if (advancedTeamId === m.aId) {
            penH = 4; penA = 5;
          }
        }

        return {
          ...m,
          sh2,
          sa2,
          penH,
          penA
        };
      }
      return m;
    });

    // Validar y limpiar llaves posteriores para que ningún equipo eliminado ni prematuro aparezca en fases siguientes
    if (Array.isArray(newBracket[p])) {
      newBracket[p].forEach((m: any, mIdx: number) => {
        if (!m) return;
        const isTwoLegged = p !== 'Final';
        const isMatchConcluded = (m.hId !== null && m.hId !== undefined && m.aId !== null && m.aId !== undefined) && (
          isTwoLegged
            ? (m.sh !== null && m.sh !== undefined && m.sh2 !== null && m.sh2 !== undefined)
            : (m.sh !== null && m.sh !== undefined)
        );

        if (!isMatchConcluded) {
          // Si el partido de esta fase AÚN NO HA CONCLUIDO, vaciar inmediatamente el cupo en la fase siguiente
          if (p === 'Dieciseisavos' && newBracket.Octavos?.[mIdx]) {
            newBracket.Octavos[mIdx].hId = null;
          } else if (p === 'Octavos' && newBracket.Cuartos) {
            const cIdx = Math.floor(mIdx / 2);
            const isH = mIdx % 2 === 0;
            if (newBracket.Cuartos[cIdx]) {
              if (isH) newBracket.Cuartos[cIdx].hId = null;
              else newBracket.Cuartos[cIdx].aId = null;
            }
          } else if (p === 'Cuartos' && newBracket.Semis) {
            const sIdx = Math.floor(mIdx / 2);
            const isH = mIdx % 2 === 0;
            if (newBracket.Semis[sIdx]) {
              if (isH) newBracket.Semis[sIdx].hId = null;
              else newBracket.Semis[sIdx].aId = null;
            }
          } else if (p === 'Semis' && newBracket.Final) {
            const finalMatch = Array.isArray(newBracket.Final) ? newBracket.Final[0] : newBracket.Final;
            if (finalMatch) {
              if (mIdx === 0) finalMatch.hId = null;
              if (mIdx === 1) finalMatch.aId = null;
            }
          }
          return;
        }

        const totH = isTwoLegged ? ((m.sh || 0) + (m.sh2 || 0)) : (m.sh || 0);
        const totA = isTwoLegged ? ((m.sa || 0) + (m.sa2 || 0)) : (m.sa || 0);
        let winner: number | null = null;
        if (totH > totA) {
          winner = m.hId;
        } else if (totA > totH) {
          winner = m.aId;
        } else if (m.penH !== null && m.penH !== undefined && m.penA !== null && m.penA !== undefined && m.penH !== m.penA) {
          winner = m.penH > m.penA ? m.hId : m.aId;
        } else {
          // Si hay empate en el global y no se ha resuelto la tanda de penaltis (o están empatados sin ganador),
          // la eliminatoria NO ha concluido válidamente. NO propagar ningún equipo a la siguiente ronda.
          winner = null;
        }

        // Si la eliminatoria no tiene un ganador definitivo resuelto, limpiar la plaza en la fase posterior
        if (!winner) {
          if (p === 'Dieciseisavos' && newBracket.Octavos?.[mIdx]) {
            newBracket.Octavos[mIdx].hId = null;
          } else if (p === 'Octavos' && newBracket.Cuartos) {
            const cIdx = Math.floor(mIdx / 2);
            const isH = mIdx % 2 === 0;
            if (newBracket.Cuartos[cIdx]) {
              if (isH) newBracket.Cuartos[cIdx].hId = null;
              else newBracket.Cuartos[cIdx].aId = null;
            }
          } else if (p === 'Cuartos' && newBracket.Semis) {
            const sIdx = Math.floor(mIdx / 2);
            const isH = mIdx % 2 === 0;
            if (newBracket.Semis[sIdx]) {
              if (isH) newBracket.Semis[sIdx].hId = null;
              else newBracket.Semis[sIdx].aId = null;
            }
          } else if (p === 'Semis' && newBracket.Final) {
            const finalMatch = Array.isArray(newBracket.Final) ? newBracket.Final[0] : newBracket.Final;
            if (finalMatch) {
              if (mIdx === 0) finalMatch.hId = null;
              if (mIdx === 1) finalMatch.aId = null;
            }
          }
          return;
        }

        const loser = winner === m.hId ? m.aId : m.hId;

        // Propagar el ganador a la fase inmediatamente posterior sólo si la eliminatoria terminó
        if (p === 'Dieciseisavos' && newBracket.Octavos?.[mIdx]) {
          newBracket.Octavos[mIdx].hId = winner;
        } else if (p === 'Octavos' && newBracket.Cuartos) {
          const cIdx = Math.floor(mIdx / 2);
          const isH = mIdx % 2 === 0;
          if (newBracket.Cuartos[cIdx]) {
            if (isH) newBracket.Cuartos[cIdx].hId = winner;
            else newBracket.Cuartos[cIdx].aId = winner;
          }
        } else if (p === 'Cuartos' && newBracket.Semis) {
          const sIdx = Math.floor(mIdx / 2);
          const isH = mIdx % 2 === 0;
          if (newBracket.Semis[sIdx]) {
            if (isH) newBracket.Semis[sIdx].hId = winner;
            else newBracket.Semis[sIdx].aId = winner;
          }
        } else if (p === 'Semis' && newBracket.Final) {
          const finalMatch = Array.isArray(newBracket.Final) ? newBracket.Final[0] : newBracket.Final;
          if (finalMatch) {
            if (mIdx === 0) finalMatch.hId = winner;
            if (mIdx === 1) finalMatch.aId = winner;
          }
        }

        // Limpieza estricta: asegurar que el equipo perdedor no aparezca en ninguna llave de fases posteriores
        if (loser !== null && loser !== undefined) {
          const subsequentPhases = phases.slice(pIdx + 1).concat('Final');
          subsequentPhases.forEach(sp => {
            const spMatches = Array.isArray(newBracket[sp]) ? newBracket[sp] : (newBracket[sp] ? [newBracket[sp]] : []);
            spMatches.forEach((sm: any) => {
              if (sm) {
                if (sm.hId === loser) sm.hId = null;
                if (sm.aId === loser) sm.aId = null;
              }
            });
          });
        }
      });
    }
  });

  return newBracket;
};

/**
 * Extrae con precisión los 8 terceros lugares de la Fase de Grupos de UEFA Champions League.
 */
export const extractChampionsRepescados = (c1Comp: any): any[] => {
  if (!c1Comp || !Array.isArray(c1Comp.teams) || c1Comp.teams.length === 0) {
    return [];
  }

  // Si la fase de grupos de Champions League aún está activa (< 6 jornadas), los 8 repescados aún no están determinados
  if (c1Comp.phase === 'groups' && (c1Comp.matchday || 0) < 6) {
    return [];
  }

  let groups = c1Comp.groups;
  if (!Array.isArray(groups) || groups.length === 0) {
    if (c1Comp.teams.length >= 32) {
      groups = Array.from({ length: 8 }, (_, i) => ({
        name: `Grupo ${String.fromCharCode(65 + i)}`,
        teamIds: c1Comp.teams.slice(i * 4, i * 4 + 4).map((t: any) => t.id)
      }));
    } else {
      return [];
    }
  }

  const repescados: any[] = [];
  const addedNames = new Set<string>();

  groups.forEach((g: any, gi: number) => {
    const groupTeams = c1Comp.teams
      .filter((t: any) => g.teamIds && g.teamIds.includes(t.id))
      .sort((a: any, b: any) => 
        (b.pts || 0) - (a.pts || 0) ||
        ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) ||
        (b.gf || 0) - (a.gf || 0)
      );

    const third = groupTeams[2] || groupTeams[0];
    if (third && !addedNames.has(third.name)) {
      addedNames.add(third.name);
      const groupLetter = g.name || `Grupo ${String.fromCharCode(65 + gi)}`;
      repescados.push({
        ...third,
        originalId: third.id,
        id: 17 + gi,
        isRepesca: true,
        clOrigin: `Champions League (3.º ${groupLetter})`
      });
    }
  });

  return repescados;
};

/**
 * Sanitiza y repara la lista de los 24 equipos de UEFA Europa League (C3).
 * Asegura que:
 * 1. Los 16 primeros equipos (IDs 1..16) correspondan a los clasificados por ligas.
 * 2. Los 8 equipos restantes (IDs 17..24) correspondan a los repescados de Champions League.
 * 3. NUNCA exista un equipo duplicado (por ejemplo, si el equipo del usuario clasifica por liga,
 *    no debe figurar repetido en los puestos 17..24 como repescado de Champions).
 */
export const sanitizeEuropaLeagueTeams = (uelComp: any, c1Comp?: any): any => {
  if (!uelComp || !Array.isArray(uelComp.teams) || uelComp.teams.length === 0) {
    return uelComp;
  }

  const rawTeams: any[] = uelComp.teams;
  // Extraer los 16 equipos de liga (IDs 1..16)
  const leagueTeams = rawTeams.filter((t: any) => !t.isRepesca && t.id <= 16);
  
  // Si no tienen IDs canónicos 1..16, tomar los primeros 16 que no sean repescas
  const resolvedLeagueTeams: any[] = (leagueTeams.length >= 16 ? leagueTeams.slice(0, 16) : rawTeams.slice(0, 16)).map((t: any, i: number) => ({
    ...t,
    id: i + 1,
    isRepesca: false
  }));

  const leagueNames = new Set<string>(resolvedLeagueTeams.map(t => t.name));
  const usedNames = new Set<string>(leagueNames);

  // Extraer los 8 repescados (IDs 17..24)
  const rawRepescados = rawTeams.filter((t: any) => t.isRepesca || t.id > 16);
  const cleanRepescados: any[] = [];

  // Si c1Comp está disponible y ha finalizado grupos, inyectar prioritariamente los terceros puestos reales
  const isC1Done = !c1Comp || c1Comp.phase !== 'groups' || (c1Comp.matchday || 0) >= 6;
  const c1Repescados = (c1Comp && isC1Done) ? extractChampionsRepescados(c1Comp) : [];
  if (c1Repescados.length >= 8) {
    c1Repescados.forEach((r: any) => {
      if (r && r.name && !usedNames.has(r.name) && cleanRepescados.length < 8) {
        usedNames.add(r.name);
        cleanRepescados.push({
          ...r,
          id: 17 + cleanRepescados.length,
          isRepesca: true
        });
      }
    });
  }

  // Conservar repescados previos que sean legítimos y no colisionen con los equipos de liga
  if (cleanRepescados.length < 8) {
    rawRepescados.forEach((r: any) => {
      if (r && r.name && !usedNames.has(r.name) && cleanRepescados.length < 8) {
        usedNames.add(r.name);
        cleanRepescados.push({
          ...r,
          id: 17 + cleanRepescados.length,
          isRepesca: true
        });
      }
    });
  }

  // Si aún faltan repescados para completar los 8 (por haber eliminado duplicados), rellenar con clubes auténticos de PRESETS
  if (cleanRepescados.length < 8) {
    const fallbackCodes = ['ES', 'EN', 'IT', 'DE', 'FR', 'NL', 'MI', 'MB'];
    let idx = 0;
    while (cleanRepescados.length < 8 && idx < fallbackCodes.length * 4) {
      const code = fallbackCodes[idx % fallbackCodes.length];
      const presets = PRESETS[code] || [];
      const cand = presets.find(p => p && !usedNames.has(p.name));
      if (cand && !usedNames.has(cand.name)) {
        usedNames.add(cand.name);
        const groupLetter = String.fromCharCode(65 + cleanRepescados.length);
        cleanRepescados.push({
          ...cand,
          id: 17 + cleanRepescados.length,
          isRepesca: true,
          league: code,
          clOrigin: `Champions League (3.º Grupo ${groupLetter})`
        });
      }
      idx++;
    }
  }

  const finalizedTeams = [...resolvedLeagueTeams, ...cleanRepescados.slice(0, 8)];

  // Sincronizar careerTeamId si el equipo del usuario está en la lista
  let careerTeamId = uelComp.careerTeamId;
  if (uelComp.careerTeamName) {
    const found = finalizedTeams.find(t => t.name === uelComp.careerTeamName);
    if (found) {
      careerTeamId = found.id;
    }
  }

  return {
    ...uelComp,
    teams: finalizedTeams,
    careerTeamId: careerTeamId ?? uelComp.careerTeamId
  };
};

/**
 * Inyecta los 8 repescados reales de Champions League en la estructura de UEFA Europa League (C3)
 * y sincroniza las llaves de Octavos de Final con los ganadores de Dieciseisavos.
 */
export const syncChampionsRepescadosToUEL = (c1Comp: any, uelComp: any): any => {
  if (!uelComp || !uelComp.teams) return uelComp;
  
  // Si la Europa League ya disputó Dieciseisavos y ya avanzó a Octavos (con partidos jugados), no alterar la llave
  if (uelComp.phase && uelComp.phase !== 'Dieciseisavos' && (uelComp.matchday || 0) >= 2) {
    return sanitizeEuropaLeagueTeams(uelComp, c1Comp);
  }

  // Si Champions aún está en grupos y no ha completado las 6 jornadas, no sincronizar prematuramente
  const isC1Done = !c1Comp || c1Comp.phase !== 'groups' || (c1Comp.matchday || 0) >= 6;
  if (!isC1Done) {
    return sanitizeEuropaLeagueTeams(uelComp, c1Comp);
  }

  const realRepescados = extractChampionsRepescados(c1Comp);
  if (realRepescados.length < 8) {
    return sanitizeEuropaLeagueTeams(uelComp, c1Comp);
  }

  // Conservar los 16 equipos de liga originales (IDs 1..16)
  const leagueTeams = (uelComp.teams || []).filter((t: any) => !t.isRepesca && t.id <= 16);
  const leagueTeamNames = new Set(leagueTeams.map(t => t.name));
  
  // Filtrar repescados para que ninguno sea un equipo que ya esté en leagueTeams
  const safeRealRepescados = realRepescados.filter((r: any) => !leagueTeamNames.has(r.name));
  const usedRepescaNames = new Set<string>(safeRealRepescados.map((r: any) => r.name));

  const fallbackCodes = ['ES', 'EN', 'IT', 'DE', 'FR', 'NL', 'MI', 'MB'];
  let fbIdx = 0;
  while (safeRealRepescados.length < 8 && fbIdx < fallbackCodes.length * 4) {
    const code = fallbackCodes[fbIdx % fallbackCodes.length];
    const presets = PRESETS[code] || [];
    const cand = presets.find(p => p && !leagueTeamNames.has(p.name) && !usedRepescaNames.has(p.name));
    if (cand) {
      usedRepescaNames.add(cand.name);
      const groupLetter = String.fromCharCode(65 + safeRealRepescados.length);
      safeRealRepescados.push({
        ...cand,
        id: 17 + safeRealRepescados.length,
        isRepesca: true,
        league: code,
        clOrigin: `Champions League (3.º Grupo ${groupLetter})`
      });
    }
    fbIdx++;
  }

  // Asegurar que tenemos exactamente 16 de liga y 8 repescados (total 24)
  const updatedTeams = [
    ...leagueTeams.slice(0, 16),
    ...safeRealRepescados.slice(0, 8).map((r: any, idx: number) => ({
      ...r,
      id: 17 + idx,
      isRepesca: true
    }))
  ];

  // Actualizar el bracket de Octavos para que 'aId' apunte fielmente a los IDs 17..24
  const updatedBracket = { ...(uelComp.bracket || {}) };
  
  // Verificar los ganadores de Dieciseisavos (únicamente para eliminatorias concluidas con vuelta jugada)
  let dieciseisavosWinners: (number | null)[] = Array(8).fill(null);
  if (Array.isArray(updatedBracket.Dieciseisavos) && updatedBracket.Dieciseisavos.length === 8) {
    dieciseisavosWinners = updatedBracket.Dieciseisavos.map((m: any) => {
      if (!m || m.sh === null || m.sh === undefined || m.sh2 === null || m.sh2 === undefined) {
        return null;
      }
      // En la ida: m.sh (goles de m.hId), m.sa (goles de m.aId)
      // En la vuelta: m.sh2 (goles de m.hId), m.sa2 (goles de m.aId)
      const totH = (m.sh || 0) + (m.sh2 || 0);
      const totA = (m.sa || 0) + (m.sa2 || 0);
      if (totH > totA) return m.hId;
      if (totA > totH) return m.aId;
      if (m.penH !== null && m.penH !== undefined && m.penA !== null && m.penA !== undefined && m.penH !== m.penA) {
        return m.penH > m.penA ? m.hId : m.aId;
      }
      return null;
    });
  }

  // Inyectar los repescados en aId de Octavos.
  // hId se completará con el ganador de Dieciseisavos ÚNICAMENTE si ya se jugó y concluyó. De lo contrario debe ser null.
  if (Array.isArray(updatedBracket.Octavos) && updatedBracket.Octavos.length === 8) {
    updatedBracket.Octavos = updatedBracket.Octavos.map((m: any, i: number) => ({
      ...m,
      hId: dieciseisavosWinners[i] ?? null,
      aId: 17 + i
    }));
  } else {
    updatedBracket.Octavos = Array(8).fill(0).map((_, i) => ({
      id: 'O' + (i + 1),
      hId: dieciseisavosWinners[i] ?? null,
      aId: 17 + i,
      sh: null,
      sa: null,
      sh2: null,
      sa2: null,
      penH: null,
      penA: null
    }));
  }

  // Detectar si el equipo del usuario / modo carrera finalizó 3.º en Champions League
  let careerTeamId = uelComp.careerTeamId;
  let userTeamId = uelComp.userTeamId;
  let careerTeamName = uelComp.careerTeamName;

  const userRepescado = safeRealRepescados.find((r: any) => 
    (c1Comp.careerTeamId && (r.originalId === c1Comp.careerTeamId || r.id === c1Comp.careerTeamId)) ||
    (c1Comp.userTeamId && (r.originalId === c1Comp.userTeamId || r.id === c1Comp.userTeamId)) ||
    (c1Comp.careerTeamName && r.name === c1Comp.careerTeamName) ||
    (c1Comp.userTeamName && r.name === c1Comp.userTeamName)
  );

  if (userRepescado) {
    careerTeamId = userRepescado.id;
    userTeamId = userRepescado.id;
    careerTeamName = userRepescado.name;
  }

  return {
    ...uelComp,
    teams: updatedTeams,
    bracket: updatedBracket,
    careerTeamId: careerTeamId ?? uelComp.careerTeamId,
    userTeamId: userTeamId ?? uelComp.userTeamId,
    careerTeamName: careerTeamName ?? uelComp.careerTeamName
  };
};

