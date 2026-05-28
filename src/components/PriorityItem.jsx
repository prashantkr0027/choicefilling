import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sortedRoundEntries } from '../utils/groupRows';

function abbrevRound(round) {
  return round.replace(/round\s*/i, 'R');
}

export default function PriorityItem({ item, index, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  };

  const rounds = sortedRoundEntries(item.rounds || {});

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200
        ${isDragging
          ? 'border-violet-400 bg-violet-950/40 shadow-xl shadow-violet-500/30 opacity-80'
          : 'border-slate-700/60 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/80'
        }
      `}
    >
      {/* Serial Number */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mt-0.5">
        <span className="text-xs font-bold text-white">{index + 1}</span>
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 flex flex-col gap-0.5 mt-2.5 cursor-grab active:cursor-grabbing opacity-35 hover:opacity-70 transition-opacity"
        title="Drag to reorder"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-3.5 h-0.5 bg-slate-400 rounded-full" />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
            {item.quota}
          </span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-700/80 text-slate-400">
            {item.seatType}
          </span>
        </div>

        <p className="text-slate-200 text-xs font-semibold leading-snug break-words">
          {item.institute}
        </p>
        <p className="text-indigo-300/80 text-[10px] leading-snug break-words mb-1.5">
          {item.program}
        </p>

        {/* Rounds inline */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {rounds.map(([round, data]) => (
            <span key={round} className="text-[9px] font-mono text-slate-500 whitespace-nowrap">
              <span className="text-slate-600 font-bold">{abbrevRound(round)}</span>
              {' '}
              <span className="text-emerald-500/80">{data.openingRank}→{data.closingRank}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-0.5"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}
