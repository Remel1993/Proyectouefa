import React, { useState, useMemo } from 'react';
import { Trophy, Dices, Zap, Shield as ShieldIcon, ChevronRight, Calendar, Award, CheckCircle, CheckCircle2, XCircle, Clock, Sparkles, Layers, ArrowLeft, RotateCcw, ShieldCheck, Dumbbell, Target, Globe, Flame, Lock, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { tacticalOptions, sameDist, getEuropaLeagueMatchKey, getEuropaLeagueObjectiveTarget, UEL_PHASE_ORDER } from '../lib/career';
import { sanitizeChampionsBracket, sanitizeEuropaLeagueTeams } from '../lib/championsSanitizer';

export const uelPhaseLabel = (phase?: string) => {
  if (!phase) return 'Dieciseisavos';
  if (phase === 'Dieciseisavos') return 'Dieciseisavos de Final (1/16)';
  if (phase === 'Octavos') return 'Octavos de Final (1/8)';
  if (phase === 'Cuartos') return 'Cuartos de Final (1/4)';
  if (phase === 'Semis') return 'Semifinales';
  if (phase === 'Final') return 'Gran Final';
  if (phase === 'Terminado') return 'Torneo Finalizado';
  return phase;
};

export const getUELObjectiveTarget = (tier: number) => {
  if (tier >= 4) return { target: 'Final', label: 'Conquistar la UEFA Europa League', desc: 'Obligación de levantar el trofeo europeo.' };
  if (tier === 3) return { target: 'Semis', label: 'Alcanzar Semifinales', desc: 'Gran papel en Europa para prestigiar al club.' };
  if (tier === 2) return { target: 'Cuartos', label: 'Llegar a Cuartos de Final', desc: 'Consolidación continental superando eliminatorias.' };
  return { target: 'Octavos', label: 'Superar Dieciseisavos', desc: 'Competir con dignidad en el escenario europeo.' };
};

export interface CareerUELHubProps {
  career: any;
  team: any;
  uelComp: any;
  uelInfo: any;
  clComp?: any;
  onPlayUelMatch: () => void;
  onSimulateUelMatch: () => void;
  onSimulateAllUel?: () => void;
  onOpenNewSeason?: () => void;
  onBackToCareer?: () => void;
  onOpenDrill?: () => void;
  onOpenTraining?: () => void;
  onSetTactic?: (tactic: any) => void;
  isEuropaDate?: boolean;
  currentWeek?: number;
  nextUelWeek?: number | null;
  ui: any;
}

export const CareerUELHub: React.FC<CareerUELHubProps> = ({
  career,
  team,
  uelComp,
  uelInfo,
  clComp,
  onPlayUelMatch,
  onSimulateUelMatch,
  onSimulateAllUel,
  onOpenNewSeason,
  onBackToCareer,
  onOpenDrill,
  onOpenTraining,
  onSetTactic,
  isEuropaDate = true,
  currentWeek = 1,
  nextUelWeek,
  ui
}) => {
  const { Shield } = ui;
  const [subTab, setSubTab] = useState<'match' | 'tactic' | 'bracket' | 'schedule' | 'teams' | 'objective'>('match');
  const [bracketRoundFilter, setBracketRoundFilter] = useState<'ALL' | string>('ALL');

  // Sanitizar equipos y evitar duplicados de Champions en UEL
  const safeUelComp = useMemo(() => {
    return sanitizeEuropaLeagueTeams(uelComp);
  }, [uelComp]);

  // Identificar el equipo del modo carrera dentro de la UEFA Europa League (C3)
  const careerUelTeam = useMemo(() => {
    if (!safeUelComp?.teams?.length || !team) return null;
    return safeUelComp.teams.find((t: any) => t.id === safeUelComp.careerTeamId) ||
      safeUelComp.teams.find((t: any) => t.name === (safeUelComp.careerTeamName || team.name)) ||
      safeUelComp.teams.find((t: any) => t.id === safeUelComp.userTeamId) || null;
  }, [safeUelComp, team]);

  const phase = safeUelComp?.phase || 'Dieciseisavos';
  const matchday = safeUelComp?.matchday || 0;

  // Verificación cronológica y de fase de grupos de Champions League
  const isClGroupsFinished = Boolean(!clComp || clComp.phase !== 'groups' || (clComp.matchday || 0) >= 6);

  // Semana oficial del calendario para la ronda actual de Europa League
  const expectedWeekForPhase = useMemo(() => {
    if (phase === 'Dieciseisavos') return (matchday % 2 === 0) ? 22 : 23;
    if (phase === 'Octavos') return (matchday % 2 === 0) ? 25 : 27;
    if (phase === 'Cuartos') return (matchday % 2 === 0) ? 30 : 32;
    if (phase === 'Semis') return (matchday % 2 === 0) ? 34 : 36;
    if (phase === 'Final') return 39;
    return 22;
  }, [phase, matchday]);

  const isUclWaitingForRepescados = phase !== 'Dieciseisavos' && !isClGroupsFinished;
  const isChronologicallyReady = currentWeek >= expectedWeekForPhase;
  const canPlayUELMatch = Boolean(isEuropaDate && isChronologicallyReady && !isUclWaitingForRepescados);

  const safeBracket = useMemo(() => {
    return sanitizeChampionsBracket(safeUelComp?.bracket, safeUelComp?.teams) || { Dieciseisavos: [], Octavos: [], Cuartos: [], Semis: [], Final: [] };
  }, [safeUelComp?.bracket, safeUelComp?.teams]);

  const isFinalPlayed = Boolean(safeBracket?.Final?.[0]?.sh !== null && safeBracket?.Final?.[0]?.sh !== undefined);
  const isFinished = Boolean(safeUelComp?.showWinner || phase === 'Terminado' || isFinalPlayed);

  // Base táctica y opciones
  const baseTactic = useMemo(() => ({
    att: career?.baseDist?.att || team?.att || 3,
    opp: career?.baseDist?.opp || team?.opp || 3,
    def: career?.baseDist?.def || team?.def || 3
  }), [career?.baseDist, team]);

  const effectiveTactic = useMemo(() => {
    const tactic = career?.tactic ? { ...career.tactic } : { ...baseTactic };
    if (career?.activeInjury) {
      const attr = career.activeInjury.attr as 'att' | 'opp' | 'def';
      if (attr) {
        tactic[attr] = Math.max(1, (tactic[attr] || 1) - 1);
      }
    }
    return tactic;
  }, [career?.tactic, baseTactic, career?.activeInjury]);

  const totalTeamStrength = baseTactic.att + baseTactic.opp + baseTactic.def;
  const currentTier = career?.tier || team?.tier || 1;
  const tacticOptionsList = useMemo(() => tacticalOptions(baseTactic, currentTier), [baseTactic, currentTier]);

  // Clave de partido de Europa League para independizar entrenamiento por jornada
  const uelMatchKey = useMemo(() => {
    const s = career?.uelSeason || uelComp?.season || career?.season || 1;
    const p = uelComp?.phase || 'Dieciseisavos';
    const md = uelComp?.matchday || 0;
    return getEuropaLeagueMatchKey(s, p, md);
  }, [career?.season, career?.uelSeason, uelComp?.phase, uelComp?.matchday, uelComp?.season]);

  const hasTrainedThisUelMatch = useMemo(() => {
    return career?.trainedMatchKey === uelMatchKey ||
      career?.trainedUelMatchKey === uelMatchKey ||
      (Boolean(currentWeek) && career?.trainedWeek === currentWeek);
  }, [career?.trainedMatchKey, career?.trainedUelMatchKey, career?.trainedWeek, uelMatchKey, currentWeek]);

  // Determinar si el club no clasificó a UEFA Europa League esta temporada
  const isNotQualified = useMemo(() => {
    if (careerUelTeam) return false;
    if (career?.uelQualified) return false;
    if (uelInfo && !uelInfo.notQualified) return false;
    return true;
  }, [careerUelTeam, career?.uelQualified, uelInfo]);

  // Buscar último partido jugado en UEL
  const lastPlayedUELMatch = useMemo(() => {
    if (isNotQualified || !careerUelTeam || careerUelTeam.id === undefined || careerUelTeam.id === null) return null;
    const userUelId = careerUelTeam.id;

    if (Array.isArray(uelComp?.history) && uelComp.history.length > 0) {
      for (let i = 0; i < uelComp.history.length; i++) {
        const h = uelComp.history[i];
        const m = (h.results || []).find((r: any) => r && (r.hId === userUelId || r.aId === userUelId));
        if (m) {
          const ht = safeUelComp.teams.find((t: any) => t.id === m.hId) || { name: 'Local' };
          const at = safeUelComp.teams.find((t: any) => t.id === m.aId) || { name: 'Visitante' };
          const isHome = m.hId === userUelId;
          const myScore = isHome ? m.sh : m.sa;
          const rivalScore = isHome ? m.sa : m.sh;
          const rivalTeam = (isHome ? at : ht) || { name: 'Rival Europeo' };
          const res = myScore > rivalScore ? 'W' : myScore === rivalScore ? 'D' : 'L';

          let aggregateInfo: any = null;
          const dayStr = String(h.day ?? '');
          const isKnockout = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis'].some(p => dayStr.includes(p));
          const phaseKey = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis'].find(p => dayStr.includes(p));

          if (isKnockout && phaseKey && safeBracket?.[phaseKey]) {
            const bMatches = Array.isArray(safeBracket[phaseKey]) ? safeBracket[phaseKey] : [safeBracket[phaseKey]];
            const bMatch = bMatches.find((bm: any) => bm && (bm.hId === userUelId || bm.aId === userUelId));
            if (bMatch && bMatch.sh !== null) {
              const hasVuelta = bMatch.sh2 !== null && bMatch.sh2 !== undefined;
              const isVuelta = dayStr.includes('Vuelta') || hasVuelta;
              const totHId = (bMatch.sh || 0) + (bMatch.sh2 || 0);
              const totAId = (bMatch.sa || 0) + (bMatch.sa2 || 0);
              const globalLeft = isVuelta ? totAId : totHId;
              const globalRight = isVuelta ? totHId : totAId;

              let qualified = null;
              if (hasVuelta) {
                let winnerId = null;
                if (totHId > totAId) winnerId = bMatch.hId;
                else if (totAId > totHId) winnerId = bMatch.aId;
                else if (bMatch.penH !== null && bMatch.penH !== undefined) {
                  winnerId = (bMatch.penH || 0) > (bMatch.penA || 0) ? bMatch.hId : bMatch.aId;
                }
                if (winnerId !== null) {
                  qualified = winnerId === userUelId;
                }
              }

              let penaltiesText = null;
              if (hasVuelta && bMatch.penH !== null && bMatch.penH !== undefined && bMatch.penA !== null && bMatch.penA !== undefined) {
                const penLeft = isVuelta ? bMatch.penA : bMatch.penH;
                const penRight = isVuelta ? bMatch.penH : bMatch.penA;
                penaltiesText = `(${penLeft}-${penRight} pen.)`;
              }

              aggregateInfo = {
                phaseName: phaseKey,
                isVuelta,
                leg1Score: `${bMatch.sh} - ${bMatch.sa}`,
                leg2Score: hasVuelta ? `${bMatch.sh2} - ${bMatch.sa2}` : null,
                globalScoreText: hasVuelta ? `${globalLeft} - ${globalRight}` : `${bMatch.sh} - ${bMatch.sa}`,
                penaltiesText,
                qualified
              };
            }
          }

          const uelLogEntry = (career?.seasonLog || []).find((l: any) => l.isUEL || l.isEuropaLeague);

          return {
            dayLabel: h.day,
            home: ht,
            away: at,
            isHome,
            scoreH: m.sh,
            scoreA: m.sa,
            penH: m.penH,
            penA: m.penA,
            myScore,
            rivalScore,
            rivalTeam,
            result: res,
            aggregateInfo,
            pe: uelLogEntry?.pe ?? (res === 'W' ? 3 : res === 'D' ? 2 : 0),
            rep: uelLogEntry?.rep ?? (res === 'W' ? 0.7 : res === 'D' ? 0.2 : -0.1)
          };
        }
      }
    }
    return null;
  }, [isNotQualified, careerUelTeam, uelComp, safeBracket, career?.seasonLog]);

  // Próximo partido de eliminatoria directa en UEL
  const nextMatchInfo = useMemo(() => {
    if (isFinished || isNotQualified || !careerUelTeam) return null;

    if (['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'].includes(phase)) {
      const bracketMatches = Array.isArray(safeBracket?.[phase])
        ? safeBracket[phase]
        : [safeBracket?.[phase]].filter(Boolean);

      const match = bracketMatches.find((m: any) => m && (m.hId === careerUelTeam.id || m.aId === careerUelTeam.id));
      if (!match) return null;

      const isVuelta = matchday % 2 !== 0 && phase !== 'Final';
      const homeId = isVuelta ? match.aId : match.hId;
      const awayId = isVuelta ? match.hId : match.aId;
      const homeTeam = safeUelComp.teams.find((t: any) => t.id === homeId) || { name: 'Por Definir', att: 3, opp: 3, def: 3 };
      const awayTeam = safeUelComp.teams.find((t: any) => t.id === awayId) || { name: 'Por Definir', att: 3, opp: 3, def: 3 };
      const isHome = homeId === careerUelTeam.id;
      const rival = isHome ? awayTeam : homeTeam;

      let aggregate = null;
      if (isVuelta && match.sh !== null && match.sa !== null) {
        aggregate = {
          idaHomeName: safeUelComp.teams.find((t: any) => t.id === match.hId)?.name,
          idaAwayName: safeUelComp.teams.find((t: any) => t.id === match.aId)?.name,
          sh: match.sh,
          sa: match.sa,
          myIdaScore: isHome ? match.sa : match.sh,
          rivalIdaScore: isHome ? match.sh : match.sa
        };
      }

      return {
        type: 'knockout',
        phase,
        isVuelta,
        homeTeam,
        awayTeam,
        isHome,
        rival,
        matchId: match.id,
        aggregate,
        title: phase === 'Final'
          ? 'Gran Final UEFA Europa League'
          : `${uelPhaseLabel(phase)} · ${isVuelta ? 'Partido de Vuelta' : 'Partido de Ida'}`
      };
    }

    return null;
  }, [isFinished, isNotQualified, careerUelTeam, phase, safeBracket, matchday, safeUelComp]);

  // Comprobar si el usuario fue eliminado o se consagró campeón
  const winnerTeam = useMemo(() => {
    if (!isFinished) return null;
    const final = safeBracket?.Final?.[0] || safeBracket?.Final;
    if (!final || final.sh === null || final.sh === undefined) return null;
    const winId = final.sh > final.sa ? final.hId : final.sa > final.sh ? final.aId : ((final.penH || 0) > (final.penA || 0) ? final.hId : final.aId);
    return safeUelComp?.teams?.find((t: any) => t.id === winId) || null;
  }, [isFinished, safeBracket, safeUelComp]);

  const isUserChampion = winnerTeam && careerUelTeam && winnerTeam.id === careerUelTeam.id;
  const isUserEliminated = !isNotQualified && careerUelTeam && !nextMatchInfo && !isUserChampion && (phase !== 'Dieciseisavos' || matchday > 0);

  // Objetivo continental en UEFA Europa League (calculado con sistema canónico)
  const uelObjective = useMemo(() => {
    const isDropped = Boolean(career?.droppedToUel);
    const target = getEuropaLeagueObjectiveTarget(currentTier, isDropped);
    const targetRank = UEL_PHASE_ORDER.indexOf(target.targetPhase);
    const currentRank = UEL_PHASE_ORDER.indexOf(phase || 'Dieciseisavos');

    let done = false;
    let progress = 25;
    let status: 'completed' | 'on_track' | 'at_risk' | 'failed' = 'on_track';
    let statusLabel = 'En Carrera (UEL)';

    if (isNotQualified) {
      done = false;
      progress = 0;
      status = 'failed';
      statusLabel = 'No Clasificado';
    } else if (isUserChampion) {
      done = true;
      progress = 100;
      status = 'completed';
      statusLabel = '¡Campeón de Europa League!';
    } else if (isUserEliminated) {
      if (currentRank >= targetRank) {
        done = true;
        progress = 100;
        status = 'completed';
        statusLabel = 'Objetivo Cumplido';
      } else {
        done = false;
        progress = Math.max(15, Math.round((Math.max(1, currentRank) / (targetRank || 1)) * 80));
        status = 'failed';
        statusLabel = 'Eliminado en UEL';
      }
    } else if (isFinished && !isUserChampion) {
      if (currentRank >= targetRank) {
        done = true;
        progress = 100;
        status = 'completed';
        statusLabel = 'Objetivo Cumplido';
      } else {
        done = false;
        status = 'failed';
        statusLabel = 'No Alcanzado';
      }
    } else {
      if (currentRank >= targetRank) {
        done = true;
        progress = 100;
        status = 'completed';
        statusLabel = 'Objetivo Alcanzado';
      } else {
        done = false;
        progress = Math.max(25, Math.min(90, Math.round(((currentRank + 1) / (targetRank + 1)) * 90)));
        status = 'on_track';
        statusLabel = `En ${uelPhaseLabel(phase)}`;
      }
    }

    return { target, done, progress, status, statusLabel };
  }, [currentTier, career?.droppedToUel, phase, isNotQualified, isUserChampion, isUserEliminated, isFinished]);

  return (
    <div className='flex-grow px-3 pb-24 flex flex-col space-y-4'>
      {/* Top Banner UEFA Europa League */}
      <div className='bg-gradient-to-r from-amber-950/80 via-orange-950/70 to-slate-950/80 backdrop-blur-md rounded-3xl p-4 border border-amber-500/30 shadow-2xl relative overflow-hidden'>
        <div className='absolute -right-8 -bottom-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none' />
        
        <div className='flex items-center justify-between gap-3 relative z-10'>
          <div className='flex items-center gap-3 min-w-0'>
            {onBackToCareer && (
              <button
                onClick={onBackToCareer}
                className='p-2 bg-slate-900/60 hover:bg-slate-800 rounded-2xl border border-white/10 text-amber-300 active:scale-95 transition-all'
                title='Volver a la vista general de Carrera'
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className='w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg border border-amber-300/40 shrink-0'>
              <Flame size={22} className='text-slate-950 drop-shadow' />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5'>
                <span className='text-[8px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30'>
                  UEFA Europa League
                </span>
                <span className='text-[8px] font-black uppercase text-slate-300'>
                  {isFinished ? '🏆 Finalizado' : uelPhaseLabel(phase)}
                </span>
              </div>
              <h2 className='text-sm font-black italic uppercase text-white truncate drop-shadow-md mt-0.5'>
                {team?.name || careerUelTeam?.name || 'Modo Carrera'}
              </h2>
            </div>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            {/* Botón directo para Ver Llaves */}
            <button
              onClick={() => setSubTab('bracket')}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer ${
                subTab === 'bracket'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 font-black'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
              }`}
              title='Ver cómo van las llaves del torneo'
            >
              <Layers size={13} />
              <span>Ver Llaves</span>
            </button>

            <div className='hidden sm:block text-[9px] font-bold text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10'>
              Fuerza: <span className='text-amber-400 font-black'>{effectiveTactic.att}/{effectiveTactic.opp}/{effectiveTactic.def}</span>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className='grid grid-cols-6 gap-1 mt-4 bg-slate-900/70 p-1 rounded-2xl border border-white/5'>
          {[
            { id: 'match', label: 'Partido', icon: Dices },
            { id: 'bracket', label: 'Llaves', icon: Layers },
            { id: 'schedule', label: 'Partidos', icon: Calendar },
            { id: 'teams', label: 'Clubes', icon: Globe },
            { id: 'objective', label: 'Objetivo', icon: Target },
            { id: 'tactic', label: 'Táctica', icon: ShieldCheck }
          ].map(tabItem => {
            const Icon = tabItem.icon;
            const active = subTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setSubTab(tabItem.id as any)}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white font-bold'
                }`}
              >
                <Icon size={13} className={active ? 'text-slate-950' : 'text-slate-400'} />
                <span className='text-[7.5px] uppercase tracking-tight truncate mt-0.5'>{tabItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode='wait'>
        {/* SUBTAB: MATCH (Next Match / Play & Simulation / Last Played Match) */}
        {subTab === 'match' && (
          <motion.div
            key='match'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='space-y-4'
          >
            {/* Si no está clasificado */}
            {isNotQualified && (
              <div className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-center space-y-3 shadow-xl'>
                <div className='w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20'>
                  <Globe size={24} />
                </div>
                <h3 className='text-sm font-black uppercase italic text-white'>No clasificado a la Europa League</h3>
                <p className='text-[10px] text-slate-300 leading-relaxed max-w-xs mx-auto'>
                  Tu club no alcanzó las posiciones europeas en la temporada regular. Puedes consultar el cuadro de eliminatorias, el cual progresa sincronizado semana a semana junto con las ligas y la Champions League.
                </p>
                {onBackToCareer && (
                  <button
                    onClick={onBackToCareer}
                    className='w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all border border-white/10'
                  >
                    Volver a la Liga Nacional
                  </button>
                )}
              </div>
            )}

            {/* Si el torneo ya concluyó y el usuario fue Campeón */}
            {isUserChampion && (
              <div className='bg-gradient-to-br from-amber-600/30 via-orange-950/40 to-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-amber-400/40 text-center space-y-3 shadow-2xl'>
                <Trophy size={48} className='text-amber-400 mx-auto drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-bounce' />
                <h3 className='text-lg font-black uppercase italic text-white'>¡Campeón de la UEFA Europa League!</h3>
                <p className='text-[10px] text-amber-200'>
                  Has conquistado el título europeo. Prestigio continental máximo y gran recompensa de PE para el desarrollo del equipo.
                </p>
                {onOpenNewSeason && (
                  <button
                    onClick={onOpenNewSeason}
                    className='w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black uppercase italic text-[11px] tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all'
                  >
                    🎉 Iniciar Nueva Temporada
                  </button>
                )}
              </div>
            )}

            {/* Si el usuario fue eliminado */}
            {isUserEliminated && (
              <div className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-red-500/20 text-center space-y-2 shadow-xl'>
                <XCircle size={32} className='text-red-400 mx-auto' />
                <h3 className='text-xs font-black uppercase italic text-white'>Eliminado de la Europa League</h3>
                <p className='text-[9px] text-slate-300'>
                  Tu club ha caído eliminado de la competición. Puedes seguir la fase eliminatoria que avanza sincronizada semana a semana según el calendario oficial europeo.
                </p>
                {onBackToCareer && (
                  <button
                    onClick={onBackToCareer}
                    className='w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all border border-white/10'
                  >
                    Volver a la Liga Nacional
                  </button>
                )}
              </div>
            )}

            {/* Tarjeta de Próximo Partido si está vivo en la eliminatoria */}
            {nextMatchInfo && (
              <div className='bg-slate-900/70 backdrop-blur-md rounded-3xl p-4 border border-amber-500/20 shadow-2xl space-y-4'>
                <div className='flex items-center justify-between border-b border-white/5 pb-2'>
                  <div className='flex items-center gap-1.5'>
                    <Sparkles size={13} className='text-amber-400' />
                    <span className='text-[8px] font-black uppercase tracking-wider text-amber-300'>
                      {nextMatchInfo.title}
                    </span>
                  </div>
                  {nextMatchInfo.aggregate && (
                    <span className='text-[8px] font-black uppercase bg-black/50 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30'>
                      Ida: {nextMatchInfo.aggregate.sh} - {nextMatchInfo.aggregate.sa}
                    </span>
                  )}
                </div>

                {/* Enfrentamiento de Escudos */}
                <div className='flex items-center justify-between gap-2 px-2'>
                  <div className='flex-1 flex flex-col items-center text-center'>
                    <Shield
                      color1={nextMatchInfo.homeTeam?.color1}
                      color2={nextMatchInfo.homeTeam?.color2}
                      initial={nextMatchInfo.homeTeam?.name}
                      size='md'
                      isFlag={nextMatchInfo.homeTeam?.isFlag}
                    />
                    <p className='text-[10px] font-black uppercase italic text-white mt-1.5 truncate max-w-[100px]'>
                      {nextMatchInfo.homeTeam?.name}
                    </p>
                    <span className='text-[8px] font-bold text-amber-400 bg-black/40 px-1.5 py-0.2 rounded mt-0.5'>
                      {nextMatchInfo.homeTeam?.att}/{nextMatchInfo.homeTeam?.opp}/{nextMatchInfo.homeTeam?.def}
                    </span>
                  </div>

                  <div className='flex flex-col items-center shrink-0 px-2'>
                    <span className='text-xs font-black italic uppercase text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20'>
                      VS
                    </span>
                    <span className='text-[7px] font-bold text-slate-400 mt-1 uppercase'>
                      {nextMatchInfo.isHome ? 'En tu estadio' : 'A domicilio'}
                    </span>
                  </div>

                  <div className='flex-1 flex flex-col items-center text-center'>
                    <Shield
                      color1={nextMatchInfo.awayTeam?.color1}
                      color2={nextMatchInfo.awayTeam?.color2}
                      initial={nextMatchInfo.awayTeam?.name}
                      size='md'
                      isFlag={nextMatchInfo.awayTeam?.isFlag}
                    />
                    <p className='text-[10px] font-black uppercase italic text-white mt-1.5 truncate max-w-[100px]'>
                      {nextMatchInfo.awayTeam?.name}
                    </p>
                    <span className='text-[8px] font-bold text-amber-400 bg-black/40 px-1.5 py-0.2 rounded mt-0.5'>
                      {nextMatchInfo.awayTeam?.att}/{nextMatchInfo.awayTeam?.opp}/{nextMatchInfo.awayTeam?.def}
                    </span>
                  </div>
                </div>

                {/* Panel Informativo cuando no es fecha habilitada de Europa League */}
                {!canPlayUELMatch ? (
                  <div className='space-y-3 pt-1'>
                    {isUclWaitingForRepescados ? (
                      <div className='p-3.5 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2 text-left'>
                        <div className='flex items-center gap-2'>
                          <span className='text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30'>
                            Esperando Cierre de Grupos UCL (Semana 18)
                          </span>
                        </div>
                        <p className='text-[10px] font-medium text-slate-300 leading-relaxed'>
                          Los 8 repescados desde la Champions League (3.ºs de grupo) se confirmarán tras la Jornada 6 (Semana 18). Los Octavos de Final de Europa League se disputarán a la par con la Champions League en la <strong>Semana 25</strong> (Ida) y <strong>Semana 27</strong> (Vuelta).
                        </p>
                      </div>
                    ) : !isChronologicallyReady ? (
                      <div className='p-3.5 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2 text-left'>
                        <div className='flex items-center gap-2'>
                          <span className='text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30'>
                            Modo Informativo · Semana Oficial {expectedWeekForPhase}
                          </span>
                          {phase === 'Octavos' && (
                            <span className='text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30'>
                              A la par con UCL
                            </span>
                          )}
                        </div>
                        <p className='text-[10px] font-medium text-slate-300 leading-relaxed'>
                          Tu eliminatoria de {uelPhaseLabel(phase)} se disputará en la <strong>Semana {expectedWeekForPhase}</strong> del calendario oficial{phase === 'Octavos' ? ' (a la par con los Octavos de UEFA Champions League)' : ''} (Semana actual: <strong>{currentWeek}</strong>).
                        </p>
                      </div>
                    ) : (
                      <div className='p-3.5 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2 text-left'>
                        <div className='flex items-center gap-2'>
                          <span className='text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10'>
                            Compromiso Semanal Completado
                          </span>
                        </div>
                        <p className='text-[10px] font-medium text-slate-300 leading-relaxed'>
                          Ya has disputado el partido de Europa League de esta semana. Avanza en el calendario liguero para disputar la siguiente fecha continental.
                        </p>
                      </div>
                    )}

                    <div className='grid grid-cols-2 gap-2'>
                      <button
                        onClick={() => setSubTab('bracket')}
                        className='py-3 font-black uppercase italic text-[10px] tracking-wider rounded-2xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-400/30 active:scale-95 transition-all flex items-center justify-center gap-1.5'
                      >
                        <Swords size={13} className='text-amber-300' />
                        <span>Ver Cuadro</span>
                      </button>
                      <button
                        onClick={() => setSubTab('schedule')}
                        className='py-3 font-black uppercase italic text-[10px] tracking-wider rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-1.5'
                      >
                        <Calendar size={13} className='text-slate-300' />
                        <span>Ver Calendario</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Botones de Acción */}
                    <div className='grid grid-cols-2 gap-2 pt-1'>
                      <button
                        onClick={onPlayUelMatch}
                        className='py-3.5 font-black uppercase italic text-[11px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-xl active:scale-95 border-amber-300/40 cursor-pointer'
                      >
                        <Swords size={16} />
                        <span>Jugar Partido</span>
                      </button>

                      <button
                        onClick={onSimulateUelMatch}
                        className='py-3.5 font-black uppercase italic text-[11px] tracking-widest rounded-2xl border transition-all flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/30 shadow-lg active:scale-95 cursor-pointer'
                      >
                        <Zap size={16} />
                        <span>Simular</span>
                      </button>
                    </div>

                    {/* Acciones de Preparación Pre-Partido */}
                    <div className='grid grid-cols-2 gap-2 pt-1 border-t border-white/5'>
                      {onOpenDrill && (
                        <button
                          onClick={onOpenDrill}
                          disabled={hasTrainedThisUelMatch}
                          className={`py-2 rounded-xl text-[8px] font-black uppercase italic tracking-wider border flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                            hasTrainedThisUelMatch
                              ? 'bg-slate-900/40 border-white/5 text-slate-500 cursor-not-allowed opacity-60'
                              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10'
                          }`}
                        >
                          <Dumbbell size={11} className={hasTrainedThisUelMatch ? 'text-slate-500' : 'text-amber-400'} />
                          <span>{hasTrainedThisUelMatch ? 'Sesión Hecha (1D6)' : 'Entreno 1D6'}</span>
                        </button>
                      )}

                      {onOpenTraining && (
                        <button
                          onClick={onOpenTraining}
                          className='py-2 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[8px] font-black uppercase italic tracking-wider border border-white/10 flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                        >
                          <Zap size={11} className='text-orange-400' /> PE ({career?.pe || 0})
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tarjeta de Resumen del Último Partido Jugado */}
            {lastPlayedUELMatch && (
              <div className='bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-amber-950/40 rounded-3xl p-4 border border-amber-500/30 shadow-lg space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20'>
                      Último Partido Disputado
                    </span>
                    <span className='text-[8px] font-bold text-slate-400'>
                      {lastPlayedUELMatch.dayLabel}
                    </span>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    lastPlayedUELMatch.result === 'W'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : lastPlayedUELMatch.result === 'D'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {lastPlayedUELMatch.result === 'W' ? 'Victoria 🏆' : lastPlayedUELMatch.result === 'D' ? 'Empate 🤝' : 'Derrota ❌'}
                  </span>
                </div>

                <div className='bg-black/40 rounded-2xl p-3 border border-white/5 flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2 min-w-0 flex-1'>
                    <Shield
                      color1={lastPlayedUELMatch.home?.color1}
                      color2={lastPlayedUELMatch.home?.color2}
                      initial={lastPlayedUELMatch.home?.name}
                      size='sm'
                      isFlag={lastPlayedUELMatch.home?.isFlag}
                    />
                    <span className='text-[10px] font-black uppercase truncate text-white'>
                      {lastPlayedUELMatch.home?.name}
                    </span>
                  </div>

                  <div className='text-center shrink-0 px-3 py-1 bg-black/60 rounded-xl border border-white/10'>
                    <span className='text-sm font-black italic text-amber-300 tabular-nums tracking-wider'>
                      {lastPlayedUELMatch.scoreH} - {lastPlayedUELMatch.scoreA}
                    </span>
                    {lastPlayedUELMatch.penH !== null && lastPlayedUELMatch.penH !== undefined && (
                      <span className='block text-[7.5px] font-bold text-amber-400'>
                        ({lastPlayedUELMatch.penH}-{lastPlayedUELMatch.penA} pen.)
                      </span>
                    )}
                  </div>

                  <div className='flex items-center justify-end gap-2 min-w-0 flex-1 text-right'>
                    <span className='text-[10px] font-black uppercase truncate text-white'>
                      {lastPlayedUELMatch.away?.name}
                    </span>
                    <Shield
                      color1={lastPlayedUELMatch.away?.color1}
                      color2={lastPlayedUELMatch.away?.color2}
                      initial={lastPlayedUELMatch.away?.name}
                      size='sm'
                      isFlag={lastPlayedUELMatch.away?.isFlag}
                    />
                  </div>
                </div>

                {/* Resumen Global de Eliminatoria */}
                {lastPlayedUELMatch.aggregateInfo && (
                  <div className='bg-amber-950/60 rounded-2xl p-2.5 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-[8px] font-bold text-slate-200'>
                    <div className='flex items-center gap-2'>
                      {lastPlayedUELMatch.aggregateInfo.globalScoreText ? (
                        <span className='bg-amber-600 px-3 py-1 rounded-xl font-black text-slate-950 text-[9.5px] shadow-sm tracking-wide'>
                          RESULTADO GLOBAL: {lastPlayedUELMatch.aggregateInfo.globalScoreText} {lastPlayedUELMatch.aggregateInfo.penaltiesText || ''}
                        </span>
                      ) : (
                        <span className='bg-amber-600/80 px-2.5 py-1 rounded-xl font-black text-slate-950 text-[9px]'>
                          GLOBAL: {lastPlayedUELMatch.aggregateInfo.myTotal} - {lastPlayedUELMatch.aggregateInfo.rivalTotal}
                        </span>
                      )}
                    </div>
                    {lastPlayedUELMatch.aggregateInfo.qualified !== null && (
                      <span className={`px-2.5 py-1 rounded-full font-black uppercase tracking-wider text-[8px] ${
                        lastPlayedUELMatch.aggregateInfo.qualified
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {lastPlayedUELMatch.aggregateInfo.qualified ? '✅ ¡Clasificado a siguiente ronda!' : '❌ Eliminado en esta ronda'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* SUBTAB: BRACKET (Visual Tree for Dieciseisavos -> Octavos -> Cuartos -> Semis -> Final) */}
        {subTab === 'bracket' && (
          <motion.div
            key='bracket'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='space-y-4 pb-28'
          >
            {/* SELECTOR DE RONDA EN CHIPS HORIZONTALES */}
            <div className='flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1'>
              {['ALL', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'].map(rk => (
                <button
                  key={rk}
                  type='button'
                  onClick={() => setBracketRoundFilter(rk)}
                  className={`px-3 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    bracketRoundFilter === rk
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-105'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {rk === 'ALL' ? 'Todas las Rondas' : uelPhaseLabel(rk)}
                </button>
              ))}
            </div>

            {['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final']
              .filter(rk => bracketRoundFilter === 'ALL' || bracketRoundFilter === rk)
              .map(roundKey => {
              const matches = Array.isArray(safeBracket?.[roundKey]) ? safeBracket[roundKey] : [safeBracket?.[roundKey]].filter(Boolean);
              if (!matches || matches.length === 0) return null;

              const isTwoLegged = roundKey !== 'Final';

              return (
                <div key={roundKey} className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-3.5 border border-white/10 space-y-3 shadow-md'>
                  <div className='flex items-center justify-between bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 px-3.5 py-2 rounded-2xl border border-amber-500/30 shadow-md'>
                    <div>
                      <h4 className='text-[11px] font-black uppercase italic text-amber-300'>{uelPhaseLabel(roundKey)}</h4>
                      <span className='text-[8px] font-bold text-slate-400'>{roundKey === 'Final' ? 'Partido Único (Sede Neutral)' : 'Eliminatoria Ida y Vuelta'}</span>
                    </div>
                    {isTwoLegged ? (
                      <div className='flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-slate-400'>
                        <span className='w-4.5 text-center text-slate-300'>Ida</span>
                        <span className='w-4.5 text-center text-slate-300'>Vta</span>
                        <span className='w-5.5 text-center text-amber-300'>Glob</span>
                      </div>
                    ) : (
                      <span className='text-[7px] font-black uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30'>Final</span>
                    )}
                  </div>

                  <div className='grid gap-2'>
                    {matches.map((m: any, idx: number) => {
                      if (!m) return null;
                      const h = safeUelComp?.teams?.find((t: any) => t.id === m.hId) || (m.hId ? { name: `Equipo ${m.hId}` } : null);
                      const a = safeUelComp?.teams?.find((t: any) => t.id === m.aId) || (m.aId ? { name: `Equipo ${m.aId}` } : null);
                      const isUserMatch = Boolean(careerUelTeam?.id && (m.hId === careerUelTeam.id || m.aId === careerUelTeam.id));

                      const hasIda = m.sh !== null && m.sh !== undefined && m.sa !== null && m.sa !== undefined;
                      const hasVuelta = isTwoLegged && m.sh2 !== null && m.sh2 !== undefined && m.sa2 !== null && m.sa2 !== undefined;
                      const totH = (m.sh || 0) + (m.sh2 || 0);
                      const totA = (m.sa || 0) + (m.sa2 || 0);

                      let winnerId: string | number | null = null;
                      let isFinishedMatch = false;

                      if (!isTwoLegged && hasIda) {
                        isFinishedMatch = true;
                        if (m.sh > m.sa) winnerId = m.hId;
                        else if (m.sa > m.sh) winnerId = m.aId;
                        else if (m.penH !== null && m.penH !== undefined) winnerId = m.penH > m.penA ? m.hId : m.aId;
                      } else if (hasVuelta) {
                        isFinishedMatch = true;
                        if (totH > totA) winnerId = m.hId;
                        else if (totA > totH) winnerId = m.aId;
                        else if (m.penH !== null && m.penH !== undefined) winnerId = m.penH > m.penA ? m.hId : m.aId;
                      }

                      const isWinnerH = isFinishedMatch && winnerId === m.hId;
                      const isLoserH = isFinishedMatch && winnerId !== null && winnerId !== m.hId;
                      const isWinnerA = isFinishedMatch && winnerId === m.aId;
                      const isLoserA = isFinishedMatch && winnerId !== null && winnerId !== m.aId;

                      const isUserEliminatedInMatch = isUserMatch && isFinishedMatch && ((m.hId === careerUelTeam?.id && isLoserH) || (m.aId === careerUelTeam?.id && isLoserA));

                      return (
                        <div
                          key={m.id || idx}
                          className={`rounded-2xl p-2.5 sm:p-3 border transition-all space-y-1.5 ${
                            isUserMatch
                              ? isUserEliminatedInMatch
                                ? 'bg-gradient-to-br from-red-950/40 via-slate-900/90 to-slate-950/90 border-red-500/30 ring-1 ring-red-500/20'
                                : 'bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-orange-950/70 border-amber-400/60 shadow-lg ring-1 ring-amber-500/30'
                              : 'bg-black/40 border-white/10'
                          }`}
                        >
                          {/* Cabecera del Cruce */}
                          <div className='flex items-center justify-between text-[7px] font-black uppercase tracking-wider pb-1 border-b border-white/5'>
                            <div className='flex items-center gap-1.5 min-w-0'>
                              <span className='text-slate-400 shrink-0'>Llave {idx + 1}</span>
                              {isUserMatch && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[6px] font-black border shrink-0 ${
                                  isUserEliminatedInMatch
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                                }`}>
                                  {isUserEliminatedInMatch ? 'Tu Club (Eliminado)' : 'Tu Club'}
                                </span>
                              )}
                            </div>

                            {isTwoLegged ? (
                              <span className={`px-1.5 py-0.5 rounded-full text-[6.5px] font-bold shrink-0 ${
                                hasVuelta
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : hasIda
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-white/10'
                              }`}>
                                {hasVuelta ? `Global: ${totH}-${totA}` : hasIda ? 'Ida jugada' : 'Por disputar'}
                              </span>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded-full text-[6.5px] font-bold shrink-0 ${
                                hasIda ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {hasIda ? `Final: ${m.sh}-${m.sa}` : 'Por disputar'}
                              </span>
                            )}
                          </div>

                          {/* Fila Equipo Local */}
                          <div className={`flex justify-between items-center py-0.5 transition-opacity ${isLoserH ? 'opacity-50' : 'opacity-100'}`}>
                            <div className='flex items-center gap-1.5 flex-1 min-w-0 pr-1 overflow-hidden'>
                              <Shield color1={h?.color1} color2={h?.color2} initial={h?.name} size='xs' isFlag={h?.isFlag} />
                              <span className={`text-[8.5px] font-black uppercase italic truncate block max-w-full ${
                                isWinnerH
                                  ? 'text-amber-300'
                                  : h?.id === careerUelTeam?.id
                                  ? 'text-amber-200'
                                  : h?.name
                                  ? 'text-white'
                                  : 'text-slate-500'
                              }`}>
                                {h?.name || 'Por Definir'}
                              </span>
                              {isWinnerH && <span className='text-[7px] font-black text-amber-400 shrink-0'>🏆</span>}
                              {isLoserH && (
                                <span className='text-[5.5px] font-bold uppercase px-1 py-0.2 rounded bg-red-950/60 text-red-300 border border-red-500/20 shrink-0 whitespace-nowrap'>
                                  Eliminado
                                </span>
                              )}
                            </div>

                            {isTwoLegged ? (
                              <div className='flex items-center gap-1 tabular-nums text-[8px] shrink-0 font-bold'>
                                {/* Ida */}
                                <span className={`w-4.5 text-center py-0.5 rounded text-[8px] ${
                                  hasIda ? 'bg-black/50 text-slate-200 border border-white/5 font-extrabold' : 'text-slate-600'
                                }`} title='Goles Ida'>
                                  {hasIda ? m.sh : '—'}
                                </span>

                                {/* Vuelta */}
                                <span className={`w-4.5 text-center py-0.5 rounded text-[8px] ${
                                  hasVuelta ? 'bg-black/50 text-slate-200 border border-white/5 font-extrabold' : 'text-slate-600'
                                }`} title='Goles Vuelta'>
                                  {hasVuelta ? m.sh2 : '—'}
                                </span>

                                {/* Global */}
                                <span className={`w-5.5 text-center py-0.5 rounded text-[8px] font-black ${
                                  hasVuelta
                                    ? (isWinnerH ? 'bg-gradient-to-r from-amber-500 to-orange-400 text-slate-950 font-black' : 'bg-amber-950/60 text-amber-200 border border-amber-500/30')
                                    : 'text-slate-600'
                                }`} title='Global'>
                                  {hasVuelta ? totH : '—'}
                                </span>

                                {/* Penaltis */}
                                {hasVuelta && m.penH !== null && m.penH !== undefined && (
                                  <span className='text-[6.5px] font-black text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30 shrink-0'>
                                    {m.penH}p
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className='flex items-center gap-1 tabular-nums text-[8px] shrink-0 font-black'>
                                <span className={`px-2 py-0.5 rounded ${
                                  hasIda ? (isWinnerH ? 'bg-amber-500 text-slate-950 font-black' : 'bg-black/60 text-white border border-white/10') : 'text-slate-600'
                                }`}>
                                  {hasIda ? m.sh : '—'}
                                </span>
                                {m.penH !== null && m.penH !== undefined && (
                                  <span className='text-[6.5px] font-bold text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30'>
                                    {m.penH}p
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Fila Equipo Visitante */}
                          <div className={`flex justify-between items-center py-0.5 border-t border-white/5 transition-opacity ${isLoserA ? 'opacity-50' : 'opacity-100'}`}>
                            <div className='flex items-center gap-1.5 flex-1 min-w-0 pr-1 overflow-hidden'>
                              <Shield color1={a?.color1} color2={a?.color2} initial={a?.name} size='xs' isFlag={a?.isFlag} />
                              <span className={`text-[8.5px] font-black uppercase italic truncate block max-w-full ${
                                isWinnerA
                                  ? 'text-amber-300'
                                  : a?.id === careerUelTeam?.id
                                  ? 'text-amber-200'
                                  : a?.name
                                  ? 'text-white'
                                  : 'text-slate-500'
                              }`}>
                                {a?.name || 'Por Definir'}
                              </span>
                              {isWinnerA && <span className='text-[7px] font-black text-amber-400 shrink-0'>🏆</span>}
                              {isLoserA && (
                                <span className='text-[5.5px] font-bold uppercase px-1 py-0.2 rounded bg-red-950/60 text-red-300 border border-red-500/20 shrink-0 whitespace-nowrap'>
                                  Eliminado
                                </span>
                              )}
                            </div>

                            {isTwoLegged ? (
                              <div className='flex items-center gap-1 tabular-nums text-[8px] shrink-0 font-bold'>
                                {/* Ida */}
                                <span className={`w-4.5 text-center py-0.5 rounded text-[8px] ${
                                  hasIda ? 'bg-black/50 text-slate-200 border border-white/5 font-extrabold' : 'text-slate-600'
                                }`} title='Goles Ida'>
                                  {hasIda ? m.sa : '—'}
                                </span>

                                {/* Vuelta */}
                                <span className={`w-4.5 text-center py-0.5 rounded text-[8px] ${
                                  hasVuelta ? 'bg-black/50 text-slate-200 border border-white/5 font-extrabold' : 'text-slate-600'
                                }`} title='Goles Vuelta'>
                                  {hasVuelta ? m.sa2 : '—'}
                                </span>

                                {/* Global */}
                                <span className={`w-5.5 text-center py-0.5 rounded text-[8px] font-black ${
                                  hasVuelta
                                    ? (isWinnerA ? 'bg-gradient-to-r from-amber-500 to-orange-400 text-slate-950 font-black' : 'bg-amber-950/60 text-amber-200 border border-amber-500/30')
                                    : 'text-slate-600'
                                }`} title='Global'>
                                  {hasVuelta ? totA : '—'}
                                </span>

                                {/* Penaltis */}
                                {hasVuelta && m.penA !== null && m.penA !== undefined && (
                                  <span className='text-[6.5px] font-black text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30 shrink-0'>
                                    {m.penA}p
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className='flex items-center gap-1 tabular-nums text-[8px] shrink-0 font-black'>
                                <span className={`px-2 py-0.5 rounded ${
                                  hasIda ? (isWinnerA ? 'bg-amber-500 text-slate-950 font-black' : 'bg-black/60 text-white border border-white/10') : 'text-slate-600'
                                }`}>
                                  {hasIda ? m.sa : '—'}
                                </span>
                                {m.penA !== null && m.penA !== undefined && (
                                  <span className='text-[6.5px] font-bold text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30'>
                                    {m.penA}p
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* SUBTAB: SCHEDULE (All tournament match results chronologically) */}
        {subTab === 'schedule' && (
          <motion.div
            key='schedule'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='space-y-3'
          >
            {Array.isArray(uelComp?.history) && uelComp.history.length > 0 ? (
              uelComp.history.map((hist: any, hIdx: number) => (
                <div key={hIdx} className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-3.5 border border-white/10 space-y-2 shadow-md'>
                  <span className='text-[9px] font-black uppercase tracking-wider text-amber-400 block border-b border-white/5 pb-1'>
                    {hist.day}
                  </span>
                  <div className='space-y-1.5'>
                    {(hist.results || []).map((r: any, rIdx: number) => {
                      const h = safeUelComp.teams.find((t: any) => t.id === r.hId) || { name: 'Local' };
                      const a = safeUelComp.teams.find((t: any) => t.id === r.aId) || { name: 'Visitante' };
                      const isUser = careerUelTeam && (r.hId === careerUelTeam.id || r.aId === careerUelTeam.id);
                      return (
                        <div
                          key={rIdx}
                          className={`flex items-center justify-between p-2 rounded-xl text-[8px] font-bold ${
                            isUser ? 'bg-amber-950/40 border border-amber-500/30' : 'bg-black/30'
                          }`}
                        >
                          <span className='text-white truncate max-w-[110px]'>{h.name}</span>
                          <span className='font-black text-amber-400 px-2'>
                            {r.sh} - {r.sa} {r.penH !== null && r.penH !== undefined ? `(${r.penH}-${r.penA}p)` : ''}
                          </span>
                          <span className='text-white truncate max-w-[110px] text-right'>{a.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className='bg-slate-900/60 rounded-3xl p-6 text-center border border-white/10 text-slate-400 text-xs'>
                Aún no se han disputado partidos en esta edición.
              </div>
            )}
          </motion.div>
        )}

        {/* SUBTAB: TEAMS (24 Teams in UEFA Europa League) */}
        {subTab === 'teams' && (
          <motion.div
            key='teams'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='space-y-3'
          >
            <div className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-3.5 border border-white/10 space-y-2 shadow-md'>
              <div className='flex items-center justify-between border-b border-white/5 pb-1.5'>
                <span className='text-[9px] font-black uppercase tracking-wider text-amber-400'>
                  24 Clubes Participantes
                </span>
                <span className='text-[7px] font-bold text-slate-400 uppercase'>
                  16 Ligas + 8 Repescas Champions
                </span>
              </div>

              <div className='grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar'>
                {(safeUelComp?.teams || []).map((t: any) => {
                  const isUser = careerUelTeam && t.id === careerUelTeam.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-2.5 rounded-2xl border flex items-center gap-2 transition-all ${
                        isUser
                          ? 'bg-amber-950/50 border-amber-500/50 shadow-md'
                          : 'bg-black/30 border-white/5'
                      }`}
                    >
                      <Shield color1={t.color1} color2={t.color2} initial={t.name} size='sm' isFlag={t.isFlag} />
                      <div className='min-w-0 flex-1'>
                        <p className={`text-[9px] font-black uppercase truncate ${isUser ? 'text-amber-300' : 'text-white'}`}>
                          {t.name}
                        </p>
                        <span className='text-[7px] text-slate-400 block truncate'>
                          {t.clOrigin || t.league || 'Europa'}
                        </span>
                      </div>
                      <span className='text-[8px] font-bold text-amber-400 shrink-0 bg-black/40 px-1.5 py-0.5 rounded'>
                        {t.att}/{t.opp}/{t.def}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB: OBJECTIVE (Board Objective for UEL) */}
        {subTab === 'objective' && (
          <motion.div
            key='objective'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='space-y-4'
          >
            <div className='bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-amber-500/30 space-y-4 shadow-xl'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-[9px] font-black uppercase tracking-widest text-amber-400'>
                    Directiva Continental
                  </p>
                  <h3 className='text-base font-black uppercase italic text-white mt-0.5'>
                    Exigencia en UEFA Europa League
                  </h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider border ${
                  uelObjective.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : uelObjective.status === 'failed'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {uelObjective.statusLabel}
                </span>
              </div>

              {/* Tarjeta de Meta Principal */}
              <div className='bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3'>
                <div className='flex items-start gap-3'>
                  <div className='w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 mt-0.5'>
                    <Trophy size={20} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h4 className='text-sm font-black uppercase italic text-white truncate'>
                      {uelObjective.target.label}
                    </h4>
                    <p className='text-[10px] text-slate-300 mt-0.5 leading-relaxed'>
                      {uelObjective.target.detail}
                    </p>
                    <p className='text-[8.5px] font-bold text-amber-400 mt-1 uppercase'>
                      Meta Mínima Exigida: {uelObjective.target.targetValue}
                    </p>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className='space-y-1.5 pt-1'>
                  <div className='flex justify-between text-[8px] font-black uppercase tracking-wider text-slate-400'>
                    <span>Progreso en Europa League</span>
                    <span className='text-white font-bold'>{uelObjective.progress}%</span>
                  </div>
                  <div className='w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-white/5'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        uelObjective.status === 'completed'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : uelObjective.status === 'failed'
                          ? 'bg-gradient-to-r from-red-600 to-rose-500'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${uelObjective.progress}%` }}
                    />
                  </div>
                </div>

                {/* Comparativa de Fases */}
                <div className='bg-slate-900/60 p-3 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-center'>
                  <div>
                    <span className='text-[7.5px] font-bold uppercase text-slate-400 block'>Ronda Objetivo:</span>
                    <span className='text-[9.5px] font-black text-amber-300 uppercase'>
                      {uelPhaseLabel(uelObjective.target.targetPhase)}
                    </span>
                  </div>
                  <div>
                    <span className='text-[7.5px] font-bold uppercase text-slate-400 block'>Ronda Actual:</span>
                    <span className='text-[9.5px] font-black text-white uppercase'>
                      {isFinished ? 'Finalizado' : uelPhaseLabel(phase)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Beneficios por Cumplimiento */}
              <div className='grid grid-cols-2 gap-2.5'>
                <div className='bg-black/30 rounded-2xl p-3 border border-white/5 space-y-1'>
                  <p className='text-[8px] font-black uppercase text-slate-400'>Puntos de Entrenamiento</p>
                  <p className='text-xs font-black text-emerald-400'>+{uelObjective.target.pe} PE</p>
                  <p className='text-[7.5px] text-slate-400'>Recompensa otorgada al final de curso</p>
                </div>
                <div className='bg-black/30 rounded-2xl p-3 border border-white/5 space-y-1'>
                  <p className='text-[8px] font-black uppercase text-slate-400'>Prestigio Continental</p>
                  <p className='text-xs font-black text-amber-300'>+{uelObjective.target.rep} Reputación</p>
                  <p className='text-[7.5px] text-slate-400'>Impacta en la valoración de banquillos</p>
                </div>
              </div>

              {/* Botón directo para Ver Cuadro de Llaves */}
              <button
                onClick={() => setSubTab('bracket')}
                className='w-full py-3 bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 text-amber-200 border border-amber-500/30 rounded-2xl text-[9px] font-black uppercase italic tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md'
              >
                <Layers size={14} className='text-amber-400' />
                <span>Explorar Cuadro de Llaves UEL</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* SUBTAB: TACTIC (Quick formation adjustment for European night) */}
        {subTab === 'tactic' && (
          <motion.div
            key='tactic'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className='space-y-3'
          >
            <div className='bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-amber-500/30 space-y-4 shadow-xl'>
              <div className='flex items-center justify-between border-b border-white/5 pb-3'>
                <div>
                  <span className='text-[9px] font-black uppercase tracking-wider text-amber-400'>
                    Pizarra Táctica · {totalTeamStrength} Puntos de Fuerza
                  </span>
                  <h3 className='text-base font-black uppercase italic text-white mt-0.5'>
                    Esquema para Noche Europea
                  </h3>
                </div>
                <div className='w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30'>
                  <Target size={20} />
                </div>
              </div>

              <div className='bg-black/40 rounded-2xl p-3.5 border border-white/5'>
                <p className='text-[10px] font-bold text-slate-300 leading-relaxed'>
                  Puntos totales a distribuir: <strong className='text-amber-300'>{baseTactic.att} + {baseTactic.opp} + {baseTactic.def} = {totalTeamStrength} pts</strong>.
                  Ajusta la estrategia para los cruces de Europa League respetando los límites de plantilla (5-5-4).
                </p>
              </div>

              {/* Grid de opciones tácticas */}
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
                {tacticOptionsList.map((o: any) => {
                  const isSelected = sameDist(effectiveTactic, o) || sameDist(career?.tactic, o);
                  return (
                    <button
                      key={`${o.att}-${o.opp}-${o.def}`}
                      onClick={() => onSetTactic && onSetTactic(o)}
                      className={`py-3.5 px-3 rounded-2xl border text-center transition-all active:scale-95 shadow cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 text-slate-950 font-black ring-2 ring-amber-400/40'
                          : 'bg-slate-900/60 hover:bg-slate-800 border-white/10 text-white'
                      }`}
                    >
                      <p className='text-base font-black italic tabular-nums'>{o.att}-{o.opp}-{o.def}</p>
                      <p className={`text-[7px] font-black uppercase tracking-wider ${isSelected ? 'text-slate-950/90 font-black' : 'text-slate-400'}`}>
                        ATT · OPP · DEF
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Botones de Entrenamiento y PE */}
              <div className='pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {onOpenTraining && (
                  <button
                    onClick={onOpenTraining}
                    className='p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[9px] font-black uppercase italic tracking-wider flex items-center justify-center gap-1.5 active:scale-95 shadow cursor-pointer'
                  >
                    <Dumbbell size={14} /> Subir Atributos ({career?.pe || 0} PE)
                  </button>
                )}
                {onOpenDrill && (
                  <button
                    onClick={onOpenDrill}
                    disabled={hasTrainedThisUelMatch}
                    className={`p-3 rounded-2xl text-[9px] font-black uppercase italic tracking-wider border flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                      hasTrainedThisUelMatch
                        ? 'bg-slate-800/40 border-white/5 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10 cursor-pointer'
                    }`}
                  >
                    <Dices size={14} className={hasTrainedThisUelMatch ? 'text-slate-500' : 'text-amber-400'} />
                    <span>{hasTrainedThisUelMatch ? 'Sesión Hecha (1D6)' : 'Lanzar Dado de Entreno (1D6)'}</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
