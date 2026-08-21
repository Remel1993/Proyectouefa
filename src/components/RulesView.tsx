// Rules View Component
import React from 'react';
import { ChevronLeft } from 'lucide-react';

export const RulesView = ({ setView }: { setView: (v: string) => void }) => (
  <div className='flex-grow px-4 pb-8 flex flex-col'>
    <header className='flex items-center gap-3 mb-8'>
      <button onClick={() => setView('hub')} className='p-3 bg-slate-900/30 backdrop-blur-md rounded-2xl text-slate-300 hover:text-white active:scale-95 transition-all border border-white/10'>
        <ChevronLeft />
      </button>
      <h2 className='text-xl font-black uppercase italic text-blue-400 drop-shadow-md'>Reglas del Juego</h2>
    </header>
    <div className='space-y-4'>
      <div className='bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg'>
        <h4 className='text-xs font-black uppercase italic text-emerald-400 mb-2'>1. Dos Divisiones</h4>
        <p className='text-[11px] font-bold text-slate-200 leading-relaxed'>Cada liga tiene 1ª y 2ª división. Al finalizar ambas, los 3 últimos de Primera descienden y los 3 primeros de Segunda ascienden, heredando e intercambiando estadísticas.</p>
      </div>
      <div className='bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg'>
        <h4 className='text-xs font-black uppercase italic text-blue-400 mb-2'>2. Ataque y Defensa</h4>
        <p className='text-[11px] font-bold text-slate-200 leading-relaxed'>Para marcar gol, el atacante debe sacar un número menor o igual a su ATK. Si lo logra, el portero rival debe sacar un número <strong className='text-white'>menor o igual a su DEF</strong> para detenerlo.</p>
      </div>
      <div className='bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg'>
        <h4 className='text-xs font-black uppercase italic text-purple-400 mb-2'>3. Guardado Automático</h4>
        <p className='text-[11px] font-bold text-slate-200 leading-relaxed'>Tu progreso de todas las ligas se guarda automáticamente. Cualquier edición que hagas en los equipos perdurará durante tus temporadas.</p>
      </div>
    </div>
  </div>
);
