import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import FilterBar    from '../components/FilterBar';
import CutoffCard   from '../components/CutoffCard';
import PriorityList from '../components/PriorityList';
import ExportButton from '../components/ExportButton';
import { loadAllBundledFiles, BUNDLED_FILES } from '../utils/parseHTML';
import { groupRows } from '../utils/groupRows';

// ── Default filter state ───────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  institute:     '',
  branch:        '',
  round:         'All',
  category:      'All',   // base category: OPEN | EWS | OBC-NCL | SC | ST
  pwd:           false,   // when true, look for "<category> (PwD)" seat types
  quota:         'All',   // OS | HS | AI
  gender:        'All',   // Gender-Neutral | Female-Only
  instituteType: 'All',   // NIT | IIIT | IIT | GFTI
};

const PAGE_SIZE = 60;

export default function HomePage({ priorityList, onAdd, onRemove, onClear, onReorder }) {
  const [allRows,        setAllRows]        = useState([]);
  const [filters,        setFilters]        = useState(DEFAULT_FILTERS);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [page,           setPage]           = useState(1);
  const [isLoading,      setIsLoading]      = useState(true);
  const [loadError,      setLoadError]      = useState(null);

  // Load all bundled HTML files on mount
  useEffect(() => {
    setIsLoading(true);
    loadAllBundledFiles()
      .then((rows) => setAllRows(rows))
      .catch((err) => {
        console.error('[HomePage] Failed to load bundled files:', err);
        setLoadError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Reset to page 1 whenever filters or data change
  useEffect(() => { setPage(1); }, [filters, allRows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Group flat rows → unique (instituteType, institute, program, quota, seatType, gender) combos
  const groupedItems = useMemo(() => groupRows(allRows), [allRows]);

  // Apply all active filters
  const filteredItems = useMemo(() => {
    return groupedItems.filter((item) => {
      // ── Institute Type ──
      if (filters.instituteType !== 'All' && item.instituteType !== filters.instituteType) return false;

      // ── Text search ──
      if (filters.institute && !item.institute.toLowerCase().includes(filters.institute.toLowerCase())) return false;
      if (filters.branch    && !item.program.toLowerCase().includes(filters.branch.toLowerCase()))    return false;

      // ── Round ── (item must have data for that round)
      if (filters.round !== 'All' && !item.rounds[filters.round]) return false;

      // ── Category / Seat Type + PwD ──
      if (filters.category !== 'All') {
        // PwD enabled → match "<category> (PwD)", else match "<category>" exactly
        const target = filters.pwd ? `${filters.category} (PwD)` : filters.category;
        if (item.seatType !== target) return false;
      } else if (filters.pwd) {
        // No specific category but PwD on → show only PwD seat types
        if (!item.seatType.includes('(PwD)')) return false;
      }

      // ── Quota ──
      if (filters.quota !== 'All' && item.quota !== filters.quota) return false;

      // ── Gender ──
      if (filters.gender !== 'All' && item.gender !== filters.gender) return false;

      return true;
    });
  }, [groupedItems, filters]);

  const paginatedItems = useMemo(
    () => filteredItems.slice(0, page * PAGE_SIZE),
    [filteredItems, page]
  );

  const priorityIds = useMemo(
    () => new Set(priorityList.map((i) => i.id)),
    [priorityList]
  );

  // Count active (non-default) filters for the badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.instituteType !== 'All') count++;
    if (filters.round         !== 'All') count++;
    if (filters.category      !== 'All') count++;
    if (filters.pwd)                     count++;
    if (filters.quota         !== 'All') count++;
    if (filters.gender        !== 'All') count++;
    if (filters.institute.trim())        count++;
    if (filters.branch.trim())           count++;
    return count;
  }, [filters]);

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(({ active }) => {
    const item = active.data.current?.item;
    if (item) setActiveDragItem(item);
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveDragItem(null);
    if (!over) return;

    const draggedItem = active.data.current?.item;
    if (draggedItem && over.id === 'priority-drop-zone') {
      onAdd(draggedItem);
      return;
    }

    // Reorder within priority list
    if (active.id !== over.id) {
      const oldIndex = priorityList.findIndex((i) => i.id === active.id);
      const newIndex = priorityList.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(priorityList, oldIndex, newIndex));
      }
    }
  }, [onAdd, onReorder, priorityList]);

  const hasMore = paginatedItems.length < filteredItems.length;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4 flex flex-col lg:flex-row gap-4">

        {/* ═══ LEFT PANEL ═══ */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Filters panel */}
          {!isLoading && !loadError && groupedItems.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="text-base">🔍</span>
                <h2 className="text-slate-200 font-bold text-sm">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none">
                    {activeFilterCount}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-500">
                  {filteredItems.length.toLocaleString()}
                  <span className="text-slate-700"> / {groupedItems.length.toLocaleString()} combos</span>
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Reset all
                  </button>
                )}
              </div>
              {/* Pass groupedItems for round detection */}
              <FilterBar
                groupedItems={groupedItems}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
          )}

          {/* ── Cards area ── */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full border-4 border-slate-700" />
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin absolute inset-0" />
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-semibold">Loading cutoff data…</p>
                <p className="text-slate-500 text-xs mt-1">
                  Parsing {BUNDLED_FILES.length} files (NITs · IIITs · IITs · GFTIs)
                </p>
              </div>
            </div>

          ) : loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="text-4xl">⚠️</div>
              <p className="text-red-400 font-semibold">Failed to load data files</p>
              <p className="text-slate-500 text-xs max-w-xs">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors"
              >
                Retry
              </button>
            </div>

          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-3xl mb-2">🔎</div>
              <p className="font-medium">No results match your filters</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Clear all filters
              </button>
            </div>

          ) : (
            <>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}
              >
                {paginatedItems.map((item) => (
                  <CutoffCard
                    key={item.id}
                    item={item}
                    onAdd={onAdd}
                    isAdded={priorityIds.has(item.id)}
                    activeRound={filters.round}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-indigo-500 hover:text-indigo-300 transition-all duration-200"
                  >
                    Load more ({filteredItems.length - paginatedItems.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col gap-3">
          <div
            className="sticky rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col gap-3"
            style={{ top: '4.5rem', maxHeight: 'calc(100vh - 5rem)' }}
          >
            <PriorityList
              items={priorityList}
              onRemove={onRemove}
              onClear={onClear}
            />
            <ExportButton items={priorityList} />
          </div>
        </div>
      </main>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem ? (
          <div className="rounded-xl border-2 border-indigo-400 bg-slate-800 shadow-2xl shadow-indigo-500/30 p-3 opacity-90 rotate-1 scale-105 max-w-xs">
            <p className="text-slate-200 font-semibold text-xs">{activeDragItem.institute}</p>
            <p className="text-indigo-300 text-[11px] mt-0.5">{activeDragItem.program}</p>
            <p className="text-slate-500 text-[10px] mt-1">
              {activeDragItem.quota} · {activeDragItem.seatType}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
