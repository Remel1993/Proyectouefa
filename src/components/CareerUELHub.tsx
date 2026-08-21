import React, { useState, useMemo } from 'react';
import { Trophy, Dices, Zap, Shield as ShieldIcon, ChevronRight, Calendar, Award, CheckCircle, CheckCircle2, XCircle, Clock, Sparkles, Layers, ArrowLeft, RotateCcw, ShieldCheck, Dumbbell, Target, Globe, Flame, Lock, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { tacticalOptions, sameDist, getEuropaLeagueMatchKey } from '../lib/career';

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

  // Identificar el equipo del modo carrera dentro de la UEFA Europa League (C3)
  const careerUelTeam = useMemo(() => {
    if (!uelComp?.teams?.length || !team) return null;
    return uelComp.teams.find((t: any) => t.id === uelComp.careerTeamId) ||
      uelComp.teams.find((t: any) => t.name === (uelComp.careerTeamName || team.name)) ||
      uelComp.teams.find((t: any) => t.id === uelComp.userTeamId) || null;
  }, [uelComp, team]);

  const phase = uelComp?.phase || 'Dieciseisavos';
  const matchday = uelComp?.matchday || 0;
  const isFinished = uelComp?.showWinner || phase === 'Terminado';

  const safeBracket = useMemo(() => {
    return uelComp?.bracket || { Dieciseisavos: [], Octavos: [], Cuartos: [], Semis: [], Final: [] };
  }, [uelComp?.bracket]);

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
          const ht = uelComp.teams.find((t: any) => t.id === m.hId) || { name: 'Local' };
          const at = uelComp.teams.find((t: any) => t.id === m.aId) || { name: 'Visitante' };
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
      const homeTeam = uelComp.teams.find((t: any) => t.id === homeId) || { name: 'Por Definir', att: 3, opp: 3, def: 3 };
      const awayTeam = uelComp.teams.find((t: any) => t.id === awayId) || { name: 'Por Definir', att: 3, opp: 3, def: 3 };
      const isHome = homeId === careerUelTeam.id;
      const rival = isHome ? awayTeam : homeTeam;

      let aggregate = null;
      if (isVuelta && match.sh !== null && match.sa !== null) {
        aggregate = {
          idaHomeName: uelComp.teams.find((t: any) => t.id === match.hId)?.name,
          idaAwayName: uelComp.teams.find((t: any) => t.id === match.aId)?.name,
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
  }, [isFinished, isNotQualified, careerUelTeam, phase, safeBracket, matchday, uelComp]);

  // Comprobar si el usuario fue eliminado o se consagró campeón
  const winnerTeam = useMemo(() => {
    if (!isFinished) return null;
    const final = safeBracket?.Final?.[0] || safeBracket?.Final;
    if (!final || final.sh === null || final.sh === undefined) return null;
    const winId = final.sh > final.sa ? final.hId : final.sa > final.sh ? final.aId : ((final.penH || 0) > (final.penA || 0) ? final.hId : final.aId);
    return uelComp?.teams?.find((t: any) => t.id === winId) || null;
  }, [isFinished, safeBracket, uelComp]);

  const isUserChampion = winnerTeam && careerUelTeam && winnerTeam.id === careerUelTeam.id;
  const isUserEliminated = !isNotQualified && careerUelTeam && !nextMatchInfo && !isUserChampion && (phase !== 'Dieciseisavos' || matchday > 0);

  const objectiveInfo = useMemo(() => getUELObjectiveTarget(currentTier), [currentTier]);

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

          <div className='text-right shrink-0'>
            <div className='text-[9px] font-bold text-slate-300 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10'>
              Fuerza: <span className='text-amber-400 font-black'>{effectiveTactic.att}/{effectiveTactic.opp}/{effectiveTactic.def}</span>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className='grid grid-cols-6 gap-1 mt-4 bg-slate-900/70 p-1 rounded-2xl border border-white/5'>
          {[
            { id: 'match', label: 'Partido', icon: Dices },
            { id: 'bracket', label: 'Cuadro', icon: Layers },
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
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white font-bold'
                }`}
              >
                <Icon size={13} className={active ? 'text-slate-950' : 'text-slate-400'} />
                <span className='text-[7px] uppercase tracking-tight truncate mt-0.5'>{tabItem.label}</span>
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
                  Tu club no alcanzó las posiciones 5.º a 8.º de liga europea ni la repesca de Champions League en la temporada regular. Puedes seguir el cuadro del torneo y simular las eliminatorias.
                </p>
                {onSimulateAllUel && !isFinished && (
                  <button
                    onClick={onSimulateAllUel}
                    className='w-full py-3 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all active:scale-95'
                  >
                    ⚡ Simular Todo el Torneo
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
                  Tu club ha caído eliminado de la competición. Puedes seguir la fase eliminatoria o simular los cruces restantes.
                </p>
                {onSimulateAllUel && !isFinished && (
                  <button
                    onClick={onSimulateAllUel}
                    className='w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[9px] font-black uppercase italic tracking-wider transition-all'
                  >
                    Simular resto de la Europa League
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

                {/* Panel Informativo cuando no es fecha de Europa League */}
                {!isEuropaDate ? (
                  <div className='space-y-3 pt-1'>
                    <div className='p-3.5 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2 text-left'>
                      <div className='flex items-center gap-2'>
                        <span className='text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30'>
                          Modo Informativo · Semana Oficial {nextUelWeek || 20}
                        </span>
                      </div>
                      <p className='text-[10px] font-medium text-slate-300 leading-relaxed'>
                        Tu eliminatoria de Europa League se disputará en la <strong>Semana {nextUelWeek || 20}</strong> del calendario oficial (Semana actual: <strong>{currentWeek}</strong>).
                      </p>
                    </div>

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
              <div className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-4 border border-white/10 shadow-lg space-y-2'>
                <div className='flex items-center justify-between border-b border-white/5 pb-2'>
                  <span className='text-[8px] font-black uppercase text-amber-400'>
                    Último resultado · {lastPlayedUELMatch.dayLabel}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      lastPlayedUELMatch.result === 'W' ? 'bg-emerald-500/20 text-emerald-300' :
                      lastPlayedUELMatch.result === 'D' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {lastPlayedUELMatch.result === 'W' ? 'Victoria' : lastPlayedUELMatch.result === 'D' ? 'Empate' : 'Derrota'}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between px-3 py-1'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Shield
                      color1={lastPlayedUELMatch.home?.color1}
                      color2={lastPlayedUELMatch.home?.color2}
                      initial={lastPlayedUELMatch.home?.name}
                      size='sm'
                      isFlag={lastPlayedUELMatch.home?.isFlag}
                    />
                    <span className='text-[10px] font-black uppercase text-white truncate max-w-[90px]'>
                      {lastPlayedUELMatch.home?.name}
                    </span>
                  </div>

                  <div className='text-center px-2'>
                    <span className='text-sm font-black text-amber-400'>
                      {lastPlayedUELMatch.scoreH} - {lastPlayedUELMatch.scoreA}
                    </span>
                    {lastPlayedUELMatch.penH !== null && lastPlayedUELMatch.penH !== undefined && (
                      <span className='block text-[7px] text-slate-400'>
                        ({lastPlayedUELMatch.penH}-{lastPlayedUELMatch.penA} pen.)
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-2 min-w-0 justify-end'>
                    <span className='text-[10px] font-black uppercase text-white truncate max-w-[90px] text-right'>
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

                {lastPlayedUELMatch.aggregateInfo && (
                  <div className='text-center bg-black/40 py-1 px-2 rounded-xl text-[8px] font-bold text-amber-300 border border-white/5'>
                    Global: {lastPlayedUELMatch.aggregateInfo.globalScoreText} {lastPlayedUELMatch.aggregateInfo.penaltiesText || ''}
                    {lastPlayedUELMatch.aggregateInfo.qualified !== null && (
                      <span className={`ml-2 font-black ${lastPlayedUELMatch.aggregateInfo.qualified ? 'text-emerald-400' : 'text-red-400'}`}>
                        {lastPlayedUELMatch.aggregateInfo.qualified ? '¡Clasificado a la siguiente ronda!' : 'Eliminado del torneo'}
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

              return (
                <div key={roundKey} className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-3.5 border border-white/10 space-y-2 shadow-md'>
                  <div className='flex items-center justify-between border-b border-white/5 pb-1.5'>
                    <span className='text-[9px] font-black uppercase tracking-wider text-amber-400'>
                      {uelPhaseLabel(roundKey)}
                    </span>
                    <span className='text-[7px] font-bold text-slate-400 uppercase'>
                      {roundKey === 'Final' ? 'Partido Único' : 'Ida y Vuelta'}
                    </span>
                  </div>

                  <div className='grid gap-2'>
                    {matches.map((m: any, idx: number) => {
                      if (!m) return null;
                      const h = uelComp?.teams?.find((t: any) => t.id === m.hId) || { name: 'Por definir' };
                      const a = uelComp?.teams?.find((t: any) => t.id === m.aId) || { name: 'Por definir' };
                      const isUserMatch = careerUelTeam && (m.hId === careerUelTeam.id || m.aId === careerUelTeam.id);

                      const playedIda = m.sh !== null && m.sh !== undefined;
                      const playedVuelta = m.sh2 !== null && m.sh2 !== undefined;
                      const totH = (m.sh || 0) + (m.sh2 || 0);
                      const totA = (m.sa || 0) + (m.sa2 || 0);

                      let winnerId = null;
                      if (roundKey === 'Final' && playedIda) {
                        winnerId = m.sh > m.sa ? m.hId : m.sa > m.sh ? m.aId : ((m.penH || 0) > (m.penA || 0) ? m.hId : m.aId);
                      } else if (playedVuelta) {
                        winnerId = totH > totA ? m.hId : totA > totH ? m.aId : ((m.penH || 0) > (m.penA || 0) ? m.hId : m.aId);
                      }

                      return (
                        <div
                          key={m.id || idx}
                          className={`p-2 rounded-2xl border transition-all ${
                            isUserMatch
                              ? 'bg-amber-950/40 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                              : 'bg-black/30 border-white/5'
                          }`}
                        >
                          <div className='flex items-center justify-between text-[8px] font-bold'>
                            {/* Equipo Local */}
                            <div className='flex items-center gap-1.5 min-w-0 flex-1'>
                              <Shield color1={h.color1} color2={h.color2} initial={h.name} size='xs' isFlag={h.isFlag} />
                              <span className={`truncate ${winnerId === h.id ? 'font-black text-amber-300' : 'text-white'}`}>
                                {h.name}
                              </span>
                              {winnerId === h.id && <span className='text-[7px] text-amber-400'>✓</span>}
                            </div>

                            {/* Resultados */}
                            <div className='px-2 text-center shrink-0'>
                              {roundKey === 'Final' ? (
                                playedIda ? (
                                  <span className='font-black text-amber-400'>
                                    {m.sh} - {m.sa}
                                    {m.penH !== null && m.penH !== undefined ? ` (${m.penH}-${m.penA}p)` : ''}
                                  </span>
                                ) : (
                                  <span className='text-slate-500'>vs</span>
                                )
                              ) : (
                                <div className='flex items-center gap-1.5'>
                                  <span className='text-[7px] text-slate-400'>
                                    {playedIda ? `Ida: ${m.sh}-${m.sa}` : '-'}
                                  </span>
                                  {playedVuelta && (
                                    <>
                                      <span className='text-[7px] text-slate-500'>|</span>
                                      <span className='text-[7px] text-slate-400'>
                                        {`Vta: ${m.sh2}-${m.sa2}`}
                                      </span>
                                      <span className='font-black text-amber-400 ml-1'>
                                        ({totH}-{totA})
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Equipo Visitante */}
                            <div className='flex items-center gap-1.5 min-w-0 flex-1 justify-end'>
                              {winnerId === a.id && <span className='text-[7px] text-amber-400'>✓</span>}
                              <span className={`truncate text-right ${winnerId === a.id ? 'font-black text-amber-300' : 'text-white'}`}>
                                {a.name}
                              </span>
                              <Shield color1={a.color1} color2={a.color2} initial={a.name} size='xs' isFlag={a.isFlag} />
                            </div>
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
                      const h = uelComp.teams.find((t: any) => t.id === r.hId) || { name: 'Local' };
                      const a = uelComp.teams.find((t: any) => t.id === r.aId) || { name: 'Visitante' };
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
                {(uelComp?.teams || []).map((t: any) => {
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
            <div className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-amber-500/30 shadow-xl space-y-3'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0'>
                  <Target size={20} />
                </div>
                <div>
                  <span className='text-[8px] font-black uppercase text-amber-400'>
                    Exigencia de la Junta Directiva
                  </span>
                  <h3 className='text-xs font-black uppercase text-white italic'>
                    {objectiveInfo.label}
                  </h3>
                </div>
              </div>
              <p className='text-[10px] text-slate-300 leading-relaxed'>
                {objectiveInfo.desc}
              </p>
              <div className='bg-black/40 p-3 rounded-2xl border border-white/5 space-y-1.5'>
                <div className='flex justify-between text-[8px] font-bold text-slate-400'>
                  <span>Ronda Objetivo Mínima:</span>
                  <span className='text-amber-300 font-black'>{uelPhaseLabel(objectiveInfo.target)}</span>
                </div>
                <div className='flex justify-between text-[8px] font-bold text-slate-400'>
                  <span>Estado Actual:</span>
                  <span className='text-white font-black'>{uelPhaseLabel(phase)}</span>
                </div>
              </div>
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
            <div className='bg-slate-900/60 backdrop-blur-md rounded-3xl p-4 border border-white/10 space-y-3 shadow-md'>
              <div className='flex items-center justify-between border-b border-white/5 pb-2'>
                <span className='text-[9px] font-black uppercase tracking-wider text-amber-400'>
                  Esquema Táctico para Noche Europea
                </span>
                <span className='text-[8px] font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded'>
                  Total: {totalTeamStrength} pts
                </span>
              </div>

              <div className='grid grid-cols-1 gap-2'>
                {tacticOptionsList.map((opt, i) => {
                  const isSelected = sameDist(effectiveTactic, opt.dist);
                  return (
                    <button
                      key={i}
                      onClick={() => onSetTactic && onSetTactic(opt.dist)}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-400 shadow-md'
                          : 'bg-black/30 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='text-[10px] font-black uppercase italic text-white'>
                            {opt.label}
                          </span>
                          {isSelected && <span className='text-[8px] text-amber-400 font-bold'>★ Activo</span>}
                        </div>
                        <p className='text-[8px] text-slate-400 mt-0.5'>{opt.desc}</p>
                      </div>
                      <div className='text-right'>
                        <span className='text-xs font-black text-amber-400'>
                          {opt.dist.att}/{opt.dist.opp}/{opt.dist.def}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
