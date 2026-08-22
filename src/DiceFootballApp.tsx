import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, FastForward, Trophy, Shield as ShieldIcon, 
  Settings, ChevronLeft, ChevronRight, Dices, Save, Check, History, 
  Flame, Award, Edit3, X, Shuffle, ArrowRight, UserCheck, AlertCircle, 
  Trash2, Globe, Sparkles, TrendingUp, HelpCircle, Newspaper, Dice6, 
  Dice1, Dice2, Dice3, Dice4, Dice5, Eye, Swords, Star, Calendar, 
  Volume2, VolumeX, BarChart3, Clock, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, ChevronDown, Flag, Users,
  Megaphone, ArrowUpCircle, ArrowDownCircle, Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { playClick } from '@/lib/audio';
import { 
  getPresetStatsForTeam, getAuthenticTeamStats, restoreClubOriginalStatsInComps 
} from '@/lib/teamStats';
import { 
  APP_ID, LEAGUE_IDS, SEASON_KEY, DEFAULT_SEASON_STATE, 
  divTotalRounds, leagueTotalRounds, divPendingAt, leaguePendingAt, 
  leagueSeasonOver, leagueProgressLabel, computeLeagueNewSeason, 
  generateLeagueSchedule, buildStandingsSnapshot, isLeagueFinished 
} from '@/lib/leagueEngine';
import { 
  buildUELKnockout, buildCLPool, drawKnockoutGroups, 
  getAutoFillData, getDefaultComps, getShuffleData, generateKnockoutBrackets 
} from '@/lib/knockoutEngine';
import { 
  ChampionRecord, leaderBy, buildSeasonRecord, buildCupSeasonRecord, 
  pushRecord, registerSeasonSummary, sanitizeArchive 
} from '@/lib/palmaresHelper';
import { generateNews, WC_POPULAR_SUGGESTIONS } from '@/lib/newsGenerator';
import { 
  Shield, getTeamLogoSlug, getLast5, FormBadges, DieIcon, 
  PenaltyDots, Confetti, AttrStepper, MenuButton, NewsIcon 
} from '@/components/ui/GameUI';
import { ChampionsHistoryModal } from '@/components/ChampionsHistoryModal';
import { ArchiveView } from '@/components/ArchiveView';
import { RulesView } from '@/components/RulesView';
import { HubView } from '@/components/HubView';
import { ConfigPanel } from '@/components/ConfigPanel';

import { 
  isChampionsMatchWeek, isEuropaLeagueMatchWeek, getSemanaCalendario, 
  getTotalCalendarWeeks, isChampionsWeek, getNextChampionsWeek, 
  isEuropaLeagueWeek, getNextEuropaLeagueWeek,
  getWeekForLeagueMatchday, getLeagueMatchdayForWeek,
  getExpectedCupMatchdayForWeek
} from '@/lib/seasonCalendar';
import { sanitizeChampionsBracket, syncChampionsRepescadosToUEL, sanitizeEuropaLeagueTeams } from '@/lib/championsSanitizer';
import { ALL_WORLD_CUP_TEAMS, buildDynamicWCPool } from '@/lib/worldCup';
import { getCountryCode, getCountryFlagUrl, inferCountryRegion } from '@/lib/countries';
import { PRESETS, PRESETS_2, findDerby } from '@/lib/presets';
import { 
  CAREER_LEAGUE_ID, CAREER_DIV, CONTRACT_SEASONS, DEFAULT_CAREER,
  tierOf, tierCaps, peCostFor, worstTeams, isSquadMaxed, 
  remainingUpgradeCost, capPE, signingRepBonus, clampRep, 
  objectiveFor, expectedPosition, readPerformance, seasonObjectives, 
  clProgressRep, uelProgressRep, uelPhaseLabel, clPhaseLabel, buildOffers, 
  evaluateApplication, fireChance, simMatchGoals, simPenaltyShootout,
  CL_PHASE_ORDER, UEL_PHASE_ORDER, roll1D6, getChampionsMatchKey,
  getEuropaLeagueMatchKey, repForMatch, peForResult
} from '@/lib/career';
import { registerTitle, registerTitles } from '@/lib/palmares';
import { 
  CareerSelectView, CareerView, CareerSeasonReviewModal, CareerMatchView 
} from '@/components/CareerMode';
import { SimulationInjuryAlertModal } from '@/components/SimulationInjuryAlertModal';
import { SeasonCalendarModal } from '@/components/SeasonCalendarModal';
import TopWinnersTable from '@/components/TopWinnersTable';
import { CompetitionLogo } from '@/components/CompetitionLogo';

import championsStadiumBg from '@/assets/images/champions_league_stadium_1786921289637.jpg';
import worldCupStadiumDayBg from '@/assets/images/world_cup_stadium_day_1786921535635.jpg';

function DiceFootballApp() {
  const [view, setView] = useState('hub');
  const [activeCompId, setActiveCompId] = useState(null);
  const [compView, setCompView] = useState('main');
  const [viewDiv, setViewDiv] = useState(1); 
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [championModalTab, setChampionModalTab] = useState<'stats' | 'results' | 'promotions' | 'bracket'>('stats');
  const [championModalDiv, setChampionModalDiv] = useState(1);
  const [bracketRoundFilter, setBracketRoundFilter] = useState<'ALL' | string>('ALL');
  const [championModalBracketFilter, setChampionModalBracketFilter] = useState<'ALL' | string>('ALL');
  const [standingsView, setStandingsView] = useState<'current' | 'previous'>('current');
  const [careerTab, setCareerTab] = useState('main');

  const [eliminatedModal, setEliminatedModal] = useState<{ compId: string; phase: string; isRepesca?: boolean; userTeam?: any } | null>(null);
  const [resetConfirmModal, setResetConfirmModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showChampionsHistory, setShowChampionsHistory] = useState(false);
  const [cupAutoSim, setCupAutoSim] = useState(false);


  useEffect(() => {
    if (view !== 'hub' || compView !== 'main') window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (compView !== 'main') { setCompView('main'); }
      else if (view !== 'hub') { setView('hub'); setActiveCompId(null); }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, compView]);

  const [archive, setArchive] = useState(() => {
    try {
      const saved = window.localStorage.getItem(`${APP_ID}_archive`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const mapped = parsed.map((e, idx) => ({
            ...e,
            id: typeof e.id === 'string' && e.id.startsWith('arch_') ? e.id : `arch_${e.compId || 'c'}_${e.div || 1}_s${e.season || 1}_${idx}_${Date.now()}`
          }));
          return sanitizeArchive(mapped);
        }
      }
    } catch (e) {}
    return [];
  });
  useEffect(() => { try { window.localStorage.setItem(`${APP_ID}_archive`, JSON.stringify(archive)); } catch(e){} }, [archive]);

  const [selectedArchiveEntry, setSelectedArchiveEntry] = useState(null);

  useEffect(() => {
    const handler = (e) => { if (e.target.closest('button')) playClick(); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const [comps, setComps] = useState(() => {
    const defaultComps = getDefaultComps();
    try {
      // Intentar cargar la versión actual o migrar versiones anteriores
      const saved = window.localStorage.getItem(`${APP_ID}_comps`) || 
                    window.localStorage.getItem('dice-football-hub-elite-v6_comps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...defaultComps };
          const syncList = (list: any[], defaultList?: any[]) => {
            if (!Array.isArray(list)) return defaultList || [];
            // Si la lista de la liga no tiene el mismo número de equipos que los nuevos presets, usar default
            if (defaultList && Array.isArray(defaultList) && defaultList.length > 0 && list.length !== defaultList.length) {
              return defaultList;
            }
            return list.map((t: any) => {
              const preset = getPresetStatsForTeam(t?.name);
              if (preset) {
                return {
                  ...t,
                  att: preset.att,
                  opp: preset.opp,
                  def: preset.def,
                  color1: preset.color1 || t.color1,
                  color2: preset.color2 || t.color2,
                  league: preset.league || t.league
                };
              }
              return t;
            });
          };

          Object.keys(defaultComps).forEach(key => {
            if (parsed[key]) {
              const savedComp = parsed[key];
              const hasValidTeams1 = Array.isArray(savedComp.teams) && savedComp.teams.length > 0;
              const hasValidTeams2 = Array.isArray(savedComp.teams2) && savedComp.teams2.length > 0;
              
              merged[key] = {
                ...defaultComps[key],
                ...savedComp,
                teams: hasValidTeams1 ? syncList(savedComp.teams, defaultComps[key].teams) : defaultComps[key].teams,
                teams2: hasValidTeams2 ? syncList(savedComp.teams2, defaultComps[key].teams2) : defaultComps[key].teams2,
                id: key
              };
            }
          });
          if (!merged['C1']?.teams?.length || !merged['C1']?.groups) {
            const clData = getAutoFillData('C1', merged);
            if (clData) {
              merged['C1'] = {
                ...defaultComps['C1'],
                ...merged['C1'],
                ...clData,
                id: 'C1',
                name: 'Champions League',
                type: 'cup'
              };
            }
          }
          if (merged['C1']?.bracket) {
            merged['C1'].bracket = sanitizeChampionsBracket(merged['C1'].bracket, merged['C1'].teams);
          }
          if (merged['C3']) {
            if (!merged['C3'].teams?.length || !merged['C3'].bracket || !merged['C3'].bracket.Dieciseisavos || merged['C3'].phase === 'groups') {
              const uelData = getAutoFillData('C3', merged);
              merged['C3'] = {
                ...defaultComps['C3'],
                ...merged['C3'],
                ...uelData,
                id: 'C3',
                name: 'UEFA Europa League',
                type: 'cup'
              };
            }
            merged['C3'] = sanitizeEuropaLeagueTeams(merged['C3'], merged['C1']);
            if (merged['C3']?.bracket) {
              merged['C3'].bracket = sanitizeChampionsBracket(merged['C3'].bracket, merged['C3'].teams);
            }
          }
          return merged;
        }
      }
    } catch (e) {}
    return defaultComps;
  });

  useEffect(() => { try { window.localStorage.setItem(`${APP_ID}_comps`, JSON.stringify(comps)); } catch(e){} }, [comps]);

  // Recupera en el registro permanente cualquier edición que todavía exista
  // en el historial visual de una partida creada antes del palmarés acumulativo.
  useEffect(() => {
    const recoverableTitles: any[] = [];
    LEAGUE_IDS.forEach(id => {
      const comp = comps[id];
      if (!comp) return;
      [
        { div: 1, records: comp.championsHistory },
        { div: 2, records: comp.championsHistory2 }
      ].forEach(({ div, records }) => {
        (records || []).forEach(record => {
          if (!record?.champion) return;
          recoverableTitles.push({
            compId: id,
            compName: comp.name,
            type: 'league',
            div,
            winner: record.champion,
            season: record.season
          });
        });
      });
    });

    // Copas y torneos (Champions League C1, Europa League C3 y Copa del Mundo C2)
    ['C1', 'C2', 'C3'].forEach(id => {
      const cup = comps[id];
      if (!cup) return;
      (cup.championsHistory || []).forEach((record: any) => {
        if (!record?.champion) return;
        recoverableTitles.push({
          compId: id,
          compName: cup.name,
          type: 'cup',
          div: 1,
          winner: record.champion,
          season: record.season
        });
      });
    });

    // Historial del modo carrera
    (career?.seasonHistory || []).forEach((sh: any) => {
      if (sh.isLeagueChampion || sh.position === 1) {
        recoverableTitles.push({
          compId: sh.compId || career.compId || 'L1',
          compName: sh.compName || 'Liga',
          type: 'league',
          div: sh.div || 1,
          winner: { name: sh.teamName },
          season: sh.season || 1
        });
      }
      if (sh.isClChampion || (sh.clResult && sh.clResult.includes('Campeón'))) {
        recoverableTitles.push({
          compId: 'C1',
          compName: 'Champions League',
          type: 'cup',
          div: 1,
          winner: { name: sh.teamName },
          season: sh.season || 1
        });
      }
      if (sh.isUelChampion || (sh.uelResult && sh.uelResult.includes('Campeón'))) {
        recoverableTitles.push({
          compId: 'C3',
          compName: 'UEFA Europa League',
          type: 'cup',
          div: 1,
          winner: { name: sh.teamName },
          season: sh.season || 1
        });
      }
    });

    registerTitles(recoverableTitles);
    // La recuperación solo se ejecuta al cargar la partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeComp = comps[activeCompId];
  const updateActiveComp = (newData) => setComps(prev => ({ ...prev, [activeCompId]: { ...prev[activeCompId], ...newData } }));
  const updateCompById = (cId: string, newData: any) => setComps(prev => ({ ...prev, [cId]: { ...prev[cId], ...newData } }));

  // ===== TEMPORADA GLOBAL / JORNADA GLOBAL =====
  const [seasonState, setSeasonState] = useState(() => {
    try {
      const saved = window.localStorage.getItem(SEASON_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_SEASON_STATE, ...parsed };
      }
    } catch (e) {}
    return { ...DEFAULT_SEASON_STATE };
  });

  const [isSeasonCalendarOpen, setIsSeasonCalendarOpen] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState<{ title: string; desc?: string; week: number } | null>(null);

  useEffect(() => { try { window.localStorage.setItem(SEASON_KEY, JSON.stringify(seasonState)); } catch(e){} }, [seasonState]);

  const globalMatchday = seasonState.globalMatchday;


  const pendingLeagueIds = useMemo(
    () => LEAGUE_IDS.filter(id => leaguePendingAt(comps[id], globalMatchday)),
    [comps, globalMatchday]
  );
  const allLeaguesFinished = useMemo(() => LEAGUE_IDS.every(id => leagueSeasonOver(comps[id])), [comps]);
  const clFinal = comps['C1']?.bracket?.Final?.[0] || comps['C1']?.bracket?.Final;
  const championsFinished = !!(clFinal && clFinal.sh !== null && clFinal.sh !== undefined);

  // Cierre de temporada global: guarda clasificaciones finales, actualiza
  // previousStandings y genera (congela) los 32 de la Champions.
  const finishGlobalSeason = () => {
    const seasonNow = seasonState.season || 1;
    // Palmarés acumulativo (infinito): todos los campeones se guardan en una
    // única escritura para que un cierre interrumpido no deje ligas sin registrar.
    const seasonTitles: any[] = [];
    LEAGUE_IDS.forEach(id => {
      const c = comps[id];
      if (!c) return;
      const r1 = buildSeasonRecord(c.teams, seasonNow);
      const r2 = buildSeasonRecord(c.teams2, seasonNow);
      if (r1) seasonTitles.push({ compId: id, compName: c.name, type: 'league', div: 1, winner: r1.champion, runnerUp: r1.runnerUp, thirdPlace: r1.thirdPlace, records: r1.records, season: seasonNow });
      if (r2) seasonTitles.push({ compId: id, compName: c.name, type: 'league', div: 2, winner: r2.champion, runnerUp: r2.runnerUp, thirdPlace: r2.thirdPlace, records: r2.records, season: seasonNow });
    });
    const c1 = comps['C1'];
    if (c1) {
      const clRecord = buildCupSeasonRecord(c1, seasonNow);
      if (clRecord?.champion) {
        seasonTitles.push({ compId: 'C1', compName: c1.name || 'Champions League', type: 'cup', div: 1, winner: clRecord.champion, runnerUp: clRecord.runnerUp, thirdPlace: clRecord.thirdPlace, finalMatch: clRecord.finalMatch, records: clRecord.records, season: seasonNow });
      }
    }
    const c2 = comps['C2'];
    if (c2) {
      const wcRecord = buildCupSeasonRecord(c2, seasonNow);
      if (wcRecord?.champion) {
        seasonTitles.push({ compId: 'C2', compName: c2.name || 'Copa del Mundo', type: 'cup', div: 1, winner: wcRecord.champion, runnerUp: wcRecord.runnerUp, thirdPlace: wcRecord.thirdPlace, finalMatch: wcRecord.finalMatch, records: wcRecord.records, season: seasonNow });
      }
    }
    const c3 = comps['C3'];
    if (c3) {
      const uelRecord = buildCupSeasonRecord(c3, seasonNow);
      if (uelRecord?.champion) {
        seasonTitles.push({ compId: 'C3', compName: c3.name || 'UEFA Europa League', type: 'cup', div: 1, winner: uelRecord.champion, runnerUp: uelRecord.runnerUp, thirdPlace: uelRecord.thirdPlace, finalMatch: uelRecord.finalMatch, records: uelRecord.records, season: seasonNow });
      }
    }
    registerTitles(seasonTitles);
    setComps(prev => {
      const next = { ...prev };
      LEAGUE_IDS.forEach(id => {
        const c = next[id];
        if (!c) return;
        const withHistory = registerSeasonSummary(c, seasonState.season || 1);
        next[id] = {
          ...withHistory,
          previousStandings: buildStandingsSnapshot(c.teams) || c.previousStandings || null,
          previousStandings2: buildStandingsSnapshot(c.teams2) || c.previousStandings2 || null
        };
      });

      // No sobreescribir una Champions League en curso. Solo inicializar si no existiese.
      if (!next['C1'] || !next['C1'].teams || next['C1'].teams.length === 0) {
        const careerQualifiedName = (() => {
          if (!career.active || !career.teamId || career.div !== 1) return null;
          const comp = next[career.compId];
          const table = [...(comp?.teams || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
          const pos = table.findIndex(t => t.id === career.teamId) + 1;
          const maxSpots = career.compId === 'L7' ? 8 : 4;
          return pos > 0 && pos <= maxSpots ? table[pos - 1].name : null;
        })();
        const cl = getAutoFillData('C1', next, careerQualifiedName ? [careerQualifiedName] : []);
        if (cl) {
          const mine = careerQualifiedName ? (cl.teams || []).find(t => t.name === careerQualifiedName) : null;
          next['C1'] = {
            ...next['C1'], ...cl,
            name: next['C1']?.name || 'Champions League',
            careerTeamName: careerQualifiedName || null,
            careerTeamId: mine?.id || null,
            userTeamId: mine?.id || cl.userTeamId
          };
        }
      }
      return next;
    });
    setCareer(c => (c.active ? { ...c, clSeason: seasonNow } : c));
    setSeasonState(s => ({ ...s, phase: 'champions' }));
  };

  // Nueva temporada global (tras la Champions)
  const startNewGlobalSeason = (targetView?: 'career' | 'hub' | null) => {
    // Si la Champions League finalizó o tiene final definida, asegurar el registro del campeón en el palmarés
    const cl = comps['C1'];
    if (cl) {
      const final = cl.bracket?.Final?.[0] || cl.bracket?.Final;
      if (final && final.sh !== null && final.sh !== undefined) {
        let clWinnerId = null;
        if (final.sh > final.sa) clWinnerId = final.hId;
        else if (final.sa > final.sh) clWinnerId = final.aId;
        else clWinnerId = ((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId;
        const clWinner = (cl.teams || []).find((t: any) => t.id === clWinnerId);
        if (clWinner) {
          archiveCompetition('C1', 1, clWinner, cl, true);
        }
      }
    }

    // Si la UEFA Europa League finalizó o tiene final definida, asegurar el registro del campeón en el palmarés
    const uel = comps['C3'];
    if (uel) {
      const final = uel.bracket?.Final?.[0] || uel.bracket?.Final;
      if (final && final.sh !== null && final.sh !== undefined) {
        let uelWinnerId = null;
        if (final.sh > final.sa) uelWinnerId = final.hId;
        else if (final.sa > final.sh) uelWinnerId = final.aId;
        else uelWinnerId = ((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId;
        const uelWinner = (uel.teams || []).find((t: any) => t.id === uelWinnerId);
        if (uelWinner) {
          archiveCompetition('C3', 1, uelWinner, uel, true);
        }
      }
    }

    const seasonNow = seasonState.season || 1;
    const seasonTitles: any[] = [];
    let careerQualifiedCLName: string | null = null;
    let careerQualifiedUELName: string | null = null;

    // 1. PRIMERO: Garantizar que TODAS las 8 ligas queden 100% terminadas en la temporada que finaliza
    const finishedLeaguesState: any = { ...comps };
    LEAGUE_IDS.forEach(id => {
      let c = finishedLeaguesState[id];
      if (!c) return;
      if (!leagueSeasonOver(c)) {
        const runDivToFinish = (teamsKey: string, mdKey: string, histKey: string, winKey: string, isDiv2?: boolean) => {
          let guard = 0;
          const total = divTotalRounds(c[teamsKey]);
          while ((c[mdKey] || 0) < total && guard++ < 80) {
            const prevMd = c[mdKey] || 0;
            const res = simulateDivisionMatchday(c[teamsKey], prevMd, c[histKey] || [], id, isDiv2);
            if (!res || !res.updatedTeams || res.nextMatchday <= prevMd) break;
            c = {
              ...c,
              [teamsKey]: res.updatedTeams,
              [mdKey]: res.nextMatchday,
              [histKey]: res.newHistory,
              [winKey]: res.isFinished ? true : c[winKey]
            };
            if (res.isFinished) break;
          }
        };
        runDivToFinish('teams', 'matchday', 'history', 'showWinner', false);
        runDivToFinish('teams2', 'matchday2', 'history2', 'showWinner2', true);
      }
      
      // Guardar la foto fija de la clasificación definitiva de esta temporada que acaba de terminar
      const snap1 = buildStandingsSnapshot(c.teams);
      const snap2 = buildStandingsSnapshot(c.teams2);
      finishedLeaguesState[id] = {
        ...c,
        previousStandings: snap1,
        previousStandings2: snap2,
        isLeagueFinished: true
      };
    });

    // 2. Determinar si el club del usuario en modo carrera clasificó a UCL o UEL en esta misma temporada finalizada
    if (career.active && career.teamId && career.compId && finishedLeaguesState[career.compId]) {
      const finishedComp = finishedLeaguesState[career.compId];
      if (career.div === 1 && Array.isArray(finishedComp.teams)) {
        const sortedD1 = [...finishedComp.teams].sort((a: any, b: any) => 
          (b.pts || 0) - (a.pts || 0) || 
          ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) || 
          (b.gf || 0) - (a.gf || 0)
        );
        const pos = sortedD1.findIndex((t: any) => t.id === career.teamId || t.name === (careerTeam?.name || '')) + 1;
        if (pos >= 1 && pos <= 4) {
          // Clasificado a Champions League (Top 4)
          careerQualifiedCLName = careerTeam?.name || sortedD1[pos - 1]?.name || null;
        } else if (pos === 5 || pos === 6 || (career.compId === 'L7' && pos <= 8)) {
          // Clasificado a UEFA Europa League (5.º y 6.º puesto)
          careerQualifiedUELName = careerTeam?.name || sortedD1[pos - 1]?.name || null;
        }
      }
    }

    // 3. Archivar títulos de liga de la temporada finalizada (fuera del state reducer para evitar re-render loops)
    LEAGUE_IDS.forEach(id => {
      const c = finishedLeaguesState[id];
      if (!c) return;
      const r1 = buildSeasonRecord(c.teams, seasonNow);
      const r2 = buildSeasonRecord(c.teams2, seasonNow);
      if (r1?.champion) {
        seasonTitles.push({ compId: id, compName: c.name, type: 'league', div: 1, winner: r1.champion, season: seasonNow });
        archiveCompetition(id, 1, r1.champion, c, true);
      }
      if (r2?.champion) {
        seasonTitles.push({ compId: id, compName: c.name, type: 'league', div: 2, winner: r2.champion, season: seasonNow });
        archiveCompetition(id, 2, r2.champion, c, true);
      }
    });

    if (seasonTitles.length > 0) {
      registerTitles(seasonTitles);
    }

    // 4. Actualizar estado de las competiciones en un único commit atómico
    setComps(prev => {
      const next = { ...prev };

      // Champions League (C1) TOMADA EXCLUSIVAMENTE de la temporada finalizada
      const clPrevHist = prev['C1']?.championsHistory || [];
      const clNew = getAutoFillData('C1', finishedLeaguesState, careerQualifiedCLName ? [careerQualifiedCLName] : []);
      if (clNew) {
        const mine = careerQualifiedCLName ? (clNew.teams || []).find((t: any) => t.name === careerQualifiedCLName) : null;
        next['C1'] = {
          ...clNew,
          id: 'C1',
          name: 'Champions League',
          type: 'cup',
          matchday: 0,
          history: [],
          phase: 'groups',
          showWinner: false,
          season: seasonNow + 1,
          sourceSeason: seasonNow,
          careerTeamName: careerQualifiedCLName || null,
          careerTeamId: mine?.id || null,
          userTeamId: mine?.id || clNew.userTeamId,
          championsHistory: clPrevHist
        };
      } else {
        const defaults = getDefaultComps();
        next['C1'] = { ...defaults['C1'], season: seasonNow + 1, sourceSeason: seasonNow, championsHistory: clPrevHist };
      }

      // UEFA Europa League (C3) TOMADA EXCLUSIVAMENTE de la misma temporada finalizada
      const uelPrevHist = prev['C3']?.championsHistory || [];
      const uelNew = getAutoFillData('C3', finishedLeaguesState, careerQualifiedUELName ? [careerQualifiedUELName] : []);
      if (uelNew) {
        const mine = careerQualifiedUELName ? (uelNew.teams || []).find((t: any) => t.name === careerQualifiedUELName) : null;
        next['C3'] = {
          ...uelNew,
          id: 'C3',
          name: 'UEFA Europa League',
          type: 'cup',
          matchday: 0,
          history: [],
          phase: 'Dieciseisavos',
          showWinner: false,
          season: seasonNow + 1,
          sourceSeason: seasonNow,
          careerTeamName: careerQualifiedUELName || null,
          careerTeamId: mine?.id || null,
          userTeamId: mine?.id || uelNew.userTeamId,
          championsHistory: uelPrevHist
        };
      }

      // Avanzar las ligas a la nueva temporada (reseteo y ascensos/descensos)
      LEAGUE_IDS.forEach(id => {
        const c = finishedLeaguesState[id];
        if (!c) return;
        const ns = computeLeagueNewSeason(c) || {};
        const prevSnapshot = buildStandingsSnapshot(c.teams);
        const prevSnapshot2 = buildStandingsSnapshot(c.teams2);
        
        next[id] = {
          ...c,
          ...ns,
          matchday: 0,
          matchday2: 0,
          history: [],
          history2: [],
          showWinner: false,
          showWinner2: false,
          previousStandings: prevSnapshot,
          previousStandings2: prevSnapshot2
        };
      });

      return next;
    });
    if (seasonTitles.length > 0) {
      registerTitles(seasonTitles);
    }
    setSeasonState(s => ({ season: (s.season || 1) + 1, globalMatchday: 1, currentWeek: 1, phase: 'leagues' }));
    setCareer(c => {
      if (!c.active) return c;
      // Sincronizar automáticamente la división del club del usuario si ascendió o descendió
      let updatedDiv = c.div;
      let wonPromotion = false;
      const leagueComp = comps[c.compId];
      if (leagueComp && leagueComp.type === 'league') {
        const sorted1 = [...(leagueComp.teams || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
        const sorted2 = [...(leagueComp.teams2 || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
        if (c.div === 2 && sorted2.slice(0, 3).some(t => t.id === c.teamId || t.name === (careerTeam?.name || ''))) {
          updatedDiv = 1;
          wonPromotion = true;
        } else if (c.div === 1 && sorted1.slice(-3).some(t => t.id === c.teamId || t.name === (careerTeam?.name || ''))) {
          updatedDiv = 2;
        }
      }
      return {
        ...c,
        div: updatedDiv,
        clQualified: Boolean(careerQualifiedCLName),
        clQualifiedFor: careerQualifiedCLName ? seasonNow + 1 : null,
        uelQualified: Boolean(careerQualifiedUELName),
        uelQualifiedFor: careerQualifiedUELName ? seasonNow + 1 : null,
        trophies: {
          ...c.trophies,
          promotions: (c.trophies?.promotions || 0) + (wonPromotion ? 1 : 0)
        },
        completedOfficeWeeks: [],
        trainedMatchday: -1,
        medicalImmunityWeeks: 0,
        activeInjury: null,
        lastSimulationFeedback: null,
        seasonLog: []
      };
    });
    setActiveCompId(null);
    setCompView('main');
    if (targetView === 'career' || (targetView !== 'hub' && career.active && view === 'career')) {
      setCareerTab('office');
      setView('career');
    } else {
      setView(targetView || 'hub');
    }
  };

  // El reloj global avanza sólo cuando TODAS las ligas resolvieron su jornada
  useEffect(() => {
    if (seasonState.phase !== 'leagues') return;
    if (LEAGUE_IDS.some(id => leaguePendingAt(comps[id], globalMatchday))) return;
    if (LEAGUE_IDS.every(id => leagueSeasonOver(comps[id]))) {
      setSeasonState(s => ({ ...s, phase: 'closing' }));
      return;
    }
    setSeasonState(s => {
      const nextGlobalMd = (s.globalMatchday || 1) + 1;
      const expectedWeek = getWeekForLeagueMatchday(nextGlobalMd);
      return {
        ...s,
        globalMatchday: nextGlobalMd,
        currentWeek: Math.max(s.currentWeek || 1, expectedWeek)
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps, globalMatchday, seasonState.phase]);

  // Helper para asegurar persistencia manual
  const manualSave = () => {
    try { 
      window.localStorage.setItem(`${APP_ID}_comps`, JSON.stringify(comps)); 
      setShowSaveModal(true);
      setTimeout(() => setShowSaveModal(false), 2000);
    } catch(e) {}
  };

  const archiveCompetition = (compId: string, div: number, customWinner: any = null, compOverride: any = null, skipSetComps: boolean = false) => {
    const comp = compOverride || comps[compId];
    if (!comp) return;
    const isDiv2 = div === 2;
    const t = isDiv2 ? comp.teams2 : comp.teams;

    let winner = customWinner;
    if (!winner && Array.isArray(t) && t.length > 0) {
      if (comp.type === 'league') {
        winner = [...t].sort((a, b) => (b.pts || 0) - (a.pts || 0) || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)))[0];
      } else {
        const final = comp.bracket?.Final?.[0] || comp.bracket?.Final;
        if (final && final.sh !== null && final.sh !== undefined) {
          if (final.sh > final.sa) winner = t.find(x => x.id === final.hId);
          else if (final.sa > final.sh) winner = t.find(x => x.id === final.aId);
          else winner = t.find(x => x.id === (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId));
        }
      }
    }

    const currentSeasonNum = comp.season || seasonState?.season || 1;
    const uniqueArchId = `arch_${compId}_${div}_s${currentSeasonNum}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry = { 
      id: uniqueArchId, compId, name: comp.name, date: new Date().toLocaleDateString(), div, winner, 
      teams: t, history: isDiv2 ? comp.history2 : comp.history, bracket: comp.bracket, groups: comp.groups, type: comp.type,
      season: currentSeasonNum
    };
    setArchive(prev => sanitizeArchive([entry, ...(prev || []).filter(e => !(e.compId === compId && (e.div || 1) === (div || 1)))]));
    if (winner) {
      const activeRecord = comp.type === 'league' 
        ? buildSeasonRecord(t, currentSeasonNum) 
        : buildCupSeasonRecord(comp, currentSeasonNum, winner);

      registerTitle({
        compId, 
        compName: comp.name, 
        type: comp.type === 'league' ? 'league' : 'cup',
        div, 
        winner: {
          name: winner.name,
          color1: winner.color1,
          color2: winner.color2,
          isFlag: winner.isFlag,
          pts: winner.pts,
          gf: winner.gf,
          ga: winner.ga,
          w: winner.w,
          d: winner.d,
          l: winner.l
        }, 
        runnerUp: activeRecord?.runnerUp || null,
        thirdPlace: activeRecord?.thirdPlace || null,
        finalMatch: activeRecord?.finalMatch || null,
        records: activeRecord?.records,
        season: currentSeasonNum
      });
      if (!skipSetComps) {
        if (comp.type !== 'league') {
          const cupRecord = activeRecord || buildCupSeasonRecord(comp, currentSeasonNum, winner);
          if (cupRecord) {
            setComps(prev => {
              const current = prev[compId];
              if (!current) return prev;
              return {
                ...prev,
                [compId]: {
                  ...current,
                  championsHistory: pushRecord(cupRecord, current.championsHistory)
                }
              };
            });
          }
        } else {
          const legRecord = activeRecord || buildSeasonRecord(t, currentSeasonNum);
          if (legRecord) {
            setComps(prev => {
              const current = prev[compId];
              if (!current) return prev;
              return {
                ...prev,
                [compId]: {
                  ...current,
                  [isDiv2 ? 'championsHistory2' : 'championsHistory']: pushRecord(legRecord, current[isDiv2 ? 'championsHistory2' : 'championsHistory'])
                }
              };
            });
          }
        }
      }
    }
  };

  const [matchState, setMatchState] = useState(null);
  const [rolling, setRolling] = useState(false);
  const rollingRef = useRef(false);
  const rollIntervalRef = useRef(null);
  const rollTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const startMatch = (homeId, awayId, isDiv2Context) => {
    if (rollIntervalRef.current) { clearInterval(rollIntervalRef.current); rollIntervalRef.current = null; }
    if (rollTimeoutRef.current) { clearTimeout(rollTimeoutRef.current); rollTimeoutRef.current = null; }
    rollingRef.current = false;
    setRolling(false);
    const sourceTeams = isDiv2Context ? activeComp.teams2 : activeComp.teams;
    let home = sourceTeams.find(t => t.id === homeId);
    let away = sourceTeams.find(t => t.id === awayId);
    if (!home || !away) return;

    if (career?.active && careerTeam) {
      const isCareerHome = (home.name === careerTeam.name) && (activeCompId === career.compId ? (isDiv2Context ? career.div === 2 : career.div === 1) : (activeCompId === 'C1' && (clComp?.careerTeamId === career.teamId || clComp?.teams?.some(t => t.id === home.id && t.name === careerTeam.name))));
      const isCareerAway = (away.name === careerTeam.name) && (activeCompId === career.compId ? (isDiv2Context ? career.div === 2 : career.div === 1) : (activeCompId === 'C1' && (clComp?.careerTeamId === career.teamId || clComp?.teams?.some(t => t.id === away.id && t.name === careerTeam.name))));

      if (isCareerHome || isCareerAway) {
        const base = {
          att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
          opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
          def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
        };
        const injury = career.activeInjury && career.activeInjury.matchday === careerMd ? career.activeInjury : null;
        let dist = career.tactic ? { ...career.tactic } : { ...base };
        if (injury) {
          dist = {
            ...dist,
            [injury.attr]: Math.max(1, (dist[injury.attr] || base[injury.attr] || 1) - (injury.penalty || 1))
          };
        }
        if (isCareerHome) {
          home = { ...home, att: dist.att, opp: dist.opp, def: dist.def };
        }
        if (isCareerAway) {
          away = { ...away, att: dist.att, opp: dist.opp, def: dist.def };
        }
      }
    }

    const isVuelta = activeCompId === 'C1' && activeComp.matchday % 2 !== 0 && activeComp.phase !== 'Final' && activeComp.phase !== 'groups';
    let aggregate = null;
    if (isVuelta && activeComp.bracket) {
      const matchArray = Array.isArray(activeComp.bracket[activeComp.phase]) ? activeComp.bracket[activeComp.phase] : [activeComp.bracket[activeComp.phase]];
      const match = matchArray.find(m => m && m.hId === awayId && m.aId === homeId);
      if (match) aggregate = { sh: match.sa, sa: match.sh };
    }

    setMatchState(null);
    setMatchState({
      home, away, scoreH: 0, scoreA: 0, oppH: home.opp, oppA: away.opp, turn: 'H', phase: 'att', isDiv2Context,
      logs: ['⚽ ¡Comienza el encuentro!', aggregate ? `📊 Global: ${aggregate.sh} - ${aggregate.sa}` : 'Al terreno de juego.'],
      lastDie: 1, finished: false, isKnockout: activeComp.type === 'knockout' || (activeComp.type === 'cup' && activeComp.phase !== 'groups'), penalties: null, aggregate
    });
    setCompView('playing');
  };

  const handleRoll = () => {
    if (rollingRef.current || rolling || !matchState || matchState.finished) return;
    rollingRef.current = true;
    setRolling(true);
    if (rollIntervalRef.current) { clearInterval(rollIntervalRef.current); rollIntervalRef.current = null; }
    if (rollTimeoutRef.current) { clearTimeout(rollTimeoutRef.current); rollTimeoutRef.current = null; }
    rollIntervalRef.current = setInterval(() => setMatchState(prev => prev ? { ...prev, lastDie: roll1D6() } : prev), 100);

    rollTimeoutRef.current = setTimeout(() => {
      if (rollIntervalRef.current) { clearInterval(rollIntervalRef.current); rollIntervalRef.current = null; }
      rollTimeoutRef.current = null;
      const die = roll1D6();
      setMatchState(prev => {
        if (!prev) return prev;
        if (prev.phase === 'penalties') {
          const isHome = prev.penalties.turn === 'H';
          const attacker = isHome ? prev.home : prev.away;
          const defender = isHome ? prev.away : prev.home;
          let { scoreH, scoreA, shotsH, shotsA, phase: penPhase = 'att' } = prev.penalties;
          let historyH = [...(prev.penalties.historyH || [])]; let historyA = [...(prev.penalties.historyA || [])];
          let newLogs = [...prev.logs]; let nextTurn = prev.penalties.turn;

          if (penPhase === 'att') {
            if (die <= attacker.att) { newLogs.unshift('🎯 ' + attacker.name + ' saca un ' + die + '. ¡A portería!'); penPhase = 'gk'; } 
            else {
              newLogs.unshift('❌ ' + attacker.name + ' falló el penalti (' + die + ').');
              if (isHome) { historyH = [...historyH, false]; shotsH++; } else { historyA = [...historyA, false]; shotsA++; }
              nextTurn = isHome ? 'A' : 'H'; penPhase = 'att';
            }
          } else {
            if (die > defender.def) {
              newLogs.unshift('⚽ ¡GOL de penalti! ' + attacker.name + ' marcó.');
              if (isHome) { historyH = [...historyH, true]; scoreH++; } else { historyA = [...historyA, true]; scoreA++; }
            } else {
              newLogs.unshift('🧤 ¡PARADÓN! El portero detuvo el penalti.');
              if (isHome) historyH = [...historyH, false]; else historyA = [...historyA, false];
            }
            if (isHome) shotsH++; else shotsA++;
            nextTurn = isHome ? 'A' : 'H'; penPhase = 'att';
          }

          let finished = false;
          if (penPhase === 'att') {
            if (shotsH >= 5 && shotsA >= 5) { if (scoreH !== scoreA && shotsH === shotsA) finished = true; }
            else if (scoreH > scoreA + (5 - shotsA) || scoreA > scoreH + (5 - shotsH)) finished = true;
          }
          if (finished) {
            newLogs.unshift('🏆 Ganador tanda: ' + (scoreH > scoreA ? prev.home.name : prev.away.name));
            return { ...prev, lastDie: die, logs: newLogs, finished: true, penalties: { scoreH, scoreA, shotsH, shotsA, finished: true, historyH, historyA } };
          }
          return { ...prev, lastDie: die, logs: newLogs, penalties: { scoreH, scoreA, shotsH, shotsA, turn: nextTurn, phase: penPhase, historyH, historyA } };
        }

        const isHome = prev.turn === 'H';
        const attacker = isHome ? prev.home : prev.away; const defender = isHome ? prev.away : prev.home;
        let newLogs = [...prev.logs]; let { scoreH, scoreA, phase: newPhase } = prev;

        if (newPhase === 'att') {
          if (die <= attacker.att) { newLogs.unshift('🎯 ' + attacker.name + ' saca ' + die + '. ¡Va a portería!'); newPhase = 'gk'; } 
          else { newLogs.unshift('❌ ' + attacker.name + ' falla (Dado: ' + die + ').'); return advanceTurn({ ...prev, lastDie: die, logs: newLogs, phase: 'att' }); }
        } else {
          if (die > defender.def) { newLogs.unshift('⚽ ¡GOL de ' + attacker.name + '! (Dado: ' + die + ')'); isHome ? scoreH++ : scoreA++; } 
          else { newLogs.unshift('🧤 ¡PARADÓN! Evitó el gol (Dado: ' + die + ').'); }
          return advanceTurn({ ...prev, lastDie: die, logs: newLogs, scoreH, scoreA, phase: 'att' });
        }
        return { ...prev, lastDie: die, logs: newLogs, phase: newPhase };
      });
      rollingRef.current = false;
      setRolling(false);
    }, 800);
  };

  const advanceTurn = (state) => {
    let nextOppH = state.turn === 'H' ? state.oppH - 1 : state.oppH;
    let nextOppA = state.turn === 'A' ? state.oppA - 1 : state.oppA;
    let nextTurn = state.turn === 'H' ? 'A' : 'H';
    if (nextTurn === 'H' && nextOppH <= 0) nextTurn = 'A';
    if (nextTurn === 'A' && nextOppA <= 0) nextTurn = 'H';

    if (nextOppH <= 0 && nextOppA <= 0) {
      const isChampions = activeCompId === 'C1' || !!state.isChampions;
      const comp = (activeCompId ? comps[activeCompId] : null) || (isChampions ? comps['C1'] : null);
      const phase = state.championsPhase || comp?.phase;
      const isIda = isChampions && phase !== 'Final' && phase !== 'groups' && (state.isVuelta === false || (comp && (comp.matchday || 0) % 2 === 0));
      const isVuelta = isChampions && phase !== 'Final' && phase !== 'groups' && (state.isVuelta === true || (comp && (comp.matchday || 0) % 2 !== 0));

      let needsPenalties = false;
      if (state.isKnockout) {
        if (isVuelta) {
          if (state.aggregate) {
            needsPenalties = (state.aggregate.sh + state.scoreH === state.aggregate.sa + state.scoreA);
          } else {
            needsPenalties = (state.scoreH === state.scoreA);
          }
        } else if (!isIda) {
          needsPenalties = (state.scoreH === state.scoreA);
        }
      }

      if (needsPenalties) return { ...state, oppH: 0, oppA: 0, phase: 'penalties', penalties: { scoreH: 0, scoreA: 0, turn: 'H', shotsH: 0, shotsA: 0, phase: 'att', finished: false, historyH: [], historyA: [] }, logs: ['⚖️ Empate en el global. ¡Tanda de Penaltis!', ...state.logs] };
      return { ...state, oppH: 0, oppA: 0, finished: true, logs: ['🏁 Final del partido.', ...state.logs] };
    }
    return { ...state, oppH: nextOppH, oppA: nextOppA, turn: nextTurn, phase: 'att' };
  };

  const simulateDivisionMatchday = (teams: any[], matchday: number, history: any[], compId?: string, isDiv2?: boolean) => {
    const schedule = generateLeagueSchedule(teams);
    if (matchday >= schedule.length) return null;
    const currentRound = Array.isArray(schedule) ? schedule[matchday] : [];
    const results = currentRound.map((m: any) => {
      let h = teams.find((t: any) => t.id === m.homeId);
      let a = teams.find((t: any) => t.id === m.awayId);
      if (career?.active && careerTeam) {
        const isCareerHome = h && (h.name === careerTeam.name) && (compId ? (compId === career.compId && (isDiv2 ? career.div === 2 : career.div === 1)) : (h.id === career.teamId && h.name === careerTeam.name));
        const isCareerAway = a && (a.name === careerTeam.name) && (compId ? (compId === career.compId && (isDiv2 ? career.div === 2 : career.div === 1)) : (a.id === career.teamId && a.name === careerTeam.name));

        if (isCareerHome || isCareerAway) {
          const base = {
            att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
            opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
            def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
          };
          const injury = career.activeInjury && career.activeInjury.matchday === matchday ? career.activeInjury : null;
          let dist = career.tactic ? { ...career.tactic } : { ...base };
          if (injury) {
            dist = {
              ...dist,
              [injury.attr]: Math.max(1, (dist[injury.attr] || base[injury.attr] || 1) - (injury.penalty || 1))
            };
          }
          if (isCareerHome && h) {
            h = { ...h, att: dist.att, opp: dist.opp, def: dist.def };
          }
          if (isCareerAway && a) {
            a = { ...a, att: dist.att, opp: dist.opp, def: dist.def };
          }
        }
      }
      const { sh, sa } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);
      return { hId: m.homeId, aId: m.awayId, sh, sa };
    });
    const updatedTeams = teams.map((t: any) => {
      const res = results.find((r: any) => r.hId === t.id || r.aId === t.id);
      if (!res) return t;
      const isHome = res.hId === t.id;
      const gf = isHome ? res.sh : res.sa; const ga = isHome ? res.sa : res.sh;
      const w = gf > ga ? 1 : 0; const d = gf === ga ? 1 : 0; const l = gf < ga ? 1 : 0;
      return { ...t, p: t.p + 1, w: t.w + w, d: t.d + d, l: t.l + l, gf: t.gf + gf, ga: t.ga + ga, pts: t.pts + (w * 3 + d) };
    });
    const isFinished = matchday >= schedule.length - 1;
    const nextMatchday = matchday + 1;
    const newHistory = [{ day: matchday + 1, results }, ...history];
    return { updatedTeams, nextMatchday, newHistory, isFinished };
  };

  // Sincroniza (con el motor de dados existente) todas las jornadas pendientes
  // de las ligas indicadas hasta ponerlas al día con la jornada global.
  // Se hace en UNA sola actualización de estado para que nunca se resuelva
  // dos veces la misma jornada, aunque se llame en cadena.
  const syncLeaguesToGlobal = (ids: string[]) => {
    setComps(prev => {
      const next = { ...prev };
      let changed = false;
      ids.forEach(compId => {
        const comp = prev[compId];
        if (!comp || comp.type !== 'league') return;
        let upd = { ...comp };
        let touched = false;
        const runDiv = (teamsKey, mdKey, histKey, winKey, isDiv2?: boolean) => {
          let guard = 0;
          while (divPendingAt(upd[teamsKey], upd[mdKey], globalMatchday) && guard++ < 60) {
            const res = simulateDivisionMatchday(upd[teamsKey], upd[mdKey] || 0, upd[histKey] || [], compId, isDiv2);
            if (!res) break;
            touched = true;
            upd = {
              ...upd,
              [teamsKey]: res.updatedTeams,
              [mdKey]: res.nextMatchday,
              [histKey]: res.newHistory,
              [winKey]: res.isFinished ? true : upd[winKey]
            };
          }
        };
        runDiv('teams', 'matchday', 'history', 'showWinner', false);
        runDiv('teams2', 'matchday2', 'history2', 'showWinner2', true);
        if (touched) {
          // Al terminar su calendario, la liga guarda una COPIA independiente
          // de su clasificación final.
          if (leagueSeasonOver(upd)) {
            upd.previousStandings = buildStandingsSnapshot(upd.teams) || upd.previousStandings || null;
            upd.previousStandings2 = buildStandingsSnapshot(upd.teams2) || upd.previousStandings2 || null;
          }
          next[compId] = upd;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  // Tras un partido manual: el resto del universo resuelve la misma jornada global.
  const simulateOtherLeaguesToGlobal = (exceptId) =>
    syncLeaguesToGlobal(LEAGUE_IDS.filter(id => id !== exceptId));

  // ==========================================
  // MODO CARRERA (GDD DiceLeague V8 + V11)
  // ==========================================
  const CAREER_KEY = `${APP_ID}_career`;
  const CAREER_HISTORY_KEY = `${APP_ID}_career_history`;
  const [career, setCareer] = useState(() => {
    try {
      const saved = window.localStorage.getItem(CAREER_KEY);
      if (saved) { const parsed = JSON.parse(saved); if (parsed && typeof parsed === 'object') return { ...DEFAULT_CAREER, ...parsed }; }
    } catch (e) {}
    return { ...DEFAULT_CAREER };
  });
  useEffect(() => { try { window.localStorage.setItem(CAREER_KEY, JSON.stringify(career)); } catch (e) {} }, [career]);

  const [pastCareers, setPastCareers] = useState<any[]>(() => {
    try {
      const saved = window.localStorage.getItem(CAREER_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(CAREER_HISTORY_KEY, JSON.stringify(pastCareers));
    } catch (e) {}
  }, [pastCareers]);

  const handleDeleteCareerHard = () => {
    // Restaurar atributos originales del club en la liga si fueron mejorados con PE
    if (career.originalTeamStats || careerTeam) {
      setComps(prev => restoreClubOriginalStatsInComps(prev, career.originalTeamStats, careerTeam?.name));
    }

    setCareer({ ...DEFAULT_CAREER });
    try {
      window.localStorage.removeItem(CAREER_KEY);
    } catch (e) {}
    setView('careerSelect');
  };

  const handleArchiveAndResetCareer = () => {
    // Archivar carrera actual con fecha y datos del club
    const archiveEntry = {
      id: 'arch_' + Date.now(),
      date: new Date().toISOString(),
      archivedAt: new Date().toISOString(),
      manager: career.manager || 'Entrenador',
      teamName: careerTeam?.name || 'Club',
      teamId: career.teamId,
      compId: career.compId,
      div: career.div,
      color1: careerTeam?.color1 || '#1e3a8a',
      color2: careerTeam?.color2 || '#3b82f6',
      isFlag: careerTeam?.isFlag,
      reputation: career.reputation || 10,
      tier: career.tier || 1,
      startedSeason: 1,
      finalSeason: (career.seasonHistory || []).length + (career.seasonLog?.length ? 1 : 1),
      seasonsCount: (career.seasonHistory || []).length + (career.seasonLog?.length ? 1 : 1),
      stats: {
        matches: career.stats?.matches || 0,
        wins: career.stats?.wins || 0,
        draws: career.stats?.draws || 0,
        losses: career.stats?.losses || 0,
        gf: career.stats?.gf || 0,
        ga: career.stats?.ga || 0,
      },
      trophies: {
        leagues: career.trophies?.leagues || 0,
        champions: career.trophies?.champions || 0,
        uel: career.trophies?.uel || 0,
        promotions: career.trophies?.promotions || 0,
      },
      seasonHistory: [...(career.seasonHistory || [])],
      clParticipations: career.clParticipations || 0,
      hallOfFame: career.hallOfFame || false,
      isChampion: (career.trophies?.leagues || 0) > 0 || (career.trophies?.champions || 0) > 0 || (career.trophies?.uel || 0) > 0,
      status: (career.trophies?.champions || 0) > 0 ? 'Leyenda de Champions' : (career.trophies?.uel || 0) > 0 ? 'Campeón Continental (UEL)' : (career.trophies?.leagues || 0) > 0 ? 'Campeón de Liga' : 'Proyecto Finalizado'
    };

    setPastCareers(prev => [archiveEntry, ...prev]);

    // Restaurar atributos originales del club en la liga si fueron mejorados con PE
    if (career.originalTeamStats || careerTeam) {
      setComps(prev => restoreClubOriginalStatsInComps(prev, career.originalTeamStats, careerTeam?.name));
    }

    setCareer({ ...DEFAULT_CAREER });
    try {
      window.localStorage.removeItem(CAREER_KEY);
    } catch (e) {}
    setView('careerSelect');
  };

  const handleDeletePastCareer = (idOrIndex: string | number) => {
    setPastCareers(prev => prev.filter((c, i) => (typeof idOrIndex === 'number' ? i !== idOrIndex : c.id !== idOrIndex)));
  };
  const [careerReview, setCareerReview] = useState(null);
  const [simulationInjuryAlert, setSimulationInjuryAlert] = useState<{
    affectedAttr: 'att' | 'opp' | 'def';
    attrLabel: string;
    die: number;
    physioCost: number;
    categoryLabel: string;
    isChampions?: boolean;
  } | null>(null);

  const careerComp = comps[career.compId] || comps[CAREER_LEAGUE_ID];
  const careerTeamsKey = career.div === 2 ? 'teams2' : 'teams';
  const careerTeams = careerComp?.[careerTeamsKey] || [];
  const careerTeam = careerTeams.find(t => t.id === career.teamId) || null;
  const careerMdKey = career.div === 2 ? 'matchday2' : 'matchday';
  const careerHistKey = career.div === 2 ? 'history2' : 'history';
  const careerMd = careerComp?.[careerMdKey] || 0;
  const careerSchedule = useMemo(() => generateLeagueSchedule(careerTeams), [careerTeams]);
  const careerStandings = useMemo(
    () => [...careerTeams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf),
    [careerTeams]
  );
  const careerPosition = careerStandings.findIndex(t => t.id === career.teamId) + 1;
  const careerDivisionFinished = careerSchedule.length > 0 && careerMd >= careerSchedule.length;
  const careerFixture = !careerDivisionFinished
    ? (careerSchedule[careerMd] || []).find(m => m.homeId === career.teamId || m.awayId === career.teamId)
    : null;
  const careerIsHome = !!careerFixture && careerFixture.homeId === career.teamId;
  const careerRival = careerFixture
    ? careerTeams.find(t => t.id === (careerIsHome ? careerFixture.awayId : careerFixture.homeId))
    : null;
  const careerWorldPending = pendingLeagueIds.filter(id => id !== career.compId).length;
  // Candidatos para (re)empezar: si la temporada de Segunda ya está en marcha,
  // los 5 últimos de la tabla real de Miscelánea; si no, los 5 más humildes.
  const careerCandidates = useMemo(() => {
    const miscelanea = comps[CAREER_LEAGUE_ID];
    const pool = miscelanea?.teams2 || [];
    const playedAny = (miscelanea?.matchday2 || 0) > 0 || pool.some(t => (t.p || 0) > 0);
    let list;
    if (playedAny) {
      const standings = [...pool].sort((a, b) => (b.pts || 0) - (a.pts || 0) || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) || (b.gf || 0) - (a.gf || 0));
      list = standings.slice(Math.max(0, standings.length - 5));
    } else {
      list = worstTeams(pool, 5);
    }
    const firstId = career.firstTeamId;
    if (firstId && career.firstTeamCompId === CAREER_LEAGUE_ID && !list.some(t => t.id === firstId)) {
      const first = pool.find(t => t.id === firstId);
      if (first && tierOf(first) <= 2) list.push(first);
    }
    return list;
  }, [comps, career.firstTeamId, career.firstTeamCompId]);
  const careerUi = { Shield, DieIcon, FormBadges, PenaltyDots };

  // RESTAURACIÓN Y PROTECCIÓN DE ESTADÍSTICAS DEL EQUIPO (Estadísticas originales + mejoras de P/E)
  useEffect(() => {
    if (!career.active || !career.teamId || !careerTeam || career.fired) return;

    // Estadísticas base auténticas del club del usuario (originales + mejoras de PE aplicadas)
    const base = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };

    const hasValidInjury = career.activeInjury && career.activeInjury.matchday === careerMd;

    // Si las stats en comps difieren de base (mejoras de PE), sincronizar comps
    if (careerTeam.att !== base.att || careerTeam.opp !== base.opp || careerTeam.def !== base.def) {
      setComps(prev => {
        const comp = prev[career.compId];
        if (!comp) return prev;
        const key = career.div === 2 ? 'teams2' : 'teams';
        const teams = comp[key] || [];
        return {
          ...prev,
          [career.compId]: {
            ...comp,
            [key]: teams.map(t => t.id === career.teamId ? { ...t, att: base.att, opp: base.opp, def: base.def } : t)
          }
        };
      });
    }

    if (!career.baseDist || (career.activeInjury && !hasValidInjury) || career.baseDist.att !== base.att || career.baseDist.opp !== base.opp || career.baseDist.def !== base.def) {
      setCareer(c => {
        const validInjury = c.activeInjury && c.activeInjury.matchday === careerMd;
        return {
          ...c,
          baseDist: base,
          tactic: c.tactic || base,
          activeInjury: validInjury ? c.activeInjury : null
        };
      });
    }
  }, [career.active, career.teamId, career.compId, career.div, careerMd, careerTeam, career.fired]);

  // Garantizar ofertas de rescate activas si el mánager está despedido y no tiene ofertas en su buzón
  useEffect(() => {
    if (career.active && career.fired && (!career.offers || career.offers.length === 0) && comps) {
      const leagueNames = Object.fromEntries(LEAGUE_IDS.map(id => [id, comps[id]?.name]));
      const rescueOffers = buildOffers({
        comps,
        career,
        performance: { score: -2, label: 'En busca de proyecto' },
        reputation: career.reputation || 10,
        season: seasonState?.season || 1,
        leagueNames,
        kind: 'fired',
        objectivesMet: 0
      });
      if (rescueOffers.length > 0) {
        setCareer(c => ({
          ...c,
          offers: rescueOffers
        }));
      }
    }
  }, [career.active, career.fired, career.offers?.length, comps, seasonState?.season]);

  const openCareer = () => {
    if (career.active && careerTeam) setView('career');
    else setView('careerSelect');
  };

  const setupVillarrealScenario = () => {
    // Buscar Villarreal CF en L1 o presets
    const l1Comp = comps['L1'];
    let vTeam = (l1Comp?.teams || []).find(t => t.name === 'Villarreal CF' || t.name?.toLowerCase().includes('villarreal'));
    if (!vTeam) {
      vTeam = {
        id: 5,
        name: 'Villarreal CF',
        att: 5,
        opp: 4,
        def: 4,
        color1: '#facc15',
        color2: '#1e3a8a',
        p: 38,
        w: 19,
        d: 9,
        l: 10,
        gf: 65,
        ga: 44,
        pts: 66
      };
    }

    const totalMatchdays = 38;

    // Actualizar todas las ligas para que estén completas
    setComps(prev => {
      const next = { ...prev };

      // 1. Configurar L1 (La Liga Española) con Villarreal en 5º puesto
      const existingL1 = prev['L1'] || {};
      const teamsL1 = existingL1.teams && existingL1.teams.length > 0 ? [...existingL1.teams] : [];

      // Puntos y registros calibrados para ubicar a Villarreal exactamente en 5º lugar (puesto Europa League / Champions)
      // 1. Real Madrid (88 pts)
      // 2. FC Barcelona (85 pts)
      // 3. Atlético Madrid (76 pts)
      // 4. Athletic Club (70 pts)
      // 5. Villarreal CF (66 pts) -> 5º PUESTO
      // 6. Real Sociedad (63 pts)
      // 7. Real Betis (59 pts)
      // ... resto
      const orderedNames = [
        'Real Madrid',
        'FC Barcelona',
        'Atlético Madrid',
        'Athletic Club',
        'Villarreal CF',
        'Real Sociedad',
        'Real Betis',
        'Girona FC',
        'Celta Vigo',
        'Valencia CF',
        'Sevilla FC',
        'Osasuna',
        'Getafe',
        'Mallorca',
        'Rayo Vallecano',
        'Elche CF',
        'Alavés',
        'Levante UD',
        'Real Oviedo',
        'Espanyol'
      ];

      const simulatedPts = [88, 85, 76, 70, 66, 63, 59, 54, 51, 48, 45, 43, 41, 39, 37, 35, 33, 30, 27, 24];
      const simulatedGF =  [82, 80, 68, 62, 65, 54, 52, 48, 46, 44, 42, 38, 35, 34, 33, 31, 30, 28, 25, 22];
      const simulatedGA =  [30, 34, 32, 36, 44, 38, 42, 45, 48, 49, 52, 50, 53, 55, 58, 60, 62, 65, 70, 75];

      let updatedTeamsL1 = [];
      if (teamsL1.length > 0) {
        // Mapear los equipos existentes ajustando sus estadísticas para que el orden final sea el deseado
        // Buscamos cada equipo por nombre o id
        const assigned = new Set();
        orderedNames.forEach((targetName, idx) => {
          let found = teamsL1.find(t => !assigned.has(t.id) && (t.name === targetName || t.name.toLowerCase().includes(targetName.toLowerCase())));
          if (!found) {
            found = teamsL1.find(t => !assigned.has(t.id));
          }
          if (found) {
            assigned.add(found.id);
            const pts = simulatedPts[idx] || (60 - idx * 2);
            const gf = simulatedGF[idx] || 40;
            const ga = simulatedGA[idx] || 40;
            const w = Math.floor(pts / 3);
            const d = pts % 3;
            const l = Math.max(0, totalMatchdays - w - d);
            updatedTeamsL1.push({
              ...found,
              p: totalMatchdays,
              w,
              d,
              l,
              gf,
              ga,
              pts
            });
          }
        });

        // Asegurar que si quedó alguno afuera se agregue
        teamsL1.forEach(t => {
          if (!assigned.has(t.id)) {
            updatedTeamsL1.push({
              ...t,
              p: totalMatchdays,
              w: 5,
              d: 5,
              l: 28,
              gf: 20,
              ga: 70,
              pts: 20
            });
          }
        });
      }

      next['L1'] = {
        ...existingL1,
        teams: updatedTeamsL1.length > 0 ? updatedTeamsL1 : existingL1.teams,
        matchday: totalMatchdays,
        showWinner: true
      };

      // 2. Marcar el resto de ligas como terminadas para permitir el paso de temporada y clasificaciones
      LEAGUE_IDS.forEach(cId => {
        if (cId !== 'L1' && next[cId]) {
          const compTeams = next[cId].teams || [];
          const mdCount = compTeams.length > 0 ? (compTeams.length - 1) * 2 : 38;
          next[cId] = {
            ...next[cId],
            matchday: mdCount,
            showWinner: true,
            teams: compTeams.map((t, idx) => ({
              ...t,
              p: mdCount,
              w: Math.max(0, mdCount - 10 - idx),
              d: 5,
              l: idx + 5,
              gf: Math.max(20, 70 - idx * 2),
              ga: 30 + idx * 2,
              pts: Math.max(15, 80 - idx * 3)
            }))
          };
        }
      });

      return next;
    });

    // 3. Configurar el estado de carrera para Villarreal
    const vId = vTeam.id;
    setCareer({
      ...DEFAULT_CAREER,
      active: true,
      manager: career.manager || 'Mánager Submarino',
      compId: 'L1',
      div: 1,
      teamId: vId,
      tier: 2,
      pe: 5,
      reputation: 35, // Buena reputación en Primera División
      startedSeason: 1,
      contractStart: 1,
      contractSeasons: 2,
      signedForSeason: 1,
      lastProcessedSeason: 0,
      medicalImmunityWeeks: 0,
      trainedMatchday: -1,
      stats: {
        matches: 38,
        wins: 19,
        draws: 9,
        losses: 10,
        gf: 65,
        ga: 44
      },
      baseDist: { att: vTeam.att || 5, opp: vTeam.opp || 4, def: vTeam.def || 4 },
      tactic: { att: vTeam.att || 5, opp: vTeam.opp || 4, def: vTeam.def || 4 },
      seasonHistory: [],
      firstTeamId: vId,
      firstTeamCompId: 'L1',
      firstTeamDiv: 1,
      originalTeamStats: {
        teamId: vId,
        compId: 'L1',
        div: 1,
        att: vTeam.att || 5,
        opp: vTeam.opp || 4,
        def: vTeam.def || 4
      }
    });

    // 4. Configurar seasonState en la última semana de la temporada (Semana 40: fin de liga)
    setSeasonState(s => ({
      ...s,
      season: s.season || 1,
      currentWeek: 40,
      phase: 'league'
    }));

    setView('career');
  };

  // Exponer a window para conveniencia o llamadas desde consola si se requiere
  useEffect(() => {
    (window as any).setupVillarrealScenario = setupVillarrealScenario;
  }, [comps, career]);

  const startCareer = (teamId, manager) => {
    const team = (comps[CAREER_LEAGUE_ID]?.teams2 || []).find(t => t.id === teamId);
    if (!team) return;

    // Si ya había un club previo con estadísticas modificadas, restaurar el club anterior
    if (career.originalTeamStats || careerTeam) {
      setComps(prev => restoreClubOriginalStatsInComps(prev, career.originalTeamStats, careerTeam?.name));
    }

    setCareer(c => ({
      ...DEFAULT_CAREER,
      active: true,
      manager,
      compId: CAREER_LEAGUE_ID,
      div: CAREER_DIV,
      teamId,
      tier: tierOf(team),
      pe: 0,
      // La reputación es tuya: si ya tenías carrera, no se pierde al recomenzar
      reputation: c.seasonHistory?.length ? clampRep(c.reputation) : 10,
      startedSeason: seasonState.season || 1,
      contractStart: seasonState.season || 1,
      contractSeasons: CONTRACT_SEASONS,
      baseDist: { att: team.att, opp: team.opp, def: team.def },
      tactic: { att: team.att, opp: team.opp, def: team.def },
      seasonHistory: c.seasonHistory || [],
      firstTeamId: c.firstTeamId || teamId,
      firstTeamCompId: c.firstTeamCompId || CAREER_LEAGUE_ID,
      firstTeamDiv: c.firstTeamDiv || CAREER_DIV,
      signedForSeason: seasonState.season || 1,
      lastProcessedSeason: c.lastProcessedSeason || 0,
      medicalImmunityWeeks: 0,
      trainedMatchday: -1,
      originalTeamStats: {
        teamId: team.id,
        compId: CAREER_LEAGUE_ID,
        div: CAREER_DIV,
        att: team.att,
        opp: team.opp,
        def: team.def
      }
    }));
    setView('career');
  };

  const setCareerTactic = (dist) => setCareer(c => ({ ...c, tactic: dist }));

  const renameCareerManager = (name) => {
    const clean = (name || '').trim().slice(0, 24);
    if (!clean) return;
    setCareer(c => ({ ...c, manager: clean }));
  };

  const spendCareerPE = (attr) => {
    if (!careerTeam) return;
    const caps = tierCaps(career.tier || 1);
    const val = careerTeam[attr] || 0;
    const cost = peCostFor(val);
    if (val >= caps[attr] || career.pe < cost) return;
    const compId = career.compId;
    const upgraded = { ...careerTeam, [attr]: val + 1 };
    setComps(prev => ({
      ...prev,
      [compId]: {
        ...prev[compId],
        [careerTeamsKey]: (prev[compId]?.[careerTeamsKey] || []).map(t =>
          t.id === career.teamId ? { ...t, [attr]: val + 1 } : t
        )
      }
    }));
    setCareer(c => {
      const nextBase = { ...(c.baseDist || { att: careerTeam.att, opp: careerTeam.opp, def: careerTeam.def }) };
      nextBase[attr] = (nextBase[attr] || 0) + 1;
      // Los PE sobrantes que ya no pueden invertirse en el club se descartan
      return { ...c, pe: capPE(c.pe - cost, upgraded, c.tier || 1), baseDist: nextBase, tactic: nextBase };
    });
  };

  const applyTrainingStats = (newStats, peSpent) => {
    if (!careerTeam) return;
    const compId = career.compId;
    const upgraded = { ...careerTeam, att: newStats.att, opp: newStats.opp, def: newStats.def };
    setComps(prev => ({
      ...prev,
      [compId]: {
        ...prev[compId],
        [careerTeamsKey]: (prev[compId]?.[careerTeamsKey] || []).map(t =>
          t.id === career.teamId ? { ...t, att: newStats.att, opp: newStats.opp, def: newStats.def } : t
        )
      }
    }));
    setCareer(c => ({
      ...c,
      pe: Math.max(0, c.pe - peSpent),
      baseDist: { att: newStats.att, opp: newStats.opp, def: newStats.def },
      tactic: { att: newStats.att, opp: newStats.opp, def: newStats.def }
    }));
  };

  const currentMatchKey = useMemo(() => {
    const cl = comps['C1'];
    const uel = comps['C3'];
    const currentSeason = seasonState.season || career.clSeason || career.uelSeason || 1;
    const currentWk = seasonState.currentWeek || 1;
    const isClWk = isChampionsWeek(currentWk);
    const isUelWk = isEuropaLeagueWeek(currentWk);

    if ((isClWk || seasonState.phase === 'champions') && cl?.teams?.length && cl.phase && cl.phase !== 'Terminado') {
      return getChampionsMatchKey(currentSeason, cl.phase || 'groups', cl.matchday || 0);
    }
    if ((isUelWk || seasonState.phase === 'europa') && uel?.teams?.length && uel.phase && uel.phase !== 'Terminado') {
      return getEuropaLeagueMatchKey(currentSeason, uel.phase || 'Dieciseisavos', uel.matchday || 0);
    }
    return `league-${currentSeason}-${career.div || 1}-${careerMd}`;
  }, [seasonState.phase, seasonState.season, seasonState.currentWeek, comps, career.div, career.clSeason, career.uelSeason, careerMd]);

  const applyDrillResult = (result) => {
    if (!careerTeam) return;
    const currentWk = seasonState.currentWeek || 1;

    const drillFeedback = {
      simulated: false,
      die: result.die,
      peGained: result.peGained || 0,
      peCost: result.peCost || 0,
      physioPaid: !!result.physioPaid,
      injuryOccurred: !!result.injuryOccurred,
      immunityPrevented: !!result.immunityPrevented,
      statLost: result.statLost && result.affectedAttr ? (result.affectedAttr === 'att' ? 'Ataque' : result.affectedAttr === 'opp' ? 'Ocasiones' : 'Defensa') : undefined,
      message: result.message
    };

    // Caso 1: Fisioterapia de Élite (paga PE y cancela lesión, jugando al 100% + 3 semanas de inmunidad médica)
    if (result.physioPaid) {
      setCareer(c => {
        const base = c.baseDist || { att: careerTeam.att, opp: careerTeam.opp, def: careerTeam.def };
        return {
          ...c,
          pe: Math.max(0, (c.pe || 0) - (result.peCost || 0)),
          trainedMatchday: careerMd,
          trainedMatchKey: currentMatchKey,
          trainedClMatchKey: currentMatchKey,
          trainedUelMatchKey: currentMatchKey,
          trainedWeek: currentWk,
          activeInjury: null,
          medicalImmunityWeeks: 3,
          immunityActivatedMatchday: careerMd,
          baseDist: base,
          tactic: base,
          lastTrainingResult: drillFeedback
        };
      });
      return;
    }

    // Caso 2: Se aceptó la baja temporal por lesión (baja de -1 sólo durante este partido + 3 semanas de inmunidad)
    if (result.statLost && result.affectedAttr) {
      const attr = result.affectedAttr;
      const attrLabel = attr === 'att' ? 'Ataque' : attr === 'opp' ? 'Ocasiones' : 'Defensa';

      setCareer(c => {
        const base = c.baseDist || { att: careerTeam.att, opp: careerTeam.opp, def: careerTeam.def };
        return {
          ...c,
          trainedMatchday: careerMd,
          trainedMatchKey: currentMatchKey,
          trainedClMatchKey: currentMatchKey,
          trainedUelMatchKey: currentMatchKey,
          trainedWeek: currentWk,
          activeInjury: {
            attr,
            label: attrLabel,
            matchday: careerMd,
            matchKey: currentMatchKey,
            penalty: 1
          },
          // Se activa el escudo de inmunidad médica por 3 jornadas completas
          medicalImmunityWeeks: 3,
          immunityActivatedMatchday: careerMd,
          tactic: c.tactic || base,
          lastTrainingResult: drillFeedback
        };
      });
      return;
    }

    // Caso 3: Ganancia de PE (Dado 1: +2 PE, Dado 2: +1 PE)
    if (result.peGained > 0) {
      setCareer(c => ({
        ...c,
        pe: (c.pe || 0) + result.peGained,
        trainedMatchday: careerMd,
        trainedMatchKey: currentMatchKey,
        trainedClMatchKey: currentMatchKey,
        trainedUelMatchKey: currentMatchKey,
        trainedWeek: currentWk,
        lastTrainingResult: drillFeedback
      }));
      return;
    }

    // Caso 4: Otros casos (ej: inmunidad médica activa previa que evitó la lesión, o resultado neutro)
    setCareer(c => ({
      ...c,
      trainedMatchday: careerMd,
      trainedMatchKey: currentMatchKey,
      trainedClMatchKey: currentMatchKey,
      trainedUelMatchKey: currentMatchKey,
      trainedWeek: currentWk,
      lastTrainingResult: drillFeedback
    }));
  };

  // Empieza el partido del técnico con su distribución táctica elegida
  const startCareerMatch = () => {
    if (!careerFixture || !careerTeam || !careerRival) return;
    const base = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };
    const injury = career.activeInjury && career.activeInjury.matchday === careerMd ? career.activeInjury : null;

    let dist = career.tactic ? { ...career.tactic } : { ...base };
    if (injury) {
      dist = {
        ...dist,
        [injury.attr]: Math.max(1, (dist[injury.attr] || base[injury.attr] || 1) - 1)
      };
    }

    const home = careerIsHome ? { ...careerTeam, att: dist.att, opp: dist.opp, def: dist.def } : careerRival;
    const away = careerIsHome ? careerRival : { ...careerTeam, att: dist.att, opp: dist.opp, def: dist.def };
    setMatchState(null);
    setMatchState({
      home, away, scoreH: 0, scoreA: 0, oppH: home.opp, oppA: away.opp, turn: 'H', phase: 'att',
      isDiv2Context: career.div === 2,
      logs: [
        '⚽ ¡Comienza el encuentro!',
        `Salida táctica: ${dist.att}-${dist.opp}-${dist.def}`,
        ...(injury ? [`⚠️ Baja temporal médica en ${injury.label}: -1 pt sólo para este partido (Alta tras finalizar el encuentro)`] : [])
      ],
      lastDie: 1, finished: false, isKnockout: false, penalties: null, aggregate: null,
      careerMatch: true, careerMatchday: careerMd + 1
    });
    setView('careerMatch');
  };

  // Resuelve la jornada con un marcador dado (jugado con dados o simulado)
  const applyCareerMatchday = (
    scoreH: number,
    scoreA: number,
    trainingFeedback: any = null,
    extraTrainingPe: number = 0,
    nextImmunityWeeks: number | null = null,
    injuryOccurredThisMatchday: boolean = false,
    advanceSeasonWeek: boolean = true
  ) => {
    if (!careerFixture || !careerTeam) return;
    const compId = career.compId;
    const myGf = careerIsHome ? scoreH : scoreA;
    const myGa = careerIsHome ? scoreA : scoreH;
    const result = myGf > myGa ? 'W' : myGf === myGa ? 'D' : 'L';

    // Posición antes del partido
    const currentComp = comps[compId];
    const currentTeams = currentComp ? (career.div === 2 ? currentComp.teams2 : currentComp.teams) || [] : [];
    const sortedBefore = [...currentTeams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    const posBeforeIdx = sortedBefore.findIndex(t => t.id === career.teamId);
    const posBefore = posBeforeIdx >= 0 ? posBeforeIdx + 1 : 1;

    let posAfter = posBefore;

    // Estadísticas base auténticas del club del usuario (originales + mejoras de PE)
    const cleanBase = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };

    setComps(prev => {
      const comp = prev[compId];
      if (!comp) return prev;
      const teams = comp[careerTeamsKey] || [];
      const round = careerSchedule[careerMd] || [];
      const results = round.map(m => {
        if (m.homeId === careerFixture.homeId && m.awayId === careerFixture.awayId) {
          return { hId: m.homeId, aId: m.awayId, sh: scoreH, sa: scoreA };
        }
        const h = teams.find(t => t.id === m.homeId);
        const a = teams.find(t => t.id === m.awayId);
        const { sh, sa } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);
        return { hId: m.homeId, aId: m.awayId, sh, sa };
      });
      const updatedTeams = teams.map(t => {
        const res = results.find(r => r.hId === t.id || r.aId === t.id);
        if (!res) return t.id === career.teamId ? { ...t, ...cleanBase } : t;
        const isH = res.hId === t.id;
        const gf = isH ? res.sh : res.sa; const ga = isH ? res.sa : res.sh;
        const w = gf > ga ? 1 : 0; const d = gf === ga ? 1 : 0; const l = gf < ga ? 1 : 0;
        return {
          ...t,
          ...(t.id === career.teamId ? cleanBase : {}),
          p: t.p + 1,
          w: t.w + w,
          d: t.d + d,
          l: t.l + l,
          gf: t.gf + gf,
          ga: t.ga + ga,
          pts: t.pts + (w * 3 + d)
        };
      });

      const sortedAfter = [...updatedTeams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
      const posAfterIdx = sortedAfter.findIndex(t => t.id === career.teamId);
      posAfter = posAfterIdx >= 0 ? posAfterIdx + 1 : posBefore;

      const finished = careerMd >= careerSchedule.length - 1;
      return {
        ...prev,
        [compId]: {
          ...comp,
          [careerTeamsKey]: updatedTeams,
          [careerMdKey]: careerMd + 1,
          [careerHistKey]: [{ day: careerMd + 1, results }, ...(comp[careerHistKey] || [])],
          ...(career.div === 2 ? { showWinner2: finished ? true : comp.showWinner2 } : { showWinner: finished ? true : comp.showWinner })
        }
      };
    });

    // El mundo sigue jugando: el resto de ligas se pone al día
    syncLeaguesToGlobal(LEAGUE_IDS.filter(id => id !== compId));
    syncLeaguesToGlobal([compId]);

    // Simular copas europeas de esta semana si correspondían (únicamente si el usuario no participa activamente en ellas o ya jugó)
    const currentWk = seasonState.currentWeek || 1;
    const weekData = getSemanaCalendario(currentWk);
    const hasChampions = weekData?.fixtures?.some(f => f.competicion === 'CHAMPIONS' && f.esPartido);
    const hasEuropa = weekData?.fixtures?.some(f => f.competicion === 'EUROPA_LEAGUE' && f.esPartido);

    const isCareerAliveInC1 = Boolean(careerClInfo?.alive && !careerClInfo?.champion && !comps['C1']?.showWinner && comps['C1']?.phase !== 'Terminado');
    const isCareerAliveInC3 = Boolean(careerUelInfo?.alive && !careerUelInfo?.champion && !comps['C3']?.showWinner && comps['C3']?.phase !== 'Terminado');

    if (hasChampions || hasEuropa) {
      setComps(prev => {
        let next = { ...prev };
        let c1 = next['C1'];
        if (c1 && c1.teams && c1.teams.length > 0 && !c1.showWinner && c1.phase !== 'Terminado') {
          const expClMd = getExpectedCupMatchdayForWeek('C1', currentWk);
          // Si el usuario compite en la Champions y no ha jugado aún esta fecha, NO auto-simular la Champions
          if (hasChampions && (!isCareerAliveInC1) && (expClMd === null || (c1.matchday || 0) < expClMd)) {
            c1 = simulateSingleCupStage(c1, 'C1');
            next['C1'] = c1;
          }
        }
        let c3 = next['C3'];
        const isClDone = !c1 || c1.phase !== 'groups' || (c1.matchday || 0) >= 6;
        if (isClDone && c1 && Array.isArray(c1.groups)) {
          if (c3) {
            c3 = syncChampionsRepescadosToUEL(c1, c3);
            next['C3'] = c3;
          }
        }
        const canSimulateUelPhase = !c3 || c3.phase === 'Dieciseisavos' || isClDone;
        if (c3 && c3.teams && c3.teams.length > 0 && !c3.showWinner && c3.phase !== 'Terminado' && canSimulateUelPhase) {
          const expUelMd = getExpectedCupMatchdayForWeek('C3', currentWk);
          // Si el usuario compite en la Europa League y no ha jugado aún esta fecha, NO auto-simular la UEL
          if (hasEuropa && (!isCareerAliveInC3) && (expUelMd === null || (c3.matchday || 0) < expUelMd)) {
            c3 = simulateSingleCupStage(c3, 'C3');
            next['C3'] = c3;
          }
        }
        return next;
      });
    }

    const userPendingClThisWeek = hasChampions && isCareerAliveInC1 && ((comps['C1']?.matchday || 0) < (getExpectedCupMatchdayForWeek('C1', currentWk) ?? 99));
    const userPendingUelThisWeek = hasEuropa && isCareerAliveInC3 && ((comps['C3']?.matchday || 0) < (getExpectedCupMatchdayForWeek('C3', currentWk) ?? 99));

    // Solo avanzar la semana si no hay un compromiso europeo pendiente para el mánager en esta misma semana
    if (advanceSeasonWeek && !userPendingClThisWeek && !userPendingUelThisWeek) {
      setSeasonState(s => ({
        ...s,
        currentWeek: Math.min(43, (s.currentWeek || 1) + 1)
      }));
    }

    const ownStrength = cleanBase.att + cleanBase.opp + cleanBase.def;
    const rivalStrength = (careerRival?.att || 0) + (careerRival?.opp || 0) + (careerRival?.def || 0);
    // Plus de gesta: en tiers bajos, vencer o empatar a un equipo grande premia extra
    const gap = rivalStrength - ownStrength;
    const lowTier = (career.tier || 1) <= 2;
    const bigRival = gap >= 2;
    const bonusPE = lowTier && bigRival ? (result === 'W' ? 3 : result === 'D' ? 2 : 0) : 0;
    const bonusRep = lowTier && bigRival ? (result === 'W' ? 0.5 : result === 'D' ? 0.25 : 0) : 0;
    const rep = Math.round((repForMatch(result, ownStrength, rivalStrength, career.reputation || 10) + bonusRep) * 10) / 10;
    const matchPe = peForResult(result) + bonusPE;
    const totalPeGained = matchPe + (extraTrainingPe || 0);

    const effectiveTraining = trainingFeedback || (career.trainedMatchday === careerMd ? career.lastTrainingResult : null);

    const simFeedback = {
      matchday: careerMd + 1,
      homeName: careerIsHome ? careerTeam.name : (careerRival?.name || 'Rival'),
      awayName: careerIsHome ? (careerRival?.name || 'Rival') : careerTeam.name,
      scoreH,
      scoreA,
      myGf,
      myGa,
      result,
      posBefore,
      posAfter,
      repDelta: rep,
      peDelta: totalPeGained,
      isHome: careerIsHome,
      rivalName: careerRival?.name || '',
      trainingResult: effectiveTraining || undefined
    };

    setCareer(c => {
      const prevStats = c.stats || { matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 };
      const newStats = {
        matches: (prevStats.matches || 0) + 1,
        wins: (prevStats.wins || 0) + (result === 'W' ? 1 : 0),
        draws: (prevStats.draws || 0) + (result === 'D' ? 1 : 0),
        losses: (prevStats.losses || 0) + (result === 'L' ? 1 : 0),
        gf: (prevStats.gf || 0) + myGf,
        ga: (prevStats.ga || 0) + myGa
      };

      const newRep = clampRep(c.reputation + rep);

      // Resolución de postulación activa (2 semanas a ciegas)
      let updatedActiveApp = c.activeApplication;
      let updatedAppHistory = c.applicationHistory || [];
      let appResolutionModal = null;
      let newOffer = null;

      if (updatedActiveApp && updatedActiveApp.status === 'review') {
        const remaining = (updatedActiveApp.weeksRemaining ?? 2) - 1;
        if (remaining <= 0) {
          // Evaluación determinista al cabo de las 2 semanas
          const expPos = expectedPosition(currentTeams, career.teamId);
          const currentPerf = readPerformance(posAfter, expPos);
          const hasRecentHistoryBonus = (c.trophies?.leagues || 0) > 0 || (c.trophies?.champions || 0) > 0 || (c.trophies?.uel || 0) > 0 || (c.trophies?.promotions || 0) > 0;

          const evalRes = evaluateApplication({
            clubTier: updatedActiveApp.tier || 1,
            reputation: newRep,
            performanceScore: currentPerf?.score || 0,
            position: posAfter,
            expected: expPos,
            hasRecentHistoryBonus
          });

          if (evalRes.accepted) {
            newOffer = {
              id: `${seasonState.season || 1}-${updatedActiveApp.compId}-${updatedActiveApp.div}-${updatedActiveApp.teamId}`,
              season: seasonState.season || 1,
              compId: updatedActiveApp.compId,
              compName: updatedActiveApp.compName,
              div: updatedActiveApp.div,
              teamId: updatedActiveApp.teamId,
              teamName: updatedActiveApp.teamName,
              color1: updatedActiveApp.color1,
              color2: updatedActiveApp.color2,
              isFlag: updatedActiveApp.isFlag,
              tier: updatedActiveApp.tier,
              standingStatus: updatedActiveApp.standingStatus || 'Media Tabla',
              requiredObjective: updatedActiveApp.requiredObjective || 'Cumplir los objetivos de la directiva',
              profile: updatedActiveApp.tier >= 4 ? 'Gigante de Primera' : updatedActiveApp.tier === 3 ? 'Top 6 / Europa' : 'Proyecto Deportivo',
              seasons: CONTRACT_SEASONS,
              reason: 'Candidatura formal aceptada por la junta directiva tras 2 semanas de evaluación.',
              fromApplication: true,
              weeksRemaining: 2
            };
            updatedAppHistory = [
              {
                id: `app-res-${Date.now()}`,
                teamName: updatedActiveApp.teamName,
                compName: updatedActiveApp.compName,
                tier: updatedActiveApp.tier,
                matchday: careerMd + 1,
                accepted: true,
                message: evalRes.message,
                rejectionType: null
              },
              ...updatedAppHistory
            ].slice(0, 30);
            appResolutionModal = {
              accepted: true,
              teamName: updatedActiveApp.teamName,
              compName: updatedActiveApp.compName,
              tier: updatedActiveApp.tier,
              color1: updatedActiveApp.color1,
              color2: updatedActiveApp.color2,
              isFlag: updatedActiveApp.isFlag,
              message: evalRes.message,
              offer: newOffer
            };
            updatedActiveApp = null;
          } else {
            updatedAppHistory = [
              {
                id: `app-res-${Date.now()}`,
                teamName: updatedActiveApp.teamName,
                compName: updatedActiveApp.compName,
                tier: updatedActiveApp.tier,
                matchday: careerMd + 1,
                accepted: false,
                message: evalRes.message,
                rejectionType: evalRes.rejectionType
              },
              ...updatedAppHistory
            ].slice(0, 30);
            appResolutionModal = {
              accepted: false,
              teamName: updatedActiveApp.teamName,
              compName: updatedActiveApp.compName,
              tier: updatedActiveApp.tier,
              color1: updatedActiveApp.color1,
              color2: updatedActiveApp.color2,
              isFlag: updatedActiveApp.isFlag,
              message: evalRes.message,
              rejectionType: evalRes.rejectionType
            };
            updatedActiveApp = null;
          }
        } else {
          updatedActiveApp = {
            ...updatedActiveApp,
            weeksRemaining: remaining
          };
        }
      }

      // Caducidad de ofertas en el buzón:
      // Las ofertas activas reducen sus semanas (2 -> 1 -> 0 [Expirada con alerta visual en buzón]).
      // Las ofertas que ya estaban expiradas en la jornada previa (weeksRemaining <= 0) se retiran definitivamente.
      const prunedOffers = (c.offers || [])
        .filter(o => (typeof o.weeksRemaining === 'number' ? o.weeksRemaining : 2) > 0)
        .map(o => {
          const currentWeeks = typeof o.weeksRemaining === 'number' ? o.weeksRemaining : 2;
          const newWeeks = currentWeeks - 1;
          return {
            ...o,
            weeksRemaining: newWeeks,
            expired: newWeeks <= 0
          };
        });

      const finalOffers = newOffer
        ? [newOffer, ...prunedOffers.filter(o => o.id !== newOffer.id)]
        : prunedOffers;

      // Si en esta misma jornada se produjo lesión, se activan 3 semanas de inmunidad para las siguientes jornadas.
      // Si ya venía de antes, se consume 1 semana de protección.
      const injuryHappened = injuryOccurredThisMatchday || (c.activeInjury && c.activeInjury.matchday === careerMd);
      const finalImmunity = injuryHappened
        ? 3
        : nextImmunityWeeks !== null
        ? Math.max(0, nextImmunityWeeks - 1)
        : Math.max(0, (c.medicalImmunityWeeks || 0) - 1);

      return {
        ...c,
        pe: Math.max(0, (c.pe || 0) + totalPeGained),
        reputation: newRep,
        medicalImmunityWeeks: finalImmunity,
        trainedMatchday: careerMd,
        lastTrainingResult: effectiveTraining || c.lastTrainingResult,
        // ALTA MÉDICA AUTOMÁTICA: El equipo se recupera totalmente para el próximo partido
        activeInjury: null,
        baseDist: cleanBase,
        tactic: cleanBase,
        lastSimulationFeedback: simFeedback,
        stats: newStats,
        activeApplication: updatedActiveApp,
        offers: finalOffers,
        applicationHistory: updatedAppHistory,
        pendingAppResolutionModal: appResolutionModal || c.pendingAppResolutionModal,
        seasonLog: [
          { matchday: careerMd + 1, rival: careerRival?.name, gf: myGf, ga: myGa, result, rep, pe: totalPeGained, bonus: bonusPE > 0 },
          ...(c.seasonLog || [])
        ].slice(0, 60)
      };
    });

    setMatchState(null);
    if (view === 'careerMatch') {
      setView('career');
    }
  };

  // Resuelve la jornada tras jugar el partido con dados
  const finishCareerMatchday = () => {
    if (!matchState) return;
    if (matchState.careerChampionsMatch) {
      finishCareerChampionsMatch(matchState.scoreH, matchState.scoreA, matchState.penalties);
      return;
    }
    if (matchState.careerUelMatch) {
      finishCareerUelMatch(matchState.scoreH, matchState.scoreA, matchState.penalties);
      return;
    }
    if (!careerFixture) return;
    applyCareerMatchday(matchState.scoreH, matchState.scoreA);
  };

  // Ejecuta el partido simulado con dados y aplica la jornada
  const executeCareerSimulatedMatch = (
    injuryAttr: 'att' | 'opp' | 'def' | null,
    trainingFeedback: any,
    extraPeGained: number,
    nextImmunityWeeks: number | null,
    injuryOccurredInSim: boolean,
    advanceSeasonWeek: boolean = true
  ) => {
    if (!careerFixture || !careerTeam || !careerRival) return;
    const baseTeamStats = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };

    const tactic = career.tactic ? { ...career.tactic } : { ...baseTeamStats };
    let finalStats = { ...tactic };
    if (injuryAttr) {
      finalStats[injuryAttr] = Math.max(1, (finalStats[injuryAttr] || baseTeamStats[injuryAttr] || 1) - 1);
    }

    const mine = { ...careerTeam, att: finalStats.att, opp: finalStats.opp, def: finalStats.def };
    const home = careerIsHome ? mine : careerRival;
    const away = careerIsHome ? careerRival : mine;
    const { sh, sa } = simMatchGoals(home.opp, home.att, away.def, away.opp, away.att, home.def);

    applyCareerMatchday(sh, sa, trainingFeedback, extraPeGained, nextImmunityWeeks, injuryOccurredInSim, advanceSeasonWeek);
  };

  // Manejador de la decisión del usuario en el Modal de Alerta Médica de Simulación
  const handleSimulationInjuryChoice = (option: 'accept_injury' | 'physio_elite') => {
    if (!simulationInjuryAlert) return;
    const { affectedAttr, attrLabel, physioCost, isChampions } = simulationInjuryAlert;

    let trainingFeedback: any = null;
    let extraPeGained = 0;

    if (option === 'accept_injury') {
      trainingFeedback = {
        simulated: true,
        die: 6,
        peGained: 0,
        peCost: 0,
        physioPaid: false,
        injuryOccurred: true,
        immunityPrevented: false,
        statLost: attrLabel,
        newImmunityWeeks: 3,
        message: `Baja médica aceptada: -1 ${attrLabel} en este partido simulado. Alta médica automática tras el encuentro (+3 sem. Inmunidad Médica).`
      };
      setSimulationInjuryAlert(null);
      if (isChampions) {
        executeCareerChampionsSimulatedMatch(affectedAttr, trainingFeedback, 0, 3, true);
      } else {
        executeCareerSimulatedMatch(affectedAttr, trainingFeedback, 0, 3, true);
      }
    } else {
      // Fisioterapia de Élite: Paga PE y anula la lesión
      extraPeGained = -physioCost;
      trainingFeedback = {
        simulated: true,
        die: 6,
        peGained: 0,
        peCost: physioCost,
        physioPaid: true,
        injuryOccurred: true,
        immunityPrevented: false,
        newImmunityWeeks: 3,
        message: `Fisioterapia de Élite aplicada (-${physioCost} PE). ¡Lesión cancelada, juegas al 100%! (+3 sem. Inmunidad Médica).`
      };
      setSimulationInjuryAlert(null);
      if (isChampions) {
        executeCareerChampionsSimulatedMatch(null, trainingFeedback, extraPeGained, 3, true);
      } else {
        executeCareerSimulatedMatch(null, trainingFeedback, extraPeGained, 3, true);
      }
    }
  };

  // Simula tu propio partido con la táctica elegida y resuelve la jornada
  const simulateCareerMatchday = (advanceSeasonWeek: boolean = true) => {
    if (!careerFixture || !careerTeam || !careerRival) return;

    let trainingFeedback = null;
    let newImmunityWeeks = career.medicalImmunityWeeks || 0;
    let extraPeGained = 0;
    let injuryOccurredInSim = false;
    let injuryAttr: 'att' | 'opp' | 'def' | null = null;

    // Si aún no entrenó voluntariamente en este partido, se simula el entrenamiento con 1D6
    if (career.trainedMatchKey !== currentMatchKey && career.trainedMatchday !== careerMd) {
      const die = roll1D6();
      if (die === 1) {
        extraPeGained = 2;
        trainingFeedback = {
          simulated: true,
          die: 1,
          peGained: 2,
          injuryOccurred: false,
          immunityPrevented: false,
          message: '¡Entrenamiento sobresaliente! +2 PE ganados.'
        };
      } else if (die === 2) {
        extraPeGained = 1;
        trainingFeedback = {
          simulated: true,
          die: 2,
          peGained: 1,
          injuryOccurred: false,
          immunityPrevented: false,
          message: '¡Buen entrenamiento! +1 PE ganado.'
        };
      } else if (die >= 3 && die <= 5) {
        trainingFeedback = {
          simulated: true,
          die,
          peGained: 0,
          injuryOccurred: false,
          immunityPrevented: false,
          message: 'Sesión neutra sin incidencias ni PE extras.'
        };
      } else if (die === 6) {
        const base = {
          att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
          opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
          def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
        };
        const tactic = career.tactic ? { ...career.tactic } : { ...base };
        const attrs: Array<'att' | 'opp' | 'def'> = ['att', 'opp', 'def'].filter(a => (tactic[a] || 1) > 1) as any;
        const affected: 'att' | 'opp' | 'def' = attrs.length > 0 ? attrs[Math.floor(Math.random() * attrs.length)] : 'att';
        const attrLabels = { att: 'Ataque (ATT)', opp: 'Ocasiones (OPP)', def: 'Defensa (DEF)' };

        if (newImmunityWeeks > 0) {
          trainingFeedback = {
            simulated: true,
            die: 6,
            peGained: 0,
            injuryOccurred: true,
            immunityPrevented: true,
            message: `🛡️ ¡Inmunidad Médica activa (${newImmunityWeeks} sem.) evitó la sobrecarga en ${attrLabels[affected]}!`
          };
        } else {
          // Si estamos simulando desde la interfaz general (view !== 'career'), NO lanzar alerta médica y aceptar automáticamente por defecto la baja médica
          if (view !== 'career') {
            trainingFeedback = {
              simulated: true,
              die: 6,
              peGained: 0,
              peCost: 0,
              physioPaid: false,
              injuryOccurred: true,
              immunityPrevented: false,
              statLost: attrLabels[affected],
              newImmunityWeeks: 3,
              message: `Baja médica aceptada: -1 ${attrLabels[affected]} en este partido simulado. Alta médica automática tras el encuentro (+3 sem. Inmunidad Médica).`
            };
            injuryAttr = affected;
            injuryOccurredInSim = true;
            newImmunityWeeks = 3;
          } else {
            // Modal de alerta médica y detener simulación hasta que el usuario decida (sólo en interfaz de carrera)
            const isDiv2 = career.div === 2;
            const isChampionsOrElite = (career.tier >= 5) || (career.inChampions);
            const physioCost = isDiv2 ? 12 : isChampionsOrElite ? 30 : 20;
            const categoryLabel = isDiv2 ? 'Segunda División' : isChampionsOrElite ? 'Champions League / Élite' : 'Primera División';

            setSimulationInjuryAlert({
              affectedAttr: affected,
              attrLabel: attrLabels[affected],
              die: 6,
              physioCost,
              categoryLabel,
              isChampions: false
            });
            return;
          }
        }
      }
    } else if (career.lastTrainingResult) {
      trainingFeedback = career.lastTrainingResult;
      // Si ya había entrenado voluntariamente en esta jornada y hubo lesión activa
      if (career.activeInjury && (career.activeInjury.matchKey === currentMatchKey || career.activeInjury.matchday === careerMd)) {
        injuryAttr = career.activeInjury.attr;
        injuryOccurredInSim = true;
      }
    }

    executeCareerSimulatedMatch(injuryAttr, trainingFeedback, extraPeGained, newImmunityWeeks, injuryOccurredInSim, advanceSeasonWeek);
  };

  const simulateLeagueToGlobal = (compId: string) => {
    if (career?.active && career.compId === compId && careerTeam && careerFixture && !careerDivisionFinished) {
      simulateCareerMatchday();
    } else {
      syncLeaguesToGlobal([compId]);
    }
  };

  // Helper para mapear la jornada esperada de copas europeas según la semana del calendario
  const getExpectedCupMatchdayForWeek = (compId: string, week: number): number | null => {
    if (compId === 'C1') {
      const clMap: Record<number, number> = {
        7: 1, 9: 2, 11: 3, 14: 4, 16: 5, 18: 6,
        25: 7, 27: 8, 30: 9, 32: 10, 34: 11, 36: 12, 41: 13
      };
      return clMap[week] ?? null;
    }
    if (compId === 'C3') {
      const uelMap: Record<number, number> = {
        22: 1, 23: 2, 25: 3, 27: 4, 30: 5, 32: 6, 34: 7, 36: 8, 39: 9
      };
      return uelMap[week] ?? null;
    }
    return null;
  };

  // Botón "Simular Semana": resuelve la jornada y fixtures correspondientes a la semana en TODAS las competiciones y ligas.
  // Si hay una carrera activa con partido pendiente en esta jornada, se juega asistido por la IA para el entrenador.
  const simulateSeasonWeek = () => {
    const currentWk = seasonState.currentWeek || 1;
    const weekData = getSemanaCalendario(currentWk);

    const isCareerAliveInC1 = Boolean(careerClInfo?.alive && !careerClInfo?.champion && !comps['C1']?.showWinner && comps['C1']?.phase !== 'Terminado');
    const isCareerAliveInC3 = Boolean(careerUelInfo?.alive && !careerUelInfo?.champion && !comps['C3']?.showWinner && comps['C3']?.phase !== 'Terminado');

    const hasChampions = weekData?.fixtures?.some(f => f.competicion === 'CHAMPIONS' && f.esPartido);
    const hasEuropa = weekData?.fixtures?.some(f => f.competicion === 'EUROPA_LEAGUE' && f.esPartido);
    const hasLeague = weekData?.fixtures?.some(f => f.competicion === 'LIGA' && f.esPartido);

    const expClMd = getExpectedCupMatchdayForWeek('C1', currentWk);
    const expUelMd = getExpectedCupMatchdayForWeek('C3', currentWk);
    const expLeagueMd = getLeagueMatchdayForWeek(currentWk);

    const userPendingCl = hasChampions && isCareerAliveInC1 && ((comps['C1']?.matchday || 0) < (expClMd ?? 99));
    const userPendingUel = hasEuropa && isCareerAliveInC3 && ((comps['C3']?.matchday || 0) < (expUelMd ?? 99));
    const careerMd = (career.div === 2 ? comps[career.compId]?.matchday2 : comps[career.compId]?.matchday) || 0;
    const userPendingLeague = (hasLeague || !weekData) && career?.active && careerTeam && careerFixture && !careerDivisionFinished && (careerMd < (expLeagueMd ?? (careerMd + 1)));

    // Si el mánager tiene un partido europeo pendiente en esta semana, simular ese partido europeo primero
    if (userPendingCl) {
      simulateCareerChampionsMatch();
      return;
    }
    if (userPendingUel) {
      simulateCareerUelMatch();
      return;
    }
    // Si el mánager tiene un partido de liga pendiente en esta semana, simular el partido de liga y avanzar semana si no hay más compromisos
    if (userPendingLeague) {
      simulateCareerMatchday(true);
      return;
    }

    if (weekData) {
      const fixtures = weekData.fixtures || [];
      const milestoneFixtures = fixtures.filter(f => !f.esPartido);
      if (milestoneFixtures.length > 0) {
        const topMilestone = milestoneFixtures[0];
        setMilestoneToast({
          title: topMilestone.ronda,
          desc: topMilestone.desc || topMilestone.title || '',
          week: currentWk
        });
      }
    }

    let clWinnerToArchive: any = null;
    let uelWinnerToArchive: any = null;
    let finishedClComp: any = null;
    let finishedUelComp: any = null;

    setComps(prev => {
      let next = { ...prev };

      // 1. Simular jornada de Liga para el resto del mundo
      if (hasLeague || !weekData) {
        LEAGUE_IDS.forEach(compId => {
          const comp = next[compId];
          if (!comp || comp.type !== 'league') return;
          let upd = { ...comp };
          const runDiv = (teamsKey: string, mdKey: string, histKey: string, winKey: string, isDiv2?: boolean) => {
            let guard = 0;
            while (divPendingAt(upd[teamsKey], upd[mdKey], globalMatchday) && guard++ < 60) {
              const prevMd = upd[mdKey] || 0;
              const res = simulateDivisionMatchday(upd[teamsKey], upd[mdKey] || 0, upd[histKey] || [], compId, isDiv2);
              if (!res || res.nextMatchday === prevMd) break;
              upd = {
                ...upd,
                [teamsKey]: res.updatedTeams,
                [mdKey]: res.nextMatchday,
                [histKey]: res.newHistory,
                [winKey]: res.isFinished ? true : upd[winKey]
              };
              if (res.isFinished) break;
            }
          };
          runDiv('teams', 'matchday', 'history', 'showWinner', false);
          runDiv('teams2', 'matchday2', 'history2', 'showWinner2', true);
          if (leagueSeasonOver(upd)) {
            upd.previousStandings = buildStandingsSnapshot(upd.teams) || upd.previousStandings || null;
            upd.previousStandings2 = buildStandingsSnapshot(upd.teams2) || upd.previousStandings2 || null;
          }
          next[compId] = upd;
        });
      }

      // 2. Simular Competiciones Europeas (Champions League y Europa League sincronizadas)
      if (hasChampions || hasEuropa) {
        // 2a. Champions League
        let c1 = next['C1'];
        if (!c1 || !c1.teams || c1.teams.length === 0) {
          const autoData = getAutoFillData('C1', next);
          if (autoData) {
            c1 = { ...next['C1'], ...autoData, id: 'C1', name: 'Champions League', type: 'cup' };
          }
        }
        const canSimulateCl = hasChampions && c1 && c1.teams && c1.teams.length > 0 && !c1.showWinner && c1.phase !== 'Terminado' && (expClMd === null || (c1.matchday || 0) < expClMd);
        if (canSimulateCl) {
          c1 = simulateSingleCupStage(c1, 'C1');
          next['C1'] = c1;
        }

        // 2b. UEFA Europa League
        let c3 = next['C3'];
        if (!c3 || !c3.teams || c3.teams.length === 0) {
          const autoData = getAutoFillData('C3', next);
          if (autoData) {
            c3 = { ...next['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
          }
        }

        // Sincronizar e inyectar automáticamente los 8 repescados reales de Champions si ya concluyó su fase de grupos
        const isClDone = !c1 || c1.phase !== 'groups' || (c1.matchday || 0) >= 6;
        if (isClDone && c1 && Array.isArray(c1.groups)) {
          if (c3) {
            c3 = syncChampionsRepescadosToUEL(c1, c3);
            next['C3'] = c3;
          }
        }

        const canSimulateUelPhase = !c3 || c3.phase === 'Dieciseisavos' || isClDone;
        const canSimulateUel = hasEuropa && c3 && c3.teams && c3.teams.length > 0 && !c3.showWinner && c3.phase !== 'Terminado' && canSimulateUelPhase && (expUelMd === null || (c3.matchday || 0) < expUelMd);
        if (canSimulateUel) {
          c3 = simulateSingleCupStage(c3, 'C3', c1);
          next['C3'] = c3;
        }
      }

      // 3. Si alcanzamos o superamos la semana 42 (Cierre de Temporada), resolver cualquier liga o copa que quede pendiente al 100%
      if (currentWk >= 42) {
        LEAGUE_IDS.forEach(id => {
          let c = next[id];
          if (!c) return;
          if (!leagueSeasonOver(c)) {
            const runDivToFinish = (teamsKey: string, mdKey: string, histKey: string, winKey: string, isDiv2?: boolean) => {
              let guard = 0;
              const total = divTotalRounds(c[teamsKey]);
              while ((c[mdKey] || 0) < total && guard++ < 80) {
                const prevMd = c[mdKey] || 0;
                const res = simulateDivisionMatchday(c[teamsKey], c[mdKey] || 0, c[histKey] || [], id, isDiv2);
                if (!res || res.nextMatchday === prevMd) break;
                c = {
                  ...c,
                  [teamsKey]: res.updatedTeams,
                  [mdKey]: res.nextMatchday,
                  [histKey]: res.newHistory,
                  [winKey]: res.isFinished ? true : c[winKey]
                };
                if (res.isFinished) break;
              }
            };
            runDivToFinish('teams', 'matchday', 'history', 'showWinner', false);
            runDivToFinish('teams2', 'matchday2', 'history2', 'showWinner2', true);
            if (leagueSeasonOver(c)) {
              c.previousStandings = buildStandingsSnapshot(c.teams) || c.previousStandings || null;
              c.previousStandings2 = buildStandingsSnapshot(c.teams2) || c.previousStandings2 || null;
            }
            next[id] = c;
          }
        });

        // Asegurar conclusión de Champions si no ha finalizado
        let c1 = next['C1'];
        if (!c1 || !c1.teams || c1.teams.length === 0) {
          const autoData = getAutoFillData('C1', next);
          if (autoData) c1 = { ...next['C1'], ...autoData, id: 'C1', name: 'Champions League', type: 'cup' };
        }
        if (c1 && c1.teams && c1.teams.length > 0 && !c1.showWinner && c1.phase !== 'Terminado') {
          const finishedC1 = simulateEntireCupToFinish(c1, 'C1');
          if (finishedC1.showWinner || finishedC1.phase === 'Terminado') {
            const final = finishedC1.bracket?.Final?.[0] || finishedC1.bracket?.Final;
            if (final && final.sh !== null && final.sh !== undefined) {
              const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
              clWinnerToArchive = finishedC1.teams?.find((t: any) => t.id === winId);
              finishedClComp = finishedC1;
            }
          }
          next['C1'] = finishedC1;
        }

        // Asegurar conclusión de Europa League si no ha finalizado
        let c3 = next['C3'];
        if (!c3 || !c3.teams || c3.teams.length === 0) {
          const autoData = getAutoFillData('C3', next);
          if (autoData) c3 = { ...next['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
        }
        if (next['C1'] && Array.isArray(next['C1'].groups) && c3) {
          c3 = syncChampionsRepescadosToUEL(next['C1'], c3);
        }
        if (c3 && c3.teams && c3.teams.length > 0 && !c3.showWinner && c3.phase !== 'Terminado') {
          const finishedC3 = simulateEntireCupToFinish(c3, 'C3', next['C1']);
          if (finishedC3.showWinner || finishedC3.phase === 'Terminado') {
            const final = finishedC3.bracket?.Final?.[0] || finishedC3.bracket?.Final;
            if (final && final.sh !== null && final.sh !== undefined) {
              const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
              uelWinnerToArchive = finishedC3.teams?.find((t: any) => t.id === winId);
              finishedUelComp = finishedC3;
            }
          }
          next['C3'] = finishedC3;
        }
      }

      return next;
    });

    if (currentWk >= 42) {
      if (clWinnerToArchive && finishedClComp) {
        archiveCompetition('C1', 1, clWinnerToArchive, finishedClComp, true);
      }
      if (uelWinnerToArchive && finishedUelComp) {
        archiveCompetition('C3', 1, uelWinnerToArchive, finishedUelComp, true);
      }
      setSeasonState(s => ({
        ...s,
        currentWeek: 43,
        phase: 'completed'
      }));
      return;
    }

    // 4. Incrementar la semana de la temporada
    setSeasonState(s => ({
      ...s,
      currentWeek: Math.min(43, (s.currentWeek || 1) + 1)
    }));
  };

  const simulateUntilNextMatch = () => {
    simulateSeasonWeek();
  };

  const simulateAllPendingLeagues = simulateSeasonWeek;

  // Simula hasta el final (100% de jornadas) todas las ligas europeas pendientes
  // Permite cerrar todas las ligas restantes desde la interfaz de carrera directamente
  const simulateAllRemainingLeagues = () => {
    setComps(prev => {
      const next = { ...prev };
      let changed = false;
      LEAGUE_IDS.forEach(compId => {
        const comp = prev[compId];
        if (!comp || comp.type !== 'league') return;
        let upd = { ...comp };
        let touched = false;
        const runDivToFinish = (teamsKey: string, mdKey: string, histKey: string, winKey: string, isDiv2?: boolean) => {
          let guard = 0;
          const total = divTotalRounds(upd[teamsKey]);
          while ((upd[mdKey] || 0) < total && guard++ < 80) {
            const prevMd = upd[mdKey] || 0;
            const res = simulateDivisionMatchday(upd[teamsKey], upd[mdKey] || 0, upd[histKey] || [], compId, isDiv2);
            if (!res || res.nextMatchday === prevMd) break;
            touched = true;
            upd = {
              ...upd,
              [teamsKey]: res.updatedTeams,
              [mdKey]: res.nextMatchday,
              [histKey]: res.newHistory,
              [winKey]: res.isFinished ? true : upd[winKey]
            };
            if (res.isFinished) break;
          }
        };
        runDivToFinish('teams', 'matchday', 'history', 'showWinner', false);
        runDivToFinish('teams2', 'matchday2', 'history2', 'showWinner2', true);
        if (touched) {
          if (leagueSeasonOver(upd)) {
            upd.previousStandings = buildStandingsSnapshot(upd.teams) || upd.previousStandings || null;
            upd.previousStandings2 = buildStandingsSnapshot(upd.teams2) || upd.previousStandings2 || null;
          }
          next[compId] = upd;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  /* ===================== CHAMPIONS EN MODO CARRERA =====================
   * No hay una Champions aparte: el club de la carrera juega LA MISMA Champions
   * League de la temporada global ('C1'). Aquí sólo se lee ese torneo y se
   * manda al técnico a jugarla con el motor de dados de siempre.
   */
  const clComp = comps['C1'];
  const careerClTeam = useMemo(() => {
    if (!careerTeam || !clComp?.teams?.length) return null;
    const isQual = Boolean(
      career.clQualified ||
      (clComp.careerTeamId && clComp.careerTeamId === career.teamId) ||
      (clComp.careerTeamName && careerTeam.name && clComp.careerTeamName === careerTeam.name)
    );
    if (!isQual) return null;
    return clComp.teams.find(t => t.id === clComp.careerTeamId) ||
      clComp.teams.find(t => t.name === (clComp.careerTeamName || careerTeam.name)) || null;
  }, [clComp, careerTeam, career.clQualified, career.teamId]);

  const careerClWinnerId = useMemo(() => {
    const final = clComp?.bracket?.Final?.[0] || clComp?.bracket?.Final;
    if (!final || final.sh === null || final.sh === undefined) return null;
    const tH = final.sh, tA = final.sa;
    if (tH > tA) return final.hId;
    if (tA > tH) return final.aId;
    return (final.penH || 0) > (final.penA || 0) ? final.hId : final.aId;
  }, [clComp]);

  const careerClAlive = useMemo(() => {
    if (!careerClTeam || !clComp) return false;
    if (clComp.phase === 'groups') return true;
    if (clComp.phase === 'Terminado') return careerClWinnerId === careerClTeam.id;
    const matches = Array.isArray(clComp.bracket?.[clComp.phase])
      ? clComp.bracket[clComp.phase]
      : [clComp.bracket?.[clComp.phase]].filter(Boolean);
    return matches.some(m => m.hId === careerClTeam.id || m.aId === careerClTeam.id);
  }, [clComp, careerClTeam, careerClWinnerId]);

  const careerClInfo = useMemo(() => {
    if (!careerClTeam) return null;
    const champion = careerClWinnerId === careerClTeam.id;
    const rival = (() => {
      if (!clComp || clComp.phase === 'groups' || clComp.phase === 'Terminado') return null;
      const matches = Array.isArray(clComp.bracket?.[clComp.phase])
        ? clComp.bracket[clComp.phase]
        : [clComp.bracket?.[clComp.phase]].filter(Boolean);
      const m = matches.find(x => x.hId === careerClTeam.id || x.aId === careerClTeam.id);
      if (!m) return null;
      const rivalId = m.hId === careerClTeam.id ? m.aId : m.hId;
      return clComp.teams.find(t => t.id === rivalId) || null;
    })();
    const group = clComp?.groups?.find(g => g.teamIds?.includes(careerClTeam.id));
    return {
      season: seasonState.season || 1,
      phase: clComp?.phase || 'groups',
      phaseLabel: clPhaseLabel(clComp?.phase),
      alive: careerClAlive,
      champion,
      eliminated: !careerClAlive && !champion,
      groupName: group?.name || null,
      rivalName: rival?.name || null,
      pts: careerClTeam.pts, p: careerClTeam.p, gf: careerClTeam.gf, ga: careerClTeam.ga,
      isGlobalPhase: seasonState.phase === 'champions'
    };
  }, [clComp, careerClTeam, careerClAlive, careerClWinnerId, seasonState.phase, seasonState.season]);

  const uelComp = comps['C3'];
  const careerUelTeam = useMemo(() => {
    if (!uelComp?.teams?.length || !careerTeam) return null;
    const isQual = Boolean(
      career.uelQualified ||
      (uelComp.careerTeamId && uelComp.careerTeamId === career.teamId) ||
      (uelComp.careerTeamName && careerTeam.name && uelComp.careerTeamName === careerTeam.name)
    );
    if (!isQual) return null;
    return uelComp.teams.find((t: any) => t.id === uelComp.careerTeamId) ||
      uelComp.teams.find((t: any) => t.name === (uelComp.careerTeamName || careerTeam.name)) ||
      uelComp.teams.find((t: any) => t.id === uelComp.userTeamId) || null;
  }, [uelComp, careerTeam, career.uelQualified, career.teamId]);

  const careerUelWinnerId = useMemo(() => {
    if (!uelComp) return null;
    const final = uelComp.bracket?.Final?.[0] || uelComp.bracket?.Final;
    if (!final || final.sh === null || final.sh === undefined) return null;
    if (final.sh > final.sa) return final.hId;
    if (final.sa > final.sh) return final.aId;
    return ((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId;
  }, [uelComp]);

  const careerUelAlive = useMemo(() => {
    if (!careerUelTeam || !uelComp) return false;
    if (uelComp.phase === 'Terminado' || uelComp.showWinner) return careerUelWinnerId === careerUelTeam.id;
    const phase = uelComp.phase || 'Dieciseisavos';
    const matches = Array.isArray(uelComp.bracket?.[phase])
      ? uelComp.bracket[phase]
      : [uelComp.bracket?.[phase]].filter(Boolean);
    return matches.some((m: any) => m && (m.hId === careerUelTeam.id || m.aId === careerUelTeam.id));
  }, [uelComp, careerUelTeam, careerUelWinnerId]);

  const careerUelInfo = useMemo(() => {
    if (!careerUelTeam) {
      return {
        season: seasonState.season || 1,
        alive: false,
        notQualified: true,
        phase: uelComp?.phase || 'Dieciseisavos',
        champion: false,
        eliminated: false,
        rivalName: null
      };
    }
    const champion = careerUelWinnerId === careerUelTeam.id;
    const phase = uelComp?.phase || 'Dieciseisavos';
    const rival = (() => {
      if (!uelComp || phase === 'Terminado') return null;
      const matches = Array.isArray(uelComp.bracket?.[phase])
        ? uelComp.bracket[phase]
        : [uelComp.bracket?.[phase]].filter(Boolean);
      const m = matches.find((x: any) => x && (x.hId === careerUelTeam.id || x.aId === careerUelTeam.id));
      if (!m) return null;
      const rivalId = m.hId === careerUelTeam.id ? m.aId : m.hId;
      return uelComp.teams.find((t: any) => t.id === rivalId) || null;
    })();
    return {
      season: seasonState.season || 1,
      phase,
      alive: careerUelAlive,
      champion,
      eliminated: !careerUelAlive && !champion,
      rivalName: rival?.name || null,
      notQualified: false
    };
  }, [uelComp, careerUelTeam, careerUelAlive, careerUelWinnerId, seasonState.season]);

  // Inicializa o sortea la Champions League sin alterar ni terminar las ligas en juego
  const initOrDrawChampions = (forceDraw = false) => {
    const seasonNow = seasonState.season || 1;
    setComps(prev => {
      const next = { ...prev };
      let c1 = next['C1'];

      // Si ya está sorteada y no se solicita un nuevo sorteo forzado, no reiniciar
      if (c1?.teams?.length && !forceDraw) {
        return prev;
      }

      // Identificar si el equipo del modo carrera tiene plaza continental
      const careerQualifiedName = (() => {
        if (!career.active || !career.teamId || career.div !== 1) return null;
        if (career.clQualified) return careerTeam?.name || null;
        const comp = next[career.compId];
        const table = [...(comp?.teams || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
        const pos = table.findIndex(t => t.id === career.teamId) + 1;
        const maxSpots = career.compId === 'L7' ? 8 : 4;
        return (pos > 0 && pos <= maxSpots) || (career.tier >= 4) ? (careerTeam?.name || null) : null;
      })();

      const cl = getAutoFillData('C1', next, careerQualifiedName ? [careerQualifiedName] : []);
      if (cl) {
        const mine = careerQualifiedName ? (cl.teams || []).find(t => t.name === careerQualifiedName) : null;
        next['C1'] = {
          ...next['C1'],
          ...cl,
          id: 'C1',
          name: next['C1']?.name || 'Champions League',
          type: 'cup',
          phase: 'groups',
          matchday: 0,
          showWinner: false,
          careerTeamName: careerQualifiedName || null,
          careerTeamId: mine?.id || null,
          userTeamId: mine?.id || cl.userTeamId
        };
      }
      return next;
    });

    if (career.active && career.tier >= 3) {
      setCareer(c => ({ ...c, clSeason: seasonNow, clQualified: true }));
    }
  };

  // Sorteo de Cuadro de Eliminatorias (Octavos de Final)
  const performChampionsKnockoutDraw = () => {
    setComps(prev => {
      const next = { ...prev };
      let c1 = next['C1'];
      if (!c1 || !c1.groups || !c1.teams) return prev;
      const newBracket = generateKnockoutBrackets(c1);
      if (newBracket) {
        c1 = {
          ...c1,
          bracket: newBracket,
          phase: 'Octavos'
        };
        next['C1'] = c1;

        // Inyectar inmediatamente los 8 repescados reales a la UEFA Europa League (C3)
        let c3 = next['C3'];
        if (!c3 || !c3.teams || c3.teams.length === 0) {
          const autoData = getAutoFillData('C3', next);
          if (autoData) {
            c3 = { ...next['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
          }
        }
        if (c3) {
          next['C3'] = syncChampionsRepescadosToUEL(c1, c3);
        }
      }
      return next;
    });

    if (career.active && comps['C1']?.careerTeamId) {
      const c1 = comps['C1'];
      const userTeamId = c1.careerTeamId;
      const userGroup = c1.groups?.find((g: any) => g.teamIds?.includes(userTeamId));
      if (userGroup) {
        const groupTeams = (c1.teams || []).filter((t: any) => userGroup.teamIds?.includes(t.id)).sort((a: any, b: any) =>
          (b.pts || 0) - (a.pts || 0) ||
          ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) ||
          (b.gf || 0) - (a.gf || 0)
        );
        const userPos = groupTeams.findIndex((t: any) => t.id === userTeamId);
        if (userPos === 2) {
          setCareer(c => ({ ...c, clQualified: false, uelQualified: true }));
        } else if (userPos >= 3) {
          setCareer(c => ({ ...c, clQualified: false, uelQualified: false }));
        } else {
          setCareer(c => ({ ...c, clQualified: true, uelQualified: false }));
        }
      }
    }
  };

  // Simula hasta el final (100% de jornadas) todas las ligas europeas pendientes,
  // únicamente cuando la temporada regular concluye o se solicita explícitamente el cierre de ligas
  const finishAllLeaguesAndOpenChampions = () => {
    const seasonNow = seasonState.season || 1;
    setComps(prev => {
      const next = { ...prev };
      LEAGUE_IDS.forEach(compId => {
        const comp = prev[compId];
        if (!comp || comp.type !== 'league') return;
        let upd = { ...comp };
        const runDivToFinish = (teamsKey: string, mdKey: string, histKey: string, winKey: string, isDiv2?: boolean) => {
          let guard = 0;
          const total = divTotalRounds(upd[teamsKey]);
          while ((upd[mdKey] || 0) < total && guard++ < 80) {
            const res = simulateDivisionMatchday(upd[teamsKey], upd[mdKey] || 0, upd[histKey] || [], compId, isDiv2);
            if (!res) break;
            upd = {
              ...upd,
              [teamsKey]: res.updatedTeams,
              [mdKey]: res.nextMatchday,
              [histKey]: res.newHistory,
              [winKey]: res.isFinished ? true : upd[winKey]
            };
          }
        };
        runDivToFinish('teams', 'matchday', 'history', 'showWinner', false);
        runDivToFinish('teams2', 'matchday2', 'history2', 'showWinner2', true);

        if (leagueSeasonOver(upd)) {
          upd.previousStandings = buildStandingsSnapshot(upd.teams) || upd.previousStandings || null;
          upd.previousStandings2 = buildStandingsSnapshot(upd.teams2) || upd.previousStandings2 || null;
        }
        next[compId] = upd;
      });

      const seasonTitles = [];
      LEAGUE_IDS.forEach(id => {
        const c = next[id];
        if (!c) return;
        const r1 = buildSeasonRecord(c.teams, seasonNow);
        const r2 = buildSeasonRecord(c.teams2, seasonNow);
        if (r1) seasonTitles.push({ compId: id, compName: c.name, type: 'league', div: 1, winner: r1.champion, season: seasonNow });
        if (r2) seasonTitles.push({ compId: id, compName: c.name, type: 'league', div: 2, winner: r2.champion, season: seasonNow });
      });
      registerTitles(seasonTitles);

      LEAGUE_IDS.forEach(id => {
        const c = next[id];
        if (!c) return;
        const withHistory = registerSeasonSummary(c, seasonNow);
        next[id] = {
          ...withHistory,
          previousStandings: buildStandingsSnapshot(c.teams) || c.previousStandings || null,
          previousStandings2: buildStandingsSnapshot(c.teams2) || c.previousStandings2 || null
        };
      });

      // ¿El club del modo carrera se clasificó? (1ª División, top 4 o top 8 en Miscelánea)
      const careerQualifiedName = (() => {
        if (!career.active || !career.teamId || career.div !== 1) return null;
        const comp = next[career.compId];
        const table = [...(comp?.teams || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
        const pos = table.findIndex(t => t.id === career.teamId) + 1;
        const maxSpots = career.compId === 'L7' ? 8 : 4;
        return pos > 0 && pos <= maxSpots ? table[pos - 1].name : null;
      })();

      const cl = getAutoFillData('C1', next, careerQualifiedName ? [careerQualifiedName] : []);
      if (cl) {
        const mine = careerQualifiedName ? (cl.teams || []).find(t => t.name === careerQualifiedName) : null;
        next['C1'] = {
          ...next['C1'], ...cl,
          name: next['C1']?.name || 'Champions League',
          careerTeamName: careerQualifiedName || null,
          careerTeamId: mine?.id || null,
          userTeamId: mine?.id || cl.userTeamId
        };
      }
      return next;
    });

    setCareer(c => (c.active ? { ...c, clSeason: seasonNow, clQualified: true } : c));
    setSeasonState(s => ({ ...s, phase: 'champions', globalMatchday: 38 }));
    setActiveCompId('C1');
    setCompView('main');
    if (!career.active) {
      setView('competition');
    } else {
      setView('career');
    }
  };

  // Manda al técnico a la Champions en el Modo Carrera / Entrenador
  const openCareerChampions = () => {
    if (!comps['C1']?.teams?.length) {
      initOrDrawChampions(false);
    }
    setView('career');
  };

  // Inicia un partido de UEFA Champions League para el equipo del modo carrera con dados en directo
  const startCareerChampionsMatch = () => {
    let clComp = comps['C1'];
    if (!clComp?.teams?.length) {
      initOrDrawChampions(false);
      clComp = comps['C1'];
    }

    if (!clComp?.teams?.length || !careerTeam) return;

    const careerClTeam = clComp.teams.find(t => t.id === clComp.careerTeamId) ||
      clComp.teams.find(t => t.name === (clComp.careerTeamName || careerTeam.name)) ||
      clComp.teams.find(t => t.id === clComp.userTeamId) ||
      clComp.teams.find(t => t.id === career.teamId);
    if (!careerClTeam) return;

    const phase = clComp.phase || 'groups';
    const matchday = clComp.matchday || 0;

    const baseTeamStats = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };
    const tactic = career.tactic ? { ...career.tactic } : { ...baseTeamStats };
    let myFinalStats = { ...tactic };
    if (career.activeInjury) {
      const attr = career.activeInjury.attr as 'att' | 'opp' | 'def';
      if (attr) myFinalStats[attr] = Math.max(1, (myFinalStats[attr] || 1) - 1);
    }

    if (phase === 'groups') {
      const userGroup = clComp.groups?.find((g: any) => g.teamIds?.includes(careerClTeam.id)) || clComp.groups?.[0];
      if (!userGroup) return;
      const groupTeams = clComp.teams.filter((t: any) => userGroup.teamIds?.includes(t.id));
      const rounds = generateLeagueSchedule(groupTeams, true);
      const currentRound = rounds[matchday % 6] || [];
      const match = currentRound.find((m: any) => m.homeId === careerClTeam.id || m.awayId === careerClTeam.id);
      if (!match) return;

      const rawHome = clComp.teams.find((t: any) => t.id === match.homeId);
      const rawAway = clComp.teams.find((t: any) => t.id === match.awayId);
      const isHome = match.homeId === careerClTeam.id;

      const myTeamResolved = {
        ...(isHome ? rawHome : rawAway),
        ...myFinalStats,
        color1: careerTeam.color1,
        color2: careerTeam.color2,
        isFlag: careerTeam.isFlag
      };

      const home = isHome ? myTeamResolved : rawHome;
      const away = isHome ? rawAway : myTeamResolved;

      setMatchState(null);
      setMatchState({
        home,
        away,
        scoreH: 0,
        scoreA: 0,
        oppH: home.opp,
        oppA: away.opp,
        turn: 'H',
        phase: 'att',
        lastDie: null,
        logs: [`⭐ UEFA Champions League: ${home.name} vs ${away.name}. ${userGroup.name} · Jornada ${(matchday % 6) + 1} de 6.`],
        penalties: null,
        finished: false,
        careerMatch: true,
        careerChampionsMatch: true,
        isKnockout: false,
        isChampions: true,
        championsPhase: 'groups'
      });
      setView('careerMatch');
    } else if (['Octavos', 'Cuartos', 'Semis', 'Final'].includes(phase)) {
      const bracketMatches = Array.isArray(clComp.bracket?.[phase])
        ? clComp.bracket[phase]
        : [clComp.bracket?.[phase]].filter(Boolean);

      const match = bracketMatches.find((m: any) => m && (m.hId === careerClTeam.id || m.aId === careerClTeam.id));
      if (!match) return;

      const isVuelta = matchday % 2 !== 0 && phase !== 'Final';
      const homeId = isVuelta ? match.aId : match.hId;
      const awayId = isVuelta ? match.hId : match.aId;
      const rawHome = clComp.teams.find((t: any) => t.id === homeId);
      const rawAway = clComp.teams.find((t: any) => t.id === awayId);
      const isHome = homeId === careerClTeam.id;

      const myTeamResolved = {
        ...(isHome ? rawHome : rawAway),
        ...myFinalStats,
        color1: careerTeam.color1,
        color2: careerTeam.color2,
        isFlag: careerTeam.isFlag
      };

      const home = isHome ? myTeamResolved : rawHome;
      const away = isHome ? rawAway : myTeamResolved;

      let aggregate = null;
      if (isVuelta && match.sh !== null && match.sa !== null) {
        aggregate = { sh: match.sa, sa: match.sh };
      }

      setMatchState(null);
      setMatchState({
        home,
        away,
        scoreH: 0,
        scoreA: 0,
        oppH: home.opp,
        oppA: away.opp,
        turn: 'H',
        phase: 'att',
        lastDie: null,
        logs: [`⭐ UEFA Champions League · ${clPhaseLabel(phase)}${isVuelta ? ' (Vuelta)' : phase === 'Final' ? ' (Gran Final)' : ' (Ida)'}: ${home.name} vs ${away.name}.`],
        penalties: null,
        finished: false,
        careerMatch: true,
        careerChampionsMatch: true,
        isKnockout: true,
        isVuelta,
        aggregate,
        isChampions: true,
        championsPhase: phase
      });
      setView('careerMatch');
    }
  };

  // Finaliza un partido de Champions League del modo carrera, aplicando PE, reputación, logs y sincronización global
  const finishCareerChampionsMatch = (
    scoreH: number,
    scoreA: number,
    penalties: any = null,
    simulatedTeams: { home: any; away: any } | null = null,
    trainingFeedback: any = null,
    extraTrainingPe: number = 0,
    nextImmunityWeeks: number | null = null,
    injuryOccurredInSim: boolean = false
  ) => {
    const clComp = comps['C1'];
    if (!clComp || !careerTeam) {
      setMatchState(null);
      setView('career');
      return;
    }

    const careerClTeam = clComp.teams.find(t => t.id === clComp.careerTeamId) ||
      clComp.teams.find(t => t.name === (clComp.careerTeamName || careerTeam.name));

    const activeHome = simulatedTeams?.home || matchState?.home;
    const activeAway = simulatedTeams?.away || matchState?.away;
    const isHome = activeHome?.id === careerClTeam?.id;
    const myGf = isHome ? scoreH : scoreA;
    const myGa = isHome ? scoreA : scoreH;
    const result: 'W' | 'D' | 'L' = myGf > myGa ? 'W' : myGf === myGa ? 'D' : 'L';
    const rivalName = isHome ? activeAway?.name : activeHome?.name;
    const currentPhase = clComp.phase || 'groups';

    // 1. Procesar la ronda en el torneo global C1
    processCupRound(
      {
        home: activeHome,
        away: activeAway,
        scoreH,
        scoreA,
        penalties
      },
      'C1'
    );

    // 2. Recompensas por partido europeo
    const matchPeGained = result === 'W' ? (currentPhase === 'Final' ? 6 : 3) : result === 'D' ? 2 : 0;
    const totalPeGained = Math.max(0, matchPeGained + extraTrainingPe);
    const repGained = result === 'W' ? (currentPhase === 'Final' ? 2.5 : 0.8) : result === 'D' ? 0.3 : -0.1;
    const isChampionsWinner = currentPhase === 'Final' && (result === 'W' || (penalties && (isHome ? penalties.scoreH > penalties.scoreA : penalties.scoreA > penalties.scoreH)));

    setCareer(c => {
      const cleanBase = {
        att: Math.max(c.baseDist?.att || 1, careerTeam.att || 1),
        opp: Math.max(c.baseDist?.opp || 1, careerTeam.opp || 1),
        def: Math.max(c.baseDist?.def || 1, careerTeam.def || 1)
      };
      const newRep = Math.max(0, Math.min(100, Math.round(((c.reputation || 10) + repGained) * 10) / 10));
      const newStats = {
        ...c.stats,
        played: (c.stats?.played || 0) + 1,
        wins: (c.stats?.wins || 0) + (result === 'W' ? 1 : 0),
        draws: (c.stats?.draws || 0) + (result === 'D' ? 1 : 0),
        losses: (c.stats?.losses || 0) + (result === 'L' ? 1 : 0),
        gf: (c.stats?.gf || 0) + myGf,
        ga: (c.stats?.ga || 0) + myGa
      };

      const injuryHappened = injuryOccurredInSim || (c.activeInjury && c.activeInjury.matchKey === currentMatchKey);
      const resolvedImmunity = nextImmunityWeeks !== null && nextImmunityWeeks !== undefined
        ? nextImmunityWeeks
        : injuryHappened
        ? 3
        : Math.max(0, (c.medicalImmunityWeeks || 0) - 1);

      return {
        ...c,
        pe: Math.max(0, (c.pe || 0) + totalPeGained),
        reputation: newRep,
        activeInjury: null,
        medicalImmunityWeeks: resolvedImmunity,
        trainedMatchKey: currentMatchKey,
        clChampion: isChampionsWinner ? true : c.clChampion,
        baseDist: cleanBase,
        tactic: cleanBase,
        stats: newStats,
        lastSimulationFeedback: {
          matchday: (clComp.matchday || 0) + 1,
          isChampions: true,
          rivalName: rivalName || 'Rival Europeo',
          myGf,
          myGa,
          result,
          peGained: totalPeGained,
          matchPeGained,
          trainingPeGained: extraTrainingPe,
          trainingFeedback,
          repGained,
          headline: `⭐ UEFA Champions League · ${clPhaseLabel(currentPhase)}`,
          summary: isChampionsWinner
            ? `🏆 ¡CAMPEÓN DE LA UEFA CHAMPIONS LEAGUE! Derrotas a ${rivalName} en la Gran Final. Ganancia total: +${totalPeGained} PE (+${matchPeGained} partido${extraTrainingPe ? `, +${extraTrainingPe} entreno` : ''}) y ${repGained > 0 ? `+${repGained}` : repGained} reputación.`
            : result === 'W'
            ? `¡Victoria europea! ${myGf}-${myGa} contra ${rivalName}. Sumas +${totalPeGained} PE (+${matchPeGained} partido${extraTrainingPe ? `, +${extraTrainingPe} entreno` : ''}) y ${repGained > 0 ? `+${repGained}` : repGained} reputación.`
            : result === 'D'
            ? `Empate ${myGf}-${myGa} contra ${rivalName}. Sumas +${totalPeGained} PE (+${matchPeGained} partido${extraTrainingPe ? `, +${extraTrainingPe} entreno` : ''}) y ${repGained > 0 ? `+${repGained}` : repGained} reputación.`
            : `Derrota ${myGf}-${myGa} contra ${rivalName} en la Champions League (${repGained > 0 ? `+${repGained}` : repGained} reputación).`
        },
        seasonLog: [
          {
            matchday: (clComp.matchday || 0) + 1,
            isChampions: true,
            phase: currentPhase,
            rival: rivalName,
            gf: myGf,
            ga: myGa,
            result,
            rep: repGained,
            pe: totalPeGained
          },
          ...(c.seasonLog || [])
        ].slice(0, 60)
      };
    });

    const currentWk = seasonState.currentWeek || 1;
    const weekData = getSemanaCalendario(currentWk);
    const expLeagueMd = getLeagueMatchdayForWeek(currentWk);
    const hasLeagueThisWeek = weekData?.fixtures?.some(f => f.competicion === 'LIGA' && f.esPartido);
    const careerMd = (career.div === 2 ? comps[career.compId]?.matchday2 : comps[career.compId]?.matchday) || 0;
    const userPendingLeagueThisWeek = hasLeagueThisWeek && !careerDivisionFinished && (careerMd < (expLeagueMd ?? (careerMd + 1)));

    // Si ya no queda partido de liga pendiente para esta semana, avanzar la semana del calendario
    if (!userPendingLeagueThisWeek) {
      setSeasonState(s => ({
        ...s,
        currentWeek: Math.min(43, (s.currentWeek || 1) + 1)
      }));
    }

    setMatchState(null);
    setView('career');
  };

  // Ejecución del partido de Champions simulado
  const executeCareerChampionsSimulatedMatch = (
    injuryAttr: 'att' | 'opp' | 'def' | null,
    trainingFeedback: any,
    extraTrainingPe: number,
    nextImmunityWeeks: number | null,
    injuryOccurredInSim: boolean
  ) => {
    let clComp = comps['C1'];
    if (!clComp?.teams?.length || !careerTeam) return;

    const careerClTeam = clComp.teams.find(t => t.id === clComp.careerTeamId) ||
      clComp.teams.find(t => t.name === (clComp.careerTeamName || careerTeam.name));
    if (!careerClTeam) return;

    const phase = clComp.phase || 'groups';
    const matchday = clComp.matchday || 0;

    const baseTeamStats = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };
    const tactic = career.tactic ? { ...career.tactic } : { ...baseTeamStats };
    let myFinalStats = { ...tactic };
    if (injuryAttr) {
      myFinalStats[injuryAttr] = Math.max(1, (myFinalStats[injuryAttr] || baseTeamStats[injuryAttr] || 1) - 1);
    }

    let home: any = null, away: any = null;

    if (phase === 'groups') {
      const userGroup = clComp.groups?.find((g: any) => g.teamIds?.includes(careerClTeam.id)) || clComp.groups?.[0];
      if (!userGroup) return;
      const groupTeams = clComp.teams.filter((t: any) => userGroup.teamIds?.includes(t.id));
      const rounds = generateLeagueSchedule(groupTeams, true);
      const currentRound = rounds[matchday % 6] || [];
      const match = currentRound.find((m: any) => m.homeId === careerClTeam.id || m.awayId === careerClTeam.id);
      if (!match) return;

      const rawHome = clComp.teams.find((t: any) => t.id === match.homeId);
      const rawAway = clComp.teams.find((t: any) => t.id === match.awayId);
      const isHome = match.homeId === careerClTeam.id;

      const myTeamResolved = {
        ...(isHome ? rawHome : rawAway),
        ...myFinalStats,
        color1: careerTeam.color1,
        color2: careerTeam.color2,
        isFlag: careerTeam.isFlag
      };

      home = isHome ? myTeamResolved : rawHome;
      away = isHome ? rawAway : myTeamResolved;
    } else if (['Octavos', 'Cuartos', 'Semis', 'Final'].includes(phase)) {
      const bracketMatches = Array.isArray(clComp.bracket?.[phase])
        ? clComp.bracket[phase]
        : [clComp.bracket?.[phase]].filter(Boolean);

      const match = bracketMatches.find((m: any) => m && (m.hId === careerClTeam.id || m.aId === careerClTeam.id));
      if (!match) return;

      const isVuelta = matchday % 2 !== 0 && phase !== 'Final';
      const homeId = isVuelta ? match.aId : match.hId;
      const awayId = isVuelta ? match.hId : match.aId;
      const rawHome = clComp.teams.find((t: any) => t.id === homeId);
      const rawAway = clComp.teams.find((t: any) => t.id === awayId);
      const isHome = homeId === careerClTeam.id;

      const myTeamResolved = {
        ...(isHome ? rawHome : rawAway),
        ...myFinalStats,
        color1: careerTeam.color1,
        color2: careerTeam.color2,
        isFlag: careerTeam.isFlag
      };

      home = isHome ? myTeamResolved : rawHome;
      away = isHome ? rawAway : myTeamResolved;
    }

    if (!home || !away) return;

    const { sh: simH, sa: simA } = simMatchGoals(home.opp, home.att, away.def, away.opp, away.att, home.def);

    let penalties: any = null;
    if (phase !== 'groups') {
      const isVuelta = matchday % 2 !== 0 && phase !== 'Final';
      const bracketMatches = Array.isArray(clComp.bracket?.[phase])
        ? clComp.bracket[phase]
        : [clComp.bracket?.[phase]].filter(Boolean);
      const match = bracketMatches.find((m: any) => m && (m.hId === home.id || m.aId === home.id || m.hId === away.id || m.aId === away.id));
      const leg1H = match?.sh || 0;
      const leg1A = match?.sa || 0;
      const isDraw = phase === 'Final' ? (simH === simA) : isVuelta ? ((leg1H + simA) === (leg1A + simH)) : false;

      if (isDraw) {
        penalties = simPenaltyShootout(home.att, away.def, away.att, home.def);
      }
    }

    finishCareerChampionsMatch(simH, simA, penalties, { home, away }, trainingFeedback, extraTrainingPe, nextImmunityWeeks, injuryOccurredInSim);
  };

  // Simulación rápida de un partido de Champions League
  const simulateCareerChampionsMatch = () => {
    let clComp = comps['C1'];
    if (!clComp?.teams?.length) {
      initOrDrawChampions(false);
      clComp = comps['C1'];
    }

    if (!clComp?.teams?.length || !careerTeam) return;

    let trainingFeedback: any = null;
    let newImmunityWeeks = career.medicalImmunityWeeks || 0;
    let extraTrainingPe = 0;
    let injuryOccurredInSim = false;
    let injuryAttr: 'att' | 'opp' | 'def' | null = null;

    // Si aún no entrenó voluntariamente en este partido de Champions, se simula con 1D6
    if (career.trainedMatchKey !== currentMatchKey) {
      const die = roll1D6();
      if (die === 1) {
        extraTrainingPe = 2;
        trainingFeedback = {
          simulated: true,
          die: 1,
          peGained: 2,
          injuryOccurred: false,
          immunityPrevented: false,
          message: '¡Entrenamiento europeo de alto rendimiento! +2 PE ganados.'
        };
      } else if (die === 2) {
        extraTrainingPe = 1;
        trainingFeedback = {
          simulated: true,
          die: 2,
          peGained: 1,
          injuryOccurred: false,
          immunityPrevented: false,
          message: '¡Buen entrenamiento táctico! +1 PE ganado.'
        };
      } else if (die >= 3 && die <= 5) {
        trainingFeedback = {
          simulated: true,
          die,
          peGained: 0,
          injuryOccurred: false,
          immunityPrevented: false,
          message: 'Sesión europea regular sin incidencias.'
        };
      } else if (die === 6) {
        const base = {
          att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
          opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
          def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
        };
        const tactic = career.tactic ? { ...career.tactic } : { ...base };
        const attrs: Array<'att' | 'opp' | 'def'> = ['att', 'opp', 'def'].filter(a => (tactic[a] || 1) > 1) as any;
        const affected: 'att' | 'opp' | 'def' = attrs.length > 0 ? attrs[Math.floor(Math.random() * attrs.length)] : 'att';
        const attrLabels = { att: 'Ataque (ATT)', opp: 'Ocasiones (OPP)', def: 'Defensa (DEF)' };

        if (newImmunityWeeks > 0) {
          trainingFeedback = {
            simulated: true,
            die: 6,
            peGained: 0,
            injuryOccurred: true,
            immunityPrevented: true,
            message: `🛡️ ¡Inmunidad Médica activa (${newImmunityWeeks} sem.) evitó la sobrecarga en ${attrLabels[affected]}!`
          };
        } else {
          // Si estamos simulando desde la interfaz general (view !== 'career'), NO lanzar alerta médica y aceptar automáticamente por defecto la baja médica
          if (view !== 'career') {
            trainingFeedback = {
              simulated: true,
              die: 6,
              peGained: 0,
              peCost: 0,
              physioPaid: false,
              injuryOccurred: true,
              immunityPrevented: false,
              statLost: attrLabels[affected],
              newImmunityWeeks: 3,
              message: `Baja médica aceptada: -1 ${attrLabels[affected]} en este partido simulado. Alta médica automática tras el encuentro (+3 sem. Inmunidad Médica).`
            };
            injuryAttr = affected;
            injuryOccurredInSim = true;
            newImmunityWeeks = 3;
          } else {
            // Modal de alerta médica de simulación para Champions League (sólo en interfaz de carrera)
            setSimulationInjuryAlert({
              affectedAttr: affected,
              attrLabel: attrLabels[affected],
              die: 6,
              physioCost: 30,
              categoryLabel: 'UEFA Champions League / Élite',
              isChampions: true
            });
            return;
          }
        }
      }
    } else if (career.lastTrainingResult) {
      trainingFeedback = career.lastTrainingResult;
      if (career.activeInjury && career.activeInjury.matchKey === currentMatchKey) {
        injuryAttr = career.activeInjury.attr;
        injuryOccurredInSim = true;
      }
    }

    executeCareerChampionsSimulatedMatch(injuryAttr, trainingFeedback, extraTrainingPe, newImmunityWeeks, injuryOccurredInSim);
  };

  // Inicia un partido de UEFA Europa League para el equipo del modo carrera con dados en directo
  const startCareerUelMatch = () => {
    let uelComp = comps['C3'];
    if (!uelComp?.teams?.length) {
      const autoData = getAutoFillData('C3', comps);
      if (autoData) {
        uelComp = { ...comps['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
        setComps(prev => ({ ...prev, C3: uelComp }));
      }
    }

    if (!uelComp?.teams?.length || !careerTeam) return;

    const careerUelTeam = uelComp.teams.find(t => t.id === uelComp.careerTeamId) ||
      uelComp.teams.find(t => t.name === (uelComp.careerTeamName || careerTeam.name)) ||
      uelComp.teams.find(t => t.id === uelComp.userTeamId) ||
      uelComp.teams.find(t => t.id === career.teamId);
    if (!careerUelTeam) return;

    const phase = uelComp.phase || 'Dieciseisavos';
    const matchday = uelComp.matchday || 0;

    const clComp = comps['C1'];
    const isClGroupsFinished = Boolean(!clComp || clComp.phase !== 'groups' || (clComp.matchday || 0) >= 6);
    if (phase !== 'Dieciseisavos' && !isClGroupsFinished) return;

    const baseTeamStats = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };
    const tactic = career.tactic ? { ...career.tactic } : { ...baseTeamStats };
    let myFinalStats = { ...tactic };
    if (career.activeInjury) {
      const attr = career.activeInjury.attr as 'att' | 'opp' | 'def';
      if (attr) myFinalStats[attr] = Math.max(1, (myFinalStats[attr] || 1) - 1);
    }

    const bracketMatches = Array.isArray(uelComp.bracket?.[phase])
      ? uelComp.bracket[phase]
      : [uelComp.bracket?.[phase]].filter(Boolean);

    const match = bracketMatches.find((m: any) => m && (m.hId === careerUelTeam.id || m.aId === careerUelTeam.id));
    if (!match) return;

    const isVuelta = matchday % 2 !== 0 && phase !== 'Final';
    const homeId = isVuelta ? match.aId : match.hId;
    const awayId = isVuelta ? match.hId : match.aId;
    const rawHome = uelComp.teams.find((t: any) => t.id === homeId);
    const rawAway = uelComp.teams.find((t: any) => t.id === awayId);
    const isHome = homeId === careerUelTeam.id;

    const myTeamResolved = {
      ...(isHome ? rawHome : rawAway),
      ...myFinalStats,
      color1: careerTeam.color1,
      color2: careerTeam.color2,
      isFlag: careerTeam.isFlag
    };

    const home = isHome ? myTeamResolved : rawHome;
    const away = isHome ? rawAway : myTeamResolved;

    let aggregate = null;
    if (isVuelta && match.sh !== null && match.sa !== null) {
      aggregate = { sh: match.sa, sa: match.sh };
    }

    setMatchState(null);
    setMatchState({
      home,
      away,
      scoreH: 0,
      scoreA: 0,
      oppH: home.opp,
      oppA: away.opp,
      turn: 'H',
      phase: 'att',
      lastDie: null,
      logs: [`🟠 UEFA Europa League · ${phase}${isVuelta ? ' (Vuelta)' : phase === 'Final' ? ' (Gran Final)' : ' (Ida)'}: ${home.name} vs ${away.name}.`],
      penalties: null,
      finished: false,
      careerMatch: true,
      careerUelMatch: true,
      isKnockout: true,
      isVuelta,
      aggregate,
      isEuropaLeague: true,
      uelPhase: phase
    });
    setView('careerMatch');
  };

  // Finaliza un partido de UEFA Europa League del modo carrera
  const finishCareerUelMatch = (
    scoreH: number,
    scoreA: number,
    penalties: any = null,
    simulatedTeams: { home: any; away: any } | null = null,
    trainingFeedback: any = null,
    extraTrainingPe: number = 0,
    nextImmunityWeeks: number | null = null,
    injuryOccurredInSim: boolean = false
  ) => {
    const uelComp = comps['C3'];
    if (!uelComp || !careerTeam) {
      setMatchState(null);
      setView('career');
      return;
    }

    const careerUelTeam = uelComp.teams.find(t => t.id === uelComp.careerTeamId) ||
      uelComp.teams.find(t => t.name === (uelComp.careerTeamName || careerTeam.name)) ||
      uelComp.teams.find(t => t.id === uelComp.userTeamId);

    const activeHome = simulatedTeams?.home || matchState?.home;
    const activeAway = simulatedTeams?.away || matchState?.away;
    const isHome = activeHome?.id === careerUelTeam?.id;
    const myGf = isHome ? scoreH : scoreA;
    const myGa = isHome ? scoreA : scoreH;
    const result: 'W' | 'D' | 'L' = myGf > myGa ? 'W' : myGf === myGa ? 'D' : 'L';
    const rivalName = isHome ? activeAway?.name : activeHome?.name;
    const currentPhase = uelComp.phase || 'Dieciseisavos';

    // 1. Procesar la ronda en el torneo global C3
    processCupRound(
      {
        home: activeHome,
        away: activeAway,
        scoreH,
        scoreA,
        penalties
      },
      'C3'
    );

    // 2. Recompensas por partido en UEFA Europa League
    const matchPeGained = result === 'W' ? (currentPhase === 'Final' ? 5 : 3) : result === 'D' ? 2 : 0;
    const totalPeGained = Math.max(0, matchPeGained + extraTrainingPe);
    const repGained = result === 'W' ? (currentPhase === 'Final' ? 2.0 : 0.6) : result === 'D' ? 0.2 : -0.1;
    const isUelWinner = currentPhase === 'Final' && (result === 'W' || (penalties && (isHome ? penalties.scoreH > penalties.scoreA : penalties.scoreA > penalties.scoreH)));

    setCareer(c => {
      const cleanBase = {
        att: Math.max(c.baseDist?.att || 1, careerTeam.att || 1),
        opp: Math.max(c.baseDist?.opp || 1, careerTeam.opp || 1),
        def: Math.max(c.baseDist?.def || 1, careerTeam.def || 1)
      };
      const newRep = Math.max(0, Math.min(100, Math.round(((c.reputation || 10) + repGained) * 10) / 10));
      const newStats = {
        ...c.stats,
        played: (c.stats?.played || 0) + 1,
        wins: (c.stats?.wins || 0) + (result === 'W' ? 1 : 0),
        draws: (c.stats?.draws || 0) + (result === 'D' ? 1 : 0),
        losses: (c.stats?.losses || 0) + (result === 'L' ? 1 : 0),
        gf: (c.stats?.gf || 0) + myGf,
        ga: (c.stats?.ga || 0) + myGa
      };

      const injuryHappened = injuryOccurredInSim || (c.activeInjury && c.activeInjury.matchKey === currentMatchKey);
      const resolvedImmunity = nextImmunityWeeks !== null && nextImmunityWeeks !== undefined
        ? nextImmunityWeeks
        : injuryHappened
        ? 3
        : Math.max(0, (c.medicalImmunityWeeks || 0) - 1);

      return {
        ...c,
        pe: Math.max(0, (c.pe || 0) + totalPeGained),
        reputation: newRep,
        activeInjury: null,
        medicalImmunityWeeks: resolvedImmunity,
        trainedMatchKey: currentMatchKey,
        uelChampion: isUelWinner ? true : c.uelChampion,
        baseDist: cleanBase,
        tactic: cleanBase,
        stats: newStats,
        lastSimulationFeedback: {
          matchday: (uelComp.matchday || 0) + 1,
          isEuropaLeague: true,
          rivalName: rivalName || 'Rival Europeo',
          myGf,
          myGa,
          result,
          peGained: totalPeGained,
          matchPeGained,
          trainingPeGained: extraTrainingPe,
          trainingFeedback,
          repGained,
          headline: `🟠 UEFA Europa League · ${currentPhase}`,
          summary: isUelWinner
            ? `🏆 ¡CAMPEÓN DE LA UEFA EUROPA LEAGUE! Vences a ${rivalName} en la Gran Final. Ganancia total: +${totalPeGained} PE y +${repGained} reputación.`
            : result === 'W'
            ? `¡Victoria en Europa League! ${myGf}-${myGa} contra ${rivalName}. Sumas +${totalPeGained} PE y +${repGained} reputación.`
            : result === 'D'
            ? `Empate ${myGf}-${myGa} contra ${rivalName}. Sumas +${totalPeGained} PE y +${repGained} reputación.`
            : `Derrota ${myGf}-${myGa} contra ${rivalName} en la UEFA Europa League (${repGained} reputación).`
        },
        seasonLog: [
          {
            matchday: (uelComp.matchday || 0) + 1,
            isEuropaLeague: true,
            phase: currentPhase,
            rival: rivalName,
            gf: myGf,
            ga: myGa,
            result,
            rep: repGained,
            pe: totalPeGained
          },
          ...(c.seasonLog || [])
        ].slice(0, 60)
      };
    });

    const currentWk = seasonState.currentWeek || 1;
    const weekData = getSemanaCalendario(currentWk);
    const expLeagueMd = getLeagueMatchdayForWeek(currentWk);
    const hasLeagueThisWeek = weekData?.fixtures?.some(f => f.competicion === 'LIGA' && f.esPartido);
    const careerMd = (career.div === 2 ? comps[career.compId]?.matchday2 : comps[career.compId]?.matchday) || 0;
    const userPendingLeagueThisWeek = hasLeagueThisWeek && !careerDivisionFinished && (careerMd < (expLeagueMd ?? (careerMd + 1)));

    // Si ya no queda partido de liga pendiente para esta semana, avanzar la semana del calendario
    if (!userPendingLeagueThisWeek) {
      setSeasonState(s => ({
        ...s,
        currentWeek: Math.min(43, (s.currentWeek || 1) + 1)
      }));
    }

    setMatchState(null);
    if (view === 'careerMatch') {
      setView('career');
    }
  };

  const executeCareerUelSimulatedMatch = (
    injuryAttr: 'att' | 'opp' | 'def' | null,
    trainingFeedback: any,
    extraTrainingPe: number,
    nextImmunityWeeks: number | null,
    injuryOccurredInSim: boolean
  ) => {
    let uelComp = comps['C3'];
    if (!uelComp?.teams?.length) {
      const autoData = getAutoFillData('C3', comps);
      if (autoData) {
        uelComp = { ...comps['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
      }
    }
    if (!uelComp?.teams?.length || !careerTeam) return;

    const careerUelTeam = uelComp.teams.find(t => t.id === uelComp.careerTeamId) ||
      uelComp.teams.find(t => t.name === (uelComp.careerTeamName || careerTeam.name)) ||
      uelComp.teams.find(t => t.id === uelComp.userTeamId);
    if (!careerUelTeam) return;

    const phase = uelComp.phase || 'Dieciseisavos';
    const matchday = uelComp.matchday || 0;

    const clComp = comps['C1'];
    const isClGroupsFinished = Boolean(!clComp || clComp.phase !== 'groups' || (clComp.matchday || 0) >= 6);
    if (phase !== 'Dieciseisavos' && !isClGroupsFinished) return;

    const baseTeamStats = {
      att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
      opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
      def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
    };
    const tactic = career.tactic ? { ...career.tactic } : { ...baseTeamStats };
    let myFinalStats = { ...tactic };
    if (injuryAttr) {
      myFinalStats[injuryAttr] = Math.max(1, (myFinalStats[injuryAttr] || baseTeamStats[injuryAttr] || 1) - 1);
    }

    const bracketMatches = Array.isArray(uelComp.bracket?.[phase])
      ? uelComp.bracket[phase]
      : [uelComp.bracket?.[phase]].filter(Boolean);

    const match = bracketMatches.find((m: any) => m && (m.hId === careerUelTeam.id || m.aId === careerUelTeam.id));
    if (!match) return;

    const isVuelta = matchday % 2 !== 0 && phase !== 'Final';
    const homeId = isVuelta ? match.aId : match.hId;
    const awayId = isVuelta ? match.hId : match.aId;
    const rawHome = uelComp.teams.find((t: any) => t.id === homeId);
    const rawAway = uelComp.teams.find((t: any) => t.id === awayId);
    const isHome = homeId === careerUelTeam.id;

    const myTeamResolved = {
      ...(isHome ? rawHome : rawAway),
      ...myFinalStats,
      color1: careerTeam.color1,
      color2: careerTeam.color2,
      isFlag: careerTeam.isFlag
    };

    const home = isHome ? myTeamResolved : rawHome;
    const away = isHome ? rawAway : myTeamResolved;
    if (!home || !away) return;

    const { sh: simH, sa: simA } = simMatchGoals(home.opp, home.att, away.def, away.opp, away.att, home.def);

    let penalties: any = null;
    const leg1H = match?.sh || 0;
    const leg1A = match?.sa || 0;
    const isDraw = phase === 'Final' ? (simH === simA) : isVuelta ? ((leg1H + simA) === (leg1A + simH)) : false;
    if (isDraw) {
      penalties = simPenaltyShootout(home.att, away.def, away.att, home.def);
    }

    finishCareerUelMatch(simH, simA, penalties, { home, away }, trainingFeedback, extraTrainingPe, nextImmunityWeeks, injuryOccurredInSim);
  };

  const simulateCareerUelMatch = () => {
    let uelComp = comps['C3'];
    if (!uelComp?.teams?.length) {
      const autoData = getAutoFillData('C3', comps);
      if (autoData) {
        uelComp = { ...comps['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
        setComps(prev => ({ ...prev, C3: uelComp }));
      }
    }
    if (!uelComp?.teams?.length || !careerTeam) return;

    let trainingFeedback: any = null;
    let newImmunityWeeks = career.medicalImmunityWeeks || 0;
    let extraTrainingPe = 0;
    let injuryOccurredInSim = false;
    let injuryAttr: 'att' | 'opp' | 'def' | null = null;

    if (career.trainedMatchKey !== currentMatchKey) {
      const die = roll1D6();
      if (die === 1) {
        extraTrainingPe = 2;
        trainingFeedback = {
          simulated: true,
          die: 1,
          peGained: 2,
          injuryOccurred: false,
          immunityPrevented: false,
          message: '¡Gran sesión táctica de Europa League! +2 PE ganados.'
        };
      } else if (die === 2) {
        extraTrainingPe = 1;
        trainingFeedback = {
          simulated: true,
          die: 2,
          peGained: 1,
          injuryOccurred: false,
          immunityPrevented: false,
          message: '¡Buen entrenamiento para Europa League! +1 PE ganado.'
        };
      } else if (die >= 3 && die <= 5) {
        trainingFeedback = {
          simulated: true,
          die,
          peGained: 0,
          injuryOccurred: false,
          immunityPrevented: false,
          message: 'Preparación para Europa League sin incidencias.'
        };
      } else if (die === 6) {
        const base = {
          att: Math.max(career.baseDist?.att || 1, careerTeam.att || 1),
          opp: Math.max(career.baseDist?.opp || 1, careerTeam.opp || 1),
          def: Math.max(career.baseDist?.def || 1, careerTeam.def || 1)
        };
        const tactic = career.tactic ? { ...career.tactic } : { ...base };
        const attrs: Array<'att' | 'opp' | 'def'> = ['att', 'opp', 'def'].filter(a => (tactic[a] || 1) > 1) as any;
        const affected: 'att' | 'opp' | 'def' = attrs.length > 0 ? attrs[Math.floor(Math.random() * attrs.length)] : 'att';
        const attrLabels = { att: 'Ataque (ATT)', opp: 'Ocasiones (OPP)', def: 'Defensa (DEF)' };

        if (newImmunityWeeks > 0) {
          trainingFeedback = {
            simulated: true,
            die: 6,
            peGained: 0,
            injuryOccurred: true,
            immunityPrevented: true,
            message: `🛡️ ¡Inmunidad Médica activa (${newImmunityWeeks} sem.) evitó la sobrecarga en ${attrLabels[affected]}!`
          };
        } else {
          trainingFeedback = {
            simulated: true,
            die: 6,
            peGained: 0,
            peCost: 0,
            physioPaid: false,
            injuryOccurred: true,
            immunityPrevented: false,
            statLost: attrLabels[affected],
            newImmunityWeeks: 3,
            message: `Baja médica: -1 ${attrLabels[affected]} en este partido de Europa League (+3 sem. Inmunidad Médica tras el choque).`
          };
          injuryAttr = affected;
          injuryOccurredInSim = true;
          newImmunityWeeks = 3;
        }
      }
    } else if (career.lastTrainingResult) {
      trainingFeedback = career.lastTrainingResult;
      if (career.activeInjury && career.activeInjury.matchKey === currentMatchKey) {
        injuryAttr = career.activeInjury.attr;
        injuryOccurredInSim = true;
      }
    }

    executeCareerUelSimulatedMatch(injuryAttr, trainingFeedback, extraTrainingPe, newImmunityWeeks, injuryOccurredInSim);
  };

  // Simulación de una sola etapa / jornada de una copa (Champions, Europa League o Mundial)
  const simulateSingleCupStage = (initialComp: any, compId: string = 'C1', c1Override: any = null) => {
    if (!initialComp || initialComp.type === 'league') return initialComp;
    let comp = JSON.parse(JSON.stringify(initialComp));
    const targetId = comp.id || compId || (comp.name?.includes('Champions') || (Array.isArray(comp.groups) && comp.groups.length === 8) ? 'C1' : 'C2');
    comp.id = targetId;
    const isChampions = (targetId === 'C1' || targetId === 'C3' || comp.name?.includes('Champions') || comp.name?.includes('Europa')) && targetId !== 'C2' && !comp.name?.includes('Mundial') && !comp.name?.includes('World');
    const isWorldCup = targetId === 'C2' || comp.name?.includes('Mundial') || comp.name?.includes('World');

    if (comp.phase === 'Terminado' || comp.showWinner) return comp;

    // Control cronológico estricto: UEL Octavos no puede disputarse si Champions League aún está en fase de grupos y los emparejamientos están incompletos
    if (targetId === 'C3' && comp.phase !== 'Dieciseisavos') {
      const c1 = c1Override || comps['C1'];
      const octavosMatches = comp.bracket?.Octavos || [];
      const octavosMissingTeams = Array.isArray(octavosMatches) && octavosMatches.some((m: any) => m.aId === null || m.hId === null);
      const isC1Done = !c1 || c1.phase !== 'groups' || (c1.matchday || 0) >= 6;
      if (octavosMissingTeams && !isC1Done) {
        return comp;
      }
    }

    if (comp.phase === 'groups') {
      const maxMatchdays = isWorldCup ? 3 : 6;
      const results: any[] = [];

      (comp.groups || []).forEach((group: any) => {
        const groupTeams = (comp.teams || []).filter((t: any) => group.teamIds?.includes(t.id));
        const schedule = generateLeagueSchedule(groupTeams, !isWorldCup);
        const currentRound = schedule[(comp.matchday || 0) % maxMatchdays];
        if (currentRound) {
          currentRound.forEach((m: any) => {
            const h = (comp.teams || []).find((t: any) => t.id === m.homeId);
            const a = (comp.teams || []).find((t: any) => t.id === m.awayId);
            const { sh, sa } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);
            results.push({ hId: m.homeId, aId: m.awayId, sh, sa, penH: null, penA: null });
          });
        }
      });

      const updatedTeams = (comp.teams || []).map((t: any) => {
        const res = results.find(r => r.hId === t.id || r.aId === t.id);
        if (!res) return t;
        const isHome = res.hId === t.id;
        const gf = isHome ? res.sh : res.sa;
        const ga = isHome ? res.sa : res.sh;
        const w = gf > ga ? 1 : 0;
        const d = gf === ga ? 1 : 0;
        const l = gf < ga ? 1 : 0;
        return {
          ...t,
          p: (t.p || 0) + 1,
          w: (t.w || 0) + w,
          d: (t.d || 0) + d,
          l: (t.l || 0) + l,
          gf: (t.gf || 0) + gf,
          ga: (t.ga || 0) + ga,
          pts: (t.pts || 0) + (w * 3 + d)
        };
      });

      const nextMatchday = (comp.matchday || 0) + 1;
      const isEndOfGroups = nextMatchday >= maxMatchdays;
      let newBracket = comp.bracket;
      if (isEndOfGroups) {
        newBracket = generateKnockoutBrackets({ ...comp, teams: updatedTeams });
      }

      comp = {
        ...comp,
        teams: updatedTeams,
        history: [{ day: 'Jornada ' + nextMatchday, results }, ...(comp.history || [])],
        matchday: nextMatchday,
        phase: isEndOfGroups ? (newBracket?.Octavos ? 'Octavos' : (newBracket?.Dieciseisavos ? 'Dieciseisavos' : 'Cuartos')) : 'groups',
        bracket: newBracket
      };
    } else {
      // Knockout
      const phase = comp.phase;
      const isVuelta = isChampions && (comp.matchday || 0) % 2 !== 0 && phase !== 'Final';
      const newBracket = { ...comp.bracket };
      const matchesToProcess = Array.isArray(newBracket[phase]) ? newBracket[phase] : [newBracket[phase]].filter(Boolean);
      const allResults: any[] = [];

      matchesToProcess.forEach((m: any) => {
        if (!m) return;
        const homeId = isVuelta ? m.aId : m.hId;
        const awayId = isVuelta ? m.hId : m.aId;
        const h = (comp.teams || []).find((t: any) => t.id === homeId);
        const a = (comp.teams || []).find((t: any) => t.id === awayId);
        const { sh: simH, sa: simA } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);

        const matchSh = isVuelta ? simA : simH;
        const matchSa = isVuelta ? simH : simA;
        let penH: any = null, penA: any = null;

        const isDraw = (isChampions && isVuelta && phase !== 'Final' && phase !== 'TercerPuesto')
          ? ((m.sh || 0) + matchSh === (m.sa || 0) + matchSa)
          : (matchSh === matchSa);

        if (isDraw && (!isChampions || isVuelta || phase === 'Final' || phase === 'TercerPuesto')) {
          const penShootout = simPenaltyShootout(h?.att || 1, a?.def || 1, a?.att || 1, h?.def || 1);
          penH = isVuelta ? penShootout.scoreA : penShootout.scoreH;
          penA = isVuelta ? penShootout.scoreH : penShootout.scoreA;
        }

        if (isVuelta) {
          m.sh2 = matchSh;
          m.sa2 = matchSa;
        } else {
          m.sh = matchSh;
          m.sa = matchSa;
        }
        if (penH !== null) {
          m.penH = penH;
          m.penA = penA;
        }
        allResults.push(isVuelta
          ? { hId: m.aId, aId: m.hId, sh: matchSa, sa: matchSh, penH: penA, penA: penH }
          : { hId: m.hId, aId: m.aId, sh: matchSh, sa: matchSa, penH, penA }
        );
      });

      let nextPhase = phase;
      let showWinner = false;
      if (!isChampions || isVuelta || phase === 'Final') {
        const winners = matchesToProcess.map((m: any) => {
          const tH = isChampions && phase !== 'Final' ? ((m.sh || 0) + (m.sh2 || 0)) : (m.sh || 0);
          const tA = isChampions && phase !== 'Final' ? ((m.sa || 0) + (m.sa2 || 0)) : (m.sa || 0);
          if (tH > tA) return m.hId;
          if (tA > tH) return m.aId;
          return (m.penH || 0) > (m.penA || 0) ? m.hId : m.aId;
        });

        if (phase === 'Dieciseisavos') {
          nextPhase = 'Octavos';
          const c1Comp = c1Override || comps['C1'];
          const isC1Done = !c1Comp || c1Comp.phase !== 'groups' || (c1Comp.matchday || 0) >= 6;
          const repescadoTeams = (comp.teams || []).filter((t: any) => t.isRepesca || (t.clOrigin && t.clOrigin.includes('Repesca')));
          newBracket.Octavos = Array(8).fill(0).map((_, i) => ({
            id: 'O' + (i + 1),
            hId: winners[i] ?? null,
            aId: isC1Done ? (repescadoTeams[i]?.id ?? (17 + i)) : (repescadoTeams[i]?.id ?? null),
            sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
          }));
        } else if (phase === 'Octavos') {
          nextPhase = 'Cuartos';
          newBracket.Cuartos = Array(4).fill(0).map((_, i) => ({
            id: 'C' + (i + 1),
            hId: winners[i * 2] ?? null,
            aId: winners[i * 2 + 1] ?? null,
            sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
          }));
        } else if (phase === 'Cuartos') {
          nextPhase = 'Semis';
          newBracket.Semis = Array(2).fill(0).map((_, i) => ({
            id: 'S' + (i + 1),
            hId: winners[i * 2] ?? null,
            aId: winners[i * 2 + 1] ?? null,
            sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
          }));
        } else if (phase === 'Semis') {
          const losers = matchesToProcess.map((m: any, i: number) => {
            return m.hId === winners[i] ? m.aId : m.hId;
          });
          newBracket.Final = [{
            id: 'F1',
            hId: winners[0] ?? null,
            aId: winners[1] ?? null,
            sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
          }];
          if (isWorldCup) {
            newBracket.TercerPuesto = [{
              id: 'TP1',
              hId: losers[0] ?? null,
              aId: losers[1] ?? null,
              sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
            }];
            nextPhase = 'TercerPuesto';
          } else {
            nextPhase = 'Final';
          }
        } else if (phase === 'TercerPuesto') {
          nextPhase = 'Final';
        } else {
          nextPhase = 'Terminado';
          showWinner = true;
        }
      }

      const dayLabel = phase === 'Final'
        ? 'Gran Final'
        : phase === 'TercerPuesto'
        ? 'Tercer Puesto'
        : (phase + (isChampions ? (isVuelta ? ' (Vuelta)' : ' (Ida)') : ''));

      comp = {
        ...comp,
        history: [{ day: dayLabel, results: allResults }, ...(comp.history || [])],
        matchday: (comp.matchday || 0) + 1,
        phase: nextPhase,
        bracket: newBracket,
        showWinner
      };
    }

    if (isChampions && comp.bracket) {
      comp.bracket = sanitizeChampionsBracket(comp.bracket, comp.teams);
    }

    return comp;
  };

  // Simulación completa de una copa / torneo hasta su finalización en una sola ejecución pura
  const simulateEntireCupToFinish = (initialComp: any, compId: string = 'C1', c1Override: any = null) => {
    if (!initialComp || initialComp.type === 'league') return initialComp;
    let comp = initialComp;
    let guard = 0;
    while (guard++ < 40) {
      if (comp.phase === 'Terminado' || comp.showWinner) break;
      const prevPhase = comp.phase;
      const prevMd = comp.matchday;
      comp = simulateSingleCupStage(comp, compId, c1Override);
      if (comp.phase === prevPhase && comp.matchday === prevMd) {
        break;
      }
    }
    return comp;
  };

  // Simulación de todo el torneo Champions League restante hasta coronar al campeón
  const simulateAllCareerChampions = () => {
    const seasonNow = seasonState.season || 1;
    let clWinnerToArchive: any = null;
    let finishedClComp: any = null;

    setComps(prev => {
      let next = { ...prev };
      let c1 = next['C1'];

      // Si C1 no tiene equipos inicializados, inicializar Champions de manera segura sin alterar ligas
      if (!c1?.teams?.length) {
        const careerQualifiedName = (() => {
          if (!career.active || !career.teamId || career.div !== 1) return null;
          if (career.clQualified) return careerTeam?.name || null;
          const comp = next[career.compId];
          const table = [...(comp?.teams || [])].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
          const pos = table.findIndex(t => t.id === career.teamId) + 1;
          const maxSpots = career.compId === 'L7' ? 8 : 4;
          return (pos > 0 && pos <= maxSpots) || (career.tier >= 4) ? (careerTeam?.name || null) : null;
        })();

        const cl = getAutoFillData('C1', next, careerQualifiedName ? [careerQualifiedName] : []);
        if (cl) {
          const mine = careerQualifiedName ? (cl.teams || []).find(t => t.name === careerQualifiedName) : null;
          c1 = {
            ...next['C1'],
            ...cl,
            id: 'C1',
            name: next['C1']?.name || 'Champions League',
            type: 'cup',
            phase: 'groups',
            matchday: 0,
            showWinner: false,
            careerTeamName: careerQualifiedName || null,
            careerTeamId: mine?.id || null,
            userTeamId: mine?.id || cl.userTeamId
          };
          next['C1'] = c1;
        }
      }

      if (!c1 || c1.phase === 'Terminado' || c1.showWinner) return next;
      const finishedC1 = simulateEntireCupToFinish(c1, 'C1');
      if (finishedC1.showWinner || finishedC1.phase === 'Terminado') {
        const final = finishedC1.bracket?.Final?.[0] || finishedC1.bracket?.Final;
        if (final && final.sh !== null && final.sh !== undefined) {
          const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
          clWinnerToArchive = finishedC1.teams?.find((t: any) => t.id === winId);
          finishedClComp = finishedC1;
        }
      }

      // Sincronizar los 8 repescados reales a la UEFA Europa League (C3)
      let c3 = next['C3'];
      if (finishedC1 && Array.isArray(finishedC1.groups)) {
        if (!c3 || !c3.teams || c3.teams.length === 0) {
          const autoData = getAutoFillData('C3', next);
          if (autoData) {
            c3 = { ...next['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
          }
        }
        if (c3) {
          c3 = syncChampionsRepescadosToUEL(finishedC1, c3);
          next['C3'] = c3;
        }
      }

      return {
        ...next,
        C1: finishedC1
      };
    });

    if (clWinnerToArchive && finishedClComp) {
      archiveCompetition('C1', 1, clWinnerToArchive, finishedClComp, true);
    }

    setCareer(c => (c.active ? { ...c, clSeason: seasonNow } : c));
    setSeasonState(s => ({ ...s, phase: 'champions', globalMatchday: 38 }));
  };


  // Balance de temporada: objetivos, reputación, PE, contrato y mercado de entrenadores
  const buildCareerReview = () => {
    if (!careerTeam) return null;
    const season = seasonState.season || 1;
    const position = careerPosition || careerTeams.length;
    const expected = expectedPosition(careerTeams, career.teamId);
    const performance = readPerformance(position, expected);
    const objective = objectiveFor(career.tier || 1, position);

    const isDroppedToUel = Boolean(
      careerClInfo?.eliminated &&
      careerUelInfo &&
      !careerUelInfo.notQualified
    );

    // ¿Cumplió los objetivos de temporada? (los tres objetivos base del club + objetivo continental)
    const objectiveItems = seasonObjectives({
      tier: career.tier || 1, div: career.div, position, expected,
      wins: careerTeam.w || 0, draws: careerTeam.d || 0, played: careerTeam.p || 0,
      totalRounds: careerSchedule.length, reputation: career.reputation,
      total: careerTeams.length,
      clQualified: !!careerClInfo, clPhase: careerClInfo?.phase,
      clChampion: !!careerClInfo?.champion, clEliminated: !!careerClInfo?.eliminated,
      uelQualified: !!careerUelInfo && !careerUelInfo.notQualified,
      uelPhase: careerUelInfo?.phase,
      uelChampion: !!careerUelInfo?.champion,
      uelEliminated: !!careerUelInfo?.eliminated,
      droppedToUel: isDroppedToUel
    });
    const coreObjectives = objectiveItems.filter((o: any) => !o.extra);
    const objectivesMet = coreObjectives.filter(o => o.done).length;

    // Recorrido continental de ESTA temporada (Champions League / Europa League)
    const clRep = clProgressRep({
      champion: !!careerClInfo?.champion,
      phaseReached: careerClInfo?.phase,
      played: !!careerClInfo
    });
    const uelRep = uelProgressRep({
      champion: !!careerUelInfo?.champion,
      phaseReached: careerUelInfo?.phase,
      played: !!careerUelInfo && !careerUelInfo.notQualified
    });
    const continentalRep = isDroppedToUel ? Math.max(clRep, uelRep) : (clRep + uelRep);
    const clResult = careerClInfo && !isDroppedToUel
      ? (careerClInfo.champion
        ? '🏆 Campeón de la Champions'
        : careerClInfo.eliminated
          ? `Champions: eliminado en ${careerClInfo.phaseLabel}`
          : `Champions: ${careerClInfo.phaseLabel}`)
      : careerUelInfo && !careerUelInfo.notQualified
        ? (careerUelInfo.champion
          ? '🏆 Campeón de la Europa League'
          : careerUelInfo.eliminated
            ? `Europa League: eliminado en ${uelPhaseLabel(careerUelInfo.phase)}`
            : `Europa League: ${uelPhaseLabel(careerUelInfo.phase)}`)
        : null;

    // Despido: más duro cuanto peor fue la temporada y la racha previa
    const chance = fireChance({
      objective, score: performance.score, objectivesMet,
      badStreak: career.badStreak || 0, tier: career.tier || 1
    });
    const fired = chance >= 1 || (chance > 0 && Math.random() < chance);

    let repDelta = Math.round((objective.rep + performance.score * 2 + continentalRep) * 10) / 10;
    
    // Reajuste de Final de Temporada (Especificación Técnica Élite):
    // Si el mánager tiene 90+ de reputación y no cumple el objetivo principal del club,
    // se aplica una deducción automática de -5 puntos de reputación por incumplimiento de expectativa de élite.
    if ((career.reputation || 0) >= 90 && (objectivesMet === 0 || position > expected)) {
      repDelta -= 5;
    }

    if (fired) repDelta -= 8; // el despido pesa en tu nombre
    const repAfter = clampRep(career.reputation + repDelta);
    const newTier = objective.promote ? Math.min(4, (career.tier || 1) + 1) : (career.tier || 1);
    const maxed = isSquadMaxed(careerTeam, career.tier || 1);
    // Contrato: máximo CONTRACT_SEASONS temporadas aunque todo vaya bien
    const contractStart = career.contractStart || career.startedSeason || season;
    const seasonsServed = season - contractStart + 1;
    const contractEnd = !fired && seasonsServed >= (career.contractSeasons || CONTRACT_SEASONS);
    // Clasificación europea para la próxima Champions global (Top 4 en ligas estándar, Top 8 en Miscelánea)
    const maxClSpots = career.compId === 'L7' ? 8 : 4;
    const clQualified = career.div === 1 && position <= maxClSpots;
    const badSeason = objectivesMet === 0 || performance.score <= -2;
    const badStreak = badSeason ? (career.badStreak || 0) + 1 : 0;

    const kind = fired ? 'fired' : contractEnd ? 'renewal' : 'performance';
    const leagueNames = Object.fromEntries(LEAGUE_IDS.map(id => [id, comps[id]?.name]));
    // Las ofertas dependen de reputación + objetivos cumplidos: como mucho un
    // Tier por encima, y tras un despido sólo proyectos menores (o ninguno).
    const offers = buildOffers({
      comps, career, performance, reputation: repAfter, season, leagueNames, kind, objectivesMet
    });

    // Los PE ganados nunca exceden lo que aún puede mejorarse en el club
    const peRoom = Math.max(0, remainingUpgradeCost(careerTeam, newTier) - (career.pe || 0));
    const peGain = maxed ? 0 : Math.min(objective.pe, peRoom);

    return {
      season, teamName: careerTeam.name, compName: careerComp?.name, position, expected,
      performance: performance.label, note: objective.note,
      repDelta, repAfter, peGain, peRoom, promote: !!objective.promote, newTier,
      currentTier: career.tier || 1,
      fired, contractEnd, offers, clQualified, clResult, objectivesMet,
      objectivesTotal: coreObjectives.length, badStreak,
      unemployed: fired && offers.length === 0
    };
  };

  const openCareerReview = () => {
    if (careerReview) return;
    const season = seasonState.season || 1;
    const alreadySigned = career.signedForSeason === season;
    const alreadyProcessed = career.lastProcessedSeason === season || alreadySigned;
    const review = buildCareerReview();
    if (!review) return;
    setCareerReview(alreadySigned ? { ...review, contractEnd: false, offers: [] } : review);
    if (!alreadyProcessed) {
      if (review.fired && (career.originalTeamStats || careerTeam)) {
        setComps(prev => restoreClubOriginalStatsInComps(prev, career.originalTeamStats, careerTeam?.name));
      }
      const isChampionsWinner = Boolean(review.clResult?.includes('Champions') && review.clResult?.includes('Campeón'));
      const isUelWinner = Boolean(review.clResult?.includes('Europa League') && review.clResult?.includes('Campeón'));

      setCareer(c => ({
        ...c,
        reputation: review.repAfter,
        // Al ser despedido pierdes el trabajo hecho en el club: los PE no viajan
        pe: review.fired ? 0 : capPE(c.pe + review.peGain, careerTeam, review.newTier),
        tier: review.newTier,
        fired: review.fired,
        badStreak: review.badStreak,
        offers: review.offers,
        seasonLog: [],
        clQualifiedFor: review.clQualified ? review.season + 1 : null,
        lastProcessedSeason: review.season,
        trophies: {
          leagues: (c.trophies?.leagues || 0) + (review.position === 1 ? 1 : 0),
          champions: (c.trophies?.champions || 0) + (isChampionsWinner ? 1 : 0),
          uel: (c.trophies?.uel || 0) + (isUelWinner ? 1 : 0),
          promotions: (c.trophies?.promotions || 0) + (c.div === 2 && review.position <= 3 ? 1 : 0)
        },
        seasonHistory: [
          {
            season: review.season, teamName: review.teamName, compName: review.compName,
            div: c.div, pts: careerTeam?.pts || 0,
            position: review.position, performance: review.performance,
            repAfter: review.repAfter, note: review.note,
            objectivesMet: review.objectivesMet, objectivesTotal: review.objectivesTotal,
            clResult: review.clResult, promoted: c.div === 2 && review.position <= 3,
            fired: review.fired,
            isLeagueChampion: review.position === 1,
            isClChampion: isChampionsWinner,
            isUelChampion: isUelWinner
          },
          ...(c.seasonHistory || [])
        ]
      }));

      // Registrar títulos ganados en el modo carrera en el palmarés persistente
      if (review.position === 1 && careerTeam) {
        registerTitle({
          compId: career.compId,
          compName: review.compName || comps[career.compId]?.name || 'Liga',
          type: 'league',
          div: career.div,
          winner: {
            name: careerTeam.name,
            color1: careerTeam.color1,
            color2: careerTeam.color2,
            isFlag: careerTeam.isFlag
          },
          season: review.season
        });
      }
      if (isChampionsWinner && careerTeam) {
        registerTitle({
          compId: 'C1',
          compName: 'Champions League',
          type: 'cup',
          div: 1,
          winner: {
            name: careerTeam.name,
            color1: careerTeam.color1,
            color2: careerTeam.color2,
            isFlag: careerTeam.isFlag
          },
          season: review.season
        });
      }
      if (isUelWinner && careerTeam) {
        registerTitle({
          compId: 'C2',
          compName: 'UEFA Europa League',
          type: 'cup',
          div: 1,
          winner: {
            name: careerTeam.name,
            color1: careerTeam.color1,
            color2: careerTeam.color2,
            isFlag: careerTeam.isFlag
          },
          season: review.season
        });
      }
    }
  };

  // Firmar por un club nuevo: contrato limpio, sin rastro del despido anterior.
  // La reputación viaja contigo y da un plus si el club es mayor.
  // El club previo recupera sus estadísticas de fuerza originales.
  const acceptCareerOffer = (offer) => {
    // Si el entrenador cambia de club, el club que entrenaba recupera sus estadísticas de fuerza originales
    if (career.originalTeamStats || careerTeam) {
      setComps(prev => restoreClubOriginalStatsInComps(prev, career.originalTeamStats, careerTeam?.name));
    }

    const teams = offer.div === 2 ? comps[offer.compId]?.teams2 : comps[offer.compId]?.teams;
    const team = (teams || []).find(t => t.id === offer.teamId);
    const season = seasonState.season || 1;
    const bonus = signingRepBonus({
      fromTier: career.tier || 1,
      toTier: offer.tier || 1,
      fromStrength: (careerTeam?.att || 0) + (careerTeam?.opp || 0) + (careerTeam?.def || 0),
      toStrength: (team?.att || 0) + (team?.opp || 0) + (team?.def || 0)
    });
    setCareer(c => ({
      ...c,
      active: true,
      compId: offer.compId, div: offer.div, teamId: offer.teamId,
      tier: offer.tier, pe: 0, fired: false, offers: [], seasonLog: [],
      activeApplication: null,
      pendingAppResolutionModal: null,
      transferredInSeason: season,
      reputation: clampRep(c.reputation + bonus),
      signingBonus: bonus,
      clQualifiedFor: null, badStreak: 0,
      contractStart: season + 1,
      contractSeasons: CONTRACT_SEASONS,
      signedForSeason: season,
      lastProcessedSeason: c.lastProcessedSeason,
      medicalImmunityWeeks: 0,
      trainedMatchday: -1,
      completedOfficeWeeks: [],
      activeInjury: null,
      lastSimulationFeedback: null,
      originalTeamStats: team ? {
        teamId: team.id,
        compId: offer.compId,
        div: offer.div,
        att: team.att,
        opp: team.opp,
        def: team.def
      } : null,
      baseDist: team ? { att: team.att, opp: team.opp, def: team.def } : c.baseDist,
      tactic: team ? { att: team.att, opp: team.opp, def: team.def } : c.tactic
    }));
    setCareerReview(null);
    setView('career');
  };

  // Renovar contrato en el club actual
  const renewCareerContract = () => {
    const season = seasonState.season || 1;
    setCareer(c => ({
      ...c,
      contractStart: season + 1,
      contractSeasons: CONTRACT_SEASONS,
      fired: false,
      offers: [],
      signedForSeason: season,
      activeApplication: null,
      completedOfficeWeeks: [],
      trainedMatchday: -1,
      medicalImmunityWeeks: 0,
      activeInjury: null,
      lastSimulationFeedback: null,
      seasonLog: []
    }));
    setCareerReview(null);
    setView('career');
  };

  const closeCareerReview = () => {
    setCareerReview(null);
    setView('career');
  };

  // Avanzar una semana de oficina (mercado o parón internacional)
  const advanceCareerOfficeWeek = (officeWeekNum) => {
    setCareer(c => {
      const completed = [...(c.completedOfficeWeeks || [])];
      if (!completed.includes(officeWeekNum)) {
        completed.push(officeWeekNum);
      }

      let updatedActiveApp = c.activeApplication;
      let updatedAppHistory = c.applicationHistory || [];
      let appResolutionModal = null;
      let newOffer = null;

      if (updatedActiveApp && updatedActiveApp.status === 'review') {
        const remaining = (updatedActiveApp.weeksRemaining ?? 2) - 1;
        if (remaining <= 0) {
          const currentComp = comps[c.compId];
          const currentTeams = currentComp ? (c.div === 2 ? currentComp.teams2 : currentComp.teams) || [] : [];
          const expPos = expectedPosition(currentTeams, c.teamId);
          const sortedAfter = [...currentTeams].sort((a, b) => (b.pts || 0) - (a.pts || 0) || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)));
          const posIdx = sortedAfter.findIndex(t => t.id === c.teamId);
          const currentPos = posIdx >= 0 ? posIdx + 1 : expPos;
          const currentPerf = readPerformance(currentPos, expPos);
          const hasRecentHistoryBonus = (c.trophies?.leagues || 0) > 0 || (c.trophies?.champions || 0) > 0 || (c.trophies?.uel || 0) > 0 || (c.trophies?.promotions || 0) > 0;

          const evalRes = evaluateApplication({
            clubTier: updatedActiveApp.tier || 1,
            reputation: c.reputation || 10,
            performanceScore: currentPerf?.score || 0,
            position: currentPos,
            expected: expPos,
            hasRecentHistoryBonus
          });

          if (evalRes.accepted) {
            newOffer = {
              id: `${seasonState.season || 1}-${updatedActiveApp.compId}-${updatedActiveApp.div}-${updatedActiveApp.teamId}`,
              season: seasonState.season || 1,
              compId: updatedActiveApp.compId,
              compName: updatedActiveApp.compName,
              div: updatedActiveApp.div,
              teamId: updatedActiveApp.teamId,
              teamName: updatedActiveApp.teamName,
              color1: updatedActiveApp.color1,
              color2: updatedActiveApp.color2,
              isFlag: updatedActiveApp.isFlag,
              tier: updatedActiveApp.tier,
              standingStatus: updatedActiveApp.standingStatus || 'Media Tabla',
              requiredObjective: updatedActiveApp.requiredObjective || 'Cumplir los objetivos de la directiva',
              profile: updatedActiveApp.tier >= 4 ? 'Gigante de Primera' : updatedActiveApp.tier === 3 ? 'Top 6 / Europa' : 'Proyecto Deportivo',
              seasons: CONTRACT_SEASONS,
              reason: 'Candidatura formal aceptada por la junta directiva tras 2 semanas de evaluación.',
              fromApplication: true,
              weeksRemaining: 2
            };
            updatedAppHistory = [
              {
                id: `app-res-${Date.now()}`,
                teamName: updatedActiveApp.teamName,
                compName: updatedActiveApp.compName,
                tier: updatedActiveApp.tier,
                matchday: careerMd,
                accepted: true,
                message: evalRes.message,
                rejectionType: null
              },
              ...updatedAppHistory
            ].slice(0, 30);
            appResolutionModal = {
              accepted: true,
              teamName: updatedActiveApp.teamName,
              compName: updatedActiveApp.compName,
              tier: updatedActiveApp.tier,
              color1: updatedActiveApp.color1,
              color2: updatedActiveApp.color2,
              isFlag: updatedActiveApp.isFlag,
              message: evalRes.message,
              offer: newOffer
            };
            updatedActiveApp = null;
          } else {
            updatedAppHistory = [
              {
                id: `app-res-${Date.now()}`,
                teamName: updatedActiveApp.teamName,
                compName: updatedActiveApp.compName,
                tier: updatedActiveApp.tier,
                matchday: careerMd,
                accepted: false,
                message: evalRes.message,
                rejectionType: evalRes.rejectionType
              },
              ...updatedAppHistory
            ].slice(0, 30);
            appResolutionModal = {
              accepted: false,
              teamName: updatedActiveApp.teamName,
              compName: updatedActiveApp.compName,
              tier: updatedActiveApp.tier,
              color1: updatedActiveApp.color1,
              color2: updatedActiveApp.color2,
              isFlag: updatedActiveApp.isFlag,
              message: evalRes.message,
              rejectionType: evalRes.rejectionType
            };
            updatedActiveApp = null;
          }
        } else {
          updatedActiveApp = {
            ...updatedActiveApp,
            weeksRemaining: remaining
          };
        }
      }

      // Caducidad de ofertas en el buzón:
      // Las ofertas activas reducen sus semanas (2 -> 1 -> 0 [Expirada con alerta visual en buzón]).
      // Las ofertas que ya estaban expiradas en la semana previa (weeksRemaining <= 0) se retiran definitivamente.
      const prunedOffers = (c.offers || [])
        .filter(o => (typeof o.weeksRemaining === 'number' ? o.weeksRemaining : 2) > 0)
        .map(o => {
          const currentWeeks = typeof o.weeksRemaining === 'number' ? o.weeksRemaining : 2;
          const newWeeks = currentWeeks - 1;
          return {
            ...o,
            weeksRemaining: newWeeks,
            expired: newWeeks <= 0
          };
        });

      const finalOffers = newOffer
        ? [newOffer, ...prunedOffers.filter(o => o.id !== newOffer.id)]
        : prunedOffers;

      return {
        ...c,
        completedOfficeWeeks: completed,
        activeApplication: updatedActiveApp,
        offers: finalOffers,
        applicationHistory: updatedAppHistory,
        pendingAppResolutionModal: appResolutionModal || c.pendingAppResolutionModal
      };
    });
    setSeasonState(s => ({
      ...s,
      currentWeek: Math.min(43, (s.currentWeek || 1) + 1)
    }));
  };

  // Postulación activa a un club vacante (máximo 1 activa, evaluación a ciegas de 2 semanas)
  const submitCareerApplication = (vacancy) => {
    if (!vacancy) return;
    const season = seasonState.season || 1;
    setCareer(c => {
      if (c.activeApplication) return c; // Límite: máximo 1 postulación activa a la vez
      if (c.transferredInSeason === season || c.signedForSeason === season) return c; // Ya firmó en esta temporada
      return {
        ...c,
        activeApplication: {
          teamId: vacancy.teamId,
          teamName: vacancy.teamName,
          compId: vacancy.compId,
          compName: vacancy.compName,
          div: vacancy.div,
          tier: vacancy.tier,
          color1: vacancy.color1,
          color2: vacancy.color2,
          isFlag: vacancy.isFlag,
          standingStatus: vacancy.standingStatus,
          requiredObjective: vacancy.requiredObjective,
          submittedMatchday: careerMd,
          weeksRemaining: 2,
          status: 'review'
        }
      };
    });
  };

  // Si la temporada del club acabó, el balance se ofrece una sola vez por temporada.
  // Si el club está clasificado para la Champions global, el balance espera a que
  // su recorrido europeo esté resuelto para que cuente en la valoración.
  useEffect(() => {
    if (!career.active || !careerTeam) return;
    if (!careerDivisionFinished) return;
    if (career.lastProcessedSeason === (seasonState.season || 1)) return;
    if (career.signedForSeason === (seasonState.season || 1)) return;
    if (view !== 'career') return;
    const playsCl = career.clQualifiedFor === (seasonState.season || 1) || !!careerClInfo;
    if (playsCl && !(careerClInfo?.champion || careerClInfo?.eliminated)) return;
    openCareerReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [career.active, careerDivisionFinished, seasonState.season, view, careerClInfo]);


  // El club puede ascender o descender de división: la carrera sigue al equipo
  // y el reseteo de puntos/estadísticas se aplica siempre, lo quiera o no el técnico
  useEffect(() => {
    if (!career.active || !career.teamId) return;
    const comp = comps[career.compId];
    if (!comp) return;
    const inCurrent = (career.div === 2 ? comp.teams2 : comp.teams)?.some(t => t.id === career.teamId);
    if (inCurrent) return;
    const otherDiv = career.div === 2 ? 1 : 2;
    const otherTeams = otherDiv === 2 ? comp.teams2 : comp.teams;
    const moved = otherTeams?.find(t => t.id === career.teamId);
    if (!moved) return;
    const teamsKey = otherDiv === 2 ? 'teams2' : 'teams';
    // Reseteo obligatorio de puntos y estadísticas del club al cambiar de división
    setComps(prev => ({
      ...prev,
      [career.compId]: {
        ...prev[career.compId],
        [teamsKey]: (prev[career.compId]?.[teamsKey] || []).map(t =>
          t.id === career.teamId ? { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 } : t
        )
      }
    }));
    setCareer(c => ({
      ...c,
      div: otherDiv,
      tier: tierOf(moved),
      seasonLog: [],
      baseDist: { att: moved.att, opp: moved.opp, def: moved.def },
      tactic: { att: moved.att, opp: moved.opp, def: moved.def }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps, career.active, career.compId, career.div, career.teamId]);


  // Resuelve la ronda/jornada actual de una copa o mundial.
  // `ms` = resultado jugado manualmente por el usuario, o null para simular TODO.
  const processCupRound = (ms?: any, targetCompId?: string, isAutoSimManual?: boolean) => {
    const cId = targetCompId || activeCompId;
    const currentComp = comps[cId];
    if (!currentComp || currentComp.type === 'league') return;
    const isAutoSim = isAutoSimManual ?? (!ms && cupAutoSim);

    // Control cronológico estricto: UEL Octavos no puede disputarse si Champions League aún está en fase de grupos
    if (cId === 'C3' && currentComp.phase !== 'Dieciseisavos' && currentComp.phase !== 'Terminado') {
      const c1 = comps['C1'];
      const isC1Done = !c1 || c1.phase !== 'groups' || (c1.matchday || 0) >= 6;
      if (!isC1Done) {
        return;
      }
    }
    // Copas y Mundiales mantienen la lógica original sin divisiones múltiples
    const results: any[] = ms
      ? [{ hId: ms.home.id, aId: ms.away.id, sh: ms.scoreH, sa: ms.scoreA, penH: ms.penalties?.scoreH, penA: ms.penalties?.scoreA }]
      : [];
    if (currentComp.phase === 'groups') {
       const isWorldCup = cId === 'C2';
       const maxMatchdays = isWorldCup ? 3 : 6;
       currentComp.groups.forEach(group => {
          const groupTeams = currentComp.teams.filter(t => group.teamIds.includes(t.id));
          const currentRound = generateLeagueSchedule(groupTeams, !isWorldCup)[currentComp.matchday % maxMatchdays];
          if (currentRound) {
             currentRound.forEach(m => {
                const isUserMatch = ms && (m.homeId === currentComp.userTeamId || m.awayId === currentComp.userTeamId || m.homeId === ms.home?.id || m.awayId === ms.home?.id);
                if (!isUserMatch) {
                   const h = currentComp.teams.find(t => t.id === m.homeId); const a = currentComp.teams.find(t => t.id === m.awayId);
                   const { sh, sa } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);
                   results.push({ hId: m.homeId, aId: m.awayId, sh, sa, penH: null, penA: null });
                }
             });
          }
       });
       const updatedTeams = currentComp.teams.map(t => {
          const res = results.find(r => r.hId === t.id || r.aId === t.id);
          if (!res) return t;
          const isHome = res.hId === t.id;
          const gf = isHome ? res.sh : res.sa; const ga = isHome ? res.sa : res.sh;
          const w = gf > ga ? 1 : 0; const d = gf === ga ? 1 : 0; const l = gf < ga ? 1 : 0;
          return { ...t, p: t.p + 1, w: t.w + w, d: t.d + d, l: t.l + l, gf: t.gf + gf, ga: t.ga + ga, pts: t.pts + (w * 3 + d) };
       });
       const nextMatchday = currentComp.matchday + 1;
       const isEndOfGroups = nextMatchday >= maxMatchdays;
       let newBracket = null;
       if (isEndOfGroups) newBracket = generateKnockoutBrackets({ ...currentComp, teams: updatedTeams });
        const updatedComp = { 
          ...currentComp, 
          teams: updatedTeams, 
          history: [{ day: 'Jornada ' + nextMatchday, results }, ...currentComp.history], 
          matchday: nextMatchday, 
          phase: isEndOfGroups ? (newBracket.Octavos ? 'Octavos' : 'Cuartos') : 'groups', 
          bracket: newBracket 
        };
        updateCompById(cId, updatedComp);

        // Al culminar la fase de grupos de Champions League, inyectar los 8 terceros puestos en Europa League
        if (isEndOfGroups && cId === 'C1') {
          setComps(prev => {
            let uel = prev['C3'];
            if (!uel || !uel.teams || uel.teams.length === 0) {
              const autoData = getAutoFillData('C3', prev);
              if (autoData) {
                uel = { ...prev['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
              }
            }
            if (uel) {
              const syncedUel = syncChampionsRepescadosToUEL(updatedComp, uel);
              return {
                ...prev,
                C1: updatedComp,
                C3: syncedUel
              };
            }
            return {
              ...prev,
              C1: updatedComp
            };
          });

          // Actualizar transición de modo carrera si el club del usuario disputaba Champions
          if (career.active && (updatedComp as any).careerTeamId) {
            const userTeamId = (updatedComp as any).careerTeamId;
            const userGroup = (updatedComp as any).groups?.find((g: any) => g.teamIds?.includes(userTeamId));
            if (userGroup) {
              const groupTeams = updatedTeams.filter((t: any) => userGroup.teamIds?.includes(t.id)).sort((a: any, b: any) =>
                (b.pts || 0) - (a.pts || 0) ||
                ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0)) ||
                (b.gf || 0) - (a.gf || 0)
              );
              const userPos = groupTeams.findIndex((t: any) => t.id === userTeamId);
              if (userPos === 2) {
                // 3.º Puesto -> Accede a Octavos de UEFA Europa League
                setCareer(c => ({
                  ...c,
                  clQualified: false,
                  uelQualified: true,
                  seasonLog: [
                    {
                      matchday: (updatedComp.matchday || 6),
                      isChampions: true,
                      phase: 'Fase de Grupos',
                      rival: 'UEFA',
                      gf: 0,
                      ga: 0,
                      result: 'D',
                      rep: 1.0,
                      pe: 2
                    },
                    ...(c.seasonLog || [])
                  ]
                }));
              } else if (userPos >= 3) {
                // 4.º Puesto -> Eliminado de competiciones continentales
                setCareer(c => ({ ...c, clQualified: false, uelQualified: false }));
              } else {
                // 1.º o 2.º Puesto -> Clasificado a Octavos de Champions
                setCareer(c => ({ ...c, clQualified: true, uelQualified: false }));
              }
            }
          }
        }

        // Check if user's team was eliminated or reached repesca in group stage (solo en vista standalone de competición)
        if (isEndOfGroups && cId === activeCompId) {
          const userTeamId = currentComp.userTeamId;
          const userGroup = currentComp.groups.find(g => g.teamIds.includes(userTeamId));
          if (userGroup) {
            const groupTeams = updatedTeams.filter(t => userGroup.teamIds.includes(t.id)).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
            const userPos = groupTeams.findIndex(t => t.id === userTeamId);
            const userTeamObj = updatedTeams.find(t => t.id === userTeamId);
            if (userPos >= 2) {
              const isCL = cId === 'C1';
              const isThirdPlaceCL = isCL && userPos === 2;

              if (isAutoSim) {
                // En "Simular Todo" no interrumpimos: adoptamos automáticamente un clasificado
                const qualified = currentComp.groups.flatMap(g => {
                  const gt = updatedTeams.filter(t => g.teamIds.includes(t.id)).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
                  return gt.slice(0, 2).map(t => t.id);
                }).filter(id => id !== userTeamId);
                if (qualified.length) updateCompById(cId, { userTeamId: qualified[Math.floor(Math.random() * qualified.length)] });
              } else {
                setTimeout(() => setEliminatedModal({
                  compId: activeCompId,
                  phase: 'Fase de Grupos',
                  isRepesca: isThirdPlaceCL,
                  userTeam: userTeamObj
                }), 500);
              }
            }
          }
        }

    } else {
       // Eliminatorias
       const isChampions = (cId === 'C1' || cId === 'C3' || currentComp.id === 'C1' || currentComp.id === 'C3' || currentComp.name?.includes('Champions') || currentComp.name?.includes('Europa')) && cId !== 'C2' && currentComp.id !== 'C2' && !currentComp.name?.includes('Mundial') && !currentComp.name?.includes('World');
       const phase = currentComp.phase;
       const isVuelta = isChampions && currentComp.matchday % 2 !== 0 && phase !== 'Final';
       const newBracket = { ...currentComp.bracket };
       const matchesToProcess = Array.isArray(newBracket[phase]) ? newBracket[phase] : [newBracket[phase]];
       const allResults = [];

       matchesToProcess.forEach(m => {
          let sh, sa, penH, penA;
          if (ms && m.hId === ms.home.id && m.aId === ms.away.id) {
             sh = ms.scoreH; sa = ms.scoreA; penH = ms.penalties?.scoreH; penA = ms.penalties?.scoreA;
          } else if (ms && isVuelta && m.hId === ms.away.id && m.aId === ms.home.id) {
             sh = ms.scoreA; sa = ms.scoreH; penH = ms.penalties?.scoreA; penA = ms.penalties?.scoreH;
          } else {
             const h = currentComp.teams.find(t => t.id === (isVuelta ? m.aId : m.hId));
             const a = currentComp.teams.find(t => t.id === (isVuelta ? m.hId : m.aId));
             const { sh: simH, sa: simA } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);
             if (isVuelta) { sh = simA; sa = simH; } else { sh = simH; sa = simA; }
             const isDraw = (isChampions && isVuelta && phase !== 'Final' && phase !== 'TercerPuesto') ? (m.sh + sh === m.sa + sa) : (sh === sa);
             if (isDraw && (!isChampions || isVuelta || phase === 'Final' || phase === 'TercerPuesto')) {
                const penShootout = simPenaltyShootout(h?.att || 1, a?.def || 1, a?.att || 1, h?.def || 1);
                penH = isVuelta ? penShootout.scoreA : penShootout.scoreH;
                penA = isVuelta ? penShootout.scoreH : penShootout.scoreA;
             }
          }
          if (isVuelta) { m.sh2 = sh; m.sa2 = sa; } else { m.sh = sh; m.sa = sa; }
          if (penH !== undefined) { m.penH = penH; m.penA = penA; }
          allResults.push(isVuelta ? { hId: m.aId, aId: m.hId, sh: sa, sa: sh, penH: penA, penA: penH } : { hId: m.hId, aId: m.aId, sh, sa, penH, penA });
       });

       let nextPhase = phase, showWinner = false;
       if (!isChampions || isVuelta || phase === 'Final') {
          const winners = matchesToProcess.map(m => {
             const tH = isChampions && phase!=='Final' ? m.sh+m.sh2 : m.sh; const tA = isChampions && phase!=='Final' ? m.sa+m.sa2 : m.sa;
             if(tH>tA) return m.hId; if(tA>tH) return m.aId; return m.penH>m.penA ? m.hId : m.aId;
          });
          if (phase === 'Dieciseisavos') {
            nextPhase = 'Octavos';
            const c1Comp = comps['C1'];
            const isC1Done = !c1Comp || c1Comp.phase !== 'groups' || (c1Comp.matchday || 0) >= 6;
            const repescadoTeams = isC1Done ? (currentComp.teams || []).filter((t: any) => t.isRepesca || (t.clOrigin && t.clOrigin.includes('Repesca'))) : [];
            newBracket.Octavos = Array(8).fill(0).map((_, i) => ({
              id: 'O' + (i + 1),
              hId: winners[i] ?? null,
              aId: isC1Done ? (repescadoTeams[i]?.id ?? (17 + i)) : null,
              sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
            }));
          } else if (phase === 'Octavos') {
            nextPhase = 'Cuartos';
            newBracket.Cuartos = Array(4).fill(0).map((_, i) => ({
              id: 'C' + (i + 1),
              hId: winners[i * 2] ?? null,
              aId: winners[i * 2 + 1] ?? null,
              sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
            }));
          } else if (phase === 'Cuartos') {
            nextPhase = 'Semis';
            newBracket.Semis = Array(2).fill(0).map((_, i) => ({
              id: 'S' + (i + 1),
              hId: winners[i * 2] ?? null,
              aId: winners[i * 2 + 1] ?? null,
              sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
            }));
          } else if (phase === 'Semis') {
            const isWC = cId === 'C2' || currentComp.id === 'C2' || !!currentComp.isWorldCup || currentComp.name?.includes('Mundial') || currentComp.name?.includes('World');
            const losers = matchesToProcess.map((m, i) => {
              return m.hId === winners[i] ? m.aId : m.hId;
            });
            newBracket.Final = [{
              id: 'F1',
              hId: winners[0] ?? null,
              aId: winners[1] ?? null,
              sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
            }];
            if (isWC) {
              newBracket.TercerPuesto = [{
                id: 'TP1',
                hId: losers[0] ?? null,
                aId: losers[1] ?? null,
                sh: null, sa: null, penH: null, penA: null, sh2: null, sa2: null
              }];
              nextPhase = 'TercerPuesto';
            } else {
              nextPhase = 'Final';
            }
          } else if (phase === 'TercerPuesto') {
            nextPhase = 'Final';
          } else {
            nextPhase = 'Terminado';
            showWinner = true;
          }
       }
       if (isChampions && newBracket) {
         const clean = sanitizeChampionsBracket(newBracket, currentComp.teams);
         if (clean) Object.assign(newBracket, clean);
       }
        const dayLabel = phase === 'Final'
          ? 'Gran Final'
          : phase === 'TercerPuesto'
          ? 'Tercer Puesto'
          : (phase + (isChampions ? (isVuelta ? ' (Vuelta)' : ' (Ida)') : ''));
        const updatedComp = { history: [{ day: dayLabel, results: allResults }, ...currentComp.history], matchday: currentComp.matchday + 1, phase: nextPhase, bracket: newBracket, showWinner };
        updateCompById(cId, updatedComp);
        if (showWinner) {
          const final = newBracket?.Final?.[0] || newBracket?.Final;
          let clWinner = null;
          if (final && final.sh !== null && final.sh !== undefined) {
            const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
            clWinner = currentComp.teams?.find((t: any) => t.id === winId);
          }
          archiveCompetition(cId, 1, clWinner, { ...currentComp, ...updatedComp });
        }

        // Check if user's team was eliminated in knockout (solo en vista standalone)
        if ((!isChampions || isVuelta || phase === 'Final') && cId === activeCompId) {
          const userTeamId = currentComp.userTeamId;
          const winners = matchesToProcess.map(m => {
            const tH = isChampions && phase!=='Final' ? m.sh+m.sh2 : m.sh; const tA = isChampions && phase!=='Final' ? m.sa+m.sa2 : m.sa;
            if(tH>tA) return m.hId; if(tA>tH) return m.aId; return m.penH>m.penA ? m.hId : m.aId;
          });
          const wasInThisRound = matchesToProcess.some(m => m.hId === userTeamId || m.aId === userTeamId);
          const userAdvanced = winners.includes(userTeamId);
         if (wasInThisRound && !userAdvanced && !showWinner) {
            if (isAutoSim) {
              const alive = winners.filter(id => id !== userTeamId);
              if (alive.length) updateCompById(cId, { userTeamId: alive[Math.floor(Math.random() * alive.length)] });
            } else {
              setTimeout(() => setEliminatedModal({ compId: activeCompId, phase }), 500);
            }
          }
        }
    }
    // Avanzar la semana del calendario de la temporada
    setSeasonState(s => ({
      ...s,
      currentWeek: Math.min(43, (s.currentWeek || 1) + 1)
    }));
  };

  const processMatchday = () => {
    if (activeComp.type === 'league') {
      const isDiv2Context = matchState.isDiv2Context;
      const tArray = isDiv2Context ? activeComp.teams2 : activeComp.teams;
      const tMatchday = isDiv2Context ? activeComp.matchday2 : activeComp.matchday;
      const tHistory = isDiv2Context ? activeComp.history2 : activeComp.history;

      const schedule = generateLeagueSchedule(tArray);
      const currentRound = Array.isArray(schedule) ? schedule[tMatchday] : [];

      const results = currentRound.map((m: any) => {
        if (m.homeId === matchState.home.id || m.awayId === matchState.home.id || m.homeId === matchState.away.id || m.awayId === matchState.away.id) {
          if(m.homeId === matchState.home.id) return { hId: m.homeId, aId: m.awayId, sh: matchState.scoreH, sa: matchState.scoreA };
          if(m.homeId === matchState.away.id) return { hId: m.homeId, aId: m.awayId, sh: matchState.scoreA, sa: matchState.scoreH };
        }
        const h = tArray.find((t: any) => t.id === m.homeId); const a = tArray.find((t: any) => t.id === m.awayId);
        const { sh, sa } = simMatchGoals(h?.opp, h?.att, a?.def, a?.opp, a?.att, h?.def);
        return { hId: m.homeId, aId: m.awayId, sh, sa };
      });

      const updatedTeams = tArray.map((t: any) => {
        const res = results.find((r: any) => r.hId === t.id || r.aId === t.id);
        if (!res) return t;
        const isHome = res.hId === t.id;
        const gf = isHome ? res.sh : res.sa; const ga = isHome ? res.sa : res.sh;
        const w = gf > ga ? 1 : 0; const d = gf === ga ? 1 : 0; const l = gf < ga ? 1 : 0;
        return { ...t, p: t.p + 1, w: t.w + w, d: t.d + d, l: t.l + l, gf: t.gf + gf, ga: t.ga + ga, pts: t.pts + (w * 3 + d) };
      });

      const isFinished = tMatchday === schedule.length - 1;
      const nextMatchday = tMatchday + 1;
      const newHistory = [{ day: tMatchday + 1, results }, ...tHistory];

      // Datos de la división que el usuario jugó
      const playedDivUpdate: any = {};
      if (isDiv2Context) {
        playedDivUpdate.teams2 = updatedTeams;
        playedDivUpdate.history2 = newHistory;
        playedDivUpdate.matchday2 = nextMatchday;
        playedDivUpdate.showWinner2 = isFinished;
      } else {
        playedDivUpdate.teams = updatedTeams;
        playedDivUpdate.history = newHistory;
        playedDivUpdate.matchday = nextMatchday;
        playedDivUpdate.showWinner = isFinished;
      }

      // Simular simultáneamente la OTRA división
      const otherTeams = isDiv2Context ? activeComp.teams : activeComp.teams2;
      const otherMatchday = isDiv2Context ? activeComp.matchday : activeComp.matchday2;
      const otherHistory = isDiv2Context ? activeComp.history : activeComp.history2;
      const otherSchedule = generateLeagueSchedule(otherTeams);
      const otherNotFinished = otherMatchday < otherSchedule.length;

      if (otherTeams && otherTeams.length > 0 && otherNotFinished) {
        const otherResult = simulateDivisionMatchday(otherTeams, otherMatchday, otherHistory, activeCompId, !isDiv2Context);
        if (otherResult) {
          if (isDiv2Context) {
            playedDivUpdate.teams = otherResult.updatedTeams;
            playedDivUpdate.history = otherResult.newHistory;
            playedDivUpdate.matchday = otherResult.nextMatchday;
            playedDivUpdate.showWinner = otherResult.isFinished;
          } else {
            playedDivUpdate.teams2 = otherResult.updatedTeams;
            playedDivUpdate.history2 = otherResult.newHistory;
            playedDivUpdate.matchday2 = otherResult.nextMatchday;
            playedDivUpdate.showWinner2 = otherResult.isFinished;
          }
        }
      }

      updateActiveComp(playedDivUpdate);
      // JORNADA GLOBAL SINCRONIZADA: el resultado manual queda registrado tal cual
      // y las demás ligas resuelven automáticamente esta misma jornada global.
      simulateOtherLeaguesToGlobal(activeCompId);

    } else {
       processCupRound(matchState);
    }
    setCompView('main');
  };

  // Simulación automática de copas/mundiales hasta el campeón
  useEffect(() => {
    if (!cupAutoSim) return;
    if (!activeComp || activeComp.type === 'league') { setCupAutoSim(false); return; }
    if (activeComp.showWinner || activeComp.phase === 'Terminado') { setCupAutoSim(false); return; }
    if (compView !== 'main') return;
    const t = setTimeout(() => processCupRound(null), 420);
    return () => clearTimeout(t);
  }, [cupAutoSim, activeComp, compView]);

  const handlePromotionAndNewSeason = () => {
    if (activeComp.type !== 'league') return;

    // Archivamos a los campeones sin disparar setComps redundantes
    archiveCompetition(activeCompId, 1, null, activeComp, true);
    archiveCompetition(activeCompId, 2, null, activeComp, true);

    const ns = computeLeagueNewSeason(activeComp);
    if (!ns) return;

    const nextTeams1 = ns.teams;
    const nextTeams2 = ns.teams2;

    const seasonNow = seasonState.season || 1;
    const rec1 = buildSeasonRecord(activeComp.teams, seasonNow);
    const rec2 = buildSeasonRecord(activeComp.teams2, seasonNow);

    updateActiveComp({
      championsHistory: pushRecord(rec1, activeComp.championsHistory),
      championsHistory2: pushRecord(rec2, activeComp.championsHistory2),
      // Guardamos la tabla final terminada como "anterior competición" (una sola, reemplaza a la previa)
      previousStandings: buildStandingsSnapshot(activeComp.teams),
      previousStandings2: buildStandingsSnapshot(activeComp.teams2),
      teams: nextTeams1,
      teams2: nextTeams2,
      matchday: 0,
      matchday2: 0,
      history: [],
      history2: [],
      showWinner: false,
      showWinner2: false
    });
  };

  const handleTotalReset = (compId) => {
    const targetCompId = compId || activeCompId;
    const defaultData = (getDefaultComps && getDefaultComps()[targetCompId]) || {};
    const prevHistory = comps[targetCompId]?.championsHistory || [];
    const prevHistory2 = comps[targetCompId]?.championsHistory2 || [];

    if (targetCompId === 'C2') {
      const fresh = buildDynamicWCPool({ randomize: true, customTeams: [] });
      const pool = fresh.slice(0, 32).map((t, i) => ({ ...t, id: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
      pool.sort((a, b) => (b.att + b.opp + b.def) - (a.att + a.opp + a.def));
      const drawData = drawKnockoutGroups(pool, true, true);
      updateCompById('C2', {
        teams: drawData.teams,
        groups: drawData.groups,
        phase: 'groups',
        matchday: 0,
        history: [],
        bracket: null,
        showWinner: false,
        userTeamId: drawData.teams?.[0]?.id || 1,
        championsHistory: prevHistory
      });
    } else if (targetCompId === 'C1') {
      const clData = getAutoFillData('C1', comps);
      updateCompById('C1', {
        ...clData,
        matchday: 0,
        history: [],
        phase: 'groups',
        bracket: null,
        showWinner: false,
        userTeamId: clData.teams?.[0]?.id || 1,
        championsHistory: prevHistory
      });
    } else if (targetCompId === 'C3') {
      const uelData = getAutoFillData('C3', comps);
      updateCompById('C3', {
        ...uelData,
        id: 'C3',
        name: 'UEFA Europa League',
        type: 'cup',
        matchday: 0,
        history: [],
        phase: 'Dieciseisavos',
        showWinner: false,
        userTeamId: uelData.teams?.[0]?.id || 1,
        championsHistory: prevHistory
      });
    } else {
      updateCompById(targetCompId, {
        teams: defaultData.teams || [],
        teams2: defaultData.teams2 || [],
        matchday: 0,
        matchday2: 0,
        history: [],
        history2: [],
        showWinner: false,
        showWinner2: false,
        phase: defaultData.phase || 'groups',
        bracket: null,
        championsHistory: prevHistory,
        championsHistory2: prevHistory2
      });
    }
    setCompView('main');
    setMatchState(null);
  };

  const CompetitionView = () => {
    if (!activeComp) return null;
    const currentWeek = seasonState?.currentWeek || 1;
    const isChampionsDate = isChampionsMatchWeek(currentWeek) || (allLeaguesFinished && currentWeek <= 41);
    const nextClWeek = getNextChampionsWeek(currentWeek);
    const isEuropaDate = isEuropaLeagueMatchWeek(currentWeek) || (allLeaguesFinished && currentWeek <= 39);
    const nextUelWeek = getNextEuropaLeagueWeek(currentWeek);
    const hasStarted = activeComp.type === 'league' 
      ? (activeComp.matchday > 0 || activeComp.matchday2 > 0 || activeComp.history?.length > 0)
      : (activeComp.matchday > 0 || activeComp.history?.length > 0);

    const isLeague = activeComp.type === 'league';
    const isDiv2 = viewDiv === 2 && isLeague;

    // Selectores dinámicos basados en la división actual
    const currentTeams = isDiv2 ? activeComp.teams2 : activeComp.teams;
    const currentMatchday = isDiv2 ? activeComp.matchday2 : activeComp.matchday;
    const currentHistory = isDiv2 ? activeComp.history2 : activeComp.history;
    const currentShowWinner = isDiv2 ? activeComp.showWinner2 : activeComp.showWinner;

    const sortedTeams = useMemo(() => {
      if (!currentTeams || currentTeams.length === 0) return [];
      return [...currentTeams].sort((a, b) => ((b.pts || 0) - (a.pts || 0)) || (((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0))));
    }, [currentTeams]);

    const currentUserTeamId = isDiv2 ? (activeComp.userTeamId2 || activeComp.teams2?.[0]?.id) : activeComp.userTeamId;
    const userTeam = (currentTeams && currentTeams.length > 0) ? (currentTeams.find(t => t.id === currentUserTeamId) || currentTeams[0]) : null;

    const winner = useMemo(() => {
      if (!currentTeams || currentTeams.length === 0) return null;
      if (isLeague) return sortedTeams[0];
      const final = activeComp.bracket?.Final?.[0] || activeComp.bracket?.Final;
      if (final && final.sh !== null) {
        if (final.sh > final.sa) return activeComp.teams.find(t => t.id === final.hId);
        if (final.sa > final.sh) return activeComp.teams.find(t => t.id === final.aId);
        return activeComp.teams.find(t => t.id === (final.penH > final.penA ? final.hId : final.aId));
      }
      return currentTeams[0];
    }, [activeComp, currentTeams, isLeague, sortedTeams]);

    const finalMatch = !isLeague ? (activeComp.bracket?.Final?.[0] || activeComp.bracket?.Final) : null;
    const cupTournamentEnded = !isLeague && Boolean(
      finalMatch &&
      finalMatch.sh !== null && finalMatch.sa !== null && finalMatch.sh !== undefined && finalMatch.sa !== undefined &&
      (finalMatch.sh !== finalMatch.sa || (finalMatch.penH !== null && finalMatch.penH !== undefined))
    );
    const cupChampionTeam = cupTournamentEnded ? winner : null;

    useEffect(() => {
      if (activeCompId === 'C3') {
        if (!activeComp?.teams?.length || !activeComp?.bracket) {
          const uelData = getAutoFillData('C3', comps);
          if (uelData) updateActiveComp({ ...uelData, id: 'C3', name: 'UEFA Europa League', type: 'cup' });
        }
      } else if (activeCompId === 'C1') {
        if (!activeComp?.teams?.length || !activeComp?.groups) {
          const clData = getAutoFillData('C1', comps);
          if (clData) updateActiveComp({ ...clData, id: 'C1', name: 'Champions League', type: 'cup' });
        }
      } else if (!isLeague && activeComp.phase !== 'groups' && !activeComp.bracket) {
        const newBracket = generateKnockoutBrackets(activeComp);
        if (newBracket) updateActiveComp({ bracket: newBracket });
      }
    }, [activeCompId, activeComp?.phase, activeComp?.bracket, activeComp?.teams?.length, activeComp?.groups, isLeague]);

    if (!currentTeams || currentTeams.length === 0) {
      return (
        <div className='flex-grow flex flex-col items-center justify-center text-center p-8'>
          <div className='w-24 h-24 bg-slate-900/30 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl'><Trophy size={48} className='text-slate-400' /></div>
          <h2 className='text-3xl font-black italic uppercase mb-2 text-white drop-shadow-md'>{activeComp?.name}</h2>
          <p className='text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-10 drop-shadow-md'>Configurando participantes oficiales...</p>
          <div className='space-y-4 w-full max-w-xs'>
            {!isLeague && (
              <button onClick={() => {
                 let compsState: any = null;
                 try {
                   const saved = window.localStorage.getItem(`${APP_ID}_comps`);
                   if (saved) compsState = JSON.parse(saved);
                 } catch (e) {}
                 updateActiveComp(getAutoFillData(activeCompId, compsState || comps || getDefaultComps()));
              }} className='w-full bg-emerald-600/80 backdrop-blur-md hover:bg-emerald-500 text-white py-4 rounded-2xl text-[11px] font-black uppercase italic tracking-widest shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2'>
                <Shuffle size={16}/> Cargar Equipos Oficiales
              </button>
            )}
            <button onClick={() => setView('hub')} className='w-full bg-slate-900/40 backdrop-blur-md border border-white/10 text-slate-200 py-4 rounded-2xl text-[11px] font-black uppercase italic tracking-widest transition-all active:scale-95'>Volver al Inicio</button>
          </div>
        </div>
      );
    }

    const getGroupMatch = () => {
      if (!currentTeams || currentTeams.length === 0) return null;
      if (isLeague) return (generateLeagueSchedule(currentTeams)[currentMatchday] || []).find(m => m.homeId === userTeam.id || m.awayId === userTeam.id);

      if (activeComp.phase === 'groups' && activeComp.groups) {
        const isWC = activeCompId === 'C2';
        const group = activeComp.groups.find(g => g.teamIds.includes(userTeam.id));
        if (group) return (generateLeagueSchedule(activeComp.teams.filter(t => group.teamIds.includes(t.id)), !isWC)[activeComp.matchday % (isWC ? 3 : 6)] || []).find(m => m.homeId === userTeam.id || m.awayId === userTeam.id);
        for (const g of activeComp.groups) {
          const m = (generateLeagueSchedule(activeComp.teams.filter(t => g.teamIds.includes(t.id)), !isWC)[activeComp.matchday % (isWC ? 3 : 6)] || [])[0];
          if (m) return m;
        }
      } else if (activeComp.bracket) {
        const matchArray = Array.isArray(activeComp.bracket[activeComp.phase]) ? activeComp.bracket[activeComp.phase] : [activeComp.bracket[activeComp.phase]];
        const isVuelta = (activeCompId === 'C1' || activeCompId === 'C3') && activeComp.matchday % 2 !== 0 && activeComp.phase !== 'Final';
        const userMatch = matchArray.find(m => m && (m.hId === userTeam.id || m.aId === userTeam.id));
        if (userMatch) return (isVuelta && userMatch.sh2 === null) || (!isVuelta && userMatch.sh === null) ? userMatch : null;
        return matchArray.find(m => m && (isVuelta ? m.sh2 === null : m.sh === null));
      }
      return null;
    };

    const currentMatch = getGroupMatch();
    let homeId = currentMatch?.homeId || currentMatch?.hId;
    let awayId = currentMatch?.awayId || currentMatch?.aId;

    if ((activeCompId === 'C1' || activeCompId === 'C3') && activeComp.matchday % 2 !== 0 && activeComp.phase !== 'Final' && activeComp.phase !== 'groups' && currentMatch?.hId) {
      const temp = homeId; homeId = awayId; awayId = temp;
    }

    const homeTeam = currentTeams.find(t => t.id === homeId);
    const awayTeam = currentTeams.find(t => t.id === awayId);

    // Sistema de validación de ascensos (solo Ligas)
    const isMax1 = isLeague && activeComp.teams && activeComp.matchday >= generateLeagueSchedule(activeComp.teams).length;
    const isMax2 = isLeague && activeComp.teams2 && activeComp.matchday2 >= generateLeagueSchedule(activeComp.teams2).length;
    const readyForPromotion = isLeague && (isMax1 || isMax2);
    // La nueva temporada global sólo puede arrancar cuando TODAS las ligas
    // terminaron su calendario y la Champions ya se resolvió.
    const seasonReadyForNewSeason = allLeaguesFinished && championsFinished;
    const leagueTotal = isLeague ? divTotalRounds(currentTeams) : 0;
    const leagueDivDone = isLeague && leagueTotal > 0 && currentMatchday >= leagueTotal;
    const canPlayGlobalMatchday = isLeague ? (!leagueDivDone && currentMatchday < globalMatchday) : true;
    const leaguePendingNow = isLeague && leaguePendingAt(activeComp, globalMatchday);

    if (compView === 'config') return (
      <ConfigPanel 
        initialComp={activeComp} 
        compId={activeCompId} 
        onSave={(draftData) => { updateActiveComp(draftData); setCompView('main'); }}
        onCancel={() => setCompView('main')}
        onTotalReset={handleTotalReset}
      />
    );

    if (compView === 'main') return (
      <div className='flex-grow px-4 pb-20 relative'>

        {/* SAVE MODAL */}
        {/* SAVE MODAL */}
        <AnimatePresence>
          {showSaveModal && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className='fixed top-4 right-4 z-[80]'>
              <div className='bg-emerald-600/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-emerald-400/40 shadow-[0_0_30px_rgba(52,211,153,0.4)] flex items-center gap-3'>
                <div className='w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center'>
                  <Check size={16} className='text-white' />
                </div>
                <div>
                  <p className='text-[11px] font-black uppercase italic text-white'>¡Guardado!</p>
                  <p className='text-[8px] font-bold text-emerald-200 uppercase tracking-wider'>Progreso almacenado</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ELIMINATED & REPESCA MODAL - Switch team or jump to Europa League */}
        <AnimatePresence>
          {eliminatedModal && activeComp && activeComp.type !== 'league' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md'>
              <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className={`bg-slate-900/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] border shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col ${eliminatedModal.isRepesca ? 'border-amber-500/40 shadow-amber-500/20' : 'border-red-500/30'}`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${eliminatedModal.isRepesca ? 'via-amber-500' : 'via-red-500'} to-transparent`} />
                <div className='p-6 text-center shrink-0'>
                  {eliminatedModal.isRepesca ? (
                    <>
                      <div className='w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.35)]'>
                        <CompetitionLogo compId='C3' size={36} />
                      </div>
                      <h2 className='text-xl font-black italic uppercase text-amber-400 mb-1'>¡Repesca a Europa League!</h2>
                      <p className='text-[11px] font-bold text-slate-200 mt-1'>
                        Tu equipo, <span className='text-amber-300 uppercase font-black'>{eliminatedModal.userTeam?.name || 'tu club'}</span>, ha finalizado 3.º en Champions League.
                      </p>
                      <p className='text-[10px] font-medium text-amber-200/80 mt-1 bg-amber-950/40 p-2 rounded-xl border border-amber-500/20'>
                        🛡️ ¡No quedas fuera de Europa! Obtienes plaza de repesca para disputar la <span className='font-black text-amber-300'>UEFA Europa League</span>.
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={48} className='text-red-400 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' />
                      <h2 className='text-xl font-black italic uppercase text-red-400 mb-2'>¡Eliminado!</h2>
                      <p className='text-[11px] font-bold text-slate-300'>Tu equipo fue eliminado en <span className='text-red-300 uppercase'>{eliminatedModal.phase}</span>.</p>
                      <p className='text-[10px] font-bold text-slate-400 mt-1'>Elige un nuevo equipo para continuar el torneo.</p>
                    </>
                  )}
                </div>
                <div className='overflow-y-auto flex-grow px-4 pb-4 custom-scrollbar'>
                  {eliminatedModal.isRepesca && (
                    <div className='mb-4 space-y-2'>
                      <button
                        onClick={() => {
                          const uTeam = eliminatedModal.userTeam;
                          setComps(prev => {
                            const next = { ...prev };
                            let uel = next['C3'];
                            if (!uel || !Array.isArray(uel.teams) || uel.teams.length === 0) {
                              uel = getAutoFillData('C3', next, uTeam?.name ? [uTeam.name] : []);
                            }
                            let uelTeams = [...(uel.teams || [])];
                            let found = uelTeams.find((t: any) => t.name === uTeam?.name || t.id === uTeam?.id);
                            let targetUserTeamId = found ? found.id : 1;
                            if (!found && uTeam) {
                              if (uelTeams.length > 0) {
                                uelTeams[0] = { ...uTeam, id: uelTeams[0].id, clOrigin: 'Champions League (3º Repesca)' };
                                targetUserTeamId = uelTeams[0].id;
                              } else {
                                uelTeams = [{ ...uTeam, id: 1, clOrigin: 'Champions League (3º Repesca)' }];
                                targetUserTeamId = 1;
                              }
                            }
                            next['C3'] = {
                              ...uel,
                              teams: uelTeams,
                              userTeamId: targetUserTeamId
                            };
                            return next;
                          });
                          setEliminatedModal(null);
                          setActiveCompId('C3');
                          setCompView('main');
                          setView('competition');
                        }}
                        className='w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black uppercase text-[11px] tracking-wider shadow-lg shadow-amber-600/30 active:scale-95 transition-all border border-amber-400/40'
                      >
                        <CompetitionLogo compId='C3' size={18} />
                        <span>Jugar Europa League con {eliminatedModal.userTeam?.name}</span>
                      </button>
                      <div className='flex items-center gap-2 my-3'>
                        <div className='h-px bg-white/10 flex-grow' />
                        <span className='text-[8px] font-black uppercase text-slate-400 tracking-wider'>O continuar en Champions</span>
                        <div className='h-px bg-white/10 flex-grow' />
                      </div>
                    </div>
                  )}

                  <div className='grid gap-2'>
                    {(() => {
                      // Get remaining teams based on current phase
                      const bracket = activeComp.bracket;
                      const nextPhase = activeComp.phase;
                      let remainingTeams: any[] = [];

                      if (bracket && bracket[nextPhase]) {
                        // Knockout: get teams from next round bracket
                        const nextMatches = Array.isArray(bracket[nextPhase]) ? bracket[nextPhase] : [bracket[nextPhase]];
                        const remainingIds = new Set<number>();
                        nextMatches.forEach((m: any) => { if (m?.hId) remainingIds.add(m.hId); if (m?.aId) remainingIds.add(m.aId); });
                        remainingTeams = activeComp.teams.filter((t: any) => remainingIds.has(t.id));
                      } else if (bracket) {
                        // After group stage: get all teams still in bracket (any phase)
                        const allIds = new Set<number>();
                        ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'].forEach(p => {
                          const matches = bracket[p];
                          if (matches) {
                            const arr = Array.isArray(matches) ? matches : [matches];
                            arr.forEach((m: any) => { if (m?.hId) allIds.add(m.hId); if (m?.aId) allIds.add(m.aId); });
                          }
                        });
                        remainingTeams = activeComp.teams.filter((t: any) => allIds.has(t.id));
                      }

                      return remainingTeams.map((t: any) => (
                        <button key={t.id} onClick={() => {
                          updateActiveComp({ userTeamId: t.id });
                          setEliminatedModal(null);
                        }} className='flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-slate-800/40 hover:bg-blue-600/30 hover:border-blue-400/50 active:scale-95 transition-all backdrop-blur-md'>
                          <Shield color1={t.color1} color2={t.color2} initial={t.name} size='sm' isFlag={t.isFlag} />
                          <div className='text-left'>
                            <p className='text-[10px] font-black uppercase italic text-white'>{t.name}</p>
                            <p className='text-[8px] font-bold text-slate-300'>{t.att}/{t.opp}/{t.def}</p>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESET CONFIRM MODAL */}
        <AnimatePresence>
          {resetConfirmModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md'>
              <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className='bg-slate-900/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] border border-red-500/30 shadow-2xl relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent' />
                <div className='p-8 text-center'>
                  <div className='w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(239,68,68,0.3)]'>
                    <RotateCcw size={36} className='text-red-400' />
                  </div>
                  <h2 className='text-xl font-black italic uppercase text-red-400 mb-3'>¿Reiniciar Temporada?</h2>
                  {isLeague ? (
                    <div className='space-y-2 mb-6'>
                      <p className='text-[11px] font-bold text-slate-300'>Se reiniciarán <span className='text-white'>ambas divisiones</span> de {activeComp.name}:</p>
                      <div className='flex gap-2 justify-center mt-3'>
                        <div className='bg-blue-900/30 border border-blue-500/20 px-3 py-2 rounded-xl'>
                          <p className='text-[9px] font-black text-blue-400 uppercase'>1ª División</p>
                          <p className='text-[8px] text-slate-400 font-bold'>Jornada {activeComp.matchday}</p>
                        </div>
                        <div className='bg-emerald-900/30 border border-emerald-500/20 px-3 py-2 rounded-xl'>
                          <p className='text-[9px] font-black text-emerald-400 uppercase'>2ª División</p>
                          <p className='text-[8px] text-slate-400 font-bold'>Jornada {activeComp.matchday2 || 0}</p>
                        </div>
                      </div>
                      <p className='text-[9px] font-bold text-red-400/80 mt-2'>⚠️ Todo el progreso, estadísticas y resultados se perderán.</p>
                    </div>
                  ) : (
                    <div className='mb-6'>
                      <p className='text-[11px] font-bold text-slate-300'>Se reiniciará todo el torneo de <span className='text-white'>{activeComp.name}</span>.</p>
                      <p className='text-[9px] font-bold text-red-400/80 mt-2'>⚠️ Equipos, grupos y resultados se restaurarán.</p>
                    </div>
                  )}
                  <div className='flex gap-3'>
                    <button onClick={() => setResetConfirmModal(false)} className='flex-1 bg-slate-800/80 border border-white/10 text-slate-200 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>Cancelar</button>
                    <button onClick={() => { handleTotalReset(activeCompId); setResetConfirmModal(false); }} className='flex-1 bg-gradient-to-r from-red-700/80 to-red-600/80 border-2 border-red-400/40 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:shadow-[0_0_35px_rgba(239,68,68,0.5)] hover:border-red-300/60 flex items-center justify-center gap-2'>
                      <RotateCcw size={14} className='text-red-200'/> Reiniciar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {showChampionsHistory && (
          <ChampionsHistoryModal
            championsHistory={(isLeague ? (isDiv2 ? activeComp?.championsHistory2 : activeComp?.championsHistory) : activeComp?.championsHistory) || []}
            archive={archive}
            comps={comps}
            title={`Palmarés · ${activeComp?.name || 'Competición'}${isLeague ? ` · ${isDiv2 ? '2ª' : '1ª'} Div.` : ''}`}
            compId={activeCompId}
            div={isLeague && isDiv2 ? 2 : 1}
            showTopWinners={true}
            onClose={() => setShowChampionsHistory(false)}
          />
        )}

        {/* NEWS MODAL */}

        <AnimatePresence>
          {showNewsModal && (() => {
            const currentMd = isDiv2 ? (activeComp.matchday2 || 0) : (activeComp.matchday || 0);
            const currentTms = isDiv2 ? (activeComp.teams2 || []) : (activeComp.teams || []);
            const currentHist = isDiv2 ? (activeComp.history2 || []) : (activeComp.history || []);
            const currentSched = currentTms.length > 0 ? generateLeagueSchedule(currentTms) : [];
            const newsItems = generateNews(
              currentTms,
              activeComp.teams2 || [],
              currentMd,
              activeComp.type,
              activeComp.name,
              currentHist,
              currentSched,
              activeComp.phase
            );
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md' onClick={() => setShowNewsModal(false)}>
                <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className='bg-slate-900/95 backdrop-blur-xl w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-amber-500/20 shadow-2xl relative overflow-hidden max-h-[85vh]'>
                  <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent' />
                  <div className='p-6'>
                    <div className='flex items-center justify-between mb-5'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]'>
                          <Megaphone size={20} className='text-amber-400' />
                        </div>
                        <div>
                          <h2 className='text-lg font-black italic uppercase text-white drop-shadow-md'>Noticias</h2>
                          <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Jornada {isDiv2 ? (activeComp.matchday2 || 0) : (activeComp.matchday || 0)} · {activeComp.name}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowNewsModal(false)} className='p-2 bg-slate-800/80 rounded-xl border border-white/10 active:scale-95 transition-all'>
                        <X size={16} className='text-slate-400' />
                      </button>
                    </div>

                    <div className='space-y-3 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar'>
                      {newsItems.length === 0 ? (
                        <div className='text-center py-10'>
                          <Newspaper size={32} className='text-slate-600 mx-auto mb-3' />
                          <p className='text-[10px] font-bold text-slate-500 uppercase italic'>No hay noticias aún. ¡Juega algunas jornadas!</p>
                        </div>
                      ) : (
                        newsItems.map((news, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className='bg-black/40 backdrop-blur-md rounded-2xl p-4 border transition-all hover:border-opacity-60'
                            style={{ borderColor: news.team?.color1 || '#ffffff', borderWidth: '1px', borderLeftWidth: '3px' }}
                          >
                            <div className='flex items-start gap-3'>
                              <div className='mt-0.5 shrink-0'>
                                <NewsIcon type={news.type} />
                              </div>
                              <div className='flex-grow min-w-0'>
                                <h3 className='text-[11px] font-black italic text-white leading-snug mb-1 drop-shadow-sm'>{news.title}</h3>
                                <p className='text-[9px] font-bold text-slate-400 leading-relaxed'>{news.desc}</p>
                                {news.team && (
                                  <div className='flex items-center gap-2 mt-2'>
                                    <div className='w-3 h-3 rounded-full' style={{ background: `linear-gradient(135deg, ${news.team.color1}, ${news.team.color2})` }} />
                                    <span className='text-[8px] font-black text-slate-500 uppercase tracking-wider'>{news.team.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    <button onClick={() => setShowNewsModal(false)} className='w-full mt-4 bg-slate-800/80 border border-white/10 text-slate-200 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
                      Cerrar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <AnimatePresence>
          {(currentShowWinner || readyForPromotion) && compView === 'main' && (() => {
            const sorted1 = activeComp.teams ? [...activeComp.teams].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)) : [];
            const sorted2 = activeComp.teams2 ? [...activeComp.teams2].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)) : [];
            const champion1 = sorted1[0];
            const champion2 = sorted2[0];
            const displayTeams = championModalDiv === 2 ? sorted2 : sorted1;
            const displayHistory = championModalDiv === 2 ? (activeComp.history2 || []) : (activeComp.history || []);
            const displayAllTeams = championModalDiv === 2 ? (activeComp.teams2 || []) : (activeComp.teams || []);
            const relegated = sorted1.slice(-3);
            const promoted = sorted2.slice(0, 3);
            // Ganador contextual según la división seleccionada en el modal o el bracket
            const modalWinner = isLeague 
              ? (championModalDiv === 2 ? champion2 : champion1)
              : winner;
            // Vista previa con las estadísticas reales del club según la base de datos europea de la app (sin buffs ni nerfs)
            const newPromotedStats = promoted.map((t) => getAuthenticTeamStats(t));
            const newRelegatedStats = relegated.map((t) => getAuthenticTeamStats(t));

            return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[60] bg-slate-950/98 backdrop-blur-xl flex flex-col'>
              {/* Header */}
               <div className='shrink-0 pt-3 pb-2 px-4'>
                <div className='flex items-center justify-center gap-3'>
                  <Trophy size={36} className='text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]' />
                  <div>
                    <h1 className='text-xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 drop-shadow-md'>¡CAMPEÓN!</h1>
                    <p className='text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]'>{activeComp.name}</p>
                  </div>
                </div>
              </div>

              {/* Winner showcase */}
              <div className='shrink-0 px-4 pb-3'>
                <div className='bg-gradient-to-br from-yellow-500/15 to-amber-600/10 border border-yellow-500/30 rounded-2xl p-3 shadow-[0_0_30px_rgba(234,179,8,0.1)]'>
                  <div className='flex items-center gap-3'>
                    <Shield color1={modalWinner?.color1} color2={modalWinner?.color2} initial={modalWinner?.name} size='md' isFlag={modalWinner?.isFlag} />
                    <div className='flex-1 min-w-0'>
                      <h2 className='text-base font-black uppercase italic text-white drop-shadow-md truncate'>{modalWinner?.name}</h2>
                      <p className='text-[8px] font-bold text-yellow-400/80 uppercase tracking-widest'>
                        {isLeague ? (championModalDiv === 2 ? 'Campeón 2ª División' : 'Campeón 1ª División') : activeComp.name}
                      </p>
                      {modalWinner && (
                        <div className='flex gap-1.5 mt-1.5 flex-wrap'>
                          <span className='text-[9px] font-black bg-yellow-500/25 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/40'>{modalWinner.pts} PTS</span>
                          <span className='text-[9px] font-bold bg-slate-800/70 text-slate-200 px-2 py-0.5 rounded-full border border-white/10'>{modalWinner.w}G {modalWinner.d}E {modalWinner.l}P</span>
                          <span className='text-[9px] font-bold bg-slate-800/70 text-slate-200 px-2 py-0.5 rounded-full border border-white/10'>GF:{modalWinner.gf} GC:{modalWinner.ga}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className='flex mx-4 bg-slate-900/80 rounded-2xl border border-white/10 p-0.5 shrink-0'>
                {[
                  { key: 'stats', label: '📊 Clasificación' },
                  { key: 'results', label: '📋 Resultados' },
                  ...(!isLeague ? [{ key: 'bracket', label: '⚔️ Llaves' }] : []),
                  ...(isLeague ? [{ key: 'promotions', label: '↕️ Asc/Desc' }] : [])
                ].map(tab => (
                  <button key={tab.key} onClick={() => setChampionModalTab(tab.key as any)} className={`flex-1 py-2 text-[8px] font-black uppercase italic tracking-wider rounded-xl transition-all ${championModalTab === tab.key ? 'text-yellow-400 bg-yellow-500/15 shadow-inner' : 'text-slate-400 hover:text-white'}`}>{tab.label}</button>
                ))}
              </div>

              {/* Div switcher for leagues */}
              {isLeague && (
                <div className='flex mx-4 mt-2 bg-slate-800/60 p-0.5 rounded-xl border border-white/10 shrink-0'>
                  <button onClick={() => setChampionModalDiv(1)} className={`flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-lg transition-all ${championModalDiv === 1 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>1ª División</button>
                  <button onClick={() => setChampionModalDiv(2)} className={`flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-lg transition-all ${championModalDiv === 2 ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>2ª División</button>
                </div>
              )}

              {/* Content area */}
              <div className='flex-grow overflow-y-auto px-4 py-4 custom-scrollbar'>
                {/* TAB: STATS */}
                {championModalTab === 'stats' && (
                  <div>
                    {isLeague ? (
                      <>
                        <h3 className='text-xs font-black uppercase text-slate-200 mb-3 text-center'>Clasificación</h3>
                        <div className='bg-slate-900/30 rounded-2xl border border-white/10 overflow-x-auto overflow-y-auto custom-scrollbar' style={{ maxHeight: '50vh' }}>
                          <table className='w-full text-left border-collapse'>
                            <thead className='bg-[#0f172a] sticky top-0 z-20'>
                              <tr className='text-[7px] font-black uppercase italic text-slate-400'>
                                <th className='px-1 py-1.5 sticky left-0 z-30 bg-[#0f172a] w-6'>#</th>
                                <th className='px-1 py-1.5 sticky left-[24px] z-30 bg-[#0f172a] min-w-[80px]'>Equipo</th>
                                <th className='px-1 py-1.5 text-center sticky left-[104px] z-30 bg-[#0f172a] border-r border-white/10 w-6'>PJ</th>
                                <th className='px-1 py-1.5 text-center w-5'>G</th><th className='px-1 py-1.5 text-center w-5'>E</th><th className='px-1 py-1.5 text-center w-5'>P</th>
                                <th className='px-1 py-1.5 text-center w-6'>GF</th><th className='px-1 py-1.5 text-center w-6'>GC</th><th className='px-1 py-1.5 text-center w-6'>DG</th>
                                <th className='px-1 py-1.5 text-center text-emerald-400 w-6'>Pts</th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-white/5'>
                                {displayTeams.map((t, i) => {
                                  const isPromo = championModalDiv === 2 && i < 3;
                                  const isReleg = championModalDiv === 1 && i >= displayTeams.length - 3;
                                  const rowBg = i === 0 ? 'bg-yellow-500/15' : isPromo ? 'bg-emerald-900/20' : isReleg ? 'bg-red-900/20' : '';
                                  return (
                                    <tr key={t.id} className={rowBg}>
                                      <td className={'px-1 py-1.5 text-[9px] font-black italic sticky left-0 z-10 bg-[#0f172a] ' + (i === 0 ? 'text-yellow-400' : isPromo ? 'text-emerald-400' : isReleg ? 'text-red-400' : 'text-slate-300')}>{i+1}</td>
                                      <td className='px-1 py-1.5 sticky left-[24px] z-10 bg-[#0f172a] min-w-[80px]'>
                                        <div className='flex items-center gap-1'>
                                          <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag}/>
                                          <span className='text-[8px] font-bold uppercase truncate italic max-w-[60px]'>{t.name}</span>
                                        </div>
                                      </td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold sticky left-[104px] z-10 bg-[#0f172a] border-r border-white/10'>{t.p}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold'>{t.w}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold'>{t.d}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold'>{t.l}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold'>{t.gf}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold'>{t.ga}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-bold'>{t.gf - t.ga}</td>
                                      <td className='px-1 py-1.5 text-center text-[9px] font-black text-emerald-400'>{t.pts}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className='text-xs font-black uppercase text-slate-200 mb-3 text-center'>Clasificación por Grupo</h3>
                        <div className='space-y-4'>
                          {(activeComp.groups || []).map((group, gi) => {
                            const groupTeams = (activeComp.teams || []).filter(t => Array.isArray(group.teamIds) && group.teamIds.includes(t.id)).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
                            return (
                              <div key={gi} className='bg-slate-900/30 rounded-2xl border border-white/10 overflow-hidden'>
                                <div className='bg-[#0f172a] p-2 border-b border-white/10'>
                                  <h4 className='text-[10px] font-black uppercase text-blue-400 flex items-center gap-1.5'><ShieldIcon size={10} /> {group.name}</h4>
                                </div>
                                <div className='overflow-x-auto custom-scrollbar'>
                                  <table className='w-full text-left border-collapse'>
                                    <thead className='bg-[#0f172a] sticky top-0 z-20'>
                                      <tr className='text-[7px] font-black uppercase italic text-slate-400'>
                                        <th className='px-1 py-1 sticky left-0 z-30 bg-[#0f172a] w-5'>#</th>
                                        <th className='px-1 py-1 sticky left-[20px] z-30 bg-[#0f172a] min-w-[70px]'>Equipo</th>
                                        <th className='px-1 py-1 text-center sticky left-[90px] z-30 bg-[#0f172a] border-r border-white/10 w-5'>PJ</th>
                                        <th className='px-1 py-1 text-center w-5'>G</th><th className='px-1 py-1 text-center w-5'>E</th><th className='px-1 py-1 text-center w-5'>P</th>
                                        <th className='px-1 py-1 text-center w-5'>GF</th><th className='px-1 py-1 text-center w-5'>GC</th><th className='px-1 py-1 text-center w-5'>DG</th>
                                        <th className='px-1 py-1 text-center text-emerald-400 w-5'>Pts</th>
                                      </tr>
                                    </thead>
                                    <tbody className='divide-y divide-white/5'>
                                      {groupTeams.map((t, i) => (
                                        <tr key={t.id} className={i < 2 ? 'bg-emerald-900/15' : ''}>
                                          <td className='px-1 py-1 text-[8px] font-black italic text-slate-300 sticky left-0 z-10 bg-[#0f172a]'>{i+1}</td>
                                          <td className='px-1 py-1 sticky left-[20px] z-10 bg-[#0f172a] min-w-[70px]'>
                                            <div className='flex items-center gap-1'>
                                              <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag}/>
                                              <span className='text-[8px] font-bold uppercase truncate italic max-w-[50px]'>{t.name}</span>
                                            </div>
                                          </td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold sticky left-[90px] z-10 bg-[#0f172a] border-r border-white/10'>{t.p}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold'>{t.w}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold'>{t.d}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold'>{t.l}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold'>{t.gf}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold'>{t.ga}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-bold'>{t.gf - t.ga}</td>
                                          <td className='px-1 py-1 text-center text-[8px] font-black text-emerald-400'>{t.pts}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB: RESULTS */}
                {championModalTab === 'results' && (
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-xs font-black uppercase text-slate-200'>Historial Completo de Resultados</h3>
                      <span className='text-[8px] font-bold text-slate-400'>
                        {displayHistory.reduce((acc: number, h: any) => acc + (h.results?.length || 0), 0)} partidos disputados
                      </span>
                    </div>

                    <div className='space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1'>
                      {displayHistory.length === 0 && (
                        <div className='bg-slate-900/40 rounded-2xl p-8 text-center text-slate-400 text-xs font-bold border border-white/5'>
                          No hay resultados registrados en esta competición.
                        </div>
                      )}
                      {displayHistory.map((h: any, i: number) => {
                        const dayStr = String(h.day ?? '');
                        const isKnockoutDay = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'].some(k => dayStr.includes(k));
                        const rawDay = dayStr.replace(/^Jornada\s+/i, '');
                        const dayTitle = isKnockoutDay
                          ? (dayStr.includes('·') ? dayStr : `Fase Eliminatoria · ${dayStr}`)
                          : `Jornada ${rawDay}`;

                        return (
                          <div key={i} className='bg-slate-900/80 rounded-2xl p-3.5 border border-white/10 space-y-2.5 shadow-md'>
                            <div className='flex items-center justify-between pb-1.5 border-b border-white/5'>
                              <div className='flex items-center gap-2'>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  isKnockoutDay
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}>
                                  {dayTitle}
                                </span>
                              </div>
                              <span className='text-[8px] font-bold text-slate-400'>
                                {h.results?.length || 0} {h.results?.length === 1 ? 'partido' : 'partidos'}
                              </span>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                              {Array.isArray(h.results) && h.results.map((r: any, ri: number) => {
                                const home = displayAllTeams.find(t => t.id === r.hId);
                                const away = displayAllTeams.find(t => t.id === r.aId);
                                const homeWon = r.sh > r.sa || (r.penH !== null && r.penH !== undefined && r.penH > r.penA);
                                const awayWon = r.sa > r.sh || (r.penA !== null && r.penA !== undefined && r.penA > r.penH);
                                const isTie = r.sh === r.sa && (r.penH === null || r.penH === undefined);
                                const isCareerMatchHere = activeCompId === career.compId ? (r.hId === careerTeam?.id || r.aId === careerTeam?.id) : false;
                                const isUserMatch = isCareerMatchHere || (activeCompId === 'C1' && (r.hId === activeComp?.careerTeamId || r.aId === activeComp?.careerTeamId)) || r.hId === activeComp?.userTeamId || r.aId === activeComp?.userTeamId;

                                return (
                                  <div
                                    key={ri}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                      isUserMatch
                                        ? 'bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border-blue-400/50 shadow-inner ring-1 ring-blue-400/20'
                                        : 'bg-black/40 border-white/5 hover:border-white/10'
                                    }`}
                                  >
                                    {/* Equipo Local */}
                                    <div className='flex items-center gap-2 flex-1 min-w-0 pr-2'>
                                      <Shield color1={home?.color1} color2={home?.color2} initial={home?.name} size='xs' isFlag={home?.isFlag} />
                                      <span className={`text-[9.5px] font-black uppercase truncate ${
                                        homeWon ? 'text-white' : isTie ? 'text-slate-300' : 'text-slate-400'
                                      }`}>
                                        {home?.name || 'Local'}
                                      </span>
                                    </div>

                                    {/* Marcador Central */}
                                    <div className='shrink-0 text-center px-2.5 py-1 bg-black/70 rounded-lg border border-white/10 shadow-sm'>
                                      <span className='text-[11px] font-black tracking-widest text-white tabular-nums'>
                                        {r.sh} - {r.sa}
                                      </span>
                                      {r.penH !== null && r.penH !== undefined && (
                                        <span className='block text-[7.5px] font-black text-amber-400'>
                                          ({r.penH}-{r.penA} pen)
                                        </span>
                                      )}
                                    </div>

                                    {/* Equipo Visitante */}
                                    <div className='flex items-center justify-end gap-2 flex-1 min-w-0 pl-2 text-right'>
                                      <span className={`text-[9.5px] font-black uppercase truncate ${
                                        awayWon ? 'text-white' : isTie ? 'text-slate-300' : 'text-slate-400'
                                      }`}>
                                        {away?.name || 'Visitante'}
                                      </span>
                                      <Shield color1={away?.color1} color2={away?.color2} initial={away?.name} size='xs' isFlag={away?.isFlag} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {championModalTab === 'bracket' && !isLeague && activeComp.bracket && (
                  <div className='space-y-3 pb-8'>
                    {/* SELECTOR DE RONDA EN CHIPS */}
                    <div className='flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar -mx-1 px-1 touch-auto'>
                      {['ALL', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final']
                        .filter(p => p === 'ALL' || activeComp.bracket[p])
                        .map(rk => (
                          <button
                            key={rk}
                            type='button'
                            onClick={() => setChampionModalBracketFilter(rk)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                              championModalBracketFilter === rk
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black scale-105 border border-blue-400/40'
                                : 'bg-slate-900/70 text-slate-400 hover:text-white border border-white/10'
                            }`}
                          >
                            {rk === 'ALL' ? 'Todas' : rk}
                          </button>
                      ))}
                    </div>

                    <div className='flex items-center justify-between px-1 text-[8px] font-black uppercase text-slate-400'>
                      <span className='text-slate-200'>Cuadro Eliminatorio</span>
                      <span className='bg-slate-900/60 px-2 py-0.5 rounded-full border border-white/10 text-slate-400'>
                        {championModalBracketFilter === 'ALL' ? '← Desliza para explorar →' : 'Vista de Ronda'}
                      </span>
                    </div>

                    <div className={`${
                      championModalBracketFilter === 'ALL'
                        ? 'flex gap-4 overflow-x-auto custom-scrollbar pb-6 scroll-smooth -mx-1 px-1 touch-auto'
                        : 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    }`}>
                      {['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final']
                        .filter(p => activeComp.bracket[p] && (championModalBracketFilter === 'ALL' || championModalBracketFilter === p))
                        .map(phase => {
                        const isChampions = activeCompId === 'C1' || activeCompId === 'C3';
                        const isTwoLegged = isChampions && phase !== 'Final';
                        return (
                          <div key={phase} className={`${championModalBracketFilter === 'ALL' ? 'min-w-[260px] sm:min-w-[290px] flex-shrink-0' : 'w-full'} space-y-2.5`}>
                            <div className='flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/10'>
                              <h4 className='text-[10px] font-black uppercase text-blue-300'>{phase === 'Dieciseisavos' ? 'Dieciseisavos (1/16)' : phase}</h4>
                              {isTwoLegged ? (
                                <div className='flex items-center gap-2 text-[7px] font-black uppercase tracking-wider text-slate-400'>
                                  <span className='w-5 text-center'>Ida</span>
                                  <span className='w-5 text-center'>Vta</span>
                                  <span className='w-6 text-center text-amber-300'>Glob</span>
                                </div>
                              ) : (
                                <span className='text-[7.5px] font-bold text-amber-300 uppercase'>Final</span>
                              )}
                            </div>
                            <div className='grid grid-cols-1 gap-2.5'>
                              {(Array.isArray(activeComp.bracket[phase]) ? activeComp.bracket[phase] : [activeComp.bracket[phase]]).filter(m => m !== null).map((m, mi) => {
                                const h = activeComp.teams.find(t => t.id === m.hId);
                                const a = activeComp.teams.find(t => t.id === m.aId);
                                let bWinner = null;
                                const hasIda = m.sh !== null && m.sh !== undefined;
                                const hasVuelta = isTwoLegged && m.sh2 !== null && m.sh2 !== undefined;
                                const totH = (m.sh || 0) + (m.sh2 || 0);
                                const totA = (m.sa || 0) + (m.sa2 || 0);

                                if (isTwoLegged ? hasVuelta : hasIda) {
                                  if (isTwoLegged) {
                                    if (totH > totA) bWinner = h;
                                    else if (totA > totH) bWinner = a;
                                    else if (m.penH !== null && m.penH !== undefined) bWinner = m.penH > m.penA ? h : a;
                                  } else {
                                    if (m.sh > m.sa) bWinner = h;
                                    else if (m.sa > m.sh) bWinner = a;
                                    else if (m.penH !== null && m.penH !== undefined) bWinner = m.penH > m.penA ? h : a;
                                  }
                                }

                                return (
                                  <div key={mi} className='bg-slate-900/50 rounded-2xl p-3 border border-white/10 flex flex-col gap-1.5 shadow-md'>
                                    {/* Fila Equipo 1 */}
                                    <div className='flex justify-between items-center py-0.5'>
                                      <div className='flex items-center gap-1.5 flex-1 min-w-0 pr-1'>
                                        <Shield color1={h?.color1} color2={h?.color2} initial={h?.name} size='xs' isFlag={h?.isFlag} />
                                        <span className={`text-[9px] font-black uppercase italic truncate ${bWinner?.id === h?.id ? 'text-amber-300 font-black' : h ? 'text-slate-200' : 'text-slate-500'}`}>
                                          {h?.name || 'TBD'}
                                        </span>
                                      </div>
                                      {isTwoLegged ? (
                                        <div className='flex items-center gap-1.5 tabular-nums text-[9px] shrink-0 font-bold'>
                                          <span className={`w-5 text-center py-0.5 rounded ${hasIda ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasIda ? m.sh : '—'}</span>
                                          <span className={`w-5 text-center py-0.5 rounded ${hasVuelta ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasVuelta ? m.sh2 : '—'}</span>
                                          <span className={`w-6 text-center py-0.5 rounded font-black ${hasVuelta ? (bWinner?.id === h?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300') : 'text-slate-600'}`}>
                                            {hasVuelta ? totH : '—'}
                                          </span>
                                          {hasVuelta && m.penH !== null && m.penH !== undefined && (
                                            <span className='text-amber-400 text-[7px] font-black'>({m.penH})</span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className='flex items-center gap-1 tabular-nums text-[10px] font-black'>
                                          <span className={`px-2 py-0.5 rounded ${hasIda ? (bWinner?.id === h?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200') : 'text-slate-600'}`}>
                                            {hasIda ? m.sh : '—'}
                                          </span>
                                          {m.penH !== null && m.penH !== undefined && <span className='text-amber-400 text-[7px]'>({m.penH})</span>}
                                        </div>
                                      )}
                                    </div>

                                    {/* Fila Equipo 2 */}
                                    <div className='flex justify-between items-center py-0.5 border-t border-white/5'>
                                      <div className='flex items-center gap-1.5 flex-1 min-w-0 pr-1'>
                                        <Shield color1={a?.color1} color2={a?.color2} initial={a?.name} size='xs' isFlag={a?.isFlag} />
                                        <span className={`text-[9px] font-black uppercase italic truncate ${bWinner?.id === a?.id ? 'text-amber-300 font-black' : a ? 'text-slate-200' : 'text-slate-500'}`}>
                                          {a?.name || 'TBD'}
                                        </span>
                                      </div>
                                      {isTwoLegged ? (
                                        <div className='flex items-center gap-1.5 tabular-nums text-[9px] shrink-0 font-bold'>
                                          <span className={`w-5 text-center py-0.5 rounded ${hasIda ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasIda ? m.sa : '—'}</span>
                                          <span className={`w-5 text-center py-0.5 rounded ${hasVuelta ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasVuelta ? m.sa2 : '—'}</span>
                                          <span className={`w-6 text-center py-0.5 rounded font-black ${hasVuelta ? (bWinner?.id === a?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300') : 'text-slate-600'}`}>
                                            {hasVuelta ? totA : '—'}
                                          </span>
                                          {hasVuelta && m.penA !== null && m.penA !== undefined && (
                                            <span className='text-amber-400 text-[7px] font-black'>({m.penA})</span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className='flex items-center gap-1 tabular-nums text-[10px] font-black'>
                                          <span className={`px-2 py-0.5 rounded ${hasIda ? (bWinner?.id === a?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200') : 'text-slate-600'}`}>
                                            {hasIda ? m.sa : '—'}
                                          </span>
                                          {m.penA !== null && m.penA !== undefined && <span className='text-amber-400 text-[7px]'>({m.penA})</span>}
                                        </div>
                                      )}
                                    </div>

                                    {/* Indicador de Ganador / Clasificado */}
                                    {bWinner ? (
                                      <div className='mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] font-black uppercase text-emerald-400'>
                                        <span>{phase === 'Final' ? '🏆 Campeón:' : 'Pasa:'}</span>
                                        <span className='text-amber-300 truncate max-w-[140px]'>{bWinner.name}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {championModalTab === 'promotions' && isLeague && (
                  <div className='space-y-4 text-left'>
                    <div className='bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-2xl'>
                      <h4 className='text-[9px] font-black uppercase text-emerald-400 mb-2 flex items-center gap-1.5'><ArrowUpCircle size={13}/> Ascienden a 1ª</h4>
                      <div className='space-y-1.5'>
                        {promoted.map((t, i) => (
                          <div key={t.id} className='flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5'>
                            <span className='text-[9px] font-black text-emerald-300 w-3'>{i+1}</span>
                            <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs'/>
                            <span className='text-[9px] font-bold uppercase truncate flex-grow'>{t.name}</span>
                            <span className='text-[7px] font-bold text-slate-400'>{t.att}/{t.opp}/{t.def}</span>
                            <span className='text-[7px] text-emerald-400'>→</span>
                            <span className='text-[7px] font-black text-emerald-300'>{newPromotedStats[i]?.att}/{newPromotedStats[i]?.opp}/{newPromotedStats[i]?.def}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className='bg-red-900/20 border border-red-500/20 p-3 rounded-2xl'>
                      <h4 className='text-[9px] font-black uppercase text-red-400 mb-2 flex items-center gap-1.5'><ArrowDownCircle size={13}/> Descienden a 2ª</h4>
                      <div className='space-y-1.5'>
                        {relegated.map((t, i) => (
                          <div key={t.id} className='flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/5'>
                            <span className='text-[9px] font-black text-red-300 w-3'>↓</span>
                            <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs'/>
                            <span className='text-[9px] font-bold uppercase truncate flex-grow'>{t.name}</span>
                            <span className='text-[7px] font-bold text-slate-400'>{t.att}/{t.opp}/{t.def}</span>
                            <span className='text-[7px] text-red-400'>→</span>
                            <span className='text-[7px] font-black text-red-300'>{newRelegatedStats[i]?.att}/{newRelegatedStats[i]?.opp}/{newRelegatedStats[i]?.def}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div className='shrink-0 p-4 border-t border-white/10 bg-slate-950/80 space-y-2'>
                <div className='flex items-center justify-between gap-2 mb-1'>
                  <button
                    onClick={() => setShowChampionsHistory(true)}
                    className='w-full py-2 bg-amber-500/15 border border-amber-400/30 rounded-xl text-[9px] font-black uppercase tracking-wider text-amber-300 active:scale-95 transition-all flex items-center justify-center gap-1.5'
                  >
                    <Trophy size={13} className='text-amber-400' /> Ver Historial / Palmarés
                  </button>
                </div>
                {isLeague && readyForPromotion && championModalTab !== 'promotions' ? (
                  <button onClick={() => setChampionModalTab('promotions')} className='w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3.5 rounded-2xl text-[11px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2'>
                    <ArrowUpCircle size={16}/> Ver Ascensos y Descensos
                  </button>
                ) : isLeague && readyForPromotion && championModalTab === 'promotions' ? (
                  <div className='space-y-2'>
                    {seasonReadyForNewSeason ? (
                      <button onClick={() => {
                        setChampionModalTab('stats');
                        setChampionModalDiv(1);
                        startNewGlobalSeason();
                      }} className='w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 py-3.5 rounded-2xl text-[11px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2'>
                        <RotateCcw size={16}/> Nueva Temporada Global
                      </button>
                    ) : (
                      <>
                        <button onClick={() => {
                          setChampionModalTab('stats');
                          setChampionModalDiv(1);
                          handlePromotionAndNewSeason();
                        }} className='w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 rounded-2xl text-[11px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2'>
                          <RotateCcw size={16}/> Aplicar Ascensos y Nueva Temporada
                        </button>
                        <p className='text-[9px] font-black uppercase italic text-amber-300 text-center leading-relaxed'>
                          {allLeaguesFinished ? '🏆 Resuelve la Champions League para la temporada global completa' : '⏳ Otras ligas siguen en juego'}
                        </p>
                        {allLeaguesFinished && !championsFinished && (
                          <button onClick={() => {
                            setChampionModalTab('stats');
                            setChampionModalDiv(1);
                            setMatchState(null);
                            updateActiveComp({ showWinner: false, showWinner2: false });
                            setActiveCompId('C1');
                            setCompView('main');
                            setView('competition');
                          }} className="w-full bg-slate-900/50 hover:bg-slate-800/60 backdrop-blur-md text-white py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-blue-500/30">
                            <Trophy size={15} className="text-amber-300" /> Ir a Champions League
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={() => { setChampionModalTab('stats'); setChampionModalDiv(1); updateActiveComp({ showWinner: false, showWinner2: false }); }} className='w-full bg-slate-800/80 border border-white/10 text-slate-200 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>Cerrar</button>
                  </div>
                ) : !isLeague ? (
                  <div className='flex gap-2'>
                    <button onClick={() => {
                       setChampionModalTab('stats');
                       setChampionModalDiv(1);
                       updateActiveComp({ showWinner: false });
                    }} className='flex-1 bg-slate-800/80 border border-white/10 text-slate-200 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>Cerrar</button>
                    <button onClick={() => {
                       setChampionModalTab('stats');
                       setChampionModalDiv(1);
                       if (activeCompId === 'C1' && seasonReadyForNewSeason) {
                         startNewGlobalSeason();
                       } else {
                         handleTotalReset(activeCompId);
                         updateActiveComp({ showWinner: false });
                       }
                    }} className='flex-[2] bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2'>
                      <RotateCcw size={14}/> {activeCompId === 'C1' && seasonReadyForNewSeason ? 'Nueva Temporada Global' : activeCompId === 'C2' ? 'Nueva Edición Mundial' : 'Nueva Edición'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => {
                     setChampionModalTab('stats');
                     setChampionModalDiv(1);
                     if (isDiv2) updateActiveComp({ showWinner2: false }); else updateActiveComp({ showWinner: false });
                  }} className='w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 py-3.5 rounded-2xl text-[11px] font-black uppercase italic tracking-widest shadow-xl active:scale-95 transition-all'>Continuar</button>
                )}
              </div>
            </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* HEADER RESPONSIVO OPTIMIZADO PARA MÓVIL */}
        <header className='flex items-center justify-between gap-2.5 mb-4 bg-slate-900/50 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-white/10'>
          <div className='flex items-center gap-3 min-w-0'>
            <button onClick={() => setView('hub')} className='p-2.5 bg-slate-900/80 hover:bg-slate-800 rounded-xl text-slate-200 border border-white/10 active:scale-95 transition-all shrink-0' title='Volver al Menú Principal'><ChevronLeft size={20} /></button>
            {activeCompId && (
              <div className='w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-2 flex items-center justify-center shrink-0 hover:scale-105 transition-transform'>
                <CompetitionLogo compId={activeCompId} size={44} showBackground={false} />
              </div>
            )}
            <div className='min-w-0'>
              <h2 className='text-sm sm:text-base md:text-lg font-black italic uppercase truncate drop-shadow-md text-white'>{activeComp?.name}</h2>
              {activeComp.type !== 'league' && (
                <span className='text-[8px] sm:text-[9px] font-black text-blue-300 uppercase tracking-widest block truncate'>
                  {cupTournamentEnded ? '🏆 Torneo Finalizado' : `Fase: ${activeComp.phase}`}
                </span>
              )}
            </div>
          </div>
          <div className='flex items-center gap-1.5 shrink-0'>
            <button
              onClick={() => setShowChampionsHistory(true)}
              className='flex items-center gap-1 px-2.5 py-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/40 text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shrink-0'
              title='Palmarés e Historial'
            >
              <Trophy size={13} className='text-amber-400 shrink-0' /> <span className='hidden xs:inline sm:inline'>Palmarés</span>
            </button>
            <button
              onClick={manualSave}
              className='p-2 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 rounded-xl border border-blue-500/40 active:scale-95 shrink-0'
              title='Guardar Estado'
            >
              <Save size={16}/>
            </button>
          </div>
        </header>

        {isLeague && (
          <div className='flex mb-6 bg-slate-900/40 p-1 rounded-2xl border border-white/10 backdrop-blur-md'>
            <button onClick={() => setViewDiv(1)} className={`flex-1 py-2.5 text-[10px] font-black uppercase italic rounded-[10px] transition-all ${!isDiv2 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>1ª División</button>
            <button onClick={() => setViewDiv(2)} className={`flex-1 py-2.5 text-[10px] font-black uppercase italic rounded-[10px] transition-all ${isDiv2 ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>2ª División</button>
          </div>
        )}

        <div className='mb-6 bg-slate-900/30 p-3 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-lg space-y-2'>
           <div className={`grid gap-2 ${activeComp.type !== 'league' ? 'grid-cols-5' : 'grid-cols-4'}`}>
             <MenuButton icon={<BarChart3 size={18} className='text-emerald-400'/>} label="Stats" onClick={() => setCompView('stats')} />
             <MenuButton icon={<Calendar size={18} className='text-blue-400'/>} label="Fechas" onClick={() => setCompView('calendar')} />
             <MenuButton icon={<History size={18} className='text-yellow-400'/>} label="Result." onClick={() => setCompView('results')} />
             {activeComp.type !== 'league' && (
               <MenuButton icon={<Swords size={18} className='text-purple-400'/>} label="Llaves" onClick={() => setCompView('bracket')} />
             )}
             <MenuButton icon={<Users size={18} className='text-indigo-400'/>} label="Equipo" onClick={() => setCompView('teamSelect')} />
           </div>
           <div className='grid grid-cols-2 gap-2'>
             <MenuButton icon={<Newspaper size={16} className='text-amber-400'/>} label="Noticias" onClick={() => setShowNewsModal(true)} isWide />
             <MenuButton icon={<Settings size={16} className='text-slate-300'/>} label="Ajustes" onClick={() => setCompView('config')} isWide />
           </div>
        </div>

        {activeComp.type !== 'league' && activeComp.phase === 'groups' && Array.isArray(activeComp.groups) && activeCompId !== 'C3' && (
          <div className='grid grid-cols-1 gap-6 mb-8'>
            {activeComp.groups.map((group, gi) => {
              const isCL = activeCompId === 'C1';
              const isUEL = activeCompId === 'C3';
              const sortedGroupTeams = activeComp.teams.filter(t => Array.isArray(group.teamIds) && group.teamIds.includes(t.id)).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
              return (
                <section key={gi} className='bg-slate-900/30 backdrop-blur-md rounded-[2rem] p-4 border border-white/10 shadow-lg'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-[10px] font-black uppercase text-blue-400 flex items-center gap-2 drop-shadow-md'><ShieldIcon size={12} /> {group?.name}</h3>
                    {isCL && (
                      <span className='text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30'>
                        3.º Repesca UEL
                      </span>
                    )}
                  </div>
                  <div className='space-y-1.5'>
                    {sortedGroupTeams.map((t, i) => {
                      const isFirstTwo = i < 2;
                      const isThirdCL = isCL && i === 2;
                      return (
                        <div key={t.id} className={'flex items-center gap-3 p-2 rounded-xl ' + (t.id === activeComp.userTeamId ? 'bg-blue-600/40 border border-blue-400/50 shadow-inner' : 'bg-black/30')}>
                          <span className={`text-[10px] font-black italic w-4 ${isFirstTwo ? 'text-emerald-400' : isThirdCL ? 'text-amber-400' : 'text-slate-500'}`}>{i+1}</span>
                          <Shield color1={t.color1} color2={t.color2} initial={t.name} size='sm' isFlag={t.isFlag} />
                          <div className='flex-grow min-w-0 flex items-center gap-1.5'>
                            <span className='text-[11px] font-bold uppercase truncate italic text-white drop-shadow-sm'>{t.name}</span>
                            {isThirdCL && (
                              <span className='text-[6.5px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-400/30 shrink-0'>
                                Repesca UEL
                              </span>
                            )}
                            {isFirstTwo && (
                              <span className={`text-[6.5px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${isCL ? 'bg-blue-500/25 text-blue-300 border border-blue-400/30' : isUEL ? 'bg-amber-500/25 text-amber-300 border border-amber-400/30' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'}`}>
                                Octavos
                              </span>
                            )}
                          </div>
                          <span className='text-[10px] font-black bg-slate-800/60 px-2 py-0.5 rounded-md text-emerald-400 border border-white/10 shrink-0'>{t.pts} PTS</span>
                        </div>
                      );
                    })}
                  </div>
                  {isCL && (
                    <div className='mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[7px] font-black uppercase text-slate-400 px-1 gap-1'>
                      <span className='flex items-center gap-1 text-blue-300'><span className='w-1.5 h-1.5 rounded-full bg-blue-400 inline-block'></span> 1º-2º: Octavos UCL</span>
                      <span className='flex items-center gap-1 text-amber-300'><span className='w-1.5 h-1.5 rounded-full bg-amber-400 inline-block'></span> 3º: Repesca a Europa League</span>
                      <span className='flex items-center gap-1 text-slate-500'><span className='w-1.5 h-1.5 rounded-full bg-slate-600 inline-block'></span> 4º: Eliminado</span>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* BANNER INFORMATIVO UEFA EUROPA LEAGUE */}
        {activeCompId === 'C3' && !cupTournamentEnded && (
          <div className='bg-gradient-to-r from-amber-950/60 via-slate-900/80 to-orange-950/60 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/30 mb-4 shadow-lg flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-300 shrink-0'>
              <CompetitionLogo compId='C3' size={20} showBackground={false} />
            </div>
            <div className='min-w-0 flex-1 text-[9px] text-slate-300 leading-snug'>
              <p className='text-amber-300 font-black uppercase text-[10px]'>Formato Eliminatoria Pura</p>
              <p>
                {activeComp.phase === 'Dieciseisavos'
                  ? '16 clubes de liga disputan los Dieciseisavos a ida y vuelta. Los 8 ganadores avanzarán a Octavos para medirse a los 8 repescados de Champions League.'
                  : activeComp.phase === 'Octavos'
                  ? 'Octavos de Final: Los 8 clasificados de Dieciseisavos se enfrentan a los 8 repescados de la UEFA Champions League a ida y vuelta.'
                  : 'Fase final a eliminatoria directa camino al título de UEFA Europa League.'}
              </p>
            </div>
          </div>
        )}

        {/* VISTA RESUMIDA DE ELIMINATORIAS DIRECTAS */}
        {activeComp.type !== 'league' && activeComp.phase !== 'groups' && activeComp.bracket && !cupTournamentEnded && (
          <section className='bg-slate-900/40 backdrop-blur-md rounded-[2rem] p-4 border border-white/10 mb-6 shadow-lg'>
            <div className='flex items-center justify-between mb-3'>
              <div>
                <p className='text-[8px] font-black uppercase tracking-widest text-amber-400'>
                  {activeCompId === 'C3' ? 'UEFA Europa League · Eliminatorias' : 'Fase de Eliminatorias'}
                </p>
                <h3 className='text-xs font-black uppercase italic text-white mt-0.5 flex items-center gap-1.5'>
                  <Swords size={13} className='text-amber-400' />
                  {activeComp.phase === 'Dieciseisavos' ? 'Dieciseisavos de Final (1/16)' :
                   activeComp.phase === 'Octavos' ? 'Octavos de Final' :
                   activeComp.phase === 'Cuartos' ? 'Cuartos de Final' :
                   activeComp.phase === 'Semis' ? 'Semifinales' : 'Gran Final'}
                </h3>
              </div>
              <button 
                onClick={() => setCompView('bracket')} 
                className='px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[8.5px] font-black uppercase tracking-wider border border-amber-400/30 transition-all flex items-center gap-1'
              >
                <span>Ver Llaves</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {activeComp.bracket[activeComp.phase] && (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2'>
                {(Array.isArray(activeComp.bracket[activeComp.phase]) ? activeComp.bracket[activeComp.phase] : [activeComp.bracket[activeComp.phase]]).map((m: any, mi: number) => {
                  if (!m) return null;
                  const h = activeComp.teams?.find(t => t.id === m.hId);
                  const a = activeComp.teams?.find(t => t.id === m.aId);
                  const isTwoLegged = (activeCompId === 'C1' || activeCompId === 'C3') && activeComp.phase !== 'Final';
                  const hasIda = m.sh !== null && m.sh !== undefined;
                  const hasVuelta = isTwoLegged && m.sh2 !== null && m.sh2 !== undefined;
                  const isUserMatch = h?.id === activeComp.userTeamId || a?.id === activeComp.userTeamId;

                  return (
                    <div key={mi} className={`p-2.5 rounded-2xl border transition-all ${isUserMatch ? 'bg-amber-950/30 border-amber-500/50 shadow-inner' : 'bg-slate-900/60 border-white/5'}`}>
                      {m.label && (
                        <p className='text-[7px] font-bold text-amber-300/80 uppercase tracking-wider mb-1 truncate'>{m.label}</p>
                      )}
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-1.5 min-w-0 flex-1'>
                          <Shield color1={h?.color1} color2={h?.color2} initial={h?.name} size='xs' isFlag={h?.isFlag} />
                          <span className={`text-[9.5px] font-black uppercase truncate ${h?.id === activeComp.userTeamId ? 'text-amber-300' : 'text-slate-200'}`}>{h?.name || 'TBD'}</span>
                        </div>
                        <div className='text-[9.5px] font-black text-white tabular-nums shrink-0 px-2 py-0.5 bg-black/40 rounded-lg'>
                          {hasIda ? (isTwoLegged ? `${m.sh}-${m.sa}${hasVuelta ? ` (${m.sh + m.sh2}-${m.sa + m.sa2})` : ''}` : `${m.sh}-${m.sa}`) : 'VS'}
                        </div>
                        <div className='flex items-center gap-1.5 min-w-0 flex-1 justify-end'>
                          <span className={`text-[9.5px] font-black uppercase truncate text-right ${a?.id === activeComp.userTeamId ? 'text-amber-300' : 'text-slate-200'}`}>{a?.name || 'TBD'}</span>
                          <Shield color1={a?.color1} color2={a?.color2} initial={a?.name} size='xs' isFlag={a?.isFlag} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {isLeague && (
          <section className='bg-slate-900/40 backdrop-blur-md rounded-[2rem] p-4 border border-white/10 mb-6 shadow-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[8px] font-black uppercase tracking-widest text-emerald-400'>🌎 Temporada {seasonState.season} · Jornada Global {globalMatchday}</p>
                <p className='text-sm font-black uppercase italic text-white mt-1'>{leagueProgressLabel(activeComp, globalMatchday)}</p>
                <p className='text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5'>
                  {leagueDivDone ? `${isDiv2 ? '2ª' : '1ª'} División finalizada` : `${isDiv2 ? '2ª' : '1ª'} División: Jornada ${Math.min(currentMatchday + 1, leagueTotal || 1)}/${leagueTotal}`}
                </p>
              </div>
              {leaguePendingNow && (
                <button onClick={() => simulateLeagueToGlobal(activeCompId)} className='bg-slate-800/50 hover:bg-slate-700/60 backdrop-blur-md px-4 py-3 rounded-2xl text-[9px] font-black uppercase italic tracking-widest active:scale-95 transition-all flex items-center gap-1.5 border border-white/10 text-slate-200'>
                  <Dices size={14} className='text-slate-300' /> Simular
                </button>
              )}
            </div>
            {!leaguePendingNow && !allLeaguesFinished && (
              <p className='mt-3 text-[8px] font-bold uppercase tracking-wider text-emerald-400'>
                {pendingLeagueIds.length === 0
                  ? `✔️ Jornada global ${globalMatchday - 1} completada en todas las ligas · Siguiente jornada ${globalMatchday}`
                  : `✔️ Jornada global ${globalMatchday} resuelta en esta liga · sincronizando el resto...`}
              </p>
            )}

          </section>
        )}

        {isLeague && (
          <section className='bg-slate-900/30 backdrop-blur-md rounded-[2rem] p-4 border border-white/10 mb-6 shadow-lg'>
            <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-3'>
              <h3 className='truncate text-[10px] font-black uppercase text-slate-200 flex items-center gap-2 drop-shadow-md'><BarChart3 size={12} /> Top Clasificación {isDiv2 ? '2ª' : '1ª'} Div.</h3>
              <button onClick={() => setShowChampionsHistory(true)} className='shrink-0 flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/15 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-amber-300 active:scale-95'>
                <Trophy size={11}/> Palmarés
              </button>
            </div>

            <div className='space-y-1.5'>
              {sortedTeams.slice(0, 6).map((t, i) => (
                <div key={t.id} className={'flex items-center gap-3 p-2 rounded-xl ' + (t.id === activeComp.userTeamId ? 'bg-blue-600/40 border border-blue-400/50 shadow-inner' : (isDiv2 && i < 3 ? 'bg-emerald-900/30 border border-emerald-500/20' : 'bg-black/30'))}>
                  <span className={'text-[10px] font-black italic w-4 ' + (isDiv2 && i < 3 ? 'text-emerald-400' : 'text-slate-300')}>{i+1}</span>
                  <Shield color1={t?.color1} color2={t?.color2} initial={t?.name} size='sm' isFlag={t?.isFlag} />
                  <span className='text-[11px] font-bold uppercase truncate flex-grow italic text-white drop-shadow-sm'>{t?.name}</span>
                  <span className='text-[10px] font-black bg-slate-800/60 px-2 py-0.5 rounded-md text-emerald-400 border border-white/10'>{t.pts} PTS</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TARJETA DE TORNEO CONCLUIDO / RESUMEN DE CAMPEÓN */}
        {!isLeague && cupTournamentEnded && !currentShowWinner && (
          <section className='bg-gradient-to-br from-amber-950/70 via-slate-900/90 to-yellow-950/70 backdrop-blur-md rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden border-2 border-yellow-500/30 mb-6 space-y-4 text-center'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[9px] font-black uppercase tracking-wider'>
              <Trophy size={13} className='text-yellow-400' /> Torneo Concluido
            </div>

            {cupChampionTeam && (
              <div className='flex flex-col items-center justify-center space-y-2'>
                <Shield color1={cupChampionTeam.color1} color2={cupChampionTeam.color2} initial={cupChampionTeam.name} size='xl' isFlag={cupChampionTeam.isFlag} />
                <div>
                  <h3 className='text-lg sm:text-xl font-black uppercase italic text-white drop-shadow-md'>{cupChampionTeam.name}</h3>
                  <p className='text-xs font-black uppercase tracking-widest text-amber-400'>¡Campeón de la {activeComp.name}!</p>
                </div>
              </div>
            )}

            <div className='grid grid-cols-2 gap-2 pt-2'>
              <button
                onClick={() => updateActiveComp({ showWinner: true })}
                className='py-3 px-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 text-[10px] font-black uppercase italic tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5'
              >
                <Sparkles size={14} className='text-yellow-400' /> Ver Resumen
              </button>
              <button
                onClick={() => setCompView('bracket')}
                className='py-3 px-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 text-[10px] font-black uppercase italic tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5'
              >
                <Swords size={14} className='text-purple-400' /> Ver Llaves
              </button>
            </div>

            <button
              onClick={() => setShowChampionsHistory(true)}
              className='w-full py-3 px-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg'
            >
              <Trophy size={15} className='text-amber-400' /> Ver Historial y Palmarés Oficial
            </button>

            <button
              onClick={() => {
                if (activeCompId === 'C1' && seasonReadyForNewSeason) {
                  startNewGlobalSeason();
                } else {
                  handleTotalReset(activeCompId);
                }
              }}
              className='w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-slate-950 font-black uppercase italic tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-yellow-300/60'
            >
              <RotateCcw size={16} /> {activeCompId === 'C1' && seasonReadyForNewSeason ? 'Iniciar Nueva Temporada Global' : activeCompId === 'C2' ? 'Iniciar Nueva Copa del Mundo' : 'Iniciar Nueva Edición'}
            </button>
          </section>
        )}

        {!currentShowWinner && !cupTournamentEnded && (currentMatch || (isLeague && currentMatchday >= generateLeagueSchedule(currentTeams).length)) && (
          <section className='bg-gradient-to-br from-blue-700/80 to-indigo-900/80 backdrop-blur-md rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden border border-white/20'>
            <div className='flex justify-between items-start mb-6'>
              <div className='flex flex-col items-center w-24'>
                <Shield color1={homeTeam?.color1} color2={homeTeam?.color2} initial={homeTeam?.name} size='lg' isFlag={homeTeam?.isFlag} />
                <p className='mt-2 text-[10px] font-black uppercase italic text-center truncate w-full text-white drop-shadow-sm'>{homeTeam?.name}</p>
                <div className='h-4 mt-1 flex items-start justify-center w-full'>
                  {homeTeam?.id === userTeam?.id && <span className='text-[7px] font-black bg-white/30 px-1.5 py-0.5 rounded uppercase backdrop-blur-sm text-white'>Tu Equipo</span>}
                </div>
              </div>
              <div className='flex flex-col items-center mt-4'>
                <span className='text-xs font-black text-white/70 italic mb-1 drop-shadow-sm'>VS</span>
                <div className='w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner'><Play size={20} className='ml-1 text-white' /></div>
              </div>
              <div className='flex flex-col items-center w-24'>
                <Shield color1={awayTeam?.color1} color2={awayTeam?.color2} initial={awayTeam?.name} size='lg' isFlag={awayTeam?.isFlag} />
                <p className='mt-2 text-[10px] font-black uppercase italic text-center truncate w-full text-white drop-shadow-sm'>{awayTeam?.name}</p>
                <div className='h-4 mt-1 flex items-start justify-center w-full'>
                  {awayTeam?.id === userTeam?.id && <span className='text-[7px] font-black bg-white/30 px-1.5 py-0.5 rounded uppercase backdrop-blur-sm text-white'>Tu Equipo</span>}
                </div>
              </div>
            </div>

            {(() => {
              const schedule = generateLeagueSchedule(currentTeams);
              const isDone = currentMatchday >= schedule.length;
              if (isLeague && isDone) {
                 return (
                   <button disabled className='w-full bg-slate-800/60 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-inner border border-white/10'>
                     Temporada Finalizada
                   </button>
                 );
              }
              if (isLeague && !canPlayGlobalMatchday) {
                 return (
                   <button disabled className='w-full bg-slate-800/60 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-inner border border-white/10'>
                     Esperando Jornada Global {globalMatchday + 1}
                   </button>
                 );
              }
              const isClGroupsFinished = Boolean(!comps['C1'] || comps['C1'].phase !== 'groups' || (comps['C1'].matchday || 0) >= 6);
              const isUclWaitingForRepescados = activeCompId === 'C3' && activeComp.phase !== 'Dieciseisavos' && !isClGroupsFinished;
              if (isUclWaitingForRepescados) {
                return (
                  <div className='p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/50 border border-amber-500/30 text-center space-y-2'>
                    <div className='flex items-center justify-center gap-1.5 text-amber-300 font-black text-xs uppercase tracking-wider'>
                      <Trophy size={14} className='text-amber-400' />
                      Esperando Cierre de Grupos UCL (Semana 18)
                    </div>
                    <p className='text-[10px] text-slate-300 font-medium leading-relaxed'>
                      Los 8 repescados de Champions League (3.ºs de grupo) se definirán tras la Jornada 6. Los Octavos de Europa League se disputarán a la par con la Champions League en la <strong>Semana 25 (Ida)</strong> y <strong>Semana 27 (Vuelta)</strong>.
                    </p>
                  </div>
                );
              }
              const isEuropeanOffWeek = (activeCompId === 'C1' && !isChampionsDate) || (activeCompId === 'C3' && !isEuropaDate);
              const targetWeek = activeCompId === 'C1' ? nextClWeek : nextUelWeek;

              return (
                <div className='space-y-2'>
                  {isEuropeanOffWeek && (
                    <div className='px-3 py-2 rounded-xl bg-blue-950/60 border border-blue-400/20 flex items-center justify-between text-left'>
                      <span className='text-[8.5px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1'>
                        <Trophy size={11} className='text-amber-400' /> Calendario Continental · Semana {targetWeek || 7}
                      </span>
                      <span className='text-[8px] font-bold text-slate-300'>Semana actual: {currentWeek}</span>
                    </div>
                  )}
                  <button onClick={() => startMatch(homeId, awayId, isDiv2)} className='w-full bg-slate-800/90 hover:bg-slate-700/90 text-white py-4 rounded-2xl text-xs font-black uppercase italic tracking-widest border border-white/20 active:scale-95 transition-colors flex flex-col items-center justify-center'>
                    <span>{activeComp.phase === 'Final' ? 'Gran Final' : activeComp.phase === 'TercerPuesto' ? 'Partido por 3º Puesto' : ('Jugar ' + (isLeague || activeComp.phase === 'groups' ? 'Jornada ' + (currentMatchday + 1) : activeComp.phase + (activeCompId === 'C1' ? (activeComp.matchday % 2 === 0 ? ' (Ida)' : ' (Vuelta)') : '')))}</span>
                    <span className='text-[7px] opacity-60 mt-0.5 tracking-normal text-slate-300'>{homeTeam?.opp} vs {awayTeam?.opp} TIROS DISPONIBLES</span>
                  </button>
                {isLeague && leaguePendingNow && (
                  <button onClick={() => simulateLeagueToGlobal(activeCompId)} className='w-full bg-slate-800/90 hover:bg-slate-700/90 border border-white/15 text-slate-200 py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest active:scale-95 transition-colors flex items-center justify-center gap-2'>
                    <Dices size={15} className='text-slate-300' /> Simular Jornada {currentMatchday + 1}
                  </button>
                )}
                {!isLeague && (
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      onClick={() => processCupRound(null)}
                      disabled={cupAutoSim}
                      className='bg-slate-800/90 hover:bg-slate-700/90 border border-white/15 text-slate-200 py-3.5 rounded-2xl text-[9px] font-black uppercase italic tracking-widest active:scale-95 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40'
                    >
                      <Dices size={14} className='text-slate-300' /> Simular {activeComp.phase === 'groups' ? 'Jornada' : 'Ronda'}
                    </button>
                    <button
                      onClick={() => setCupAutoSim(v => !v)}
                      className={'py-3.5 rounded-2xl text-[9px] font-black uppercase italic tracking-widest active:scale-95 transition-colors flex items-center justify-center gap-1.5 border ' + (cupAutoSim ? 'bg-red-900/80 border-red-500/40 text-red-200' : 'bg-slate-800/90 hover:bg-slate-700/90 border-white/15 text-slate-200')}
                    >
                      {cupAutoSim ? (<><X size={14}/> Detener</>) : (<><Wand2 size={14} className='text-slate-300' /> Simular Todo</>)}
                    </button>
                  </div>
                )}
                </div>
              );
            })()}

          </section>
        )}
      </div>
    );

    if (compView === 'stats') return (
      <div className='flex-grow px-4 pb-20'>
        <div className='flex items-center gap-3 mb-6'>
          <button onClick={() => setCompView('main')} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
          <h2 className='text-xl font-black italic uppercase drop-shadow-md'>Estadísticas {isDiv2 && '(2ª Div)'}</h2>
        </div>

        {isLeague && (() => {
          const prev = isDiv2 ? activeComp.previousStandings2 : activeComp.previousStandings;
          const showingPrev = standingsView === 'previous';
          return (
            <>
              <div className='flex gap-2 bg-slate-900/40 p-1 rounded-2xl border border-white/10 mb-4'>
                <button onClick={() => setStandingsView('current')} className={`flex-1 py-2 text-[9px] font-black uppercase italic rounded-xl transition-all ${!showingPrev ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>Clasificación actual</button>
                <button onClick={() => setStandingsView('previous')} className={`flex-1 py-2 text-[9px] font-black uppercase italic rounded-xl transition-all ${showingPrev ? 'bg-yellow-500 text-slate-900 shadow-md' : 'text-slate-400'}`}>Anterior competición</button>
              </div>
              {showingPrev && (!prev || prev.length === 0) && (
                <div className='bg-slate-900/30 border border-white/10 rounded-[2rem] p-8 text-center text-[10px] font-bold uppercase italic text-slate-400'>No hay una competición anterior disponible.</div>
              )}
            </>
          );
        })()}

        {isLeague ? (
          (standingsView === 'previous' && !((isDiv2 ? activeComp.previousStandings2 : activeComp.previousStandings) || []).length) ? null :
          <div className='bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-white/10 overflow-x-auto custom-scrollbar relative shadow-xl'>

            <table className='w-full text-left border-collapse min-w-[680px]'>
              <thead className='bg-[#0f172a] sticky top-0 z-50 shadow-md'>
                <tr className='text-[8px] font-black uppercase italic text-slate-400'>
                  <th className='p-3 sticky z-50 bg-[#0f172a]' style={{ left: 0, minWidth: '40px' }}>Pos</th>
                  <th className='p-3 sticky z-50 bg-[#0f172a]' style={{ left: '40px', minWidth: '130px' }}>Equipo</th>
                  <th className='p-3 sticky z-50 bg-[#0f172a] text-center border-r border-white/10' style={{ left: '170px', minWidth: '40px' }}>PJ</th>
                  <th className='p-3 text-center'>G</th><th className='p-3 text-center'>E</th><th className='p-3 text-center'>P</th><th className='p-3 text-center'>GF</th><th className='p-3 text-center'>GC</th><th className='p-3 text-center'>DG</th><th className='p-3 text-center text-emerald-400'>Pts</th><th className='p-3 text-center' style={{ minWidth: '120px' }}>Últ. 5</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-white/5'>
                {(() => {
                  const prevTable = (isDiv2 ? activeComp.previousStandings2 : activeComp.previousStandings) || [];
                  const rows = standingsView === 'previous' ? prevTable : sortedTeams;
                  return Array.isArray(rows) && rows.map((t, i) => {
                  const isUser = standingsView !== 'previous' && t.id === activeComp.userTeamId;
                  const isPromo = standingsView !== 'previous' && isDiv2 && i < 3;
                  const isRelegation = standingsView !== 'previous' && !isDiv2 && i >= rows.length - 3;
                  const rowBg = isUser ? 'bg-blue-600/30' : (isPromo ? 'bg-emerald-900/20' : (isRelegation ? 'bg-red-900/20' : ''));

                  return (
                    <tr key={t.id} className={rowBg}>
                      <td className={'p-3 text-[10px] font-black italic sticky z-40 bg-[#0f172a] ' + (isPromo ? 'text-emerald-400' : isRelegation ? 'text-red-400' : 'text-slate-300')} style={{ left: 0 }}>{i+1}</td>
                      <td className='p-3 flex items-center gap-2 sticky z-40 bg-[#0f172a]' style={{ left: '40px', minWidth: '130px' }}><Shield color1={t?.color1} color2={t?.color2} initial={t?.name} size='xs' isFlag={t?.isFlag} /><span className='text-[10px] font-bold uppercase truncate italic max-w-[80px]'>{t?.name}</span></td>
                      <td className='p-3 text-center text-[10px] font-bold sticky z-40 bg-[#0f172a] border-r border-white/10' style={{ left: '170px' }}>{t.p}</td>
                      <td className='p-3 text-center text-[10px] font-bold'>{t.w}</td><td className='p-3 text-center text-[10px] font-bold'>{t.d}</td><td className='p-3 text-center text-[10px] font-bold'>{t.l}</td><td className='p-3 text-center text-[10px] font-bold'>{t.gf}</td><td className='p-3 text-center text-[10px] font-bold'>{t.ga}</td><td className='p-3 text-center text-[10px] font-bold'>{t.gf - t.ga}</td><td className='p-3 text-center text-[10px] font-black text-emerald-400'>{t.pts}</td><td className='p-3'><FormBadges form={standingsView === 'previous' ? [] : getLast5(t.id, currentHistory)} /></td>
                    </tr>
                  )
                });
                })()}

              </tbody>
            </table>
          </div>
        ) : activeCompId === 'C3' ? (
          /* VISTA EXCLUSIVA DE PARTICIPANTES UEFA EUROPA LEAGUE */
          <div className='space-y-6'>
            {/* Banner de formato */}
            <div className='bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-orange-950/70 backdrop-blur-md rounded-3xl p-4 border border-amber-500/30 shadow-xl flex items-center justify-between'>
              <div>
                <span className='text-[8px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5'>
                  <CompetitionLogo compId='C3' size={14} showBackground={false} /> UEFA Europa League
                </span>
                <h3 className='text-sm font-black uppercase italic text-white mt-0.5'>24 Clubes en Eliminatoria Directa</h3>
              </div>
              <button
                onClick={() => setCompView('bracket')}
                className='px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[8.5px] font-black uppercase tracking-wider border border-amber-400/30 transition-all flex items-center gap-1'
              >
                <span>Ver Llaves</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {/* 16 CLUBES DE LIGA (DISPUTAN DIECISEISAVOS) */}
            <div className='bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-white/10 p-4 shadow-xl'>
              <div className='flex items-center justify-between mb-3 pb-2 border-b border-white/10'>
                <h3 className='text-xs font-black uppercase text-amber-300 flex items-center gap-2'>
                  <ShieldIcon size={14} /> 16 Clubes de Liga (Dieciseisavos de Final)
                </h3>
                <span className='text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30'>
                  5.º - 8.º Puestos
                </span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {(activeComp.teams || []).slice(0, 16).map((t: any, idx: number) => {
                  const isUser = t.id === activeComp.userTeamId;
                  return (
                    <div key={t.id || idx} className={`flex items-center justify-between p-2.5 rounded-xl border ${isUser ? 'bg-amber-950/40 border-amber-400/60 shadow-inner' : 'bg-black/30 border-white/5'}`}>
                      <div className='flex items-center gap-2 min-w-0 flex-1'>
                        <span className='text-[9px] font-black text-slate-500 w-4'>{idx + 1}</span>
                        <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag} />
                        <div className='min-w-0 flex-1'>
                          <span className={`text-[10px] font-bold uppercase truncate block ${isUser ? 'text-amber-300 font-black' : 'text-white'}`}>{t.name}</span>
                          <span className='text-[7px] text-slate-400 uppercase font-medium'>{t.clOrigin || 'Liga Nacional'}</span>
                        </div>
                      </div>
                      <div className='flex items-center gap-1.5 shrink-0 text-[8px] font-black text-slate-300 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/10'>
                        <span className='text-red-400'>{t.att}A</span>
                        <span className='text-amber-400'>{t.opp}T</span>
                        <span className='text-blue-400'>{t.def}D</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 8 CLUBES REPESCADOS DE CHAMPIONS (ENTRAN EN OCTAVOS) */}
            <div className='bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-white/10 p-4 shadow-xl'>
              <div className='flex items-center justify-between mb-3 pb-2 border-b border-white/10'>
                <h3 className='text-xs font-black uppercase text-blue-300 flex items-center gap-2'>
                  <Trophy size={14} className='text-blue-400' /> 8 Repescados de Champions League (Octavos)
                </h3>
                <span className='text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30'>
                  3.º de Grupo UCL
                </span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {(activeComp.teams || []).slice(16, 24).map((t: any, idx: number) => {
                  const isUser = t.id === activeComp.userTeamId;
                  return (
                    <div key={t.id || idx} className={`flex items-center justify-between p-2.5 rounded-xl border ${isUser ? 'bg-blue-950/40 border-blue-400/60 shadow-inner' : 'bg-black/30 border-white/5'}`}>
                      <div className='flex items-center gap-2 min-w-0 flex-1'>
                        <span className='text-[9px] font-black text-blue-400 w-4'>{idx + 1}</span>
                        <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag} />
                        <div className='min-w-0 flex-1'>
                          <span className={`text-[10px] font-bold uppercase truncate block ${isUser ? 'text-blue-300 font-black' : 'text-white'}`}>{t.name}</span>
                          <span className='text-[7px] text-blue-300/80 uppercase font-medium'>{t.clOrigin || 'Champions League (3.º)'}</span>
                        </div>
                      </div>
                      <div className='flex items-center gap-1.5 shrink-0 text-[8px] font-black text-slate-300 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/10'>
                        <span className='text-red-400'>{t.att}A</span>
                        <span className='text-amber-400'>{t.opp}T</span>
                        <span className='text-blue-400'>{t.def}D</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-8'>
            {/* Lógica original de Copas y Eliminatorias */}
            {(activeComp.groups || []).map((group, gi) => (
              <div key={gi} className='bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-white/10 overflow-x-auto custom-scrollbar relative shadow-xl'>
                <div className='bg-[#0f172a] p-3 border-b border-white/10 sticky left-0 z-50'><h3 className='text-[10px] font-black uppercase text-blue-400 flex items-center gap-2'><ShieldIcon size={12} /> {group.name}</h3></div>
                <table className='w-full text-left border-collapse min-w-[680px]'>
                  <thead className='bg-[#0f172a] sticky top-0 z-50'>
                    <tr className='text-[8px] font-black uppercase italic text-slate-400'>
                      <th className='p-3 sticky z-50 bg-[#0f172a]' style={{ left: 0, minWidth: '40px' }}>Pos</th>
                      <th className='p-3 sticky z-50 bg-[#0f172a]' style={{ left: '40px', minWidth: '130px' }}>Equipo</th>
                      <th className='p-3 sticky z-50 bg-[#0f172a] text-center border-r border-white/10' style={{ left: '170px', minWidth: '40px' }}>PJ</th>
                      <th className='p-3 text-center'>G</th><th className='p-3 text-center'>E</th><th className='p-3 text-center'>P</th><th className='p-3 text-center'>GF</th><th className='p-3 text-center'>GC</th><th className='p-3 text-center'>DG</th><th className='p-3 text-center text-emerald-400'>Pts</th><th className='p-3 text-center' style={{ minWidth: '120px' }}>Últ. 5</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-white/5'>
                    {Array.isArray(activeComp.teams) && activeComp.teams.filter(t => Array.isArray(group.teamIds) && group.teamIds.includes(t.id)).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)).map((t, i) => {
                      const isCL = activeCompId === 'C1';
                      const isUEL = activeCompId === 'C3';
                      const isFirstTwo = i < 2;
                      const isThirdCL = isCL && i === 2;
                      return (
                        <tr key={t.id} className={t.id === activeComp.userTeamId ? 'bg-blue-600/30' : ''}>
                          <td className='p-3 text-[10px] font-black italic sticky z-40 bg-[#0f172a]' style={{ left: 0 }}>
                            <span className={isFirstTwo ? 'text-emerald-400' : isThirdCL ? 'text-amber-400' : 'text-slate-500'}>{i+1}</span>
                          </td>
                          <td className='p-3 flex items-center gap-2 sticky z-40 bg-[#0f172a]' style={{ left: '40px', minWidth: '130px' }}>
                            <Shield color1={t?.color1} color2={t?.color2} initial={t?.name} size='xs' isFlag={t?.isFlag} />
                            <div className='flex items-center gap-1.5 truncate'>
                              <span className='text-[10px] font-bold uppercase truncate italic max-w-[80px]'>{t?.name}</span>
                              {isThirdCL && (
                                <span className='text-[6.5px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-400/30'>
                                  Repesca
                                </span>
                              )}
                              {isFirstTwo && (
                                <span className={`text-[6.5px] font-black uppercase px-1 py-0.2 rounded ${isCL ? 'bg-blue-500/25 text-blue-300 border border-blue-400/30' : isUEL ? 'bg-amber-500/25 text-amber-300 border border-amber-400/30' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'}`}>
                                  Octavos
                                </span>
                              )}
                            </div>
                          </td>
                          <td className='p-3 text-center text-[10px] font-bold sticky z-40 bg-[#0f172a] border-r border-white/10' style={{ left: '170px' }}>{t.p}</td>
                          <td className='p-3 text-center text-[10px] font-bold'>{t.w}</td><td className='p-3 text-center text-[10px] font-bold'>{t.d}</td><td className='p-3 text-center text-[10px] font-bold'>{t.l}</td><td className='p-3 text-center text-[10px] font-bold'>{t.gf}</td><td className='p-3 text-center text-[10px] font-bold'>{t.ga}</td><td className='p-3 text-center text-[10px] font-bold'>{t.gf - t.ga}</td><td className='p-3 text-center text-[10px] font-black text-emerald-400'>{t.pts}</td><td className='p-3'><FormBadges form={getLast5(t.id, currentHistory)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (compView === 'results') return (
      <div className='flex-grow px-4 pb-20'>
        <div className='flex items-center gap-3 mb-6'>
          <button onClick={() => setCompView('main')} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
          <h2 className='text-xl font-black italic uppercase drop-shadow-md'>Resultados {isDiv2 && '(2ª)'}</h2>
        </div>
        <div className='space-y-4'>
          {(!Array.isArray(currentHistory) || currentHistory.length === 0) && <div className='text-center py-20 text-slate-300 bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-white/5 italic font-bold uppercase text-[10px] shadow-lg'>No hay partidos jugados aún.</div>}
          {Array.isArray(currentHistory) && currentHistory.map((h, i) => (
            <div key={i} className='bg-slate-900/30 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-lg'>
              <h3 className='text-[9px] font-black uppercase text-blue-300 mb-3 drop-shadow-md'>Jornada {h.day}</h3>
              <div className='space-y-2'>
                {Array.isArray(h.results) && h.results.map((r, ri) => {
                  const home = Array.isArray(currentTeams) ? currentTeams.find(t => t.id === r.hId) : null;
                  const away = Array.isArray(currentTeams) ? currentTeams.find(t => t.id === r.aId) : null;
                  return (
                    <div key={ri} className='flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5'>
                      <div className='flex items-center gap-2 w-24'><Shield color1={home?.color1} color2={home?.color2} initial={home?.name} size='xs' isFlag={home?.isFlag} /><span className='text-[9px] font-bold uppercase truncate italic'>{home?.name}</span></div>
                      <div className='bg-slate-800/60 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-black italic tabular-nums flex flex-col items-center border border-white/10'>
                        <span>{r.sh} - {r.sa}</span>
                        {r.penH !== undefined && r.penA !== undefined && <span className='text-[7px] text-blue-300 mt-0.5'>(pen {r.penH}-{r.penA})</span>}
                      </div>
                      <div className='flex items-center gap-2 w-24 justify-end'><span className='text-[9px] font-bold uppercase truncate italic'>{away?.name}</span><Shield color1={away?.color1} color2={away?.color2} initial={away?.name} size='xs' isFlag={away?.isFlag} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

        if (compView === 'calendar') return (
      <div className='flex-grow px-4 pb-20'>
        <div className='flex items-center gap-3 mb-6'>
          <button onClick={() => setCompView('main')} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
          <h2 className='text-xl font-black italic uppercase drop-shadow-md'>Calendario {isDiv2 && '(2ª)'}</h2>
        </div>
        <div className='space-y-4'>
          {isLeague ? (
            (() => {
              const rounds = generateLeagueSchedule(currentTeams).map((round, ri) => ({ round, ri }));
              return [...rounds.filter(r => r.ri === currentMatchday), ...rounds.filter(r => r.ri > currentMatchday), ...rounds.filter(r => r.ri < currentMatchday).reverse()];
            })().map(({ round, ri }) => (
              <div key={ri} className={'bg-slate-900/30 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-lg ' + (ri === currentMatchday ? 'ring-2 ring-blue-500/50' : 'opacity-80')}>
                <div className='flex justify-between items-center mb-3'>
                  <h3 className='text-[9px] font-black uppercase text-slate-300'>Jornada {ri + 1} {ri === currentMatchday && '(Actual)'}</h3>
                  <span className={'text-[7px] font-black uppercase px-2 py-0.5 rounded-full ' + (ri < currentMatchday ? 'bg-emerald-500/30 text-emerald-300' : ri === currentMatchday ? 'bg-blue-500/40 text-blue-200' : 'bg-slate-800/80 text-slate-300')}>{ri < currentMatchday ? 'Finalizado' : ri === currentMatchday ? 'En Curso' : 'Próximo'}</span>
                </div>
                <div className='space-y-2'>
                  {round.map((m, mi) => {
                    const home = currentTeams.find(t => t.id === m.homeId); const away = currentTeams.find(t => t.id === m.awayId);
                    const result = currentHistory.find(h => h.day === (ri + 1))?.results.find(r => (r.hId === m.homeId && r.aId === m.awayId) || (r.hId === m.awayId && r.aId === m.homeId));
                    return (
                      <div key={mi} className='flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/5'>
                        <div className='flex items-center gap-2 w-24'><Shield color1={home?.color1} color2={home?.color2} initial={home?.name} size='xs' isFlag={home?.isFlag} /><span className='text-[9px] font-bold uppercase truncate italic'>{home?.name}</span></div>
                        <div className='flex flex-col items-center'>{result ? <span className='text-[10px] font-black tabular-nums bg-slate-800/60 px-2 py-0.5 rounded'>{result.sh} - {result.sa}</span> : <span className='text-[8px] font-black text-slate-400 italic'>VS</span>}</div>
                        <div className='flex items-center gap-2 w-24 justify-end'><span className='text-[9px] font-bold uppercase truncate italic'>{away?.name}</span><Shield color1={away?.color1} color2={away?.color2} initial={away?.name} size='xs' isFlag={away?.isFlag} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // Lógica intacta para torneos
            <div className='space-y-8'>
              {activeCompId !== 'C3' && (activeComp.groups || []).length > 0 && (
                <div className='space-y-6'>
                  <h2 className='text-xs font-black uppercase text-slate-200 border-b border-white/20 pb-2 drop-shadow-md'>Fase de Grupos</h2>
                  {(activeComp.groups || []).map((group, gi) => {
                    const groupTeams = activeComp.teams.filter(t => group.teamIds.includes(t.id));
                    const isWorldCup = activeCompId === 'C2';
                    const groupSchedule = generateLeagueSchedule(groupTeams, !isWorldCup);
                    const maxMatchdays = isWorldCup ? 3 : 6;
                    return (
                      <div key={gi} className='bg-slate-900/30 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-lg'>
                        <h3 className='text-[10px] font-black uppercase text-blue-400 mb-4 flex items-center gap-2 drop-shadow-md'><ShieldIcon size={12} /> {group.name}</h3>
                        <div className='space-y-4'>
                          {(() => {
                            const rounds = groupSchedule.map((round, ri) => ({ round, ri }));
                            const curIdx = activeComp.matchday % maxMatchdays;
                            if (activeComp.phase !== 'groups') return [...rounds].reverse();
                            return [...rounds.filter(r => r.ri === curIdx), ...rounds.filter(r => r.ri > curIdx), ...rounds.filter(r => r.ri < curIdx).reverse()];
                          })().map(({ round, ri }) => {
                            const isCur = activeComp.phase === 'groups' && ri === (activeComp.matchday % maxMatchdays);
                            const isPast = activeComp.phase !== 'groups' || (activeComp.phase === 'groups' && ri < (activeComp.matchday % maxMatchdays));

                            return (
                              <div key={ri} className={'p-3 rounded-2xl bg-black/30 border border-white/5 ' + (isCur ? 'border-blue-400/40 shadow-inner' : 'opacity-80')}>
                                <div className='flex justify-between items-center mb-2'>
                                  <span className='text-[8px] font-black uppercase text-slate-300 italic'>Jornada {ri + 1}</span>
                                  <span className={'text-[7px] font-black uppercase px-2 py-0.5 rounded-full ' + (isPast ? 'bg-emerald-500/30 text-emerald-300' : isCur ? 'bg-blue-500/40 text-blue-200' : 'bg-slate-800/80 text-slate-300')}>{isPast ? 'Finalizado' : isCur ? 'En Curso' : 'Próximo'}</span>
                                </div>
                                {round.map((m, mi) => {
                                  const home = activeComp.teams.find(t => t.id === m.homeId); const away = activeComp.teams.find(t => t.id === m.awayId);
                                  const result = activeComp.history.find(h => h.day === 'Jornada ' + (ri + 1))?.results.find(r => (r.hId === m.homeId && r.aId === m.awayId) || (r.hId === m.awayId && r.aId === m.homeId));

                                  return (
                                    <div key={mi} className='flex items-center justify-between py-1 border-b border-white/10 last:border-0'>
                                      <div className='flex items-center gap-2 w-20'><Shield color1={home?.color1} color2={home?.color2} initial={home?.name} size='xs' isFlag={home?.isFlag} /><span className='text-[9px] font-bold uppercase italic truncate'>{home?.name}</span></div>
                                      <div className='flex flex-col items-center'>
                                        {result ? (
                                          <div className='flex flex-col items-center'>
                                            <span className='text-[10px] font-black tabular-nums bg-slate-800/60 px-1.5 rounded'>{result.sh} - {result.sa}</span>
                                            {result.penH !== undefined && <span className='text-[7px] text-blue-300 font-bold'>(pen {result.penH}-{result.penA})</span>}
                                          </div>
                                        ) : <span className='text-[8px] font-black text-slate-400 italic'>VS</span>}
                                      </div>
                                      <div className='flex items-center gap-2 w-20 justify-end'><span className='text-[9px] font-bold uppercase italic truncate text-right'>{away?.name}</span><Shield color1={away?.color1} color2={away?.color2} initial={away?.name} size='xs' isFlag={away?.isFlag} /></div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeComp.bracket && (
                <div className='space-y-6'>
                  <h2 className='text-xs font-black uppercase text-slate-200 border-b border-white/20 pb-2 drop-shadow-md'>Eliminatorias</h2>
                  {(() => {
                    const po = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'];
                    const curIdx = po.indexOf(activeComp.phase);
                    if (curIdx === -1) return po; 
                    return [...po.slice(curIdx, curIdx + 1), ...po.slice(curIdx + 1), ...po.slice(0, curIdx).reverse()];
                  })().map(phase => {
                    const matches = activeComp.bracket[phase];
                    if (!matches || (Array.isArray(matches) && matches.length === 0)) return null;
                    const matchArray = Array.isArray(matches) ? matches : [matches];
                    const phases = ['groups', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'];
                    const currentPhaseIdx = phases.indexOf(activeComp.phase);
                    const phaseIdx = phases.indexOf(phase);
                    let status = phaseIdx < currentPhaseIdx ? 'Finalizado' : phaseIdx === currentPhaseIdx ? 'En Curso' : 'Próximo';

                    return (
                      <div key={phase} className={'bg-slate-900/30 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-lg ' + (status === 'En Curso' ? 'ring-2 ring-blue-500/50' : 'opacity-80')}>
                        <div className='flex justify-between items-center mb-3'>
                          <h3 className='text-[9px] font-black uppercase text-slate-300'>{phase === 'Dieciseisavos' ? 'Dieciseisavos (1/16)' : phase}</h3>
                          <span className={'text-[7px] font-black uppercase px-2 py-0.5 rounded-full ' + (status === 'Finalizado' ? 'bg-emerald-500/30 text-emerald-300' : status === 'En Curso' ? 'bg-blue-500/40 text-blue-200' : 'bg-slate-800/80 text-slate-300')}>{status}</span>
                        </div>
                        <div className='space-y-2'>
                          {matchArray.map((m, mi) => {
                            if (!m) return null;
                            const home = activeComp.teams.find(t => t.id === m.hId); const away = activeComp.teams.find(t => t.id === m.aId);
                            const isChampions = activeCompId === 'C1' || activeCompId === 'C3';
                            const isTwoLegged = isChampions && phase !== 'Final';
                            const isPlayedIda = m.sh !== null && m.sh !== undefined;
                            const isPlayedVuelta = isTwoLegged && m.sh2 !== null && m.sh2 !== undefined;
                            const totH = (m.sh || 0) + (m.sh2 || 0);
                            const totA = (m.sa || 0) + (m.sa2 || 0);

                            let passWinner = null;
                            if (isTwoLegged ? isPlayedVuelta : isPlayedIda) {
                              if (isTwoLegged) {
                                if (totH > totA) passWinner = home;
                                else if (totA > totH) passWinner = away;
                                else if (m.penH !== null && m.penH !== undefined) passWinner = m.penH > m.penA ? home : away;
                              } else {
                                if (m.sh > m.sa) passWinner = home;
                                else if (m.sa > m.sh) passWinner = away;
                                else if (m.penH !== null && m.penH !== undefined) passWinner = m.penH > m.penA ? home : away;
                              }
                            }

                            return (
                              <div key={mi} className='flex flex-col bg-black/30 p-3 rounded-2xl gap-2 border border-white/5'>
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-2 w-28'><Shield color1={home?.color1} color2={home?.color2} initial={home?.name || '?'} size='xs' isFlag={home?.isFlag} /><span className={`text-[9px] font-bold uppercase truncate italic ${passWinner?.id === home?.id ? 'text-amber-300 font-black' : home ? 'text-slate-200' : 'text-slate-500'}`}>{home?.name || 'Por definir'}</span></div>
                                  <div className='flex flex-col items-center flex-1'>
                                    {isPlayedIda ? (
                                      <div className='flex flex-col items-center gap-0.5'>
                                        <div className='flex items-center gap-1.5 bg-slate-800/60 px-2 py-0.5 rounded'>
                                          <span className='text-[10px] font-black tabular-nums'>{m.sh} - {m.sa}</span>
                                          {isTwoLegged && <span className='text-[7px] font-bold text-slate-400 uppercase italic'>Ida</span>}
                                        </div>
                                        {!isTwoLegged && m.penH !== null && m.penH !== undefined && (
                                          <span className='text-[7.5px] text-amber-300 font-black'>({m.penH}-{m.penA} pen)</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className='text-[8px] font-black text-slate-500 italic'>{isTwoLegged ? 'VS (Ida)' : 'VS'}</span>
                                    )}
                                  </div>
                                  <div className='flex items-center gap-2 w-28 justify-end'><span className={`text-[9px] font-bold uppercase truncate italic text-right ${passWinner?.id === away?.id ? 'text-amber-300 font-black' : away ? 'text-slate-200' : 'text-slate-500'}`}>{away?.name || 'Por definir'}</span><Shield color1={away?.color1} color2={away?.color2} initial={away?.name || '?'} size='xs' isFlag={away?.isFlag} /></div>
                                </div>

                                {isTwoLegged && (
                                  <div className='flex items-center justify-between border-t border-white/10 pt-2'>
                                    <div className='flex items-center gap-2 w-28'><Shield color1={away?.color1} color2={away?.color2} initial={away?.name || '?'} size='xs' isFlag={away?.isFlag} /><span className={`text-[9px] font-bold uppercase truncate italic ${passWinner?.id === away?.id ? 'text-amber-300 font-black' : away ? 'text-slate-200' : 'text-slate-500'}`}>{away?.name || 'Por definir'}</span></div>
                                    <div className='flex flex-col items-center flex-1'>
                                      {isPlayedVuelta ? (
                                        <div className='flex flex-col items-center'>
                                          <div className='flex items-center gap-2 bg-slate-800/60 px-1.5 rounded'><span className='text-[10px] font-black tabular-nums'>{m.sh2} - {m.sa2}</span><span className='text-[7px] font-bold text-slate-400 uppercase italic'>Vuelta</span></div>
                                          <div className='flex items-center gap-1 mt-1'>
                                            <span className='text-[8px] font-black text-amber-300 uppercase italic bg-amber-500/20 border border-amber-500/30 px-1.5 rounded'>Global: {totH} - {totA}</span>
                                            {m.penH !== undefined && m.penH !== null && <span className='text-[7px] text-blue-200 font-bold'>(pen {m.penH}-{m.penA})</span>}
                                          </div>
                                        </div>
                                      ) : <span className='text-[8px] font-black text-slate-500 italic'>VS (Vuelta)</span>}
                                    </div>
                                    <div className='flex items-center gap-2 w-28 justify-end'><span className={`text-[9px] font-bold uppercase truncate italic text-right ${passWinner?.id === home?.id ? 'text-amber-300 font-black' : home ? 'text-slate-200' : 'text-slate-500'}`}>{home?.name || 'Por definir'}</span><Shield color1={home?.color1} color2={home?.color2} initial={home?.name || '?'} size='xs' isFlag={home?.isFlag} /></div>
                                  </div>
                                )}

                                {passWinner && (
                                  <div className='mt-1 pt-1.5 border-t border-white/10 flex items-center justify-center gap-1.5 bg-emerald-900/30 rounded-xl py-1'>
                                    <span className='text-[7.5px] font-black uppercase text-emerald-300 italic'>{phase === 'Final' ? '🏆 Campeón:' : 'Pasa:'}</span>
                                    <Shield color1={passWinner.color1} color2={passWinner.color2} initial={passWinner.name} size='xs' isFlag={passWinner.isFlag} />
                                    <span className='text-[8px] font-black uppercase italic text-white truncate max-w-[120px]'>{passWinner.name}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );

    if (compView === 'bracket') return (
      <div className='flex-grow px-4 pb-36 min-h-screen overflow-y-auto'>
        <div className='flex items-center gap-3 mb-6'>
          <button onClick={() => setCompView('main')} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
          <h2 className='text-xl font-black italic uppercase drop-shadow-md'>Eliminatorias</h2>
        </div>
        {!activeComp.bracket ? (
          <div className='text-center py-20 text-slate-300 font-black bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-white/10 uppercase italic text-[10px] shadow-lg'>Las eliminatorias se generarán al finalizar la fase de grupos.</div>
        ) : (
          <div className='space-y-4'>
            {/* SELECTOR DE RONDA EN CHIPS */}
            <div className='flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar -mx-1 px-1 touch-auto'>
              {['ALL', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'TercerPuesto', 'Final']
                .filter(p => p === 'ALL' || activeComp.bracket[p])
                .map(rk => (
                  <button
                    key={rk}
                    type='button'
                    onClick={() => setBracketRoundFilter(rk)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      bracketRoundFilter === rk
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black scale-105 border border-purple-400/40'
                        : 'bg-slate-900/70 text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {rk === 'ALL' ? 'Todas las Rondas' : rk === 'Dieciseisavos' ? 'Dieciseisavos' : rk === 'TercerPuesto' ? '3º Puesto' : rk}
                  </button>
              ))}
            </div>

            <div className='flex items-center justify-between px-1 text-[8px] font-black uppercase text-slate-400'>
              <span>Rondas Eliminatorias</span>
              <span className='bg-slate-900/60 px-2 py-0.5 rounded-full border border-white/10 text-slate-400'>
                {bracketRoundFilter === 'ALL' ? '← Desliza lateral y verticalmente →' : 'Vista de Ronda'}
              </span>
            </div>

            <div className={`${
              bracketRoundFilter === 'ALL'
                ? 'flex gap-4 overflow-x-auto custom-scrollbar pb-8 scroll-smooth -mx-1 px-1 touch-auto'
                : 'grid grid-cols-1 md:grid-cols-2 gap-4'
            }`}>
            {['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'TercerPuesto', 'Final']
              .filter(p => activeComp.bracket[p] && (bracketRoundFilter === 'ALL' || bracketRoundFilter === p))
              .map(phase => {
              const isChampions = activeCompId === 'C1' || activeCompId === 'C3';
              const isTwoLegged = isChampions && phase !== 'Final' && phase !== 'TercerPuesto';
              return (
                <div key={phase} className={`${bracketRoundFilter === 'ALL' ? 'min-w-[260px] sm:min-w-[290px] flex-shrink-0' : 'w-full'} space-y-2.5`}>
                  <div className='flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-white/10'>
                    <h3 className='text-[10px] font-black uppercase text-blue-300'>{phase === 'Dieciseisavos' ? 'Dieciseisavos (1/16)' : phase === 'TercerPuesto' ? '3º Puesto' : phase}</h3>
                    {isTwoLegged ? (
                      <div className='flex items-center gap-2 text-[7px] font-black uppercase tracking-wider text-slate-400'>
                        <span className='w-5 text-center'>Ida</span>
                        <span className='w-5 text-center'>Vta</span>
                        <span className='w-6 text-center text-amber-300'>Glob</span>
                      </div>
                    ) : (
                      <span className='text-[7.5px] font-bold text-amber-300 uppercase'>{phase === 'Final' ? 'Final' : phase === 'TercerPuesto' ? '3º Puesto' : '1 Partido'}</span>
                    )}
                  </div>
                  <div className='grid grid-cols-1 gap-2.5'>
                    {(Array.isArray(activeComp.bracket[phase]) ? activeComp.bracket[phase] : [activeComp.bracket[phase]]).filter(m => m !== null).map((m, mi) => {
                      const h = activeComp.teams.find(t => t.id === m.hId);
                      const a = activeComp.teams.find(t => t.id === m.aId);
                      let winner = null;
                      const hasIda = m.sh !== null && m.sh !== undefined;
                      const hasVuelta = isTwoLegged && m.sh2 !== null && m.sh2 !== undefined;
                      const totH = (m.sh || 0) + (m.sh2 || 0);
                      const totA = (m.sa || 0) + (m.sa2 || 0);

                      if (isTwoLegged ? hasVuelta : hasIda) {
                        if (isTwoLegged) {
                          if (totH > totA) winner = h;
                          else if (totA > totH) winner = a;
                          else if (m.penH !== null && m.penH !== undefined) winner = m.penH > m.penA ? h : a;
                        } else {
                          if (m.sh > m.sa) winner = h;
                          else if (m.sa > m.sh) winner = a;
                          else if (m.penH !== null && m.penH !== undefined) winner = m.penH > m.penA ? h : a;
                        }
                      }

                      return (
                        <div key={mi} className='bg-slate-900/50 rounded-2xl p-3 border border-white/10 flex flex-col gap-1.5 shadow-md'>
                          {/* Fila Equipo 1 */}
                          <div className='flex justify-between items-center py-0.5'>
                            <div className='flex items-center gap-1.5 flex-1 min-w-0 pr-1'>
                              <Shield color1={h?.color1} color2={h?.color2} initial={h?.name || '?'} size='xs' isFlag={h?.isFlag} />
                              <span className={`text-[9px] font-black uppercase italic truncate ${winner?.id === h?.id ? 'text-amber-300 font-black' : h ? 'text-slate-200' : 'text-slate-500'}`}>
                                {h?.name || 'Por definir'}
                              </span>
                            </div>
                            {isTwoLegged ? (
                              <div className='flex items-center gap-1.5 tabular-nums text-[9px] shrink-0 font-bold'>
                                <span className={`w-5 text-center py-0.5 rounded ${hasIda ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasIda ? m.sh : '—'}</span>
                                <span className={`w-5 text-center py-0.5 rounded ${hasVuelta ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasVuelta ? m.sh2 : '—'}</span>
                                <span className={`w-6 text-center py-0.5 rounded font-black ${hasVuelta ? (winner?.id === h?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300') : 'text-slate-600'}`}>
                                  {hasVuelta ? totH : '—'}
                                </span>
                                {hasVuelta && m.penH !== null && m.penH !== undefined && (
                                  <span className='text-amber-400 text-[7px] font-black'>({m.penH})</span>
                                )}
                              </div>
                            ) : (
                              <div className='flex items-center gap-1 tabular-nums text-[10px] font-black'>
                                <span className={`px-2 py-0.5 rounded ${hasIda ? (winner?.id === h?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200') : 'text-slate-600'}`}>
                                  {hasIda ? m.sh : '—'}
                                </span>
                                {m.penH !== null && m.penH !== undefined && <span className='text-amber-400 text-[7px]'>({m.penH})</span>}
                              </div>
                            )}
                          </div>

                          {/* Fila Equipo 2 */}
                          <div className='flex justify-between items-center py-0.5 border-t border-white/5'>
                            <div className='flex items-center gap-1.5 flex-1 min-w-0 pr-1'>
                              <Shield color1={a?.color1} color2={a?.color2} initial={a?.name || '?'} size='xs' isFlag={a?.isFlag} />
                              <span className={`text-[9px] font-black uppercase italic truncate ${winner?.id === a?.id ? 'text-amber-300 font-black' : a ? 'text-slate-200' : 'text-slate-500'}`}>
                                {a?.name || 'Por definir'}
                              </span>
                            </div>
                            {isTwoLegged ? (
                              <div className='flex items-center gap-1.5 tabular-nums text-[9px] shrink-0 font-bold'>
                                <span className={`w-5 text-center py-0.5 rounded ${hasIda ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasIda ? m.sa : '—'}</span>
                                <span className={`w-5 text-center py-0.5 rounded ${hasVuelta ? 'bg-black/40 text-slate-200' : 'text-slate-600'}`}>{hasVuelta ? m.sa2 : '—'}</span>
                                <span className={`w-6 text-center py-0.5 rounded font-black ${hasVuelta ? (winner?.id === a?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300') : 'text-slate-600'}`}>
                                  {hasVuelta ? totA : '—'}
                                </span>
                                {hasVuelta && m.penA !== null && m.penA !== undefined && (
                                  <span className='text-amber-400 text-[7px] font-black'>({m.penA})</span>
                                )}
                              </div>
                            ) : (
                              <div className='flex items-center gap-1 tabular-nums text-[10px] font-black'>
                                <span className={`px-2 py-0.5 rounded ${hasIda ? (winner?.id === a?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200') : 'text-slate-600'}`}>
                                  {hasIda ? m.sa : '—'}
                                </span>
                                {m.penA !== null && m.penA !== undefined && <span className='text-amber-400 text-[7px]'>({m.penA})</span>}
                              </div>
                            )}
                          </div>

                          {/* Indicador de Ganador / Clasificado */}
                          {winner ? (
                            <div className='mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] font-black uppercase text-emerald-400'>
                              <span>{phase === 'Final' ? '🏆 Campeón:' : phase === 'TercerPuesto' ? '🥉 3º Puesto:' : 'Pasa:'}</span>
                              <span className='text-amber-300 truncate max-w-[140px]'>{winner.name}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    );

    if (compView === 'playing') {
      if (!matchState) return null;
      return (
        <div className='flex-grow flex flex-col px-4'>
        <div className='flex justify-between items-center mb-4'>
          <button onClick={() => setCompView('main')} className='p-2 bg-slate-900/30 backdrop-blur-md border border-white/10 rounded-xl text-slate-200 active:scale-95 transition-all'><ChevronLeft /></button>
          <div className='flex flex-col items-center gap-1'>
            <div className='px-4 py-1 bg-red-900/60 backdrop-blur-md rounded-full text-[9px] font-black uppercase italic border border-red-500/20 text-red-200 shadow-sm'>En Vivo</div>
            <span className='text-[8px] font-black uppercase italic text-slate-300 tracking-wider'>
              {activeComp.phase === 'Final' ? '🏆 Gran Final' : activeComp.phase === 'TercerPuesto' ? '🥉 3º Puesto' : isLeague || activeComp.phase === 'groups' ? `📅 Jornada ${currentMatchday + 1}` : `⚔️ ${activeComp.phase}${activeCompId === 'C1' ? (activeComp.matchday % 2 === 0 ? ' — Ida' : ' — Vuelta') : ''}`}
            </span>
          </div>
          <div className='w-10'></div>
        </div>

        <div className='bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 mb-4 border-b-4 border-slate-800 relative shadow-xl'>
          {matchState.aggregate && (
            <div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-400 shadow-lg z-10'>
              <span className='text-[8px] font-black uppercase italic text-white tracking-widest'>Global: {matchState.aggregate.sh + matchState.scoreH} - {matchState.aggregate.sa + matchState.scoreA}</span>
            </div>
          )}
          <div className='flex items-center'>
            <div className='flex-1 flex flex-col items-center text-center'>
              {matchState.phase === 'penalties' && <PenaltyDots history={matchState.penalties?.historyH} />}
              <Shield color1={matchState.home?.color1} color2={matchState.home?.color2} initial={matchState.home?.name} size='lg' isFlag={matchState.home?.isFlag} />
              <p className='text-[10px] font-black uppercase italic mt-2 truncate text-white drop-shadow-md w-full'>{matchState.home?.name}</p>
              <p className='text-[8px] font-bold text-slate-300 mt-1 bg-black/40 backdrop-blur-sm inline-block px-2 rounded'>{(matchState.home?.att ?? 3) + '/' + (matchState.home?.opp ?? 3) + '/' + (matchState.home?.def ?? 3)}</p>
            </div>

            <div className='px-4 flex flex-col items-center shrink-0 w-32'>
              <div className='text-5xl font-black italic tracking-tighter flex gap-3 tabular-nums drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] text-white'><span>{matchState.scoreH}</span><span className='text-slate-400'>-</span><span>{matchState.scoreA}</span></div>
              {!matchState.finished && matchState.phase !== 'penalties' && <div className='text-[8px] font-black text-white/70 uppercase italic mt-1 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm'>{matchState.oppH} vs {matchState.oppA} TIROS RESTANTES</div>}
              {matchState.phase === 'penalties' && (
                <div className='mt-2 flex flex-col items-center w-full'>
                  <span className='text-[8px] font-black text-red-400 uppercase italic'>Penaltis</span>
                  <div className='text-xl font-black italic text-blue-300 tabular-nums drop-shadow-md'>(pen {matchState.penalties.scoreH} - {matchState.penalties.scoreA})</div>
                  {matchState.penalties.shotsH < 5 || matchState.penalties.shotsA < 5 ? (
                    <div className='flex justify-between w-full text-[7px] font-bold text-slate-300 uppercase mt-1'><span>Res H: {5 - matchState.penalties.shotsH}</span><span>Res A: {5 - matchState.penalties.shotsA}</span></div>
                  ) : <div className='text-[7px] font-bold text-amber-400 uppercase mt-1'>¡Muerte Súbita!</div>}
                  <div className='text-[7px] font-bold text-slate-200 uppercase mt-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-center'>{matchState.penalties.phase === 'att' ? '⚽ Preparando Disparo' : '🧤 ¡El portero se prepara!'}</div>
                </div>
              )}
            </div>

            <div className='flex-1 flex flex-col items-center text-center'>
              {matchState.phase === 'penalties' && <PenaltyDots history={matchState.penalties?.historyA} />}
              <Shield color1={matchState.away?.color1} color2={matchState.away?.color2} initial={matchState.away?.name} size='lg' isFlag={matchState.away?.isFlag} />
              <p className='text-[10px] font-black uppercase italic mt-2 truncate text-white drop-shadow-md w-full'>{matchState.away?.name}</p>
              <p className='text-[8px] font-bold text-slate-300 mt-1 bg-black/40 backdrop-blur-sm inline-block px-2 rounded'>{(matchState.away?.att ?? 3) + '/' + (matchState.away?.opp ?? 3) + '/' + (matchState.away?.def ?? 3)}</p>
            </div>
          </div>
        </div>

        <div className='flex-grow bg-[#2e7d32]/60 backdrop-blur-md rounded-[3rem] border-8 border-slate-900/40 relative overflow-hidden flex flex-col items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]'>
          <div className='absolute top-1/2 left-0 w-full h-[2px] bg-white/20 -translate-y-1/2'></div>
          <div className='absolute top-1/2 left-1/2 w-40 h-40 border-[2px] border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2'></div>
          <div className='absolute top-1/2 left-1/2 w-3 h-3 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2'></div>

          {!matchState.finished ? (
            <div className='z-10 flex flex-col items-center gap-8'>
              <div className={'transition-all duration-300 transform ' + (rolling ? 'scale-125 rotate-45' : 'scale-100')}>
                <DieIcon value={matchState.lastDie} className='w-24 h-24 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.8)]' />
              </div>
              <button onClick={handleRoll} disabled={rolling} className='bg-white/90 backdrop-blur-sm text-emerald-900 px-10 py-5 rounded-3xl font-black uppercase italic tracking-widest shadow-[0_10px_20px_rgba(0,0,0,0.5)] active:scale-90 transition-transform disabled:opacity-50'>{rolling ? 'Lanzando...' : 'Lanzar Dado'}</button>
            </div>
          ) : (
            <div className='z-10 text-center p-6 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 max-w-[80%] shadow-2xl'>
              <Trophy size={48} className='text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' />
              <h3 className='text-lg font-black uppercase italic mb-4 text-white drop-shadow-md'>¡Fin del Partido!</h3>
              <button onClick={processMatchday} className='w-full bg-white/90 backdrop-blur-sm text-slate-950 py-4 rounded-2xl font-black uppercase italic tracking-widest active:scale-95 transition-all shadow-md'>Finalizar</button>
            </div>
          )}
        </div>

        <div className='mt-4 bg-slate-900/40 backdrop-blur-md rounded-3xl p-5 h-40 overflow-y-auto border border-white/10 space-y-2 shadow-lg custom-scrollbar'>
          {matchState.logs.map((log, i) => (
            <div key={i} className={'text-[10px] font-bold italic flex gap-3 ' + (i === 0 ? 'text-white drop-shadow-md' : 'text-slate-300')}><span className='opacity-60 shrink-0'>⚽</span><p>{log}</p></div>
          ))}
        </div>
      </div>
    );
    }

    if (compView === 'teamSelect') return (
      <div className='flex-grow px-4 pb-20'>
        <div className='flex items-center gap-3 mb-6'>
          <button onClick={() => setCompView('main')} className='p-2 bg-slate-900/30 backdrop-blur-md rounded-xl active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
          <h2 className='text-xl font-black italic uppercase drop-shadow-md'>Seleccionar Equipo {isDiv2 ? '(2ª Div)' : ''}</h2>
        </div>
        {isLeague && (
          <div className='flex mb-4 bg-slate-900/40 p-1 rounded-2xl border border-white/10 backdrop-blur-md'>
            <button onClick={() => setViewDiv(1)} className={`flex-1 py-2 text-[10px] font-black uppercase italic rounded-[10px] transition-all ${!isDiv2 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>1ª División</button>
            <button onClick={() => setViewDiv(2)} className={`flex-1 py-2 text-[10px] font-black uppercase italic rounded-[10px] transition-all ${isDiv2 ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>2ª División</button>
          </div>
        )}
        <div className='grid gap-3 overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar'>
          {Array.isArray(currentTeams) && currentTeams.map(t => (
            <button key={t.id} onClick={() => { updateActiveComp(isDiv2 ? { userTeamId2: t.id } : { userTeamId: t.id }); setCompView('main'); }} className={'flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-95 backdrop-blur-md ' + (t.id === currentUserTeamId ? 'bg-blue-600/60 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-slate-900/40 border-white/10 hover:border-white/30')}>
              <Shield color1={t?.color1} color2={t?.color2} initial={t?.name} size='md' isFlag={t?.isFlag} />
              <div className='text-left'>
                <p className='text-xs font-black uppercase italic text-white drop-shadow-md'>{t?.name}</p>
                <p className='text-[8px] font-bold text-slate-200 uppercase bg-black/40 px-1.5 py-0.5 rounded inline-block mt-1'>{t?.att + '/' + t?.opp + '/' + t?.def}</p>
              </div>
              {t.id === currentUserTeamId && <div className='ml-auto bg-white/30 p-1.5 rounded-full shadow-inner'><Check size={14} className="text-white"/></div>}
            </button>
          ))}
        </div>
      </div>
    );

    return null;
  };

  const isWorldCupActive = Boolean(
    view === 'competition' && (
      activeCompId === 'C2' ||
      comps[activeCompId]?.id === 'C2' ||
      comps[activeCompId]?.isWorldCup ||
      comps[activeCompId]?.name?.toLowerCase().includes('copa del mundo') ||
      comps[activeCompId]?.name?.toLowerCase().includes('mundial') ||
      comps[activeCompId]?.name?.toLowerCase().includes('world cup')
    )
  );

  return (
    <div className='relative min-h-screen selection:bg-cyan-500/30 font-sans text-slate-100 overflow-hidden'>
      {/* Champions League Night Stadium Background (Default & All Other Modes) */}
      <div 
        className={`fixed inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transition-all duration-700 ${
          isWorldCupActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${championsStadiumBg})` }}
      />

      {/* World Cup Daytime Stadium Background with Lush Grass (Only in World Cup Interface) */}
      <div 
        className={`fixed inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transition-all duration-700 ${
          isWorldCupActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundImage: `url(${worldCupStadiumDayBg})` }}
      />

      {/* Lighting & Atmosphere Layers: Clean, Subtle, Dark Stadium Vignette */}
      {isWorldCupActive ? (
        <>
          {/* Daylight Stadium Vignette & Natural Contrast */}
          <div className='fixed inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-slate-950/80 z-0 backdrop-blur-[0.5px] pointer-events-none transition-all duration-500' />
          {/* Subtle Ambient Light (Static & Soft) */}
          <div className='fixed -bottom-20 inset-x-0 h-80 bg-emerald-950/30 blur-3xl z-0 pointer-events-none' />
        </>
      ) : (
        <>
          {/* Deep Night Atmosphere & Stadium Lights Vignette */}
          <div className='fixed inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/90 z-0 backdrop-blur-[0.5px] pointer-events-none transition-all duration-500' />
          {/* Subtle Soft Ambient Light (Static & Relaxing) */}
          <div className='fixed top-0 inset-x-0 h-72 bg-blue-950/20 blur-3xl z-0 pointer-events-none' />
        </>
      )}

      <div className='relative z-10 max-w-md mx-auto min-h-screen flex flex-col'>
        <AnimatePresence mode='wait'>
          {view === 'hub' && (
            <motion.div key='hub' className='flex-grow flex flex-col' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HubView
                career={career}
                onOpenCareer={openCareer}
                setView={setView}
                setActiveCompId={setActiveCompId}
                setCompView={setCompView}
                comps={comps}
                seasonState={seasonState}
                pendingLeagueIds={pendingLeagueIds}
                allLeaguesFinished={allLeaguesFinished}
                championsFinished={championsFinished}
                onSimulateLeague={simulateLeagueToGlobal}
                onSimulateAll={simulateAllPendingLeagues}
                onSimulateWeek={simulateSeasonWeek}
                onSimulateUntilNextMatch={simulateUntilNextMatch}
                onNewSeason={startNewGlobalSeason}
                onSimulateChampions={simulateAllCareerChampions}
                onOpenSeasonCalendar={() => setIsSeasonCalendarOpen(true)}
                milestoneToast={milestoneToast}
                onDismissMilestoneToast={() => setMilestoneToast(null)}
              />
            </motion.div>
          )}
          {view === 'rules' && <motion.div key='rules' className='flex-grow flex flex-col' initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}><RulesView setView={setView} /></motion.div>}
          {view === 'archive' && <motion.div key='archive' className='flex-grow flex flex-col' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ArchiveView selectedArchiveEntry={selectedArchiveEntry} setSelectedArchiveEntry={setSelectedArchiveEntry} setView={setView} archive={archive} comps={comps} /></motion.div>}
          {view === 'competition' && <motion.div key='comp' className='flex-grow flex flex-col' initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }}><CompetitionView /></motion.div>}
          {view === 'careerSelect' && (
            <motion.div key='careerSelect' className='flex-grow flex flex-col' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CareerSelectView
                candidates={careerCandidates}
                leagueName={comps[CAREER_LEAGUE_ID]?.name || 'Miscelánea'}
                onBack={() => setView('hub')}
                onStart={startCareer}
                onSetupVillarrealScenario={setupVillarrealScenario}
                pastCareers={pastCareers}
                onDeletePastCareer={handleDeletePastCareer}
                ui={careerUi}
              />
            </motion.div>
          )}
          {view === 'career' && careerTeam && (
            <motion.div key='career' className='flex-grow flex flex-col' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CareerView
                career={career}
                team={careerTeam}
                comp={careerComp}
                standings={careerStandings}
                position={careerPosition}
                seasonState={seasonState}
                nextFixture={careerFixture}
                rival={careerRival}
                isHome={careerIsHome}
                divisionFinished={careerDivisionFinished}
                pendingGlobal={careerWorldPending > 0}
                worldPending={careerWorldPending}
                tab={careerTab}
                onTabChange={setCareerTab}
                onBack={() => setView('hub')}
                onPlayMatch={startCareerMatch}
                onSimulateMatch={simulateSeasonWeek}
                onSimulateWorld={simulateAllPendingLeagues}
                onSimulateGlobalMatchday={simulateAllPendingLeagues}
                onSimulateAllRemainingLeagues={simulateAllRemainingLeagues}
                onSetTactic={setCareerTactic}
                onSpendPE={spendCareerPE}
                onApplyTrainingStats={applyTrainingStats}
                onApplyDrillResult={applyDrillResult}
                onOpenReview={openCareerReview}
                onRenameManager={renameCareerManager}
                reviewDone={
                  career.signedForSeason === (seasonState.season || 1) ||
                  career.lastProcessedSeason === (seasonState.season || 1)
                }
                contractSigned={career.signedForSeason === (seasonState.season || 1)}
                allLeaguesFinished={allLeaguesFinished}
                championsFinished={championsFinished}
                onNewSeason={() => startNewGlobalSeason('career')}
                clInfo={careerClInfo}
                clComp={comps['C1']}
                uelInfo={careerUelInfo}
                uelComp={comps['C3']}
                onOpenUel={() => { setActiveCompId('C3'); setCompView('main'); setView('competition'); }}
                onPlayUelMatch={startCareerUelMatch}
                onSimulateUelMatch={simulateCareerUelMatch}
                onSimulateAllUel={() => {
                  setComps(prev => {
                    let next = { ...prev };
                    let c3 = next['C3'];
                    if (!c3 || !c3.teams || c3.teams.length === 0) {
                      const autoData = getAutoFillData('C3', next);
                      if (autoData) c3 = { ...next['C3'], ...autoData, id: 'C3', name: 'UEFA Europa League', type: 'cup' };
                    }
                    if (c3 && c3.teams && c3.teams.length > 0 && !c3.showWinner && c3.phase !== 'Terminado') {
                      const finishedC3 = simulateEntireCupToFinish(c3, 'C3');
                      if (finishedC3.showWinner || finishedC3.phase === 'Terminado') {
                        const final = finishedC3.bracket?.Final?.[0] || finishedC3.bracket?.Final;
                        let uelWinner = null;
                        if (final && final.sh !== null && final.sh !== undefined) {
                          const winId = (final.sh > final.sa) ? final.hId : (final.sa > final.sh) ? final.aId : (((final.penH || 0) > (final.penA || 0)) ? final.hId : final.aId);
                          uelWinner = finishedC3.teams?.find((t: any) => t.id === winId);
                        }
                        archiveCompetition('C3', 1, uelWinner, finishedC3);
                      }
                      next['C3'] = finishedC3;
                    }
                    return next;
                  });
                  setSeasonState(s => ({
                    ...s,
                    currentWeek: Math.min(43, Math.max(39, (s.currentWeek || 1) + 1))
                  }));
                }}
                onPlayChampionsMatch={startCareerChampionsMatch}
                onSimulateChampionsMatch={simulateCareerChampionsMatch}
                onSimulateAllChampions={simulateAllCareerChampions}
                onDrawChampions={initOrDrawChampions}
                onPerformKnockoutDraw={performChampionsKnockoutDraw}
                schedule={careerSchedule}
                onOpenChampions={openCareerChampions}
                onAcceptOffer={acceptCareerOffer}
                onRejectOffer={(offerId) => setCareer(c => ({ ...c, offers: (c.offers || []).filter(o => o.id !== offerId) }))}
                onSubmitApplication={submitCareerApplication}
                onAdvanceOfficeWeek={advanceCareerOfficeWeek}
                onRejectAppResolution={(offer) => setCareer(c => ({
                  ...c,
                  pendingAppResolutionModal: null,
                  offers: (c.offers || []).filter(o => o.id !== offer?.id && o.teamId !== offer?.teamId)
                }))}
                onDecideLaterAppOffer={() => setCareer(c => ({ ...c, pendingAppResolutionModal: null }))}
                onDismissAppResolutionModal={() => setCareer(c => ({ ...c, pendingAppResolutionModal: null }))}
                onDismissSimulationFeedback={() => setCareer(c => ({ ...c, lastSimulationFeedback: null }))}
                onDeleteCareer={handleDeleteCareerHard}
                onArchiveAndResetCareer={handleArchiveAndResetCareer}
                onSetupVillarrealScenario={setupVillarrealScenario}
                pastCareers={pastCareers}
                onDeletePastCareer={handleDeletePastCareer}
                allComps={comps}
                ui={careerUi}
              />
            </motion.div>
          )}
          {view === 'careerMatch' && (
            <motion.div key='careerMatch' className='flex-grow flex flex-col' initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
              <CareerMatchView matchState={matchState} rolling={rolling} onRoll={handleRoll} onFinish={finishCareerMatchday} ui={careerUi} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {careerReview && (
            <CareerSeasonReviewModal review={careerReview} onAcceptOffer={acceptCareerOffer} onRenew={renewCareerContract} onStay={closeCareerReview} ui={careerUi} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {simulationInjuryAlert && view === 'career' && (
            <SimulationInjuryAlertModal
              isOpen={!!simulationInjuryAlert && view === 'career'}
              affectedAttr={simulationInjuryAlert.affectedAttr}
              attrLabel={simulationInjuryAlert.attrLabel}
              die={simulationInjuryAlert.die}
              physioCost={simulationInjuryAlert.physioCost}
              categoryLabel={simulationInjuryAlert.categoryLabel}
              career={career}
              team={careerTeam}
              onSelectOption={handleSimulationInjuryChoice}
              onCancel={() => setSimulationInjuryAlert(null)}
              ui={careerUi}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isSeasonCalendarOpen && (
            <SeasonCalendarModal
              isOpen={isSeasonCalendarOpen}
              onClose={() => setIsSeasonCalendarOpen(false)}
              currentWeek={seasonState?.currentWeek || 1}
              seasonNumber={seasonState?.season || 1}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DiceFootballApp;
