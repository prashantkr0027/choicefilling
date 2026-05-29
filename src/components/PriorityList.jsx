import React, { useCallback } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { arrayMove }    from '@dnd-kit/sortable';
import PriorityItem       from './PriorityItem';
import MobilePriorityItem from './MobilePriorityItem';

// ── Desktop drop-zone wrapper (requires DndContext) ───────────────────────────

function DesktopPriorityList({ items, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'priority-drop-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 overflow-y-auto rounded-xl border-2 border-dashed transition-all duration-200
        min-h-[200px] p-2 space-y-2
        ${isOver
          ? 'border-violet-400 bg-violet-500/5 shadow-inner shadow-violet-500/10'
          : items.length === 0
            ? 'border-slate-700 bg-slate-800/20'
            : 'border-slate-700/40 bg-transparent'
        }
      `}
    >
      {items.length === 0 ? (
        <EmptyState isMobile={false} />
      ) : (
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <PriorityItem key={item.id} item={item} index={index} onRemove={onRemove} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

// ── Mobile list (no DndContext required) ──────────────────────────────────────

function MobilePriorityItemList({ items, onRemove, onReorder }) {
  const moveUp = useCallback((index) => {
    if (index === 0) return;
    onReorder(arrayMove(items, index, index - 1));
  }, [items, onReorder]);

  const moveDown = useCallback((index) => {
    if (index === items.length - 1) return;
    onReorder(arrayMove(items, index, index + 1));
  }, [items, onReorder]);

  return (
    <div
      className={`
        flex-1 overflow-y-auto rounded-xl border-2 border-dashed transition-all duration-200
        min-h-[180px] p-2 space-y-2
        ${items.length === 0 ? 'border-slate-700 bg-slate-800/20' : 'border-slate-700/40 bg-transparent'}
      `}
    >
      {items.length === 0 ? (
        <EmptyState isMobile={true} />
      ) : (
        items.map((item, index) => (
          <MobilePriorityItem
            key={item.id}
            item={item}
            index={index}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onRemove={onRemove}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
          />
        ))
      )}
    </div>
  );
}

// ── Empty state (shared) ──────────────────────────────────────────────────────

function EmptyState({ isMobile }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-3">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl sm:text-2xl">
        🎯
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">No choices yet</p>
        <p className="text-slate-600 text-xs mt-1">
          {isMobile
            ? <>Tap <span className="text-indigo-400">+ Add to Priority List</span><br />on any card above</>
            : <>Drag cards here or click <span className="text-indigo-400">+</span> to add</>
          }
        </p>
      </div>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function PriorityList({ items, onRemove, onClear, onReorder, isMobile }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-slate-100 font-bold text-base">Priority List</h2>
          <p className="text-slate-500 text-xs">
            {items.length} choice{items.length !== 1 ? 's' : ''}
            {!isMobile && items.length > 0 && (
              <span className="hidden sm:inline"> · drag to reorder</span>
            )}
            {isMobile && items.length > 0 && (
              <span> · ▲▼ to reorder</span>
            )}
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

      {/* List body — desktop uses DnD, mobile uses ▲▼ buttons */}
      {isMobile ? (
        <MobilePriorityItemList items={items} onRemove={onRemove} onReorder={onReorder} />
      ) : (
        <DesktopPriorityList items={items} onRemove={onRemove} />
      )}
    </div>
  );
}
