import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS }          from '@dnd-kit/utilities';
import { sortedRoundEntries } from '../utils/groupRows';

// ── Shared color maps ─────────────────────────────────────────────────────────

const QUOTA_COLORS = {
  OS: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  HS: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  AI: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  GO: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const SEAT_COLORS = {
  OPEN:      'bg-slate-600/60 text-slate-300',
  EWS:       'bg-yellow-500/20 text-yellow-300',
  'OBC-NCL': 'bg-orange-500/20 text-orange-300',
  SC:        'bg-pink-500/20 text-pink-300',
  ST:        'bg-red-500/20 text-red-300',
};

const INSTITUTE_TYPE_COLORS = {
  NIT:  'bg-blue-500/15 text-blue-300 border-blue-500/30',
  IIIT: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  IIT:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  GFTI: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
};

function getSeatColor(seatType) {
  for (const [key, cls] of Object.entries(SEAT_COLORS)) {
    if (seatType?.toUpperCase().includes(key)) return cls;
  }
  return 'bg-slate-600/60 text-slate-300';
}

function abbrevRound(round) {
  return round.replace(/round\s*/i, 'R');
}

// ── Rank status computation ───────────────────────────────────────────────────
//
// Compares item's closing rank for `compareRound` against the user's rank.
// Lower rank number = better (JEE convention).
//
// 🟢 safe       — CR > userRank * 1.15  (well above your rank → safe to apply)
// 🟡 borderline — userRank < CR ≤ userRank * 1.15  (close to your rank)
// 🔴 reach      — CR < userRank  (cutoff better than your rank → hard to get)

function getRankStatus(item, compareRound, userRank) {
  if (!userRank || !compareRound) return null;
  const roundData = item.rounds?.[compareRound];
  if (!roundData?.closingRank) return null;

  const cr = parseInt(String(roundData.closingRank).replace(/[^0-9]/g, ''), 10);
  const ur = parseInt(String(userRank), 10);
  if (isNaN(cr) || isNaN(ur) || ur <= 0) return null;

  if (cr < ur)          return 'reach';       // 🔴
  if (cr <= ur * 1.15)  return 'borderline';  // 🟡
  return 'safe';                               // 🟢
}

const RANK_STATUS_CONFIG = {
  safe:       {
    border: 'border-emerald-500/70',
    bg:     'bg-emerald-950/25',
    badge:  'bg-emerald-500/20 text-emerald-300',
    emoji:  '🟢',
    label:  'Safe',
  },
  borderline: {
    border: 'border-yellow-500/70',
    bg:     'bg-yellow-950/20',
    badge:  'bg-yellow-500/20 text-yellow-300',
    emoji:  '🟡',
    label:  'Borderline',
  },
  reach:      {
    border: 'border-red-500/70',
    bg:     'bg-red-950/20',
    badge:  'bg-red-500/20 text-red-300',
    emoji:  '🔴',
    label:  'Reach',
  },
};

// ── Shared card body (presentation, no DnD) ───────────────────────────────────

function CardBody({ item, onAdd, isAdded, activeRound, isMobile, rankStatus }) {
  const quotaClass     = QUOTA_COLORS[item.quota] ?? 'bg-slate-600/40 text-slate-400 border-slate-600/40';
  const rounds         = sortedRoundEntries(item.rounds || {});
  const highlightRound = activeRound && activeRound !== 'All' ? activeRound : null;
  const rankCfg        = rankStatus ? RANK_STATUS_CONFIG[rankStatus] : null;

  return (
    <div className="p-3 sm:p-4">
      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {item.instituteType && item.instituteType !== 'Unknown' && (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wide ${
            INSTITUTE_TYPE_COLORS[item.instituteType] ?? 'bg-slate-700 text-slate-300 border-slate-600'
          }`}>
            {item.instituteType}
          </span>
        )}

        {/* CSAB source badge */}
        {item.source === 'CSAB' && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wide bg-amber-500/20 text-amber-300 border-amber-500/40">
            CSAB
          </span>
        )}

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${quotaClass}`}>
          {item.quota}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeatColor(item.seatType)}`}>
          {item.seatType}
        </span>

        {/* Rank status badge */}
        {rankCfg && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rankCfg.badge}`}>
            {rankCfg.emoji} {rankCfg.label}
          </span>
        )}

        <span className="text-[10px] text-slate-500 ml-auto" title={item.gender}>
          {item.gender === 'Gender-Neutral' ? '⚥ Neutral' : '♀ Female'}
        </span>
        {isAdded && (
          <span className="text-[10px] font-bold text-emerald-400">✓ Added</span>
        )}
      </div>

      {/* Institute */}
      <p className="text-slate-200 font-semibold text-xs sm:text-sm leading-relaxed mb-1">
        {item.institute}
      </p>

      {/* Program */}
      <p className="text-indigo-300 text-[11px] sm:text-xs leading-relaxed mb-2.5">
        {item.program}
      </p>

      {/* Per-round ranks */}
      <div className="space-y-1 mb-3">
        {rounds.map(([round, data]) => {
          const isHighlighted = highlightRound === round;
          return (
            <div
              key={round}
              className={`flex items-center justify-between text-[10px] rounded-lg px-2 py-1.5 ${
                isHighlighted
                  ? 'bg-indigo-500/15 border border-indigo-500/25'
                  : 'bg-slate-900/60'
              }`}
            >
              <span className={`font-bold ${isHighlighted ? 'text-indigo-300' : 'text-slate-500'}`}>
                {abbrevRound(round)}
              </span>
              <span className={`font-mono ${isHighlighted ? 'text-emerald-300' : 'text-emerald-500/80'}`}>
                {data.openingRank}
                <span className="text-slate-600 mx-0.5">→</span>
                {data.closingRank}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(item); }}
        disabled={isAdded}
        className={`
          w-full rounded-lg text-xs font-semibold transition-all duration-200
          flex items-center justify-center gap-1.5
          ${isMobile ? 'py-3.5 min-h-[52px] text-sm' : 'py-2.5 min-h-[44px] sm:min-h-[36px]'}
          ${isAdded
            ? 'bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20'
            : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500 hover:text-white active:bg-indigo-600 active:text-white border border-indigo-500/30 active:scale-[0.98]'
          }
        `}
      >
        {isAdded ? '✓ In Priority List' : '+ Add to Priority List'}
      </button>
    </div>
  );
}

// ── Border/bg classes based on state ─────────────────────────────────────────

function resolveCardClass({ isDragging = false, isAdded, rankStatus }) {
  if (isDragging) {
    return 'border-indigo-400 shadow-xl shadow-indigo-500/30';
  }
  if (isAdded) {
    return 'border-emerald-500/40 bg-emerald-950/20';
  }
  if (rankStatus && RANK_STATUS_CONFIG[rankStatus]) {
    const cfg = RANK_STATUS_CONFIG[rankStatus];
    return `${cfg.border} ${cfg.bg}`;
  }
  return 'border-slate-700/60 bg-slate-800/60';
}

// ── Desktop card — uses useDraggable, MUST only render inside DndContext ───────

function DesktopCutoffCard({ item, onAdd, isAdded, activeRound, rankStatus }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   `draggable-${item.id}`,
    data: { item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex:    isDragging ? 999 : undefined,
    opacity:   isDragging ? 0.5 : 1,
  };

  const cardClass = resolveCardClass({ isDragging, isAdded, rankStatus });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative rounded-xl border transition-all duration-200
        cursor-grab active:cursor-grabbing touch-none
        hover:shadow-lg hover:shadow-indigo-500/10
        ${cardClass}
      `}
    >
      <CardBody
        item={item} onAdd={onAdd} isAdded={isAdded}
        activeRound={activeRound} isMobile={false} rankStatus={rankStatus}
      />
    </div>
  );
}

// ── Mobile card — plain div, no drag ─────────────────────────────────────────

function MobileCutoffCard({ item, onAdd, isAdded, activeRound, rankStatus }) {
  const cardClass = resolveCardClass({ isAdded, rankStatus });

  return (
    <div className={`relative rounded-xl border transition-colors duration-150 ${cardClass}`}>
      <CardBody
        item={item} onAdd={onAdd} isAdded={isAdded}
        activeRound={activeRound} isMobile={true} rankStatus={rankStatus}
      />
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function CutoffCard({
  item,
  onAdd,
  isAdded,
  activeRound,
  isMobile,
  userRank,
  compareRound,
}) {
  const rankStatus = getRankStatus(item, compareRound, userRank);

  if (isMobile) {
    return (
      <MobileCutoffCard
        item={item} onAdd={onAdd} isAdded={isAdded}
        activeRound={activeRound} rankStatus={rankStatus}
      />
    );
  }
  return (
    <DesktopCutoffCard
      item={item} onAdd={onAdd} isAdded={isAdded}
      activeRound={activeRound} rankStatus={rankStatus}
    />
  );
}
