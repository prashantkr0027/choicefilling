import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import PriorityItem from './PriorityItem';

export default function PriorityList({ items, onRemove, onClear }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'priority-drop-zone' });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-slate-100 font-bold text-base">Priority List</h2>
          <p className="text-slate-500 text-xs">
            {items.length} choice{items.length !== 1 ? 's' : ''}
            {items.length > 0 && <span className="hidden sm:inline"> · drag to reorder</span>}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400/70 hover:text-red-400 active:text-red-400 transition-colors px-2.5 py-2 rounded-lg hover:bg-red-500/10 min-h-[36px]"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto rounded-xl border-2 border-dashed transition-all duration-200
          min-h-[180px] sm:min-h-[200px] p-2 space-y-2
          ${isOver
            ? 'border-violet-400 bg-violet-500/5 shadow-inner shadow-violet-500/10'
            : items.length === 0
              ? 'border-slate-700 bg-slate-800/20'
              : 'border-slate-700/40 bg-transparent'
          }
        `}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl sm:text-2xl">
              🎯
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">No choices yet</p>
              <p className="text-slate-600 text-xs mt-1">
                Tap <span className="text-indigo-400">+ Add</span> or drag cards here
              </p>
            </div>
          </div>
        ) : (
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => (
              <PriorityItem
                key={item.id}
                item={item}
                index={index}
                onRemove={onRemove}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
