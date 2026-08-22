// Tournament, League and Cup Configuration Panel
import React, { useState } from 'react';
import { 
  ChevronLeft, Save, RotateCcw, Plus, Trash2, Shuffle, Wand2, Globe, Flag, 
  Shield as ShieldIcon, Info, AlertTriangle, Check, Users, BarChart3,
  Sparkles, Trophy, Layers, Dices, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AttrStepper, MenuButton } from '@/components/ui/GameUI';
import { CompetitionLogo } from '@/components/CompetitionLogo';
import { PRESETS, PRESETS_2 } from '@/lib/presets';
import { ALL_WORLD_CUP_TEAMS, buildDynamicWCPool } from '@/lib/worldCup';
import { getCountryCode, getCountryFlagUrl, inferCountryRegion } from '@/lib/countries';
import { getPresetStatsForTeam, getAuthenticTeamStats } from '@/lib/teamStats';
import { WC_POPULAR_SUGGESTIONS } from '@/lib/newsGenerator';
import { 
  buildUELKnockout, buildCLPool, drawKnockoutGroups, 
  getDefaultComps, getShuffleData 
} from '@/lib/knockoutEngine';
import { APP_ID, generateLeagueSchedule } from '@/lib/leagueEngine';

export const ConfigPanel = ({ initialComp, compId, onSave, onCancel, onTotalReset }) => {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(initialComp)));
  const [editDiv, setEditDiv] = useState(1);
  const [drawModal, setDrawModal] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [validationWarningModal, setValidationWarningModal] = useState<{
    type: 'excess' | 'deficit';
    count: number;
    diff: number;
  } | null>(null);

  // Estados para competiciones de copa (Champions, Europa League y Copa del Mundo)
  const isWC = compId === 'C2' || draft.id === 'C2' || !!draft.isWorldCup || (draft.name || '').includes('Mundial') || (draft.name || '').includes('Copa del Mundo');
  const isCL = (compId === 'C1' || draft.id === 'C1' || (draft.name || '').includes('Champions')) && compId !== 'C3' && draft.id !== 'C3' && !(draft.name || '').includes('Europa');
  const isUEL = compId === 'C3' || draft.id === 'C3' || (draft.name || '').includes('Europa');
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryAtt, setNewCountryAtt] = useState(3);
  const [newCountryOpp, setNewCountryOpp] = useState(3);
  const [newCountryDef, setNewCountryDef] = useState(3);
  const [newCountryColor1, setNewCountryColor1] = useState('#0033a0');
  const [newCountryColor2, setNewCountryColor2] = useState('#ffffff');
  const [newCountryRegion, setNewCountryRegion] = useState('EU');
  const [annexToast, setAnnexToast] = useState<string | null>(null);

  const hasStarted = initialComp.type === 'league' 
    ? (initialComp.matchday > 0 || initialComp.matchday2 > 0 || initialComp.history?.length > 0)
    : (initialComp.matchday > 0 || initialComp.history?.length > 0);

  const handleSaveAttempt = () => {
    if (isWC || isCL) {
      const count = (draft.teams || []).length;
      if (count > 32) {
        setValidationWarningModal({
          type: 'excess',
          count,
          diff: count - 32
        });
        return;
      }
      if (count < 32) {
        setValidationWarningModal({
          type: 'deficit',
          count,
          diff: 32 - count
        });
        return;
      }
    } else if (isUEL) {
      const count = (draft.teams || []).length;
      if (count > 24) {
        setValidationWarningModal({
          type: 'excess',
          count,
          diff: count - 24
        });
        return;
      }
      if (count < 24) {
        setValidationWarningModal({
          type: 'deficit',
          count,
          diff: 24 - count
        });
        return;
      }
    }
    onSave(draft);
  };

  const currentTeams = editDiv === 2 ? draft.teams2 : draft.teams;
  const updateTeamAttr = (id, field, val) => {
    if (editDiv === 2) {
      setDraft(prev => ({ ...prev, teams2: prev.teams2.map(t => t.id === id ? { ...t, [field]: val } : t) }));
    } else {
      setDraft(prev => ({ ...prev, teams: prev.teams.map(t => t.id === id ? { ...t, [field]: val } : t) }));
    }
  };

  const handleCountryNameInput = (nameVal) => {
    setNewCountryName(nameVal);
    if (nameVal && nameVal.trim()) {
      const matchTeam = ALL_WORLD_CUP_TEAMS.find(t => t.name.toLowerCase() === nameVal.trim().toLowerCase());
      if (matchTeam) {
        setNewCountryAtt(matchTeam.att);
        setNewCountryOpp(matchTeam.opp);
        setNewCountryDef(matchTeam.def);
        setNewCountryColor1(matchTeam.color1);
        setNewCountryColor2(matchTeam.color2);
        setNewCountryRegion(matchTeam.region);
      } else {
        const inferred = inferCountryRegion(nameVal);
        if (inferred) setNewCountryRegion(inferred);
      }
    }
  };

  const handleSelectQuickCountry = (sug) => {
    const catalogEntry = ALL_WORLD_CUP_TEAMS.find(t => t.name.toLowerCase() === sug.name.toLowerCase());
    setNewCountryName(sug.name);
    if (catalogEntry) {
      setNewCountryAtt(catalogEntry.att);
      setNewCountryOpp(catalogEntry.opp);
      setNewCountryDef(catalogEntry.def);
      setNewCountryColor1(catalogEntry.color1);
      setNewCountryColor2(catalogEntry.color2);
      setNewCountryRegion(catalogEntry.region);
    } else {
      setNewCountryRegion(sug.region);
    }
    setAnnexToast(`Seleccionado: ${sug.name}. Pulsa "Anexar Selección" para añadirlo.`);
    setTimeout(() => setAnnexToast(null), 3000);
  };

  const handleAnnexCountry = (e) => {
    e?.preventDefault();
    const cleanName = (newCountryName || '').trim();
    if (!cleanName) return;

    const existingList = draft.teams || [];
    const alreadyExists = existingList.some(t => (t.name || '').toLowerCase() === cleanName.toLowerCase());
    if (alreadyExists) {
      setAnnexToast(`⚠️ '${cleanName}' ya está en la lista de selecciones.`);
      setTimeout(() => setAnnexToast(null), 3000);
      return;
    }

    const nextId = existingList.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
    const newTeam = {
      id: nextId,
      name: cleanName,
      att: newCountryAtt,
      opp: newCountryOpp,
      def: newCountryDef,
      color1: newCountryColor1,
      color2: newCountryColor2,
      isFlag: true,
      region: newCountryRegion,
      p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
    };

    const newCount = existingList.length + 1;
    setDraft(prev => ({
      ...prev,
      teams: [...(prev.teams || []), newTeam]
    }));

    setNewCountryName('');
    if (newCount > 32) {
      setAnnexToast(`¡${cleanName} anexado! (Tienes ${newCount}/32: Recuerda eliminar ${newCount - 32} selección para poder guardar)`);
    } else if (newCount === 32) {
      setAnnexToast(`¡${cleanName} anexado! ¡Tienes las 32 selecciones completas!`);
    } else {
      setAnnexToast(`¡Selección de ${cleanName} anexada! (${newCount}/32 selecciones)`);
    }
    setTimeout(() => setAnnexToast(null), 4000);
  };

  const handleRemoveTeam = (teamId) => {
    if (hasStarted) return;
    setDraft(prev => ({
      ...prev,
      teams: (prev.teams || []).filter(t => t.id !== teamId)
    }));
  };

  const handleGenerateAndDrawWC = () => {
    if (hasStarted) return;
    const fresh = buildDynamicWCPool({ randomize: true, customTeams: [] });
    const pool = fresh.slice(0, 32).map((t, i) => ({ ...t, id: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
    pool.sort((a, b) => (b.att + b.opp + b.def) - (a.att + a.opp + a.def));
    const pots = [
      pool.slice(0, 8), pool.slice(8, 16),
      pool.slice(16, 24), pool.slice(24, 32)
    ];
    const drawData = drawKnockoutGroups(pool, true, true);
    setDraft(prev => ({
      ...prev,
      teams: drawData.teams,
      groups: drawData.groups,
      phase: 'groups',
      matchday: 0,
      history: [],
      bracket: null,
      showWinner: false
    }));
    setDrawModal({ step: 'groups', pots, groups: drawData.groups, drawData });
    setAnnexToast('¡32 selecciones oficiales generadas y sorteadas en 8 grupos A-H!');
    setTimeout(() => setAnnexToast(null), 3500);
  };

  const handleDrawUI = () => {
    if (hasStarted) return;
    const isWCTournament = isWC;
    let pool = [];

    if (isWCTournament) {
      const customTeams = draft.teams && draft.teams.length > 0 ? [...draft.teams] : [];
      pool = buildDynamicWCPool({ randomize: false, customTeams });
    } else {
      const customTeams = draft.teams && draft.teams.length > 0 ? [...draft.teams] : [];
      let compsState: any = null;
      try {
        compsState = JSON.parse(window.localStorage.getItem(`${APP_ID}_comps`) || '{}');
      } catch (e) {}
      pool = customTeams.length >= 32 ? customTeams : buildCLPool(compsState || getDefaultComps());
    }

    const initializedPool = pool.slice(0, 32).map((t, i) => ({ ...t, id: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));

    initializedPool.sort((a, b) => (b.att + b.opp + b.def) - (a.att + a.opp + a.def));
    const pots = [
      initializedPool.slice(0, 8), initializedPool.slice(8, 16),
      initializedPool.slice(16, 24), initializedPool.slice(24, 32)
    ];
    const drawData = drawKnockoutGroups(initializedPool, isWCTournament, true);
    setDrawModal({ step: 'pots', pots, groups: drawData.groups, drawData });
  };

  const detectedCode = isWC ? getCountryCode(newCountryName) : null;
  const regionLabels = {
    EU: 'UEFA (Europa)',
    SA: 'CONMEBOL (Sudamérica)',
    NA: 'CONCACAF (Norte/Centro)',
    AF: 'CAF (África)',
    AS: 'AFC (Asia/M.Oriente)',
    OC: 'OFC (Oceanía)'
  };

  return (
    <div className='flex-grow px-3 sm:px-4 pb-32 relative'>
      {drawModal && (
          <div className='fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-y-auto custom-scrollbar'>
              <div className='max-w-lg mx-auto w-full flex flex-col min-h-full'>
                <h2 className='text-xl sm:text-2xl font-black uppercase italic text-yellow-400 text-center mb-4 sm:mb-6 mt-2 drop-shadow-md'>
                    {drawModal.step === 'pots' ? 'Bombos Generados' : 'Sorteo de Grupos (A - H)'}
                </h2>
                {drawModal.step === 'pots' ? (
                    <div className='space-y-4 mb-6 flex-grow flex flex-col'>
                         <p className='text-[10px] text-center text-slate-300 font-bold uppercase'>Equipos ordenados por ranking de fuerza en 4 bombos.</p>
                         <div className='space-y-3 flex-grow'>
                           {drawModal.pots.map((pot, i) => (
                               <div key={i} className='bg-slate-900/50 p-3.5 rounded-2xl border border-white/10'>
                                   <h3 className='text-xs sm:text-sm font-black uppercase text-blue-400 mb-2.5 flex items-center gap-2'><ShieldIcon size={14}/> Bombo {i+1}</h3>
                                   <div className='grid grid-cols-2 gap-2'>
                                       {pot.map(t => (
                                           <div key={t.id} className='flex items-center gap-2 text-[10px] bg-black/30 p-2 rounded-xl border border-white/5'>
                                              <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag} />
                                              <span className='font-bold uppercase truncate'>{t.name}</span>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           ))}
                         </div>
                         <div className='sticky bottom-2 pt-2 bg-slate-950/80 backdrop-blur-md'>
                           <button onClick={() => setDrawModal({...drawModal, step: 'groups'})} className='w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 px-4 rounded-2xl font-black uppercase italic text-white text-xs sm:text-sm active:scale-95 shadow-lg shadow-emerald-500/25 transition-all border border-emerald-400/40'>Asignar a Grupos (A-H)</button>
                         </div>
                    </div>
                ) : (
                    <div className='space-y-4 mb-6 flex-grow flex flex-col'>
                         <p className='text-[10px] text-center text-slate-300 font-bold uppercase'>
                           {isWC ? '8 Grupos formados respetando reglas continentales oficiales.' : '8 Grupos formados sin coincidencia de equipos del mismo país.'}
                         </p>
                         <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 flex-grow'>
                             {drawModal.groups.map((g, i) => (
                                 <div key={i} className='bg-slate-900/50 p-3 rounded-2xl border border-white/10'>
                                     <h3 className='text-[11px] font-black uppercase text-emerald-400 mb-2 flex justify-between'>
                                        <span>{g.name}</span>
                                     </h3>
                                     <div className='space-y-1.5'>
                                         {g.teamIds.map(id => {
                                             const t = drawModal.drawData.teams.find(x => x.id === id);
                                             return (
                                                 <div key={id} className='flex items-center justify-between text-[10px] bg-black/30 p-2 rounded-xl border border-white/5'>
                                                     <div className='flex items-center gap-2 min-w-0'>
                                                         <Shield color1={t?.color1} color2={t?.color2} initial={t?.name} size='xs' isFlag={t?.isFlag} />
                                                         <span className='font-bold uppercase truncate'>{t?.name}</span>
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                             ))}
                         </div>
                         <div className='sticky bottom-2 pt-3 bg-slate-950/80 backdrop-blur-md flex gap-2.5'>
                            <button onClick={() => setDrawModal(null)} className='flex-1 bg-slate-900 border border-white/10 py-3.5 rounded-2xl font-black uppercase italic text-slate-300 text-xs active:scale-95 transition-all'>Cerrar</button>
                            <button onClick={() => { setDraft(prev => ({...prev, ...drawModal.drawData})); setDrawModal(null); }} className='flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-3 rounded-2xl font-black uppercase italic text-white text-xs sm:text-sm active:scale-95 shadow-lg shadow-blue-500/25 transition-all border border-blue-400/40 flex items-center justify-center gap-1.5'><Check size={16} /> Confirmar y Guardar</button>
                         </div>
                    </div>
                )}
              </div>
          </div>
      )}

      {/* HEADER DE AJUSTES CON ACCESO DIRECTO A GUARDAR */}
      <div className='flex items-center justify-between gap-2 mb-4 bg-slate-900/50 backdrop-blur-md p-3 rounded-2xl border border-white/10'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <button onClick={onCancel} className='p-2 bg-slate-900/80 hover:bg-slate-800 rounded-xl active:scale-95 transition-all border border-white/10 shrink-0 text-slate-300 hover:text-white'><ChevronLeft size={20} /></button>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h2 className='text-base sm:text-lg font-black italic uppercase drop-shadow-md text-white truncate'>
                {isWC ? 'Copa del Mundo' : isCL ? 'Champions League' : 'Ajustes'}
              </h2>
              {(isWC || isCL) && <span className='text-[8px] bg-yellow-500/20 text-yellow-300 font-black px-2 py-0.5 rounded-full border border-yellow-500/30 uppercase shrink-0'>Config</span>}
            </div>
            <p className='text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate'>
              {isWC ? 'Gestión de selecciones y sorteo por bombos' : isCL ? 'Gestión de clubes y sorteo por bombos' : 'Edición de equipos y atributos'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveAttempt}
          className='bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase italic tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/25 active:scale-95 transition-all border border-blue-400/40 shrink-0'
        >
          <Save size={14} /> Guardar
        </button>
      </div>

      {annexToast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-black uppercase text-center shadow-lg flex items-center justify-center gap-2'>
          <Sparkles size={14} className='text-emerald-400 shrink-0' /> <span>{annexToast}</span>
        </motion.div>
      )}

      {/* SECCIÓN ESPECIAL: GESTIÓN DE CHAMPIONS LEAGUE (SOLO SORTEO POR BOMBOS) */}
      {isCL && (
        <div className='space-y-4 mb-6'>
          <div className='bg-gradient-to-br from-blue-950/70 via-slate-900/90 to-indigo-950/70 backdrop-blur-md rounded-3xl p-4 sm:p-5 border-2 border-blue-500/30 shadow-2xl space-y-3.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/40 text-blue-300 shadow-inner'>
                  <Trophy size={22} className='text-amber-300' />
                </div>
                <div>
                  <h3 className='text-sm sm:text-base font-black uppercase italic text-white'>UEFA Champions League</h3>
                  <p className='text-[9px] text-blue-200 font-bold uppercase tracking-wider'>32 Clubes en 8 Grupos (A - H)</p>
                </div>
              </div>
              <div className='px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border bg-blue-950/60 text-blue-300 border-blue-500/40'>
                {(draft.teams || []).length} / 32
              </div>
            </div>

            {/* ÚNICA OPCIÓN DE SORTEO SOLICITADA */}
            <button
              onClick={() => handleDrawUI()}
              disabled={hasStarted}
              className={`w-full py-3.5 px-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                hasStarted
                  ? 'opacity-40 cursor-not-allowed bg-blue-950/20 border border-blue-500/10 text-blue-400/50'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white border-2 border-blue-400/50 shadow-blue-500/25'
              }`}
            >
              <ShieldIcon size={16} className='text-yellow-400' /> Sorteo por Bombos
            </button>

            {hasStarted && (
              <p className='text-[8px] text-center text-amber-300 font-bold uppercase italic mt-1'>
                Torneo en curso. Para sortear de nuevo, concluye la edición o reinicia la competición.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN ESPECIAL: GESTIÓN DE UEFA EUROPA LEAGUE (ELIMINATORIA PURA DESDE DIECISEISAVOS) */}
      {isUEL && (
        <div className='space-y-4 mb-6'>
          <div className='bg-gradient-to-br from-amber-950/70 via-slate-900/90 to-orange-950/70 backdrop-blur-md rounded-3xl p-4 sm:p-5 border-2 border-amber-500/30 shadow-2xl space-y-3.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-300 shadow-inner'>
                  <CompetitionLogo compId='C3' size={24} showBackground={false} />
                </div>
                <div>
                  <h3 className='text-sm sm:text-base font-black uppercase italic text-white'>UEFA Europa League</h3>
                  <p className='text-[9px] text-amber-200 font-bold uppercase tracking-wider'>Eliminatoria Pura · 24 Clubes (Ida y Vuelta)</p>
                </div>
              </div>
              <div className='px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border bg-amber-950/60 text-amber-300 border-amber-500/40'>
                {(draft.teams || []).length} / 24
              </div>
            </div>

            <div className='bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1.5 text-[9px] font-bold text-slate-300'>
              <p className='text-amber-300 font-black uppercase flex items-center gap-1'><Layers size={12} /> Estructura de la Competición:</p>
              <p>• <strong className='text-white'>16 Clubes de Liga (5º al 8º de ES, IT, EN, DE):</strong> Juegan Dieciseisavos de Final (Ida y Vuelta).</p>
              <p>• <strong className='text-white'>8 Repescados de Champions League (3º de Fase de Grupos):</strong> Se incorporan directamente en Octavos de Final.</p>
            </div>

            <button
              onClick={() => {
                if (hasStarted) return;
                let compsState: any = null;
                try {
                  compsState = JSON.parse(window.localStorage.getItem(`${APP_ID}_comps`) || '{}');
                } catch (e) {}
                const shuffled = getShuffleData('C3', compsState || getDefaultComps());
                setDraft(prev => ({
                  ...prev,
                  ...shuffled
                }));
                setAnnexToast('¡Cruces de Dieciseisavos reordenados con éxito!');
                setTimeout(() => setAnnexToast(null), 3000);
              }}
              disabled={hasStarted}
              className={`w-full py-3.5 px-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                hasStarted
                  ? 'opacity-40 cursor-not-allowed bg-amber-950/20 border border-amber-500/10 text-amber-400/50'
                  : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white border-2 border-amber-400/50 shadow-amber-500/25'
              }`}
            >
              <Dices size={16} className='text-white' /> Reordenar Cruces de Dieciseisavos
            </button>

            {hasStarted && (
              <p className='text-[8px] text-center text-amber-300 font-bold uppercase italic mt-1'>
                Torneo en curso. Para reordenar cruces, concluye la edición o reinicia la competición.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN ESPECIAL Y PRINCIPAL: GESTIÓN DE COPA DEL MUNDO (SOLO SORTEO POR BOMBOS) */}
      {isWC && (
        <div className='space-y-4 mb-6'>
          {/* PANEL 1: ESTADO DEL MUNDIAL Y SORTEO POR BOMBOS */}
          <div className='bg-gradient-to-br from-indigo-950/70 via-slate-900/90 to-blue-950/70 backdrop-blur-md rounded-3xl p-4 sm:p-5 border-2 border-indigo-500/30 shadow-2xl space-y-3.5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 text-indigo-300 shadow-inner'>
                  <Globe size={22} className='text-indigo-300' />
                </div>
                <div>
                  <h3 className='text-sm sm:text-base font-black uppercase italic text-white'>Copa del Mundo</h3>
                  <p className='text-[9px] text-indigo-200 font-bold uppercase tracking-wider'>32 Selecciones en 8 Grupos (A - H)</p>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                (draft.teams || []).length === 32
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
              }`}>
                {(draft.teams || []).length} / 32
              </div>
            </div>

            {/* ÚNICA OPCIÓN DE SORTEO SOLICITADA */}
            <button
              onClick={() => handleDrawUI()}
              disabled={hasStarted}
              className={`w-full py-3.5 px-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                hasStarted
                  ? 'opacity-40 cursor-not-allowed bg-indigo-950/20 border border-indigo-500/10 text-indigo-400/50'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/50 shadow-emerald-500/25'
              }`}
            >
              <ShieldIcon size={16} className='text-yellow-400' /> Sorteo por Bombos
            </button>

            {hasStarted && (
              <p className='text-[8px] text-center text-amber-300 font-bold uppercase italic mt-1'>
                Torneo en curso. Para sortear de nuevo, concluye la edición o reinicia la competición.
              </p>
            )}
          </div>

          {/* PANEL 2: ANEXAR / PERSONALIZAR PAÍSES DE FORMA INTUITIVA */}
          <div className='bg-slate-900/40 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-blue-300'>
                  <Plus size={16} />
                </div>
                <div>
                  <h4 className='text-xs sm:text-sm font-black uppercase italic text-white'>Anexar Selección</h4>
                  <p className='text-[8px] text-slate-400 font-bold uppercase tracking-wider'>Elige una sugerencia o escribe un país</p>
                </div>
              </div>
            </div>

            {/* SUGERENCIAS RÁPIDAS EN CHIPS SCROLLEABLES */}
            <div>
              <label className='text-[8px] font-black uppercase text-slate-400 block mb-1.5'>
                Sugerencias Rápidas (1 toque para rellenar datos oficiales):
              </label>
              <div className='flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar no-scrollbar -mx-1 px-1'>
                {WC_POPULAR_SUGGESTIONS.map(sug => (
                  <button
                    key={sug.name}
                    type='button'
                    onClick={() => handleSelectQuickCountry(sug)}
                    className='shrink-0 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 transition-all text-slate-200 border border-white/10 rounded-xl px-2.5 py-1.5 text-[9px] font-bold flex items-center gap-1.5'
                  >
                    <span>{sug.flag}</span>
                    <span>{sug.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FORMULARIO DE PAÍS CON PREVIEW */}
            <div className='space-y-3 bg-black/30 p-3.5 rounded-2xl border border-white/5'>
              <div className='flex items-center gap-3'>
                <Shield color1={newCountryColor1} color2={newCountryColor2} initial={newCountryName || 'País'} size='md' isFlag={true} />
                <div className='flex-grow space-y-1.5'>
                  <input
                    type='text'
                    value={newCountryName}
                    onChange={(e) => handleCountryNameInput(e.target.value)}
                    placeholder='Escribe un país (Ej: Japón, Colombia, Noruega...)'
                    className='bg-black/60 w-full rounded-xl px-3 py-2 text-xs font-black italic uppercase border border-white/15 focus:border-indigo-400 focus:bg-slate-900 outline-none text-white transition-all placeholder:text-slate-500'
                  />
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    {detectedCode ? (
                      <span className='text-[8px] font-black uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1'>
                        <Check size={9} /> Bandera oficial: {detectedCode.toUpperCase()}
                      </span>
                    ) : newCountryName.trim() ? (
                      <span className='text-[8px] font-black uppercase text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1'>
                        <Flag size={9} /> Escudo bicolor configurable
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* SELECTOR DE CONFEDERACIÓN */}
              <div>
                <label className='text-[8px] font-black uppercase text-slate-400 block mb-1'>Confederación:</label>
                <div className='grid grid-cols-3 sm:grid-cols-6 gap-1'>
                  {Object.entries(regionLabels).map(([code, label]) => (
                    <button
                      key={code}
                      type='button'
                      onClick={() => setNewCountryRegion(code)}
                      className={`py-1.5 px-1 rounded-xl text-[8px] font-black uppercase italic transition-all border text-center truncate ${
                        newCountryRegion === code
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30 scale-[1.02]'
                          : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white'
                      }`}
                      title={label}
                    >
                      {code === 'EU' ? 'UEFA' : code === 'SA' ? 'CONMEBOL' : code === 'NA' ? 'CONCACAF' : code === 'AF' ? 'CAF' : code === 'AS' ? 'AFC' : 'OFC'}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEPPERS DE ATRIBUTOS */}
              <div className='grid grid-cols-3 gap-2 pt-1'>
                <AttrStepper label="Atk (1-5)" val={newCountryAtt} min={1} max={5} onUpdate={(v) => setNewCountryAtt(v)} />
                <AttrStepper label="Opp (1-5)" val={newCountryOpp} min={1} max={5} onUpdate={(v) => setNewCountryOpp(v)} />
                <AttrStepper label="Def (1-4)" val={newCountryDef} min={1} max={4} onUpdate={(v) => setNewCountryDef(v)} />
              </div>

              {/* COLORES */}
              <div className='flex items-center justify-between pt-1 border-t border-white/5'>
                <span className='text-[8px] font-black uppercase text-slate-400'>Colores de Escudo/Camiseta:</span>
                <div className='flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5'>
                  <input type='color' value={newCountryColor1} onChange={(e) => setNewCountryColor1(e.target.value)} className='w-7 h-7 rounded-lg bg-transparent cursor-pointer border-none p-0' title='Color Principal' />
                  <input type='color' value={newCountryColor2} onChange={(e) => setNewCountryColor2(e.target.value)} className='w-7 h-7 rounded-lg bg-transparent cursor-pointer border-none p-0' title='Color Secundario' />
                </div>
              </div>

              <button
                onClick={handleAnnexCountry}
                disabled={!newCountryName.trim()}
                className={`w-full py-3 rounded-2xl font-black uppercase italic tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                  newCountryName.trim()
                    ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white border border-indigo-400 shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer'
                    : 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Plus size={15} /> Anexar Selección a la Copa
              </button>
            </div>
          </div>
        </div>
      )}

      {draft.type === 'league' && (
        <div className='flex mb-4 bg-slate-900/50 p-1 rounded-2xl border border-white/10 backdrop-blur-sm'>
          <button onClick={() => setEditDiv(1)} className={`flex-1 py-2 text-[10px] font-black uppercase italic rounded-xl transition-all ${editDiv === 1 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>1ª División</button>
          <button onClick={() => setEditDiv(2)} className={`flex-1 py-2 text-[10px] font-black uppercase italic rounded-xl transition-all ${editDiv === 2 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>2ª División</button>
        </div>
      )}

      {/* LISTA DE EQUIPOS / SELECCIONES CONFIGURADAS */}
      <div className='flex items-center justify-between mb-3 px-1'>
        <h3 className='text-xs font-black uppercase italic text-slate-300'>
          {isWC ? `Selecciones Actuales (${(currentTeams || []).length})` : `Equipos Configurados (${(currentTeams || []).length})`}
        </h3>
        {isWC && <span className='text-[8px] text-slate-400 font-bold uppercase'>Cupo Oficial: 32</span>}
      </div>

      <div className='grid gap-3'>
        {(!Array.isArray(currentTeams) || currentTeams.length === 0) && (
          <div className='text-center py-8 bg-slate-900/30 backdrop-blur-md rounded-[2rem] border border-dashed border-white/20 space-y-2'>
            <Globe size={28} className='mx-auto text-slate-500 opacity-60' />
            <p className='text-[10px] font-bold text-slate-300 uppercase italic'>No hay selecciones en la lista.</p>
            {isWC && (
              <button
                onClick={handleGenerateAndDrawWC}
                className='px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase italic tracking-wider active:scale-95'
              >
                Generar 32 Selecciones Oficiales
              </button>
            )}
          </div>
        )}
        {Array.isArray(currentTeams) && currentTeams.map((t, idx) => (
          <div key={t.id} className='bg-slate-900/40 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-md space-y-2.5 relative group'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center shrink-0'>
                <Shield color1={t?.color1} color2={t?.color2} initial={t?.name} size='md' isFlag={t?.isFlag} />
              </div>
              <div className='flex-grow min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='text-[9px] font-black text-slate-400 shrink-0'>#{idx + 1}</span>
                  <input
                    className='bg-black/40 w-full rounded-xl px-2.5 py-1.5 text-xs font-black italic uppercase border border-white/10 focus:border-blue-500 focus:bg-slate-800/80 outline-none text-white transition-colors backdrop-blur-sm'
                    value={t?.name}
                    onChange={(e) => updateTeamAttr(t.id, 'name', e.target.value)}
                  />
                  {isWC && !hasStarted && (
                    <button
                      onClick={() => handleRemoveTeam(t.id)}
                      title='Eliminar selección'
                      className='p-2 bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 rounded-xl transition-all active:scale-95 shrink-0'
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {isWC && t.region && (
                  <div className='mt-1 flex items-center gap-1.5'>
                    <span className='text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-500/30'>
                      {regionLabels[t.region] || t.region}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className='grid grid-cols-3 gap-1.5 pt-1'>
              <AttrStepper label="Atk (1-5)" val={t.att} min={1} max={5} onUpdate={(v) => updateTeamAttr(t.id, 'att', v)} />
              <AttrStepper label="Opp (1-5)" val={t.opp} min={1} max={5} onUpdate={(v) => updateTeamAttr(t.id, 'opp', v)} />
              <AttrStepper label="Def (1-4)" val={t.def} min={1} max={4} onUpdate={(v) => updateTeamAttr(t.id, 'def', v)} />
            </div>

            <div className='flex items-center justify-between pt-1 border-t border-white/5'>
              <span className='text-[8px] font-bold text-slate-400 uppercase'>Colores</span>
              <div className='flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5'>
                <input type='color' value={t.color1} onChange={(e) => updateTeamAttr(t.id, 'color1', e.target.value)} className='w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0' />
                <input type='color' value={t.color2} onChange={(e) => updateTeamAttr(t.id, 'color2', e.target.value)} className='w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ZONA DE PELIGRO UBICADA AL FINAL */}
      <div className='mt-8 bg-slate-900/30 backdrop-blur-md rounded-2xl p-4 border border-red-500/20 shadow-lg'>
        <h3 className='text-xs font-black text-red-400 uppercase italic mb-2 flex items-center gap-2'><AlertTriangle size={14}/> Zona de Peligro</h3>
        <p className='text-[9px] text-slate-400 font-bold mb-3'>Restaura los valores iniciales y equipos originales de la competición.</p>
        <button onClick={() => setShowResetConfirm(true)} className='w-full py-3.5 bg-gradient-to-r from-red-700/60 via-red-600/50 to-red-700/60 text-red-200 font-black uppercase tracking-widest text-[10px] rounded-2xl border-2 border-red-500/40 active:scale-95 transition-all shadow-[0_0_25px_rgba(239,68,68,0.2)] hover:shadow-[0_0_35px_rgba(239,68,68,0.35)] hover:border-red-400/60 flex items-center justify-center gap-2 italic'>
           <RotateCcw size={14} className='text-red-300'/> Reiniciar Competición
        </button>
      </div>

      <AnimatePresence>
        {showResetConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md'>
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }} className='bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-[2rem] border border-red-500/30 shadow-2xl overflow-hidden'>
              <div className='bg-gradient-to-r from-red-900/60 via-red-800/40 to-red-900/60 px-6 py-5 border-b border-red-500/20'>
                <div className='flex items-center justify-center gap-3'>
                  <div className='w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30'>
                    <AlertTriangle size={20} className='text-red-400' />
                  </div>
                  <h3 className='text-lg font-black uppercase italic text-red-300 tracking-tight'>Reiniciar Competición</h3>
                </div>
              </div>
              <div className='px-6 py-5'>
                <p className='text-sm font-bold text-slate-200 text-center leading-relaxed'>
                  Esto borrará <span className='text-red-400'>todo el progreso</span> de esta competición y restaurará los equipos originales.
                </p>
                <p className='text-[10px] font-bold text-slate-500 text-center mt-2 uppercase tracking-wider'>Esta acción no se puede deshacer</p>
              </div>
              <div className='flex gap-3 px-6 pb-6'>
                <button onClick={() => setShowResetConfirm(false)} className='flex-1 bg-slate-800/80 border border-white/10 text-slate-200 py-3.5 rounded-2xl text-[11px] font-black uppercase italic tracking-widest active:scale-95 transition-all'>
                  Cancelar
                </button>
                <button onClick={() => { onTotalReset(compId); setShowResetConfirm(false); }} className='flex-1 bg-gradient-to-r from-red-700/80 to-red-600/80 border-2 border-red-400/40 text-white py-3.5 rounded-2xl text-[11px] font-black uppercase italic tracking-widest active:scale-95 transition-all shadow-[0_0_25px_rgba(239,68,68,0.35)] flex items-center justify-center gap-2'>
                  <RotateCcw size={14} className='text-red-200'/> Reiniciar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE ADVERTENCIA DE VALIDACIÓN DE CUPO (MUNDIAL 32 SELECCIONES) */}
      <AnimatePresence>
        {validationWarningModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4'>
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }} className='bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col'>
              <div className='flex items-start gap-3 border-b border-white/10 pb-3'>
                <div className='w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400 shrink-0'>
                  <AlertTriangle size={22} />
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='text-sm sm:text-base font-black uppercase italic text-amber-300'>
                    {validationWarningModal.type === 'excess' ? 'Cupo de 32 Selecciones Excedido' : 'Cupo Incompleto'}
                  </h3>
                  <p className='text-[10px] text-slate-300 font-bold leading-tight mt-0.5'>
                    {validationWarningModal.type === 'excess'
                      ? `Tienes ${validationWarningModal.count} selecciones ingresadas (${validationWarningModal.diff} de más). Debes eliminar ${validationWarningModal.diff} selección(es) para dejar el cupo oficial en exactamente 32.`
                      : `Tienes ${validationWarningModal.count} selecciones (faltan ${validationWarningModal.diff}). Se necesitan exactamente 32 selecciones para conformar los 8 grupos.`}
                  </p>
                </div>
                <button onClick={() => setValidationWarningModal(null)} className='p-1 text-slate-400 hover:text-white rounded-lg'>
                  <X size={18} />
                </button>
              </div>

              {validationWarningModal.type === 'excess' ? (
                <div className='flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[45vh]'>
                  <p className='text-[9px] font-black uppercase text-slate-400 tracking-wider'>
                    Selecciona cuál(es) deseas eliminar para quedar en 32:
                  </p>
                  {(draft.teams || []).map((t: any) => (
                    <div key={t.id} className='flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <Shield color1={t.color1} color2={t.color2} initial={t.name} size='xs' isFlag={t.isFlag} />
                        <span className='text-xs font-bold text-white uppercase italic truncate'>{t.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newTeams = (draft.teams || []).filter((x: any) => x.id !== t.id);
                          setDraft((prev: any) => ({ ...prev, teams: newTeams }));
                          if (newTeams.length === 32) {
                            setValidationWarningModal(null);
                            setAnnexToast('¡Cupo exacto de 32 selecciones alcanzado! Ya puedes guardar.');
                            setTimeout(() => setAnnexToast(null), 3000);
                          } else if (newTeams.length > 32) {
                            setValidationWarningModal({
                              type: 'excess',
                              count: newTeams.length,
                              diff: newTeams.length - 32
                            });
                          } else {
                            setValidationWarningModal(null);
                          }
                        }}
                        className='px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 active:scale-95 transition-all'
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='space-y-3 py-2'>
                  <p className='text-xs text-slate-300 font-bold'>
                    Puedes autocompletar y equilibrar las 32 selecciones oficiales con 1 toque o regresar y anexar los países que gustes.
                  </p>
                  <button
                    onClick={() => {
                      setValidationWarningModal(null);
                      handleGenerateAndDrawWC();
                    }}
                    className='w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                  >
                    <Sparkles size={14} /> Generar 32 Selecciones Oficiales
                  </button>
                </div>
              )}

              <div className='flex gap-2 pt-2 border-t border-white/10'>
                <button
                  onClick={() => setValidationWarningModal(null)}
                  className='flex-1 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase active:scale-95 transition-all border border-white/10'
                >
                  Cerrar y Revisar
                </button>
                {(draft.teams || []).length === 32 && (
                  <button
                    onClick={() => {
                      setValidationWarningModal(null);
                      onSave(draft);
                    }}
                    className='flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase italic active:scale-95 transition-all shadow-lg shadow-blue-500/25'
                  >
                    Guardar Cambios
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE INFERIOR CON AJUSTE SAFE-AREA Y RESPONSIVO */}
      <div className='fixed bottom-3 sm:bottom-4 left-0 right-0 max-w-sm mx-auto px-4 z-50 pointer-events-none'>
        <button
          onClick={handleSaveAttempt}
          className='w-full pointer-events-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 px-4 rounded-2xl font-black uppercase italic tracking-widest text-xs shadow-[0_8px_25px_rgba(0,0,0,0.6)] flex items-center justify-center gap-2 active:scale-95 transition-all border border-blue-400/50 backdrop-blur-md'
        >
          <Save size={16} className='text-blue-200' /> Guardar Cambios
        </button>
      </div>
    </div>
  );
};

