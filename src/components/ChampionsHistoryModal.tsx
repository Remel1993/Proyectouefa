// Modal for viewing Champions and League Palmares / Historic Champions
import React, { useState } from 'react';
import { Trophy, Star } from 'lucide-react';
import { Shield } from '@/components/ui/GameUI';
import TopWinnersTable from '@/components/TopWinnersTable';
import { ChampionRecord } from '@/lib/palmaresHelper';

export const ChampionsHistoryModal = ({ 
  championsHistory = [], 
  onClose, 
  title = 'Palmarés', 
  compId = null, 
  div = 1, 
  showTopWinners = false 
}: { 
  championsHistory?: ChampionRecord[]; 
  onClose?: () => void; 
  title?: string; 
  compId?: string | null; 
  div?: number; 
  showTopWinners?: boolean; 
}) => {
  const [tab, setTab] = useState<'history' | 'winners'>('history');
  const canShowWinners = (showTopWinners || !!compId) && !!compId;

  return (
    <div className='fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3' onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className='w-full max-w-md bg-slate-900 border border-amber-400/30 rounded-[1.75rem] shadow-2xl overflow-hidden'>
        <div className='flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/20 to-transparent'>
          <div className='flex min-w-0 items-center gap-2'>
            <Trophy size={16} className='shrink-0 text-amber-400' />
            <h3 className='truncate text-sm font-black uppercase italic text-amber-300'>{title}</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className='shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg active:scale-95'>Cerrar</button>
          )}
        </div>
        {canShowWinners && (
          <div className='grid grid-cols-2 gap-2 px-3 pt-3'>
            <button onClick={() => setTab('history')} className={`rounded-xl border px-2 py-2 text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all ${tab === 'history' ? 'border-amber-400/40 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              Últimos 10 campeones
            </button>
            <button onClick={() => setTab('winners')} className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all ${tab === 'winners' ? 'border-amber-400/40 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              <Star size={10} className={tab === 'winners' ? 'fill-amber-400 text-amber-400' : ''} /> Máximos ganadores
            </button>
          </div>
        )}
        {canShowWinners && tab === 'winners' ? (
          <div className='max-h-[70vh] overflow-y-auto p-3'>
            <TopWinnersTable compId={compId as string} div={div} records={championsHistory} emptyLabel='Aún no se ha ganado ningún título en esta liga.' />
          </div>
        ) : (
          <div className='max-h-[70vh] overflow-y-auto p-3 space-y-2.5'>
            {!championsHistory.length ? (
              <p className='py-10 text-center text-[11px] font-bold italic text-slate-500'>
                El palmarés está esperando a su primer campeón.
              </p>
            ) : championsHistory.map((r, i) => (
              <div key={`${r.season}-${i}`} className='rounded-2xl border border-amber-400/20 bg-slate-950/70 p-3'>
                <div className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3'>
                  <Shield color1={r.champion.color1} color2={r.champion.color2} initial={r.champion.name} size='sm' isFlag={r.champion.isFlag} />
                  <div className='min-w-0'>
                    <p className='text-[8px] font-black uppercase tracking-widest text-amber-400'>Temporada {r.season}</p>
                    <p className='truncate text-[13px] font-black uppercase italic text-white'>{r.champion.name}</p>
                    <div className='flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5'>
                      {r.runnerUp && (
                        <span className='text-[9px] font-bold text-slate-400'>🥈 2º {r.runnerUp.name}</span>
                      )}
                      {r.thirdPlace && (
                        <span className='text-[9px] font-bold text-amber-400'>🥉 3º {r.thirdPlace.name}</span>
                      )}
                    </div>
                  </div>
                  <span className='shrink-0 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300'>{r.champion.pts} PTS</span>
                </div>
                <div className='mt-2.5 grid grid-cols-2 gap-2'>
                  <div className='rounded-xl bg-white/5 px-2 py-1.5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Máx. goleador (equipo)</p>
                    <p className='truncate text-[10px] font-black text-emerald-400'>{r.records.topScoring.name} · {r.records.topScoring.value} GF</p>
                  </div>
                  <div className='rounded-xl bg-white/5 px-2 py-1.5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Mejor defensa</p>
                    <p className='truncate text-[10px] font-black text-sky-400'>{r.records.bestDefense.name} · {r.records.bestDefense.value} GC</p>
                  </div>
                  <div className='rounded-xl bg-white/5 px-2 py-1.5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Mejor DG</p>
                    <p className='truncate text-[10px] font-black text-amber-300'>{r.records.bestGoalDiff.name} · {r.records.bestGoalDiff.value > 0 ? '+' : ''}{r.records.bestGoalDiff.value}</p>
                  </div>
                  <div className='rounded-xl bg-white/5 px-2 py-1.5'>
                    <p className='text-[7px] font-black uppercase tracking-widest text-slate-400'>Más victorias</p>
                    <p className='truncate text-[10px] font-black text-fuchsia-300'>{r.records.mostWins.name} · {r.records.mostWins.value}V</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
