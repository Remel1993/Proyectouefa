// UI Atomic Components and Badges for Dice Football
import React, { useState } from 'react';
import { 
  Trophy, TrendingUp, AlertCircle, Flame, Dice6, Swords, Eye, Star, Newspaper,
  Dice1, Dice2, Dice3, Dice4, Dice5, Dices 
} from 'lucide-react';
import { getCountryCode } from '@/lib/countries';

export const getLast5 = (teamId: any, history: any[]) => {
  if (!Array.isArray(history) || !history.length) return [];
  const out: string[] = [];
  for (let i = 0; i < history.length && out.length < 5; i++) {
    const dayResults = history[i]?.results;
    if (!Array.isArray(dayResults)) continue;
    const matches = dayResults.filter((r: any) => r && (r.hId === teamId || r.aId === teamId));
    for (let j = matches.length - 1; j >= 0 && out.length < 5; j--) {
      const res = matches[j];
      if (res.sh == null || res.sa == null) continue;
      const isHome = res.hId === teamId;
      const gf = isHome ? res.sh : res.sa;
      const ga = isHome ? res.sa : res.sh;
      let r = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
      if (gf === ga && res.penH != null && res.penA != null) {
        const pf = isHome ? res.penH : res.penA;
        const pa = isHome ? res.penA : res.penH;
        if (pf !== pa) r = pf > pa ? 'W' : 'L';
      }
      out.push(r);
    }
  }
  return out.reverse();
};

export const FormBadges = ({ form }: { form: string[] }) => {
  if (!form.length) return <span className='text-[9px] font-bold text-slate-600'>—</span>;
  return (
    <div className='flex items-center justify-center gap-1'>
      {form.map((r, i) => (
        <span
          key={i}
          title={r === 'W' ? 'Victoria' : r === 'D' ? 'Empate' : 'Derrota'}
          className={`w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-black text-white ${r === 'W' ? 'bg-emerald-500' : r === 'D' ? 'bg-slate-500' : 'bg-red-500'}`}
        >{r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}</span>
      ))}
    </div>
  );
};

export const getTeamLogoSlug = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

export const Shield = ({ color1, color2, initial, size = 'md', isFlag = false, logoUrl = null }: {
  color1?: string;
  color2?: string;
  initial?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isFlag?: boolean;
  logoUrl?: string | null;
}) => {
  const dims = size === 'xl' ? 'w-24 h-28' : size === 'lg' ? 'w-20 h-24' : size === 'sm' ? 'w-8 h-10' : size === 'xs' ? 'w-5 h-6' : 'w-12 h-14';
  const imgDims = size === 'xl' ? 'w-24 h-18' : size === 'lg' ? 'w-20 h-14' : size === 'sm' ? 'w-8 h-6' : size === 'xs' ? 'w-5 h-4' : 'w-12 h-8';
  const fontSize = size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-[10px]' : size === 'xs' ? 'text-[8px]' : 'text-sm';
  const safeInitial = initial ? initial[0] : '?';
  const [logoFailed, setLogoFailed] = useState(false);

  if (isFlag) {
    const code = getCountryCode(initial);
    if (code) {
      return (
        <div className={`${imgDims} relative overflow-hidden shadow-md rounded-sm border border-white/10 shrink-0`}>
          <img src={`https://flagcdn.com/${code}.svg`} alt={initial} className='w-full h-full object-cover' onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      );
    }
    return (
      <div className={`${dims} relative overflow-hidden shadow-md rounded-lg border border-white/10 shrink-0`}>
        <div className='absolute inset-0 flex flex-col'>
          <div className='h-1/2 w-full' style={{ backgroundColor: color1 || '#333' }}></div>
          <div className='h-1/2 w-full' style={{ backgroundColor: color2 || '#666' }}></div>
        </div>
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className={`${fontSize} font-black text-white mix-blend-difference italic drop-shadow-md`}>{safeInitial}</span>
        </div>
      </div>
    );
  }

  const slug = getTeamLogoSlug(initial);
  const potentialLogo = logoUrl || (slug ? `/crests/${slug}.png` : null);

  if (potentialLogo && !logoFailed) {
    return (
      <div className={`${dims} relative flex items-center justify-center shrink-0 p-0.5`}>
        <img
          src={potentialLogo}
          alt={initial || 'Escudo'}
          className='w-full h-full object-contain drop-shadow-md'
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${dims} relative overflow-hidden shadow-md shrink-0`} style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)' }}>
      <div className='absolute inset-0 flex'>
        <div className='w-1/2 h-full' style={{ backgroundColor: color1 || '#333' }}></div>
        <div className='w-1/2 h-full' style={{ backgroundColor: color2 || '#666' }}></div>
      </div>
      <div className='absolute inset-0 flex items-center justify-center'>
        <span className={`${fontSize} font-black text-white mix-blend-difference italic drop-shadow-md`}>{safeInitial}</span>
      </div>
    </div>
  );
};

export const DieIcon = ({ value, className }: { value: number; className?: string }) => {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[value - 1] || Dices;
  return <Icon className={className} strokeWidth={1.5} />;
};

export const Confetti = () => (
  <div className='fixed inset-0 pointer-events-none z-[55] overflow-hidden'>
    {[...Array(60)].map((_, i) => (
      <div 
        key={i} className='absolute animate-bounce'
        style={{
          left: (Math.random() * 100) + '%', top: '-10%', width: '8px', height: '8px',
          backgroundColor: ['#ffd700', '#ff0000', '#00ff00', '#0000ff', '#ffffff'][Math.floor(Math.random() * 5)],
          animation: `confetti-fall ${2 + Math.random() * 3}s linear infinite`, animationDelay: `${Math.random() * 2}s`
        }}
      />
    ))}
    <style>{`@keyframes confetti-fall { to { transform: translateY(110vh) rotate(720deg); } }`}</style>
  </div>
);

export const AttrStepper = ({ label, val, min, max, onUpdate }: { label: string; val: number; min: number; max: number; onUpdate: (v: number) => void }) => (
  <div className='flex flex-col items-center bg-black/40 rounded-xl p-1.5 border border-white/10'>
    <span className='text-[7px] font-black uppercase text-slate-300 mb-1'>{label}</span>
    <div className='flex items-center gap-2 w-full justify-center'>
      <button onClick={() => onUpdate(Math.max(min, val - 1))} className='w-5 h-5 bg-slate-800/80 hover:bg-slate-700 rounded text-white text-xs font-bold active:scale-95 flex items-center justify-center transition-all'>-</button>
      <span className='text-[10px] font-black w-2 text-center text-white'>{val}</span>
      <button onClick={() => onUpdate(Math.min(max, val + 1))} className='w-5 h-5 bg-slate-800/80 hover:bg-slate-700 rounded text-white text-xs font-bold active:scale-95 flex items-center justify-center transition-all'>+</button>
    </div>
  </div>
);

export const MenuButton = ({ icon, label, onClick, disabled = false, isDanger = false, isWide = false }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isDanger?: boolean;
  isWide?: boolean;
}) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`
      flex items-center justify-center p-3 rounded-2xl border transition-all 
      ${isWide ? 'flex-row gap-2' : 'flex-col'}
      ${disabled ? 'opacity-30 cursor-not-allowed bg-slate-900/20 border-white/5' : 
        isDanger ? 'bg-red-900/20 border-red-500/30 text-red-400 hover:bg-red-900/40 active:scale-95' : 
        'bg-slate-800/40 border-white/10 text-white hover:bg-slate-700/60 active:scale-95 hover:border-white/30 backdrop-blur-md'}
    `}
  >
    <div className={isWide ? 'mb-0' : 'mb-1'}>{icon}</div>
    <span className='text-[8px] font-black uppercase italic tracking-wider'>{label}</span>
  </button>
);

export const NewsIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'leader': return <Trophy size={18} className='text-yellow-400' />;
    case 'crisis': case 'relegation': return <AlertCircle size={18} className='text-red-400' />;
    case 'promotion': case 'rivalry': return <TrendingUp size={18} className='text-emerald-400' />;
    case 'stats': case 'scorer': case 'defense': return <Flame size={18} className='text-orange-400' />;
    case 'momentum': return <TrendingUp size={18} className='text-yellow-400' />;
    case 'luck': return <Dice6 size={18} className='text-purple-400' />;
    case 'derby': return <Swords size={18} className='text-red-500' />;
    case 'preview': return <Eye size={18} className='text-cyan-400' />;
    case 'generic': case 'surprise': return <Star size={18} className='text-blue-400' />;
    default: return <Newspaper size={18} className='text-slate-300' />;
  }
};

export const PenaltyDots = ({ history }: { history: boolean[] }) => {
  const totalLen = history ? history.length : 0;
  const startIdx = totalLen % 5 === 0 && totalLen > 0 ? totalLen - 5 : totalLen - (totalLen % 5);
  const visibleHistory = history && totalLen > 0 ? history.slice(startIdx) : [];

  return (
    <div className="flex justify-center gap-[3px] mb-2 min-h-[14px]">
      {visibleHistory.map((h, i) => {
        const globalIdx = startIdx + i;
        const isNewest = globalIdx === totalLen - 1;
        return (
          <div
            key={globalIdx}
            style={isNewest ? { animation: 'penDotPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' } : {}}
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${h ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'}`}
          >
            <span className="text-[7px] text-white font-black">{h ? '✓' : '✗'}</span>
          </div>
        );
      })}
    </div>
  );
};
