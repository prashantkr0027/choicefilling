import React from 'react';
import { sortedRoundEntries } from '../utils/groupRows';

function abbrevRound(round) {
  return round.replace(/round\s*/i, 'R');
}

/**
 * Mobile-only priority list item.
 * No DnD hooks — reordering is done with up/down arrow buttons.
 */
export default function MobilePriorityItem({
  item,
  index,
  isFirst,
  isLast,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const rounds = sortedRoundEntries(item.rounds || {});

  const arrowBtn = (label, handler, disabled, title) => (
    <button
      onClick={handler}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center rounded-lg transition-all duration-150
        text-base leading-none
        ${disabled
          ? 'text-slate-700 cursor-default'
          : 'text-slate-400 hover:text-indigo-300 active:text-indigo-200 hover:bg-indigo-500/10 active:bg-indigo-500/20'
        }
      `}
      style={{ width: 36, height: 36 }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-stretch gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 px-2.5 py-2.5">

      {/* Serial number */}
      <div className="flex-shrink-0 w-7 h-7 self-start mt-0.5 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
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

      {/* Up / Down / Remove controls */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 -mr-1">
        {arrowBtn('▲', onMoveUp,   isFirst, 'Move up')}
        {arrowBtn('▼', onMoveDown, isLast,  'Move down')}
        <button
          onClick={() => onRemove(item.id)}
          title="Remove"
          className="flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 active:text-red-400 hover:bg-red-500/10 active:bg-red-500/10 transition-all mt-0.5 text-sm"
          style={{ width: 36, height: 36 }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
