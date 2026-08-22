// Modal for viewing Champions, UEL, World Cup and League Palmares / Historic Champions
import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { Trophy, Star, Shield as ShieldIcon, Flame, ShieldAlert, Award, TrendingUp } from 'lucide-react';
import { Shield } from '@/components/ui/GameUI';
import TopWinnersTable from '@/components/TopWinnersTable';
import { ChampionRecord, resolveTeamVisuals, enrichChampionRecord, buildSeasonRecord, buildCupSeasonRecord } from '@/lib/palmaresHelper';
import { getTitles, subscribeTitles, getPalmaresVersion, TitleEntry } from '@/lib/palmares';

const useTitlesVersion = () =>
  useSyncExternalStore(
    (cb) => subscribeTitles(cb),
    () => getPalmaresVersion(),
    () => "0",
  );

export const ChampionsHistoryModal = ({ 
  championsHistory = [], 
  archive = [],
  comps = {},
  onClose, 
  title = 'Palmarés', 
  compId = null, 
  div = 1, 
  showTopWinners = true 
}: { 
  championsHistory?: ChampionRecord[]; 
  archive?: any[];
  comps?: Record<string, any>;
  onClose?: () => void; 
  title?: string; 
  compId?: string | null; 
  div?: number; 
  showTopWinners?: boolean; 
}) => {
  const [tab, setTab] = useState<'history' | 'winners'>('history');
  const version = useTitlesVersion();
  const canShowWinners = showTopWinners || !!compId;

  const isCupTournament = compId === 'C1' || compId === 'C2' || compId === 'C3';

  // Unificar y enriquecer registros locales, archivo y almacenamiento histórico con TODOS los datos extras
  const mergedHistory: ChampionRecord[] = useMemo(() => {
    const map = new Map<number, ChampionRecord>();

    // 1. Integrar registros directos de championsHistory pasados por prop
    (championsHistory || []).forEach(r => {
      if (r && r.season && (r.champion?.name || (r as any).winner?.name)) {
        const enriched = enrichChampionRecord(r, compId, div);
        map.set(r.season, enriched);
      }
    });

    // 2. Integrar registros de comp en comps
    if (compId && comps?.[compId]) {
      const compHist = div === 2 ? comps[compId].championsHistory2 : comps[compId].championsHistory;
      if (Array.isArray(compHist)) {
        compHist.forEach((r: any) => {
          if (r && r.season && (r.champion?.name || r.winner?.name)) {
            if (!map.has(r.season)) {
              map.set(r.season, enrichChampionRecord(r, compId, div));
            }
          }
        });
      }
    }

    // 3. Reconstruir temporadas guardadas en archive para esta competición y división
    if (compId && Array.isArray(archive)) {
      archive.forEach((entry: any) => {
        if (!entry || !entry.season) return;
        if (entry.compId === compId && (Number(entry.div || 1) === Number(div || 1))) {
          if (!map.has(entry.season) || !map.get(entry.season)?.records?.topScoring?.value) {
            let computedRecord: ChampionRecord | null = null;
            if (entry.type === 'league' || (!entry.type && !isCupTournament)) {
              if (Array.isArray(entry.teams) && entry.teams.length >= 2) {
                computedRecord = buildSeasonRecord(entry.teams, entry.season);
              }
            } else {
              computedRecord = buildCupSeasonRecord(entry, entry.season, entry.winner);
            }
            if (computedRecord) {
              map.set(entry.season, enrichChampionRecord(computedRecord, compId, div));
            }
          }
        }
      });
    }

    // 4. Integrar títulos registrados en el almacenamiento permanente (getTitles)
    if (compId) {
      const titles = getTitles().filter(t => t.compId === compId && (Number(t.div || 1) === Number(div || 1)));
      titles.forEach(t => {
        if (!map.has(t.season) && t.winner?.name) {
          const enriched = enrichChampionRecord({
            season: t.season,
            champion: t.winner,
            runnerUp: t.runnerUp,
            thirdPlace: t.thirdPlace,
            finalMatch: t.finalMatch,
            records: t.records
          }, compId, div);
          map.set(t.season, enriched);
        } else if (map.has(t.season)) {
          // Fusionar posibles datos extras del título permanente si faltaban
          const current = map.get(t.season)!;
          if ((!current.records || current.records.topScoring?.value <= 0) && t.records) {
            map.set(t.season, enrichChampionRecord({
              ...current,
              records: t.records,
              runnerUp: current.runnerUp || t.runnerUp,
              thirdPlace: current.thirdPlace || t.thirdPlace,
              finalMatch: current.finalMatch || t.finalMatch
            }, compId, div));
          }
        }
      });
    }

    return Array.from(map.values())
      .sort((a, b) => b.season - a.season)
      .slice(0, 10);
  }, [championsHistory, archive, comps, compId, div, version, isCupTournament]);

  return (
    <div className='fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3' onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className='w-full max-w-lg bg-slate-900 border border-amber-400/30 rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
        <div className='flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/20 to-transparent shrink-0'>
          <div className='flex min-w-0 items-center gap-2'>
            <Trophy size={18} className='shrink-0 text-amber-400' />
            <h3 className='truncate text-sm font-black uppercase italic text-amber-300'>{title}</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className='shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-300 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg active:scale-95 transition-all'>Cerrar</button>
          )}
        </div>

        {canShowWinners && (
          <div className='grid grid-cols-2 gap-2 px-3 pt-3 shrink-0'>
            <button 
              onClick={() => setTab('history')} 
              className={`rounded-xl border px-2 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5 ${tab === 'history' ? 'border-amber-400/50 bg-amber-500/25 text-amber-200 shadow-md' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              <Trophy size={11} className={tab === 'history' ? 'text-amber-400' : 'text-slate-400'} />
              Últimos 10 campeones
            </button>
            <button 
              onClick={() => setTab('winners')} 
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all ${tab === 'winners' ? 'border-amber-400/50 bg-amber-500/25 text-amber-200 shadow-md' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
            >
              <Star size={11} className={tab === 'winners' ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} /> 
              Máximos ganadores
            </button>
          </div>
        )}

        {canShowWinners && tab === 'winners' ? (
          <div className='overflow-y-auto p-3 custom-scrollbar flex-grow'>
            <TopWinnersTable 
              compId={compId as string} 
              div={div} 
              records={mergedHistory} 
              emptyLabel={isCupTournament ? 'Aún no se ha registrado ningún campeón en este torneo continental.' : 'Aún no se ha ganado ningún título en esta competición.'} 
            />
          </div>
        ) : (
          <div className='overflow-y-auto p-3 space-y-3 custom-scrollbar flex-grow'>
            {!mergedHistory.length ? (
              <div className='py-14 text-center space-y-2'>
                <Trophy size={36} className='mx-auto text-amber-400/40 animate-pulse' />
                <p className='text-xs font-black uppercase italic text-slate-300'>
                  El palmarés está esperando a su primer campeón.
                </p>
                <p className='text-[9px] font-bold text-slate-400 max-w-xs mx-auto'>
                  Al concluir la temporada o torneo, los campeones y todos los datos extras quedarán inmortalizados aquí.
                </p>
              </div>
            ) : mergedHistory.map((r, i) => {
              const champVis = resolveTeamVisuals(r.champion.name, r.champion);
              const runnerVis = r.runnerUp ? resolveTeamVisuals(r.runnerUp.name, r.runnerUp) : null;
              const thirdVis = r.thirdPlace ? resolveTeamVisuals(r.thirdPlace.name, r.thirdPlace) : null;

              const topScorerVis = r.records?.topScoring?.name ? resolveTeamVisuals(r.records.topScoring.name) : null;
              const bestDefVis = r.records?.bestDefense?.name ? resolveTeamVisuals(r.records.bestDefense.name) : null;
              const bestDgVis = r.records?.bestGoalDiff?.name ? resolveTeamVisuals(r.records.bestGoalDiff.name) : null;
              const mostWinsVis = r.records?.mostWins?.name ? resolveTeamVisuals(r.records.mostWins.name) : null;

              return (
                <div key={`${r.season}-${i}`} className='rounded-2xl border border-amber-400/25 bg-slate-950/80 p-3.5 shadow-lg hover:border-amber-400/50 transition-all'>
                  {/* CABECERA: TEMPORADA, CAMPEÓN Y PUNTOS */}
                  <div className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pb-2 border-b border-white/5'>
                    <div className='flex items-center justify-center shrink-0'>
                      <Shield color1={champVis.color1} color2={champVis.color2} initial={champVis.name} size='md' isFlag={champVis.isFlag} />
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30'>
                          Temporada {r.season}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 mt-0.5'>
                        <p className='truncate text-sm font-black uppercase italic text-white'>{champVis.name}</p>
                        <Trophy size={12} className='text-amber-400 shrink-0 fill-amber-400' />
                      </div>
                      {/* Resumen de rendimiento del campeón */}
                      {!isCupTournament && (
                        <div className='flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-bold text-slate-400'>
                          <span className='text-emerald-400 font-black'>{r.champion.w || 0}V</span>
                          <span>·</span>
                          <span className='text-slate-300 font-black'>{r.champion.d || 0}E</span>
                          <span>·</span>
                          <span className='text-rose-400 font-black'>{r.champion.l || 0}D</span>
                          <span>—</span>
                          <span className='text-slate-300'>{r.champion.gf} GF / {r.champion.ga} GC</span>
                          <span className='text-amber-300 font-black'>({(r.champion.gd !== undefined ? r.champion.gd : (r.champion.gf - r.champion.ga)) > 0 ? '+' : ''}{r.champion.gd !== undefined ? r.champion.gd : (r.champion.gf - r.champion.ga)} DG)</span>
                        </div>
                      )}
                    </div>
                    {r.champion.pts > 0 && !isCupTournament ? (
                      <div className='text-right'>
                        <span className='shrink-0 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 px-2.5 py-1.5 text-xs font-black text-amber-300 shadow-sm block'>
                          {r.champion.pts} PTS
                        </span>
                      </div>
                    ) : (
                      <span className='shrink-0 flex items-center gap-1 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/25 to-amber-600/10 px-2.5 py-1.5 text-[9px] font-black text-amber-300 uppercase tracking-wider shadow-sm'>
                        <Trophy size={11} className='text-amber-400 fill-amber-400' /> Campeón
                      </span>
                    )}
                  </div>

                  {/* RESULTADO DE LA GRAN FINAL (EN COPAS / MUNDIAL) */}
                  {r.finalMatch && (
                    <div className='mt-2.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 flex items-center justify-between text-[10px]'>
                      <span className='text-[8px] font-black uppercase text-amber-400/90 tracking-wider'>🏆 Gran Final</span>
                      <div className='flex items-center gap-2 font-black text-white'>
                        <span className='truncate max-w-[100px] text-right text-slate-300'>{r.finalMatch.homeName}</span>
                        <span className='bg-slate-900 px-2 py-0.5 rounded text-amber-300 tabular-nums border border-white/10'>
                          {r.finalMatch.homeScore} - {r.finalMatch.awayScore}
                          {r.finalMatch.penH !== null && r.finalMatch.penH !== undefined && (
                            <span className='text-[8px] text-amber-400 ml-1'>({r.finalMatch.penH}-{r.finalMatch.penA}p)</span>
                          )}
                        </span>
                        <span className='truncate max-w-[100px] text-slate-300'>{r.finalMatch.awayName}</span>
                      </div>
                    </div>
                  )}

                  {/* PODIO: SUBCAMPEÓN Y TERCER PUESTO */}
                  {(runnerVis || thirdVis) && (
                    <div className='flex flex-wrap items-center gap-2 mt-2'>
                      {runnerVis && (
                        <div className='text-[9px] font-bold text-slate-300 flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-xl border border-white/5'>
                          <Shield color1={runnerVis.color1} color2={runnerVis.color2} initial={runnerVis.name} size='xs' isFlag={runnerVis.isFlag} />
                          <span>🥈 2º {runnerVis.name}</span>
                          {r.runnerUp?.pts ? <span className='text-amber-400/90 font-black'>({r.runnerUp.pts} pts)</span> : null}
                        </div>
                      )}
                      {thirdVis && (
                        <div className='text-[9px] font-bold text-amber-200/90 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20'>
                          <Shield color1={thirdVis.color1} color2={thirdVis.color2} initial={thirdVis.name} size='xs' isFlag={thirdVis.isFlag} />
                          <span>🥉 3º {thirdVis.name}</span>
                          {r.thirdPlace?.pts ? <span className='text-amber-400 font-black'>({r.thirdPlace.pts} pts)</span> : null}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE DE DATOS EXTRAS / RÉCORDS DE LA TEMPORADA */}
                  {r.records && (
                    <div className='mt-2.5 pt-2 border-t border-white/5'>
                      <p className='text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1'>
                        <Award size={10} className='text-amber-400' /> Datos Extras y Récords de la Edición
                      </p>
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-1.5'>
                        {/* MÁXIMO GOLEADOR */}
                        <div className='rounded-xl bg-white/[0.04] p-2 border border-emerald-500/20'>
                          <div className='flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-emerald-400'>
                            <Flame size={9} /> Máx. Ataque
                          </div>
                          <div className='flex items-center gap-1.5 mt-1'>
                            {topScorerVis && <Shield color1={topScorerVis.color1} color2={topScorerVis.color2} initial={topScorerVis.name} size='xs' isFlag={topScorerVis.isFlag} />}
                            <p className='truncate text-[10px] font-black text-white'>{r.records.topScoring?.name || champVis.name}</p>
                          </div>
                          <p className='text-[9px] font-black text-emerald-400 mt-0.5'>{r.records.topScoring?.value || r.champion.gf} GF</p>
                        </div>

                        {/* MEJOR DEFENSA */}
                        <div className='rounded-xl bg-white/[0.04] p-2 border border-sky-500/20'>
                          <div className='flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-sky-400'>
                            <ShieldAlert size={9} /> Mejor Defensa
                          </div>
                          <div className='flex items-center gap-1.5 mt-1'>
                            {bestDefVis && <Shield color1={bestDefVis.color1} color2={bestDefVis.color2} initial={bestDefVis.name} size='xs' isFlag={bestDefVis.isFlag} />}
                            <p className='truncate text-[10px] font-black text-white'>{r.records.bestDefense?.name || champVis.name}</p>
                          </div>
                          <p className='text-[9px] font-black text-sky-400 mt-0.5'>{r.records.bestDefense?.value || r.champion.ga} GC</p>
                        </div>

                        {/* MEJOR DIFERENCIAL DE GOL */}
                        <div className='rounded-xl bg-white/[0.04] p-2 border border-amber-500/20'>
                          <div className='flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-amber-400'>
                            <TrendingUp size={9} /> Mejor DG
                          </div>
                          <div className='flex items-center gap-1.5 mt-1'>
                            {bestDgVis && <Shield color1={bestDgVis.color1} color2={bestDgVis.color2} initial={bestDgVis.name} size='xs' isFlag={bestDgVis.isFlag} />}
                            <p className='truncate text-[10px] font-black text-white'>{r.records.bestGoalDiff?.name || champVis.name}</p>
                          </div>
                          <p className='text-[9px] font-black text-amber-300 mt-0.5'>
                            {((r.records.bestGoalDiff?.value ?? 0) > 0 ? '+' : '')}{r.records.bestGoalDiff?.value ?? (r.champion.gf - r.champion.ga)} DG
                          </p>
                        </div>

                        {/* MÁS VICTORIAS */}
                        <div className='rounded-xl bg-white/[0.04] p-2 border border-purple-500/20'>
                          <div className='flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-purple-400'>
                            <Trophy size={9} /> Más Victorias
                          </div>
                          <div className='flex items-center gap-1.5 mt-1'>
                            {mostWinsVis && <Shield color1={mostWinsVis.color1} color2={mostWinsVis.color2} initial={mostWinsVis.name} size='xs' isFlag={mostWinsVis.isFlag} />}
                            <p className='truncate text-[10px] font-black text-white'>{r.records.mostWins?.name || champVis.name}</p>
                          </div>
                          <p className='text-[9px] font-black text-purple-300 mt-0.5'>{r.records.mostWins?.value || r.champion.w || 0} Triunfos</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
