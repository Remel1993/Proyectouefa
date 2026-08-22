import React from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle,
  Flame,
  Star,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';

export interface SimulationFeedback {
  isChampions?: boolean;
  phaseLabel?: string;
  headline?: string;
  summary?: string;
  matchday?: number;
  homeName?: string;
  awayName?: string;
  scoreH?: number;
  scoreA?: number;
  myGf?: number;
  myGa?: number;
  result?: 'W' | 'D' | 'L' | string;
  posBefore?: number;
  posAfter?: number;
  posDelta?: number;
  expectedPos?: number;
  targetPos?: number;
  tier?: number;
  div?: number;
  repDelta?: number;
  repGained?: number;
  peDelta?: number;
  peGained?: number;
  matchPeGained?: number;
  trainingPeGained?: number;
  trainingResult?: any;
  rivalName?: string;
  isHome?: boolean;
  cleanSheet?: boolean;
  isGesta?: boolean;
  bonusPE?: number;
  bonusRep?: number;
  injuryOccurred?: boolean;
  immunityWeeks?: number;
}

interface SimulationFeedbackBannerProps {
  feedback: SimulationFeedback;
  onDismiss?: () => void;
}

export const SimulationFeedbackBanner: React.FC<SimulationFeedbackBannerProps> = ({
  feedback,
  onDismiss
}) => {
  if (!feedback) return null;

  const result = feedback.result;
  const peGained = feedback.peDelta ?? feedback.peGained ?? 0;
  const repGained = feedback.repDelta ?? feedback.repGained ?? 0;
  const posBefore = feedback.posBefore;
  const posAfter = feedback.posAfter;
  const posDiff = posBefore !== undefined && posAfter !== undefined ? posBefore - posAfter : 0;

  const targetPos = feedback.targetPos ?? 10;
  const expectedPos = feedback.expectedPos ?? 10;

  // Evaluación creativa de seguridad en el puesto y confianza de la directiva
  let boardStatus = {
    label: 'Objetivo en Curso',
    riskTag: 'Puesto Seguro',
    colorText: 'text-emerald-300',
    colorBg: 'bg-emerald-500/20 border-emerald-500/40',
    icon: CheckCircle
  };

  if (feedback.isChampions) {
    if (result === 'W') {
      boardStatus = {
        label: 'Prestigio Europeo',
        riskTag: 'Directiva Encantada ⭐',
        colorText: 'text-blue-300',
        colorBg: 'bg-blue-500/20 border-blue-500/40',
        icon: Star
      };
    } else if (result === 'D') {
      boardStatus = {
        label: 'Opciones Vivas',
        riskTag: 'En Competencia',
        colorText: 'text-amber-300',
        colorBg: 'bg-amber-500/20 border-amber-500/40',
        icon: ShieldCheck
      };
    } else {
      boardStatus = {
        label: 'Revés Continental',
        riskTag: 'Exigencia Máxima',
        colorText: 'text-rose-300',
        colorBg: 'bg-rose-500/20 border-rose-500/40',
        icon: AlertTriangle
      };
    }
  } else if (posAfter !== undefined) {
    const diffToTarget = posAfter - targetPos; // <= 0 significa dentro del objetivo
    const diffToExpected = expectedPos - posAfter; // >= 0 significa mejor de lo previsto por plantilla

    if (posAfter <= targetPos) {
      if (posAfter === 1 || diffToExpected >= 4) {
        boardStatus = {
          label: 'Liderando Proyecto',
          riskTag: 'Directiva Encantada 🌟',
          colorText: 'text-emerald-300',
          colorBg: 'bg-emerald-500/25 border-emerald-500/50',
          icon: Sparkles
        };
      } else {
        boardStatus = {
          label: `En Objetivo (Top ${targetPos})`,
          riskTag: 'Puesto Seguro ✅',
          colorText: 'text-emerald-300',
          colorBg: 'bg-emerald-500/20 border-emerald-500/40',
          icon: CheckCircle
        };
      }
    } else {
      if (diffToTarget <= 2 && diffToExpected >= -2) {
        boardStatus = {
          label: `A ${diffToTarget} puesto${diffToTarget > 1 ? 's' : ''} de meta`,
          riskTag: 'Bajo Observación 👀',
          colorText: 'text-amber-300',
          colorBg: 'bg-amber-500/20 border-amber-500/40',
          icon: Eye
        };
      } else if (diffToTarget <= 5 || diffToExpected >= -4) {
        boardStatus = {
          label: 'Fuera de Objetivos',
          riskTag: 'Despido Probable ⚠️',
          colorText: 'text-orange-400',
          colorBg: 'bg-orange-500/20 border-orange-500/40',
          icon: AlertTriangle
        };
      } else {
        boardStatus = {
          label: 'Zona Crítica',
          riskTag: 'Ultimátum Directiva 🔥',
          colorText: 'text-rose-400',
          colorBg: 'bg-rose-600/30 border-rose-500/60',
          icon: Flame
        };
      }
    }
  }

  const StatusIcon = boardStatus.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="relative overflow-hidden rounded-2xl p-3 sm:p-3.5 border border-white/15 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 shadow-xl backdrop-blur-md space-y-2.5"
    >
      {/* 1. Barra Superior Compacta */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-white/10 shrink-0">
            {feedback.isChampions ? 'Champions League' : `Jornada ${feedback.matchday ?? ''}`}
          </span>

          {/* Badge de Seguridad en el Puesto y Directiva */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${boardStatus.colorBg} ${boardStatus.colorText}`}>
            <StatusIcon className="w-3 h-3 shrink-0" />
            <span>{boardStatus.riskTag}</span>
          </span>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Cuadrícula Compacta de 3 Columnas Fundamentales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Columna A: Efecto en Tabla */}
        <div className="bg-black/40 rounded-xl p-2 border border-white/5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-white/10 shrink-0">
            {posDiff > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : posDiff < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Target className="w-3.5 h-3.5 text-sky-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Efecto en Tabla</p>
            <p className="font-black text-[11px] leading-tight text-white truncate">
              {feedback.isChampions ? (
                <span className="text-blue-300">{feedback.phaseLabel || 'Fase Europea'}</span>
              ) : posDiff > 0 ? (
                <span className="text-emerald-400">▲ +{posDiff} ({posBefore}º➔{posAfter}º)</span>
              ) : posDiff < 0 ? (
                <span className="text-rose-400">▼ -{Math.abs(posDiff)} ({posBefore}º➔{posAfter}º)</span>
              ) : (
                <span className="text-sky-300">= Mantiene {posAfter ?? posBefore}º</span>
              )}
            </p>
          </div>
        </div>

        {/* Columna B: Estado del Objetivo Directivo */}
        <div className="bg-black/40 rounded-xl p-2 border border-white/5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-white/10 shrink-0">
            <Target className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Objetivo Temporada</p>
            <p className="font-black text-[11px] leading-tight text-slate-200 truncate">
              {feedback.isChampions ? (
                <span className="text-amber-300">Gloria Continental</span>
              ) : (
                <span>{boardStatus.label}</span>
              )}
            </p>
          </div>
        </div>

        {/* Columna C: Balance de PE y Reputación */}
        <div className="bg-black/40 rounded-xl p-2 border border-white/5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-white/10 shrink-0">
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Balance Obtenido</p>
            <p className="font-black text-[11px] leading-tight flex items-center gap-1.5 truncate">
              <span className="text-amber-300">+{peGained} PE</span>
              <span className="text-slate-500">·</span>
              <span className={repGained > 0 ? 'text-emerald-400' : repGained < 0 ? 'text-rose-400' : 'text-slate-300'}>
                {repGained > 0 ? `+${repGained}` : `${repGained}`} Rep
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Diagnóstico Breve del Mánager (Completo, sin cortes) */}
      {feedback.summary && (
        <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
          <p className="text-[11px] font-medium text-slate-200 leading-relaxed whitespace-pre-line">
            💬 {feedback.summary}
          </p>
        </div>
      )}
    </motion.div>
  );
};
