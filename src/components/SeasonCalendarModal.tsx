import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Trophy, Shield as ShieldIcon, Sparkles, 
  CheckCircle, Clock, ChevronRight, AlertCircle, Briefcase, Flame, Layers
} from 'lucide-react';
import { SEASON_CALENDAR_42_WEEKS, SemanaCalendario, Fixture, Competicion, Slot } from '../lib/seasonCalendar';
import { CompetitionLogo } from './CompetitionLogo';

interface SeasonCalendarModalProps {
  currentWeek: number;
  isOpen: boolean;
  onClose: () => void;
  onSimulateWeek?: () => void;
  userTeamName?: string;
  userEuropeanComp?: 'CHAMPIONS' | 'EUROPA_LEAGUE' | 'NONE';
  seasonNumber?: number;
}

export const SeasonCalendarModal: React.FC<SeasonCalendarModalProps> = ({
  currentWeek,
  isOpen,
  onClose,
  onSimulateWeek,
  userTeamName,
  userEuropeanComp = 'CHAMPIONS',
  seasonNumber = 1
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | Competicion>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const months = ['ALL', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];

  const filteredWeeks = SEASON_CALENDAR_42_WEEKS.filter(week => {
    if (selectedMonth !== 'ALL' && week.mes !== selectedMonth) return false;
    if (activeFilter === 'ALL') return true;
    return week.fixtures.some(f => f.competicion === activeFilter);
  });

  const getCompBadge = (comp: Competicion) => {
    switch (comp) {
      case 'CHAMPIONS':
        return {
          label: 'Champions League',
          bg: 'bg-blue-950/70 border-blue-500/40 text-blue-300',
          icon: <CompetitionLogo compId="C1" size={13} showBackground={false} />
        };
      case 'EUROPA_LEAGUE':
        return {
          label: 'Europa League',
          bg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
          icon: <CompetitionLogo compId="C3" size={13} showBackground={false} />
        };
      case 'LIGA':
      default:
        return {
          label: 'Liga Regular',
          bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
          icon: <ShieldIcon size={11} className="text-emerald-400" />
        };
    }
  };

  const getSlotBadge = (slot: Slot) => {
    switch (slot) {
      case 'FINDE':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">Finde</span>;
      case 'MITAD':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">Mitad de Semana</span>;
      case 'UNICO':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">Partido Único</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[8.5px] font-black uppercase border border-emerald-400/30">
                  Temporada {seasonNumber}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  42 Semanas Oficiales
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase italic text-white tracking-tight mt-0.5">
                Calendario de la Temporada
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTROLES / FILTROS */}
        <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-900/60 border-b border-white/10 flex flex-col gap-2.5 shrink-0">
          {/* Filtro por competición */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[9px] font-black uppercase">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                activeFilter === 'ALL'
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas las Competiciones
            </button>
            <button
              onClick={() => setActiveFilter('LIGA')}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'LIGA'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldIcon size={12} /> Liga
            </button>
            <button
              onClick={() => setActiveFilter('CHAMPIONS')}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'CHAMPIONS'
                  ? 'bg-blue-700 border-blue-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CompetitionLogo compId="C1" size={12} showBackground={false} /> Champions League
            </button>
            <button
              onClick={() => setActiveFilter('EUROPA_LEAGUE')}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'EUROPA_LEAGUE'
                  ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CompetitionLogo compId="C3" size={12} showBackground={false} /> Europa League
            </button>
          </div>

          {/* Filtro por Mes */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[8.5px] font-bold uppercase">
            <span className="text-slate-500 font-black mr-1 text-[8px]">Mes:</span>
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                  selectedMonth === m
                    ? 'bg-slate-200 text-slate-950 font-black border-white'
                    : 'bg-black/30 text-slate-400 border-white/5 hover:text-slate-200'
                }`}
              >
                {m === 'ALL' ? 'Todos' : m}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE SEMANAS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-white/5">
          {filteredWeeks.map(week => {
            const isCurrent = week.weekIndex === currentWeek;
            const isCompleted = week.weekIndex < currentWeek;
            const isFuture = week.weekIndex > currentWeek;

            return (
              <div
                key={week.weekIndex}
                className={`pt-3.5 first:pt-0 rounded-2xl transition-all ${
                  isCurrent
                    ? 'p-3.5 bg-blue-950/30 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-transparent'
                }`}
              >
                {/* Header de la semana */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                      isCurrent
                        ? 'bg-blue-500 text-white shadow-md'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      Semana {week.weekIndex}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                      {week.mes}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle size={10} /> Disputada
                      </span>
                    )}
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[8.5px] font-black uppercase text-blue-300 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-400/40 animate-pulse">
                        <Clock size={11} /> Semana Actual
                      </span>
                    )}
                    {isFuture && (
                      <span className="text-[8px] font-bold uppercase text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-white/5">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                {/* Fixtures de la semana */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {week.fixtures.map((fix: Fixture) => {
                    const badge = getCompBadge(fix.competicion);
                    return (
                      <div
                        key={fix.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                          fix.esPartido
                            ? 'bg-slate-900/60 border-white/10'
                            : 'bg-slate-950/50 border-dashed border-white/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border flex items-center gap-1 ${badge.bg}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                            {getSlotBadge(fix.slot)}
                          </div>
                          {!fix.esPartido && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 text-[7.5px] font-black uppercase">
                              Hito / Evento
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-black text-white uppercase italic tracking-tight">
                            {fix.title || fix.ronda}
                          </p>
                          {fix.desc && (
                            <p className="text-[8.5px] text-slate-400 font-medium leading-snug mt-0.5">
                              {fix.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[9px] text-slate-400 font-bold uppercase">
            Semana activa: <strong className="text-white">Semana {currentWeek} de 42</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              Cerrar
            </button>
            {onSimulateWeek && currentWeek <= 42 && (
              <button
                onClick={() => {
                  onClose();
                  onSimulateWeek();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase italic tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <span>Simular Semana {currentWeek}</span>
                <ChevronRight size={13} className="stroke-[3]" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
