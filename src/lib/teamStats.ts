// Team statistics and preset lookup utilities
import { PRESETS, PRESETS_2 } from '@/lib/presets';

export const getPresetStatsForTeam = (teamName: string) => {
  if (!teamName) return null;
  for (const list of Object.values(PRESETS)) {
    if (!Array.isArray(list)) continue;
    const found = list.find((t: any) => t.name === teamName);
    if (found) {
      return {
        att: found.att,
        opp: found.opp,
        def: found.def,
        color1: found.color1,
        color2: found.color2,
        league: found.league,
        isFlag: found.isFlag,
        region: found.region,
        tier: found.tier
      };
    }
  }
  for (const list of Object.values(PRESETS_2)) {
    if (!Array.isArray(list)) continue;
    const found = list.find((t: any) => t.name === teamName);
    if (found) {
      return {
        att: found.att,
        opp: found.opp,
        def: found.def,
        color1: found.color1,
        color2: found.color2,
        league: found.league,
        isFlag: found.isFlag,
        region: found.region,
        tier: found.tier
      };
    }
  }
  return null;
};

// Obtiene las estadísticas auténticas del club a nivel europeo de la base de datos de la app
export const getAuthenticTeamStats = (team: any) => {
  if (!team) return { att: 3, opp: 3, def: 3 };
  const preset = getPresetStatsForTeam(team.name);
  if (preset) {
    return {
      att: preset.att,
      opp: preset.opp,
      def: preset.def,
      color1: preset.color1,
      color2: preset.color2,
      isFlag: preset.isFlag,
      league: preset.league
    };
  }
  return {
    att: team.att ?? 3,
    opp: team.opp ?? 3,
    def: team.def ?? 3,
    color1: team.color1,
    color2: team.color2,
    isFlag: team.isFlag,
    league: team.league
  };
};

export const restoreClubOriginalStatsInComps = (prevComps: any, origStats: any, teamNameFallback?: string) => {
  if (!prevComps) return prevComps;
  const targetId = origStats?.teamId;
  let att = origStats?.att;
  let opp = origStats?.opp;
  let def = origStats?.def;
  if (att === undefined || opp === undefined || def === undefined) {
    const presetMatch = getPresetStatsForTeam(teamNameFallback || '');
    if (presetMatch) {
      att = presetMatch.att;
      opp = presetMatch.opp;
      def = presetMatch.def;
    }
  }
  if (att === undefined || opp === undefined || def === undefined) return prevComps;
  let modified = false;
  const nextComps = { ...prevComps };
  for (const compId of Object.keys(nextComps)) {
    const comp = nextComps[compId];
    if (!comp) continue;
    let newTeams = comp.teams;
    let newTeams2 = comp.teams2;
    if (Array.isArray(newTeams)) {
      const matchIdx = newTeams.findIndex((t: any) => (targetId && t.id === targetId) || (teamNameFallback && t.name === teamNameFallback));
      if (matchIdx >= 0) {
        newTeams = newTeams.map((t: any, i: number) => i === matchIdx ? { ...t, att, opp, def } : t);
        modified = true;
      }
    }
    if (Array.isArray(newTeams2)) {
      const matchIdx = newTeams2.findIndex((t: any) => (targetId && t.id === targetId) || (teamNameFallback && t.name === teamNameFallback));
      if (matchIdx >= 0) {
        newTeams2 = newTeams2.map((t: any, i: number) => i === matchIdx ? { ...t, att, opp, def } : t);
        modified = true;
      }
    }
    if (modified) {
      nextComps[compId] = { ...comp, teams: newTeams, teams2: newTeams2 };
    }
  }
  return modified ? nextComps : prevComps;
};
