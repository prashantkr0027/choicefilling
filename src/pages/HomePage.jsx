import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
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
import { useIsMobile } from '../hooks/useIsMobile';

// ── Default filter state ───────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  institute:     '',
  branch:        '',
  round:         'All',
  category:      'All',
  pwd:           false,
  quota:         'All',
  gender:        'All',
  instituteType: 'All',
  // Rank range filter
  minRank:   '',
  maxRank:   '',
  rankRound: 'Round 6',
};

const PAGE_SIZE = 60;

export default function HomePage({ priorityList, onAdd, onRemove, onClear, onReorder, userRank, onRankChange, mode }) {
  const isMobile = useIsMobile();

  const [allRows,        setAllRows]        = useState([]);
  const [filters,        setFilters]        = useState(DEFAULT_FILTERS);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [page,           setPage]           = useState(1);
  const [isLoading,      setIsLoading]      = useState(true);
  const [loadError,      setLoadError]      = useState(null);
  const [filtersOpen,    setFiltersOpen]    = useState(false);

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

  // Auto-fill rank range when userRank loads (only if range not already set)
  useEffect(() => {
    if (userRank) {
      const rank = parseInt(String(userRank), 10);
      if (!isNaN(rank) && rank > 0) {
        setFilters((prev) => ({
          ...prev,
          minRank: prev.minRank || String(Math.max(1, rank - 500)),
          maxRank: prev.maxRank || String(rank + 500),
        }));
      }
    }
  }, [userRank]);

  // Switch default rankRound when mode changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      rankRound: mode === 'csab' ? 'CSAB Round 3' : 'Round 6',
    }));
  }, [mode]);

  useEffect(() => { setPage(1); }, [filters, allRows]);

  // Sensors — only used on desktop, but hooks must always be called
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const groupedItems = useMemo(() => groupRows(allRows), [allRows]);

  // Filter by mode first, then apply all other filters
  const filteredItems = useMemo(() => {
    return groupedItems.filter((item) => {
      // Mode gate — JoSAA mode shows only JoSAA source, CSAB shows only CSAB
      if (mode === 'csab'  && item.source !== 'CSAB')   return false;
      if (mode !== 'csab'  && item.source !== 'JoSAA')  return false;
      if (filters.instituteType !== 'All' && item.instituteType !== filters.instituteType) return false;
      if (filters.institute && !item.institute.toLowerCase().includes(filters.institute.toLowerCase())) return false;
      if (filters.branch    && !item.program.toLowerCase().includes(filters.branch.toLowerCase()))    return false;
      if (filters.round !== 'All' && !item.rounds[filters.round]) return false;
      if (filters.category !== 'All') {
        const target = filters.pwd ? `${filters.category} (PwD)` : filters.category;
        if (item.seatType !== target) return false;
      } else if (filters.pwd) {
        if (!item.seatType.includes('(PwD)')) return false;
      }
      if (filters.quota  !== 'All' && item.quota  !== filters.quota)  return false;
      if (filters.gender !== 'All' && item.gender !== filters.gender)  return false;

      // ── Rank range filter (based on selected round's closing rank) ──
      const hasRankFilter = filters.minRank || filters.maxRank;
      if (hasRankFilter) {
        const roundData = item.rounds?.[filters.rankRound];
        if (!roundData?.closingRank) return false;  // no data for this round
        const cr = parseInt(String(roundData.closingRank).replace(/[^0-9]/g, ''), 10);
        if (isNaN(cr)) return false;
        if (filters.minRank && cr < parseInt(filters.minRank, 10)) return false;
        if (filters.maxRank && cr > parseInt(filters.maxRank, 10)) return false;
      }

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
    if (filters.minRank || filters.maxRank) count++;
    return count;
  }, [filters]);

  // DnD handlers — only invoked on desktop
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
    if (active.id !== over.id) {
      const oldIndex = priorityList.findIndex((i) => i.id === active.id);
      const newIndex = priorityList.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(priorityList, oldIndex, newIndex));
      }
    }
  }, [onAdd, onReorder, priorityList]);

  const hasMore = paginatedItems.length < filteredItems.length;

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setFiltersOpen(false);
  }, []);

  // ── Shared layout content ────────────────────────────────────────────────────
  // Extracted so desktop (DndContext) and mobile (plain) share the same JSX tree.

  const mainContent = (
    <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 flex flex-col lg:flex-row gap-3 sm:gap-4">

      {/* ═══ LEFT PANEL ═══ */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">

        {/* Filters */}
        {!isLoading && !loadError && groupedItems.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
            {/* Mobile toggle button */}
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="lg:hidden w-full flex items-center gap-2 px-4 py-3 text-left"
              aria-expanded={filtersOpen}
            >
              <span className="text-base">🔍</span>
              <span className="text-slate-200 font-bold text-sm">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
              <span className="text-xs text-slate-500 ml-1">
                {filteredItems.length.toLocaleString()} results
              </span>
              <span className={`ml-auto text-slate-500 text-xs transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Desktop header */}
            <div className="hidden lg:flex items-center gap-2 px-4 pt-4 pb-0 mb-3.5">
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
                <button onClick={resetFilters} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Reset all
                </button>
              )}
            </div>

            {/* Filter body */}
            <div className={`px-4 pb-4 ${filtersOpen ? 'block' : 'hidden'} lg:block`}>
              {activeFilterCount > 0 && (
                <div className="lg:hidden flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-500">
                    {filteredItems.length.toLocaleString()} / {groupedItems.length.toLocaleString()} combos
                  </span>
                  <button onClick={resetFilters} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
                    Reset all
                  </button>
                </div>
              )}
              <FilterBar
                groupedItems={groupedItems}
                filters={filters}
                onFilterChange={handleFilterChange}
                userRank={userRank}
                onRankChange={onRankChange}
                mode={mode}
              />
            </div>
          </div>
        )}

        {/* Cards */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 sm:py-20">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16">
              <div className="w-full h-full rounded-full border-4 border-slate-700" />
              <div className="w-full h-full rounded-full border-4 border-indigo-500 border-t-transparent animate-spin absolute inset-0" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-semibold">Loading cutoff data…</p>
              <p className="text-slate-500 text-xs mt-1">
                Parsing {BUNDLED_FILES.length} files (NITs · IIITs · IITs · GFTIs)
              </p>
            </div>
          </div>

        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
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
          <div className="text-center py-12 text-slate-500 px-4">
            <div className="text-3xl mb-2">🔎</div>
            <p className="font-medium">No results match your filters</p>
            <button onClick={resetFilters} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">
              Clear all filters
            </button>
          </div>

        ) : (
          <>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))' }}
            >
              {paginatedItems.map((item) => (
                <CutoffCard
                  key={item.id}
                  item={item}
                  onAdd={onAdd}
                  isAdded={priorityIds.has(item.id)}
                  activeRound={filters.round}
                  isMobile={isMobile}
                  userRank={userRank}
                  compareRound={filters.rankRound}
                  mode={mode}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-5 sm:px-6 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-indigo-500 hover:text-indigo-300 transition-all duration-200 min-h-[44px]"
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
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4 flex flex-col gap-3 lg:sticky"
          style={{ top: '3.5rem', maxHeight: 'calc(100vh - 4.5rem)' }}
        >
          <PriorityList
            items={priorityList}
            onRemove={onRemove}
            onClear={onClear}
            onReorder={onReorder}
            isMobile={isMobile}
          />
          <ExportButton items={priorityList} />
        </div>
      </div>
    </main>
  );

  // ── Mobile: plain layout, no DnD ────────────────────────────────────────────
  if (isMobile) {
    return mainContent;
  }

  // ── Desktop: wrap with DndContext ────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {mainContent}

      <DragOverlay>
        {activeDragItem ? (
          <div className="rounded-xl border-2 border-indigo-400 bg-slate-800 shadow-2xl shadow-indigo-500/30 p-3 opacity-90 rotate-1 scale-105 max-w-[300px]">
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
