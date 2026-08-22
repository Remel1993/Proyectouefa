// Hub / Home View for tournament selection and season management
import React, { useState, useMemo } from 'react';
import { 
  Trophy, Settings, Calendar, History, Swords, Globe, Play, RotateCcw,
  Sparkles, FastForward, Check, Flame, ChevronLeft, Info, X, Dices, 
  ArrowRight, Briefcase, Shield as ShieldIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from '@/components/ui/GameUI';
import { CompetitionLogo } from '@/components/CompetitionLogo';
import { 
  isChampionsMatchWeek, isEuropaLeagueMatchWeek, 
  getSemanaCalendario, getTotalCalendarWeeks,
  SEASON_CALENDAR_42_WEEKS, isChampionsWeek, getNextChampionsWeek, 
  isEuropaLeagueWeek, getNextEuropaLeagueWeek,
  getWeekForLeagueMatchday, getExpectedCupMatchdayForWeek
} from '@/lib/seasonCalendar';
import { divTotalRounds, leagueTotalRounds, leagueSeasonOver, leagueProgressLabel } from '@/lib/leagueEngine';
import championsStadiumBg from '@/assets/images/champions_league_stadium_1786921289637.jpg';
import worldCupStadiumDayBg from '@/assets/images/world_cup_stadium_day_1786921535635.jpg';

export const HubView = ({ 
  setView, 
  setActiveCompId, 
  setCompView, 
  comps, 
  seasonState, 
  pendingLeagueIds, 
  allLeaguesFinished, 
  championsFinished, 
  onSimulateLeague, 
  onSimulateAll, 
  onSimulateWeek,
  onSimulateUntilNextMatch,
  onNewSeason, 
  onSimulateChampions, 
  career, 
  onOpenCareer,
  onOpenSeasonCalendar,
  milestoneToast,
  onDismissMilestoneToast
}) => {
  const [showLeagues, setShowLeagues] = useState(false);
  const globalMatchday = seasonState?.globalMatchday || 1;
  const rawCurrentWeek = seasonState?.currentWeek || 1;

  // Sincronización robusta de la semana actual con el progreso real de las competiciones
  const currentWeek = useMemo(() => {
    if (allLeaguesFinished && championsFinished) {
      return 42;
    }
    if (allLeaguesFinished) {
      return Math.min(42, Math.max(40, rawCurrentWeek));
    }
    if (globalMatchday > 1) {
      const expWeek = getWeekForLeagueMatchday(globalMatchday);
      return expWeek || rawCurrentWeek;
    }
    return Math.min(3, Math.max(1, rawCurrentWeek));
  }, [allLeaguesFinished, championsFinished, globalMatchday, rawCurrentWeek]);

  const weekData = useMemo(() => getSemanaCalendario(currentWeek) || SEASON_CALENDAR_42_WEEKS[0], [currentWeek]);
  const isChampionsDate = isChampionsMatchWeek(currentWeek) || (allLeaguesFinished && currentWeek <= 41 && !comps['C1']?.showWinner && comps['C1']?.phase !== 'Terminado');
  const nextClWeek = getNextChampionsWeek(currentWeek);
  const isEuropaDate = isEuropaLeagueMatchWeek(currentWeek) || (allLeaguesFinished && currentWeek <= 39 && !comps['C3']?.showWinner && comps['C3']?.phase !== 'Terminado');
  const nextUelWeek = getNextEuropaLeagueWeek(currentWeek);
  const pending = pendingLeagueIds || [];
  const leagues = [
    { id: 'L1', name: 'LaLiga', flag: '🇪🇸', country: 'España' },
    { id: 'L2', name: 'Serie A', flag: '🇮🇹', country: 'Italia' },
    { id: 'L3', name: 'Premier League', flag: '🇬🇧', country: 'Inglaterra' },
    { id: 'L4', name: 'Bundesliga', flag: '🇩🇪', country: 'Alemania' },
    { id: 'L5', name: 'Eredivisie', flag: '🇳🇱', country: 'Países Bajos' },
    { id: 'L6', name: 'Ligue 1', flag: '🇫🇷', country: 'Francia' },
    { id: 'L7', name: 'Miscelánea', flag: '🇵🇹', country: 'Portugal / Otros' },
    { id: 'L8', name: 'Miscelánea B', flag: '🌍', country: 'Resto de Europa' }
  ];

  const playableFixtures = weekData?.fixtures?.filter(f => f.esPartido) || [];
  const milestones = weekData?.fixtures?.filter(f => !f.esPartido) || [];

  const getFixtureBadge = (fix: any) => {
    if (!fix.esPartido) {
      return (
        <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/30 whitespace-nowrap'>
          Hito
        </span>
      );
    }
    if (fix.competicion === 'LIGA') {
      if (allLeaguesFinished || (fix.leagueMatchday && globalMatchday > fix.leagueMatchday)) {
        return (
          <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-white/10 whitespace-nowrap flex items-center gap-1'>
            <Check size={8} className='text-emerald-400' /> Jugado
          </span>
        );
      }
      if (fix.leagueMatchday === globalMatchday) {
        if (pendingLeagueIds && pendingLeagueIds.length > 0 && pendingLeagueIds.length < leagues.length) {
          return (
            <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 whitespace-nowrap animate-pulse'>
              En Juego ({leagues.length - pendingLeagueIds.length}/{leagues.length})
            </span>
          );
        }
        return (
          <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 whitespace-nowrap'>
            Esta Semana
          </span>
        );
      }
      return (
        <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/20 whitespace-nowrap'>
          Próximo
        </span>
      );
    }
    if (fix.competicion === 'CHAMPIONS') {
      const c1 = comps?.['C1'];
      if (c1?.showWinner || c1?.phase === 'Terminado') {
        return (
          <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-white/10 whitespace-nowrap flex items-center gap-1'>
            <Check size={8} className='text-blue-400' /> Jugado
          </span>
        );
      }
      const expMd = getExpectedCupMatchdayForWeek('C1', currentWeek);
      const c1Md = c1?.matchday || 0;
      if (expMd !== null && c1Md >= expMd) {
        return (
          <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-white/10 whitespace-nowrap flex items-center gap-1'>
            <Check size={8} className='text-blue-400' /> Jugado
          </span>
        );
      }
      return (
        <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 border border-blue-400/30 whitespace-nowrap'>
          Esta Semana
        </span>
      );
    }
    if (fix.competicion === 'EUROPA_LEAGUE') {
      const c3 = comps?.['C3'];
      if (c3?.showWinner || c3?.phase === 'Terminado') {
        return (
          <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-white/10 whitespace-nowrap flex items-center gap-1'>
            <Check size={8} className='text-amber-400' /> Jugado
          </span>
        );
      }
      const expMd = getExpectedCupMatchdayForWeek('C3', currentWeek);
      const c3Md = c3?.matchday || 0;
      if (expMd !== null && c3Md >= expMd) {
        return (
          <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-white/10 whitespace-nowrap flex items-center gap-1'>
            <Check size={8} className='text-amber-400' /> Jugado
          </span>
        );
      }
      return (
        <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/30 whitespace-nowrap'>
          Esta Semana
        </span>
      );
    }
    return (
      <span className='text-[6.5px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 whitespace-nowrap'>
        Partido
      </span>
    );
  };

  return (
    <div className='flex-grow flex flex-col px-3.5 sm:px-4 pb-12 space-y-4'>
      {/* HEADER DE BIENVENIDA */}
      <header className='pt-7 pb-2 text-center flex flex-col items-center'>
        <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[9px] font-black uppercase tracking-widest backdrop-blur-md mb-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]'>
          <Sparkles size={11} className='text-blue-300' />
          <span>UEFA Champions & World Leagues</span>
        </div>
        <h1 className='text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)]'>
          DICE FOOTBALL
        </h1>
        <p className='text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-0.5 drop-shadow'>
          Simulador Oficial · Temporada {seasonState?.season || 1}
        </p>
      </header>

      {/* MILESTONE TOAST / NOTIFICACIÓN DE HITO SEMANAL */}
      {milestoneToast && (
        <div className='bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 backdrop-blur-md rounded-2xl p-3 border border-amber-500/40 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30'>
              <Sparkles size={16} />
            </div>
            <div className='min-w-0'>
              <span className='text-[8px] font-black uppercase tracking-wider text-amber-400 block'>
                Hito Semana {milestoneToast.week}
              </span>
              <p className='text-[10.5px] font-black uppercase italic text-white truncate'>
                {milestoneToast.title}
              </p>
              {milestoneToast.desc && (
                <p className='text-[8.5px] font-medium text-slate-300 line-clamp-1'>
                  {milestoneToast.desc}
                </p>
              )}
            </div>
          </div>
          {onDismissMilestoneToast && (
            <button 
              onClick={onDismissMilestoneToast}
              className='p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0'
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* PANEL DE CONTROL DE TEMPORADA / CALENDARIO */}
      <section className='bg-slate-900/60 backdrop-blur-xl rounded-3xl p-3.5 sm:p-5 border border-white/10 shadow-2xl space-y-3 overflow-hidden'>
        <div className='flex items-center justify-between gap-2.5 min-w-0'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-1.5 flex-wrap'>
              <span className='px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider'>
                Temporada {seasonState?.season || 1}
              </span>
              <span className='px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider'>
                Semana {Math.min(42, currentWeek)} / 42
              </span>
              <span className='text-[8px] sm:text-[8.5px] font-bold text-slate-400 uppercase tracking-wider'>
                {weekData?.mes || 'Agosto'}
              </span>
            </div>
            <h2 className='text-base sm:text-lg font-black uppercase italic text-white tracking-tight mt-1 truncate'>
              {currentWeek > 42 || (allLeaguesFinished && championsFinished)
                ? 'Temporada Completada'
                : playableFixtures.length === 0
                  ? `${weekData?.fixtures?.[0]?.ronda || 'Sin partidos oficiales'}`
                  : `Semana ${currentWeek} · ${playableFixtures.map(f => f.ronda).join(' + ')}`}
            </h2>
          </div>

          <button
            onClick={onOpenSeasonCalendar}
            title="Abrir Calendario Oficial de 42 Semanas"
            className='w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-emerald-400/50 flex items-center justify-center text-emerald-400 hover:text-emerald-300 shrink-0 shadow-inner active:scale-95 transition-all group'
          >
            <Calendar size={18} className='group-hover:scale-110 transition-transform' />
          </button>
        </div>

        {/* BOTÓN PRINCIPAL DE ACCIÓN: SIMULAR SEMANA */}
        {currentWeek <= 42 && !((allLeaguesFinished && championsFinished) || (currentWeek >= 42 && allLeaguesFinished)) ? (
          <div className='space-y-2 pt-0.5'>
            <button
              onClick={onSimulateWeek || onSimulateAll}
              className='w-full py-3 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase italic tracking-wider active:scale-[0.98] transition-colors flex items-center justify-center gap-2 border border-amber-300/60 shadow-md cursor-pointer'
            >
              <Dices size={16} className='text-slate-950 stroke-[2.5] shrink-0' />
              <span className='truncate'>
                Simular Semana {currentWeek} {playableFixtures.length > 0 
                  ? `(${playableFixtures.map(f => f.competicion === 'LIGA' ? 'Liga' : f.competicion === 'CHAMPIONS' ? 'Champions' : f.competicion === 'EUROPA_LEAGUE' ? 'Europa' : f.ronda).join(' + ')})` 
                  : milestones.length > 0 ? `(${milestones[0].ronda})` : '(Continuar)'}
              </span>
            </button>

            {/* BOTÓN SECUNDARIO: SIMULAR HASTA MI PRÓXIMO PARTIDO */}
            {onSimulateUntilNextMatch && (
              <button
                onClick={onSimulateUntilNextMatch}
                className='w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white rounded-xl text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer'
              >
                <FastForward size={13} className='text-amber-400 shrink-0' />
                <span className='truncate'>Simular hasta mi próximo partido</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onNewSeason}
            className='w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-2xl text-[10.5px] sm:text-[11px] font-black uppercase italic tracking-wider active:scale-[0.98] transition-colors flex items-center justify-center gap-2 border border-amber-300/60 shadow-xl cursor-pointer'
          >
            <RotateCcw size={16} className='text-slate-950 stroke-[2.5] shrink-0' />
            <span className='truncate'>Iniciar Temporada {seasonState?.season ? seasonState.season + 1 : 2}</span>
          </button>
        )}

        {/* Eventos, partidos y calendario de la semana actual */}
        <div className='bg-black/30 rounded-2xl p-2.5 border border-white/5 space-y-1.5 overflow-hidden'>
          <div className='flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 px-0.5'>
            <span className='truncate'>Eventos Semana {Math.min(42, currentWeek)}</span>
            <button 
              onClick={onOpenSeasonCalendar} 
              className='text-amber-400 hover:underline flex items-center gap-0.5 shrink-0 text-[8px]'
            >
              <span>Ver Calendario</span>
              <ArrowRight size={9} />
            </button>
          </div>
          <div className='grid gap-1.5'>
            {weekData?.fixtures?.map((fix, idx) => (
              <div 
                key={fix.id || idx}
                className={`p-2 sm:p-2.5 rounded-xl border flex flex-col gap-1 overflow-hidden ${
                  fix.competicion === 'CHAMPIONS'
                    ? 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                    : fix.competicion === 'EUROPA_LEAGUE'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                    : fix.competicion === 'SELECCIONES'
                    ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className='flex items-center justify-between gap-1.5 min-w-0'>
                  <div className='flex items-center gap-1.5 min-w-0 flex-1'>
                    <span className='font-black uppercase tracking-wider text-[7px] sm:text-[7.5px] px-1.5 py-0.5 rounded bg-black/50 border border-white/10 shrink-0'>
                      {fix.competicion === 'CHAMPIONS'
                        ? 'Champions'
                        : fix.competicion === 'EUROPA_LEAGUE'
                        ? 'Europa'
                        : fix.competicion === 'SELECCIONES'
                        ? 'FIFA'
                        : 'Liga'}
                    </span>
                    <span className='font-black uppercase tracking-tight text-[9px] sm:text-[10px] text-white truncate'>
                      {fix.title || fix.ronda}
                    </span>
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <span className='text-[6.5px] sm:text-[7.5px] font-bold uppercase tracking-wider opacity-75 px-1 py-0.5 rounded bg-black/30 whitespace-nowrap'>
                      {fix.slot === 'FINDE' ? 'Fin de Sem.' : fix.slot === 'MITAD' ? 'Entre Sem.' : 'F. Única'}
                    </span>
                    {getFixtureBadge(fix)}
                  </div>
                </div>
                {fix.desc && (
                  <p className='text-[7.5px] sm:text-[8.5px] text-slate-300 font-medium leading-snug line-clamp-2'>
                    {fix.desc}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Indicadores rápidos de progreso por liga (ABAJO) */}
        <div className='flex items-center gap-1.5 pt-0.5'>
          {leagues.map(({ id, name }) => {
            const isPending = pending.includes(id);
            const comp = comps[id];
            const finished = comp ? leagueSeasonOver(comp) : false;
            return (
              <div
                key={id}
                title={`${name}: ${finished ? 'Finalizada' : isPending ? 'Pendiente' : 'Al día'}`}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  finished
                    ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                    : isPending
                    ? 'bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* MODO CARRERA DT */}
      <button
        onClick={onOpenCareer}
        className='w-full p-4 bg-gradient-to-r from-slate-900/40 via-slate-900/35 to-amber-950/20 backdrop-blur-2xl rounded-3xl border border-amber-400/30 flex items-center justify-between hover:border-amber-400/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] active:scale-[0.98] transition-all group text-left'
      >
        <div className='flex items-center gap-3.5 min-w-0'>
          <div className='w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform'>
            <Briefcase size={22} />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5'>
              <h3 className='text-sm font-black uppercase italic text-white tracking-wide truncate'>Modo Carrera DT</h3>
              <span className='text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30'>Oficial</span>
            </div>
            <p className='text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5 truncate'>
              {career?.active
                ? `${career.manager} · Rep. ${career.reputation} pts`
                : 'Crea tu DT y asciende desde 2ª División'}
            </p>
          </div>
        </div>
        <div className='w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0 ml-2'>
          <ArrowRight size={15} />
        </div>
      </button>

      {/* BARRA HORIZONTAL DE TORNEOS INTERNACIONALES (CHAMPIONS LEAGUE, UEFA EUROPA LEAGUE & COPA DEL MUNDO) */}
      <div className='p-1.5 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl grid grid-cols-3 gap-1.5'>
        {/* Champions League */}
        <button
          onClick={() => { 
            setActiveCompId('C1'); setCompView('main'); setView('competition'); 
          }}
          className='p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 group bg-gradient-to-b from-blue-950/50 to-slate-900/80 border-blue-500/30 hover:border-blue-400/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.97] cursor-pointer'
          title={isChampionsDate ? 'Champions League: Jornada disponible' : `Champions League: Próxima jornada en Semana ${nextClWeek} (Modo Informativo)`}
        >
          <div className='w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-md p-1.5 shrink-0 transition-transform group-hover:scale-105'>
            <CompetitionLogo compId="C1" size={32} showBackground={false} />
          </div>
          <div className='min-w-0 w-full'>
            <div className='flex items-center justify-center gap-1'>
              <h4 className='text-[10.5px] sm:text-xs font-black uppercase italic text-white tracking-wide truncate'>
                Champions
              </h4>
            </div>
            <div className='mt-0.5'>
              <span className={`text-[7px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md border truncate block max-w-full ${
                isChampionsDate
                  ? 'bg-blue-500/25 text-blue-300 border-blue-400/30 font-black'
                  : 'bg-blue-950/60 text-blue-300/80 border-blue-500/30'
              }`}>
                {isChampionsDate
                  ? (comps['C1']?.phase === 'groups' ? 'Grupos · Jugar' : (comps['C1']?.phase || 'En Fecha'))
                  : `Sem. ${nextClWeek} · Info`}
              </span>
            </div>
          </div>
        </button>

        {/* UEFA Europa League */}
        <button
          onClick={() => { 
            setActiveCompId('C3'); setCompView('main'); setView('competition'); 
          }}
          className='p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 group bg-gradient-to-b from-amber-950/50 to-slate-900/80 border-amber-500/30 hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.97] cursor-pointer'
          title={isEuropaDate ? 'Europa League: Ronda disponible' : `Europa League: Próxima eliminatoria en Semana ${nextUelWeek} (Modo Informativo)`}
        >
          <div className='w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-md p-1.5 shrink-0 transition-transform group-hover:scale-105'>
            <CompetitionLogo compId="C3" size={32} showBackground={false} />
          </div>
          <div className='min-w-0 w-full'>
            <div className='flex items-center justify-center gap-1'>
              <h4 className='text-[10.5px] sm:text-xs font-black uppercase italic text-white tracking-wide truncate'>
                Europa League
              </h4>
            </div>
            <div className='mt-0.5'>
              <span className={`text-[7px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md border truncate block max-w-full ${
                isEuropaDate
                  ? 'bg-amber-500/25 text-amber-300 border-amber-400/30 font-black'
                  : 'bg-amber-950/60 text-amber-300/80 border-amber-500/30'
              }`}>
                {isEuropaDate
                  ? (comps['C3']?.phase === 'Dieciseisavos' ? '1/16 Final' : (comps['C3']?.phase || 'En Fecha'))
                  : `Sem. ${nextUelWeek} · Info`}
              </span>
            </div>
          </div>
        </button>

        {/* Copa del Mundo */}
        <button
          onClick={() => { setActiveCompId('C2'); setCompView('main'); setView('competition'); }}
          className='p-2.5 sm:p-3 bg-gradient-to-b from-sky-950/50 to-slate-900/80 rounded-2xl border border-sky-500/30 hover:border-sky-400/60 hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] active:scale-[0.97] transition-all flex flex-col items-center text-center gap-1.5 group'
        >
          <div className='w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform p-1.5 shrink-0'>
            <CompetitionLogo compId="C2" size={32} showBackground={false} />
          </div>
          <div className='min-w-0 w-full'>
            <h4 className='text-[10.5px] sm:text-xs font-black uppercase italic text-white tracking-wide truncate'>
              Copa Mundial
            </h4>
            <div className='mt-0.5'>
              <span className='text-[7px] sm:text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-sky-500/25 text-sky-300 border border-sky-400/30 truncate block max-w-full'>
                {comps['C2']?.phase === 'groups' ? 'Grupos' : comps['C2']?.phase || '32 Países'}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* LIGAS NACIONALES (ACORDEÓN ELEGANTE) */}
      <section className='bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-xl'>
        <button
          onClick={() => setShowLeagues(!showLeagues)}
          className='w-full p-4 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-all text-left group'
        >
          <div className='flex items-center gap-3.5 min-w-0'>
            <div className='w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform'>
              <ShieldIcon size={20} />
            </div>
            <div className='min-w-0'>
              <h3 className='text-xs sm:text-sm font-black uppercase italic text-white tracking-wide truncate'>
                Ligas Nacionales (7 Ligas)
              </h3>
              <p className='text-[9.5px] text-slate-300 font-bold uppercase tracking-wider mt-0.5'>
                1ª y 2ª División · Ascensos y Descensos
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showLeagues ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className='w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 group-hover:text-white shrink-0 ml-2'
          >
            <ChevronLeft size={16} className='-rotate-90' />
          </motion.div>
        </button>

        <AnimatePresence>
          {showLeagues && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className='overflow-hidden border-t border-white/10'
            >
              <div className='p-3 space-y-2 bg-black/20'>
                {leagues.map(({ id, name, flag }) => {
                  const comp = comps[id];
                  if (!comp) return null;
                  const isConf = comp.teams && comp.teams.length > 0;
                  const isPending = pending.includes(id);
                  const finished = leagueSeasonOver(comp);

                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-2xl bg-slate-900/60 border flex items-center justify-between gap-3 transition-all ${
                        isPending ? 'border-amber-500/40 bg-amber-950/10' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <button
                        onClick={() => { setActiveCompId(id); setCompView('main'); setView('competition'); }}
                        className='flex items-center gap-3 min-w-0 flex-1 text-left'
                      >
                        <div className='shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-md p-1'>
                          <CompetitionLogo compId={id} size={28} showBackground={false} />
                        </div>
                        <div className='min-w-0'>
                          <h4 className='text-xs font-black uppercase italic text-white tracking-wide truncate'>
                            {comp.name || name}
                          </h4>
                          <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            finished ? 'text-blue-400' : isPending ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {isConf ? leagueProgressLabel(comp, globalMatchday) : 'No Inicializada'}
                          </p>
                        </div>
                      </button>

                      {isPending ? (
                        <button
                          onClick={() => onSimulateLeague && onSimulateLeague(id)}
                          className='shrink-0 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 rounded-xl text-[9px] font-black uppercase italic tracking-wider active:scale-95 transition-colors flex items-center gap-1.5 border border-white/10'
                        >
                          <Dices size={13} className='text-slate-300' />
                          <span>Simular</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => { setActiveCompId(id); setCompView('main'); setView('competition'); }}
                          className='shrink-0 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors'
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* BOTONES AUXILIARES (HISTORIAL & REGLAS) */}
      <div className='grid grid-cols-2 gap-3 pt-1'>
        <button
          onClick={() => setView('archive')}
          className='p-3.5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center gap-2.5 hover:bg-slate-800/60 hover:border-amber-400/40 active:scale-[0.98] transition-all group'
        >
          <div className='w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform'>
            <History size={16} />
          </div>
          <div className='text-left min-w-0'>
            <h4 className='text-xs font-black uppercase italic text-white truncate'>Historial</h4>
            <p className='text-[8.5px] text-slate-400 font-bold uppercase tracking-wider truncate'>Palmarés</p>
          </div>
        </button>

        <button
          onClick={() => setView('rules')}
          className='p-3.5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center gap-2.5 hover:bg-slate-800/60 hover:border-blue-400/40 active:scale-[0.98] transition-all group'
        >
          <div className='w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform'>
            <Info size={16} />
          </div>
          <div className='text-left min-w-0'>
            <h4 className='text-xs font-black uppercase italic text-white truncate'>Reglamento</h4>
            <p className='text-[8.5px] text-slate-400 font-bold uppercase tracking-wider truncate'>Sistema</p>
          </div>
        </button>
      </div>

      <footer className='pt-4 pb-2 text-center opacity-50'>
        <p className='text-[8.5px] font-black uppercase tracking-widest text-slate-300'>
          Dice Football Hub · Champions Night Edition
        </p>
      </footer>
    </div>
  );
};
