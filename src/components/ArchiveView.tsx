// Salón de la Fama / Archive View
import React, { useState } from 'react';
import { ChevronLeft, X, Trophy, History, ArrowRight, BarChart3, Swords } from 'lucide-react';
import { Shield } from '@/components/ui/GameUI';
import TopWinnersTable from '@/components/TopWinnersTable';
import { CompetitionLogo } from '@/components/CompetitionLogo';

export const ArchiveView = ({ setView, archive, selectedArchiveEntry, setSelectedArchiveEntry }) => {
  const [palmaresModal, setPalmaresModal] = useState<null | { title: string; compId: string; div: number }>(null);
  const [archiveLeagueDiv, setArchiveLeagueDiv] = useState<1 | 2>(1);

  const nationalLeagues = [
    { id: 'L1', name: 'España', fullName: 'Liga Española', flag: '🇪🇸' },
    { id: 'L2', name: 'Italia', fullName: 'Liga Italiana', flag: '🇮🇹' },
    { id: 'L3', name: 'Inglaterra', fullName: 'Liga Inglesa', flag: '🇬🇧' },
    { id: 'L4', name: 'Alemania', fullName: 'Liga Alemana', flag: '🇩🇪' },
    { id: 'L5', name: 'Países Bajos', fullName: 'Liga Holandesa', flag: '🇳🇱' },
    { id: 'L6', name: 'Francia', fullName: 'Liga Francesa', flag: '🇫🇷' },
    { id: 'L7', name: 'Miscelánea', fullName: 'Liga Miscelánea', flag: '🇵🇹' },
    { id: 'L8', name: 'Miscelánea B', fullName: 'Liga Miscelánea B', flag: '🌍' }
  ];

  return (
  <div className='flex-grow flex flex-col'>

    <header className='flex items-center gap-3 mb-8 px-4'>
      <button onClick={() => selectedArchiveEntry ? setSelectedArchiveEntry(null) : setView('hub')} className='p-3 bg-slate-900/30 backdrop-blur-md rounded-2xl text-slate-300 hover:text-white active:scale-95 transition-all border border-white/10'><ChevronLeft /></button>
      <h2 className='text-xl font-black uppercase italic text-yellow-500 drop-shadow-md'>Salón de la Fama</h2>
    </header>

    <div className='px-4 pb-8'>
      {!selectedArchiveEntry ? (
        <div className='space-y-6'>
          {/* PALMARES Y ESTRELLAS POR COMPETICIÓN */}
          <div className='bg-slate-900/50 backdrop-blur-md rounded-3xl border border-amber-400/20 p-4 shadow-xl'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <Trophy size={16} className='text-amber-400' />
                <h3 className='text-xs font-black text-amber-300 uppercase tracking-wider italic'>Palmarés y Estrellas Históricas</h3>
              </div>
              <div className='flex bg-slate-950/80 rounded-xl p-0.5 border border-white/10'>
                <button
                  onClick={() => setArchiveLeagueDiv(1)}
                  className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${archiveLeagueDiv === 1 ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  1ª Div
                </button>
                <button
                  onClick={() => setArchiveLeagueDiv(2)}
                  className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${archiveLeagueDiv === 2 ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  2ª Div
                </button>
              </div>
            </div>

            {/* Torneos Internacionales */}
            <div className='grid grid-cols-2 gap-2 mb-3'>
              <button onClick={() => setPalmaresModal({ title: 'Palmarés Champions League', compId: 'C1', div: 1 })} className='flex items-center justify-center gap-2.5 rounded-2xl border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-indigo-500/10 px-3 py-2.5 text-center active:scale-95 transition-all shadow-md hover:border-blue-400/60'>
                <div className='w-7 h-7 rounded-lg bg-white border border-slate-200/90 shadow-sm flex items-center justify-center p-0.5 shrink-0'>
                  <CompetitionLogo compId="C1" size={20} showBackground={false} />
                </div>
                <span className='text-[9px] font-black uppercase italic tracking-wider text-blue-200'>Champions League</span>
              </button>
              <button onClick={() => setPalmaresModal({ title: 'Palmarés Copa del Mundo', compId: 'C2', div: 1 })} className='flex items-center justify-center gap-2.5 rounded-2xl border border-sky-400/30 bg-gradient-to-r from-sky-500/20 to-blue-500/10 px-3 py-2.5 text-center active:scale-95 transition-all shadow-md hover:border-sky-400/60'>
                <div className='w-7 h-7 rounded-lg bg-white border border-slate-200/90 shadow-sm flex items-center justify-center p-0.5 shrink-0'>
                  <CompetitionLogo compId="C2" size={22} showBackground={false} />
                </div>
                <span className='text-[9px] font-black uppercase italic tracking-wider text-sky-200'>Copa del Mundo</span>
              </button>
            </div>

            {/* Ligas Nacionales */}
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {nationalLeagues.map(l => (
                <button
                  key={l.id}
                  onClick={() => setPalmaresModal({ title: `Palmarés ${l.fullName} (${archiveLeagueDiv}ª Div)`, compId: l.id, div: archiveLeagueDiv })}
                  className='flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 hover:bg-amber-500/10 hover:border-amber-400/30 px-2.5 py-2 text-left active:scale-95 transition-all'
                >
                  <div className='w-7 h-7 rounded-lg bg-white border border-slate-200/90 shadow-sm flex items-center justify-center p-0.5 shrink-0'>
                    <CompetitionLogo compId={l.id} size={22} showBackground={false} />
                  </div>
                  <div className='min-w-0 flex-grow'>
                    <p className='text-[9px] font-black uppercase italic truncate text-slate-200'>{l.name}</p>
                    <p className='text-[7px] font-bold text-amber-400/80 uppercase tracking-widest'>{archiveLeagueDiv}ª División</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-300 font-bold uppercase italic tracking-widest text-center drop-shadow-md">Últimos Campeonatos Registrados</p>
          {archive.length === 0 ? (
            <div className='text-center py-16 bg-slate-900/30 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl'>
              <History size={40} className='mx-auto mb-3 text-slate-400' />
              <p className='text-xs font-black uppercase italic text-slate-300'>No hay registros guardados</p>
              <p className='text-[9px] font-bold text-slate-500 mt-1'>Los campeones de ligas y Champions aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            archive.map((entry, idx) => (
              <button key={entry.id || idx} onClick={() => setSelectedArchiveEntry(entry)} className='w-full p-4 bg-slate-900/30 backdrop-blur-md rounded-3xl border border-white/10 flex items-center gap-4 hover:bg-slate-800/50 active:scale-95 transition-all text-left shadow-lg group'>
                <div className='w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0 group-hover:scale-110 transition-transform'><Trophy size={24} /></div>
                <div className='flex-grow overflow-hidden'>
                  <h3 className='text-sm font-black uppercase italic truncate text-white'>{entry.name} {entry.div === 2 ? '(2ª Div)' : ''}</h3>
                  <p className='text-[10px] text-slate-300 font-bold'>{entry.date} • Campeón: {entry.winner?.name || 'Desconocido'}</p>
                </div>
                <ArrowRight size={16} className='text-slate-400 shrink-0 group-hover:text-yellow-500 transition-colors' />
              </button>
            ))
          )}
        </div>
      ) : (
        <div className='bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-yellow-500/40 p-6 relative overflow-hidden shadow-2xl'>
          <div className='absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none'></div>
          <div className="text-center relative z-10">
            <Trophy size={56} className='text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' />
            <h3 className='text-2xl font-black italic uppercase mb-1 text-white'>{selectedArchiveEntry.name} {selectedArchiveEntry.div === 2 ? '(2ª Div)' : ''}</h3>
            <p className='text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-6'>{selectedArchiveEntry.date}</p>

            <div className='bg-black/30 rounded-3xl p-6 mb-6 border border-white/10 backdrop-blur-sm'>
              <h4 className='text-[10px] font-black uppercase text-yellow-500/80 mb-4 tracking-widest'>Campeón del Torneo</h4>
              <div className='flex flex-col items-center justify-center gap-3'>
                <Shield color1={selectedArchiveEntry.winner?.color1} color2={selectedArchiveEntry.winner?.color2} initial={selectedArchiveEntry.winner?.name} size='lg' isFlag={selectedArchiveEntry.winner?.isFlag} />
                <span className='text-xl font-black uppercase italic text-yellow-400 mt-2'>{selectedArchiveEntry.winner?.name}</span>
              </div>
            </div>

            {selectedArchiveEntry.type === 'league' && selectedArchiveEntry.teams && (
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5 text-left">
                <h4 className='text-[10px] font-black uppercase text-slate-300 mb-3 flex items-center gap-2'><BarChart3 size={14}/> Top 4 Clasificación</h4>
                <div className="space-y-2">
                  {[...selectedArchiveEntry.teams].sort((a,b)=>b.pts-a.pts || (b.gf-b.ga)-(a.gf-a.ga)).slice(0, 4).map((t, i) => (
                    <div key={i} className={`flex items-center justify-between text-[10px] p-2 rounded-xl ${i===0 ? 'bg-yellow-500/20 text-yellow-100 font-black' : 'bg-black/20 text-slate-200 font-bold'}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-3 text-slate-400">{i+1}</span>
                            <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag}/>
                            <span className="uppercase italic">{t.name}</span>
                        </div>
                        <span className="text-emerald-400">{t.pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedArchiveEntry.type !== 'league' && selectedArchiveEntry.bracket?.Final && selectedArchiveEntry.bracket.Final[0] && (
               <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                 <h4 className='text-[10px] font-black uppercase text-slate-300 mb-3 flex justify-center items-center gap-2'><Swords size={14}/> La Gran Final</h4>
                 {(() => {
                   const finalMatch = selectedArchiveEntry.bracket.Final[0];
                   const home = selectedArchiveEntry.teams?.find(t => t.id === finalMatch.hId);
                   const away = selectedArchiveEntry.teams?.find(t => t.id === finalMatch.aId);
                   return (
                     <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 w-20">
                           <Shield color1={home?.color1} color2={home?.color2} initial={home?.name} size='xs' isFlag={home?.isFlag}/>
                           <span className="text-[9px] font-bold uppercase truncate">{home?.name}</span>
                        </div>
                        <div className="flex flex-col items-center">
                           <span className="bg-slate-900/50 px-3 py-1 rounded text-[11px] font-black tabular-nums">{finalMatch.sh} - {finalMatch.sa}</span>
                           {finalMatch.penH !== null && finalMatch.penH !== undefined && (
                             <span className="text-[8px] text-blue-300 font-bold mt-1">(pen {finalMatch.penH}-{finalMatch.penA})</span>
                           )}
                        </div>
                        <div className="flex items-center gap-2 w-20 justify-end">
                           <span className="text-[9px] font-bold uppercase truncate text-right">{away?.name}</span>
                           <Shield color1={away?.color1} color2={away?.color2} initial={away?.name} size='xs' isFlag={away?.isFlag}/>
                        </div>
                     </div>
                   );
                 })()}
               </div>
            )}
          </div>
        </div>
            )}
    </div>

    {palmaresModal && (
      <div className='fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto custom-scrollbar' onClick={() => setPalmaresModal(null)}>
        <div className='flex items-center justify-between mb-6 mt-4' onClick={(e) => e.stopPropagation()}>
          <h2 className='text-xl font-black uppercase italic text-yellow-400 drop-shadow-md'>{palmaresModal.title}</h2>
          <button onClick={() => setPalmaresModal(null)} className='p-3 bg-slate-900/30 rounded-2xl text-slate-300 hover:text-white active:scale-95 transition-all border border-white/10'><X /></button>
        </div>
        <div className='max-w-md mx-auto w-full' onClick={(e) => e.stopPropagation()}>
          <TopWinnersTable compId={palmaresModal.compId} div={palmaresModal.div} emptyLabel='Todavía no hay campeones registrados.' />
        </div>
      </div>
    )}
  </div>
  );
};

