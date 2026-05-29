import React, { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { deriveAllRounds } from '../utils/groupRows';
import ExportButton from '../components/ExportButton';
import { useIsMobile } from '../hooks/useIsMobile';

// ── Desktop sortable row (uses useSortable — must be inside DndContext) ───────

function SortableRow({ item, index, allRounds, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-800/60 transition-colors print:border-gray-200 ${
        isDragging ? 'opacity-60 bg-violet-950/40' : 'hover:bg-slate-800/30'
      }`}
    >
      <td className="px-2 sm:px-3 py-2.5 whitespace-nowrap print:hidden">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            {...attributes}
            {...listeners}
            className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity p-1.5 -m-1 touch-none"
            title="Drag to reorder"
            style={{ minWidth: 32, minHeight: 32 }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-3 h-0.5 bg-slate-400 rounded-full" />
            ))}
          </button>
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {index + 1}
          </span>
        </div>
      </td>
      <td className="hidden print:table-cell px-2 py-1.5 text-sm font-bold text-gray-800 whitespace-nowrap">
        {index + 1}
      </td>
      <RowCells item={item} allRounds={allRounds} onRemove={onRemove} isMobile={false} />
    </tr>
  );
}

// ── Mobile row (plain tr — no DnD hooks) ─────────────────────────────────────

function MobileRow({ item, index, total, allRounds, onRemove, onMoveUp, onMoveDown }) {
  const isFirst = index === 0;
  const isLast  = index === total - 1;

  const arrowBtn = (label, handler, disabled, title) => (
    <button
      onClick={handler}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center rounded transition-all ${
        disabled
          ? 'text-slate-700 cursor-default'
          : 'text-slate-400 hover:text-indigo-300 active:text-indigo-200 hover:bg-indigo-500/10 active:bg-indigo-500/20'
      }`}
      style={{ width: 28, height: 28 }}
    >
      {label}
    </button>
  );

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20">
      <td className="px-2 py-2 whitespace-nowrap print:hidden">
        <div className="flex flex-col items-center gap-0.5">
          {arrowBtn('▲', onMoveUp,   isFirst, 'Move up')}
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
            {index + 1}
          </span>
          {arrowBtn('▼', onMoveDown, isLast,  'Move down')}
        </div>
      </td>
      <td className="hidden print:table-cell px-2 py-1.5 text-sm font-bold text-gray-800 whitespace-nowrap">
        {index + 1}
      </td>
      <RowCells item={item} allRounds={allRounds} onRemove={onRemove} isMobile={true} />
    </tr>
  );
}

// ── Shared row cells (institute, branch, quota, seat type, ranks, remove) ─────

function RowCells({ item, allRounds, onRemove, isMobile }) {
  return (
    <>
      <td className="px-2 sm:px-3 py-2.5 text-xs text-slate-200 font-semibold print:text-gray-900 print:text-sm min-w-[130px]">
        {item.institute}
      </td>
      <td className="px-2 sm:px-3 py-2.5 text-xs text-indigo-300 print:text-gray-700 print:text-sm min-w-[130px]">
        {item.program}
      </td>
      <td className="px-2 sm:px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap print:text-gray-700">
        {item.quota}
      </td>
      <td className="px-2 sm:px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap print:text-gray-700">
        {item.seatType}
      </td>
      {allRounds.map((round) => {
        const data = item.rounds?.[round];
        return (
          <td key={round} className="px-2 sm:px-3 py-2.5 text-center whitespace-nowrap print:text-gray-800">
            {data ? (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-mono font-bold text-emerald-400 print:text-green-700">
                  {data.closingRank}
                </span>
                <span className="text-[9px] font-mono text-slate-600 print:text-gray-400">
                  {data.openingRank}
                </span>
              </div>
            ) : (
              <span className="text-slate-700 text-xs">—</span>
            )}
          </td>
        );
      })}
      <td className="px-2 sm:px-3 py-2.5 print:hidden">
        <button
          onClick={() => onRemove(item.id)}
          className="flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 active:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
          title="Remove"
          style={{ width: isMobile ? 36 : 28, height: isMobile ? 36 : 28 }}
        >
          ✕
        </button>
      </td>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChoicesPage({ priorityList, onReorder, onRemove, onClear }) {
  const isMobile = useIsMobile();

  // Sensors always defined (hook rules)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const allRounds = useMemo(() => deriveAllRounds(priorityList), [priorityList]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = priorityList.findIndex((i) => i.id === active.id);
    const newIndex = priorityList.findIndex((i) => i.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(priorityList, oldIndex, newIndex));
    }
  };

  const moveUp   = (index) => { if (index > 0) onReorder(arrayMove(priorityList, index, index - 1)); };
  const moveDown = (index) => { if (index < priorityList.length - 1) onReorder(arrayMove(priorityList, index, index + 1)); };

  const tableHeader = (
    <thead>
      <tr className="border-b border-slate-700 print:border-gray-400">
        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap print:hidden">
          {isMobile ? 'Order' : '#'}
        </th>
        <th className="hidden print:table-cell px-2 py-2 text-xs font-bold text-gray-700 uppercase">#</th>
        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider print:text-gray-700 print:text-xs">Institute</th>
        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider print:text-gray-700 print:text-xs">Branch</th>
        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider print:text-gray-700 print:text-xs">Quota</th>
        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap print:text-gray-700 print:text-xs">Seat Type</th>
        {allRounds.map((round) => (
          <th key={round} className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap print:text-gray-700 print:text-xs">
            {round.replace(/round\s*/i, 'R')}
            <br />
            <span className="normal-case font-normal text-[9px] text-slate-500 print:text-gray-400">CR / OR</span>
          </th>
        ))}
        <th className="px-2 sm:px-3 py-3 print:hidden" />
      </tr>
    </thead>
  );

  const tableBody = isMobile ? (
    <tbody>
      {priorityList.map((item, index) => (
        <MobileRow
          key={item.id}
          item={item}
          index={index}
          total={priorityList.length}
          allRounds={allRounds}
          onRemove={onRemove}
          onMoveUp={() => moveUp(index)}
          onMoveDown={() => moveDown(index)}
        />
      ))}
    </tbody>
  ) : (
    <SortableContext
      items={priorityList.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <tbody>
        {priorityList.map((item, index) => (
          <SortableRow
            key={item.id}
            item={item}
            index={index}
            allRounds={allRounds}
            onRemove={onRemove}
          />
        ))}
      </tbody>
    </SortableContext>
  );

  const table = (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 print:border-0 print:bg-white print:rounded-none">
      <table className="w-full text-left border-collapse" style={{ minWidth: 520 }}>
        {tableHeader}
        {tableBody}
      </table>
    </div>
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6 print:hidden">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-100">My Choice List</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {priorityList.length} choice{priorityList.length !== 1 ? 's' : ''}
            {priorityList.length > 0 && (
              isMobile
                ? ' · tap ▲▼ to reorder'
                : <span className="hidden sm:inline"> · drag rows to reorder · CR = Closing Rank, OR = Opening Rank</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {priorityList.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm text-red-400/70 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors min-h-[40px]"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => window.print()}
            disabled={priorityList.length === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
          >
            🖨 <span className="hidden sm:inline">Print</span>
          </button>
          <div className="w-full sm:w-48">
            <ExportButton items={priorityList} />
          </div>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-black text-gray-900">JoSAA Choice List</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          &nbsp;·&nbsp;Total choices: {priorityList.length}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">CR = Closing Rank · OR = Opening Rank</p>
      </div>

      {priorityList.length === 0 ? (
        <div className="text-center py-20 sm:py-24 text-slate-500">
          <div className="text-5xl mb-4">🎯</div>
          <p className="font-semibold text-slate-300 text-lg">No choices yet</p>
          <p className="text-sm mt-1">
            Go to{' '}
            <a href="/" className="text-indigo-400 hover:underline">Browse</a>
            {' '}and add choices to your priority list.
          </p>
        </div>
      ) : (
        <>
          {isMobile && (
            <p className="text-[10px] text-slate-600 mb-2 text-right sm:hidden">
              ← scroll table horizontally →
            </p>
          )}
          {isMobile ? (
            table
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {table}
            </DndContext>
          )}
        </>
      )}
    </div>
  );
}
