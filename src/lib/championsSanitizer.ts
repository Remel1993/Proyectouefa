/**
 * Utilidades para sanitización y cálculo de llaves de Champions League (formato clásico: ida y vuelta en Octavos/Cuartos/Semis, partido único en Final).
 */

import { simMatchGoals } from './career';

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
 * estados corruptos o incompletos (por ejemplo, llaves donde se disputó la ida y se avanzó de ronda
 * pero faltaron los datos de la vuelta).
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
    const hasAdvancedTeams = nextRound.some((nm: any) => nm && (nm.hId || nm.aId));

    newBracket[p] = newBracket[p].map((m: any, mIdx: number) => {
      if (!m) return m;

      // Si tiene ida registrada pero la vuelta quedó null y ya se avanzó a la siguiente ronda
      if (
        m.sh !== null &&
        m.sh !== undefined &&
        (m.sh2 === null || m.sh2 === undefined) &&
        hasAdvancedTeams
      ) {
        const pairIdx = Math.floor(mIdx / 2);
        const isHomeInNext = mIdx % 2 === 0;
        const targetNext = nextRound[pairIdx];
        const advancedTeamId = targetNext ? (isHomeInNext ? targetNext.hId : targetNext.aId) : null;

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
  });

  return newBracket;
};

/**
 * Extrae con precisión los 8 terceros lugares de la Fase de Grupos de UEFA Champions League.
 */
export const extractChampionsRepescados = (c1Comp: any): any[] => {
  if (!c1Comp || !Array.isArray(c1Comp.groups) || !Array.isArray(c1Comp.teams)) {
    return [];
  }

  const repescados: any[] = [];
  const addedNames = new Set<string>();

  c1Comp.groups.forEach((g: any, gi: number) => {
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
        id: 17 + gi,
        isRepesca: true,
        clOrigin: `Champions League (3.º ${groupLetter})`
      });
    }
  });

  return repescados;
};

/**
 * Inyecta los 8 repescados reales de Champions League en la estructura de UEFA Europa League (C3).
 */
export const syncChampionsRepescadosToUEL = (c1Comp: any, uelComp: any): any => {
  if (!uelComp || !uelComp.teams) return uelComp;
  
  const realRepescados = extractChampionsRepescados(c1Comp);
  if (realRepescados.length < 8) {
    return uelComp;
  }

  // Conservar los 16 equipos de liga originales (IDs 1..16)
  const leagueTeams = (uelComp.teams || []).filter((t: any) => !t.isRepesca && t.id <= 16);
  
  // Asegurar que tenemos exactamente 16 de liga y 8 repescados (total 24)
  const updatedTeams = [...leagueTeams.slice(0, 16), ...realRepescados.slice(0, 8)];

  // Actualizar el bracket de Octavos para que 'aId' apunte fielmente a los IDs 17..24
  const updatedBracket = { ...(uelComp.bracket || {}) };
  if (Array.isArray(updatedBracket.Octavos)) {
    updatedBracket.Octavos = updatedBracket.Octavos.map((m: any, i: number) => ({
      ...m,
      aId: 17 + i
    }));
  }

  return {
    ...uelComp,
    teams: updatedTeams,
    bracket: updatedBracket
  };
};

