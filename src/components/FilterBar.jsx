import React, { useMemo } from 'react';
import { deriveAllRounds } from '../utils/groupRows';

// ── Fixed filter options ───────────────────────────────────────────────────────
// These match JoSAA portal values exactly.

const INSTITUTE_TYPES = ['NIT', 'IIIT', 'IIT', 'GFTI'];

const CATEGORIES = [
  { value: 'OPEN',    label: 'OPEN' },
  { value: 'EWS',     label: 'EWS' },
  { value: 'OBC-NCL', label: 'OBC-NCL' },
  { value: 'SC',      label: 'SC' },
  { value: 'ST',      label: 'ST' },
];

const QUOTAS = [
  { value: 'OS', label: 'OS', title: 'Other State' },
  { value: 'HS', label: 'HS', title: 'Home State' },
  { value: 'AI', label: 'AI', title: 'All India' },
];

const GENDERS = [
  { value: 'Gender-Neutral', label: '⚥ Neutral' },
  { value: 'Female-Only',    label: '♀ Female-Only' },
];

// ── Pill toggle group ─────────────────────────────────────────────────────────

function PillGroup({ options, value, onChange, accent = 'indigo' }) {
  const activeClass = {
    indigo:  'bg-indigo-600 text-white border-indigo-600',
    violet:  'bg-violet-600 text-white border-violet-600',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
    amber:   'bg-amber-600 text-white border-amber-600',
    rose:    'bg-rose-600 text-white border-rose-600',
    sky:     'bg-sky-600 text-white border-sky-600',
  }[accent] ?? 'bg-indigo-600 text-white border-indigo-600';

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* All / reset button */}
      <button
        onClick={() => onChange('All')}
        className={`
          px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 min-h-[36px]
          ${value === 'All'
            ? activeClass
            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 active:bg-slate-700'
          }
        `}
      >
        All
      </button>
      {options.map((opt) => {
        const val   = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const title = typeof opt === 'object' ? opt.title : undefined;
        const isActive = value === val;
        return (
          <button
            key={val}
            title={title}
            onClick={() => onChange(isActive ? 'All' : val)}
            className={`
              px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 min-h-[36px]
              ${isActive
                ? activeClass
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 active:bg-slate-700'
              }
            `}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main FilterBar ────────────────────────────────────────────────────────────

export default function FilterBar({ groupedItems, filters, onFilterChange }) {
  // Derive available rounds dynamically from loaded data
  const rounds = useMemo(() => {
    return deriveAllRounds(groupedItems ?? []);
  }, [groupedItems]);

  const searchInputClass = `
    w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5
    text-slate-200 text-sm placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50
    transition-all duration-200
  `;
  const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';

  return (
    <div className="flex flex-col gap-3.5">

      {/* ── Row 1: Institute Type ── */}
      <div>
        <p className={labelClass}>Institute Type</p>
        <PillGroup
          options={INSTITUTE_TYPES}
          value={filters.instituteType}
          onChange={(v) => onFilterChange('instituteType', v)}
          accent="indigo"
        />
      </div>

      {/* ── Row 2: Round ── */}
      {rounds.length > 0 && (
        <div>
          <p className={labelClass}>Round</p>
          <PillGroup
            options={rounds.map((r) => ({ value: r, label: r.replace('Round ', 'R') }))}
            value={filters.round}
            onChange={(v) => onFilterChange('round', v)}
            accent="violet"
          />
        </div>
      )}

      {/* ── Row 3: Category + PwD ── */}
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <p className={`${labelClass} mb-0`}>Category (Seat Type)</p>
          {/* PwD toggle */}
          <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PwD</span>
            <div
              onClick={() => onFilterChange('pwd', !filters.pwd)}
              className={`
                relative w-8 h-4.5 rounded-full border transition-all duration-200 flex items-center
                ${filters.pwd
                  ? 'bg-amber-500/30 border-amber-500/60'
                  : 'bg-slate-800 border-slate-700'
                }
              `}
              style={{ height: '18px', width: '32px' }}
              role="checkbox"
              aria-checked={filters.pwd}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onFilterChange('pwd', !filters.pwd); }}
            >
              <div className={`
                absolute w-3 h-3 rounded-full transition-all duration-200 shadow-sm
                ${filters.pwd
                  ? 'bg-amber-400 left-[16px]'
                  : 'bg-slate-500 left-[2px]'
                }
              `} />
            </div>
            {filters.pwd && (
              <span className="text-[10px] font-bold text-amber-400">(PwD)</span>
            )}
          </label>
        </div>
        <PillGroup
          options={CATEGORIES}
          value={filters.category}
          onChange={(v) => onFilterChange('category', v)}
          accent="emerald"
        />
      </div>

      {/* ── Row 4: Quota ── */}
      <div>
        <p className={labelClass}>Quota</p>
        <PillGroup
          options={QUOTAS}
          value={filters.quota}
          onChange={(v) => onFilterChange('quota', v)}
          accent="sky"
        />
      </div>

      {/* ── Row 5: Gender ── */}
      <div>
        <p className={labelClass}>Gender</p>
        <PillGroup
          options={GENDERS}
          value={filters.gender}
          onChange={(v) => onFilterChange('gender', v)}
          accent="rose"
        />
      </div>

      {/* ── Row 6: Search boxes ── */}
      <div className="grid grid-cols-1 gap-2 pt-0.5">
        <div>
          <p className={labelClass}>Search Institute</p>
          <input
            type="text"
            placeholder="e.g. NIT Warangal, IIT Bombay…"
            className={searchInputClass}
            value={filters.institute}
            onChange={(e) => onFilterChange('institute', e.target.value)}
          />
        </div>
        <div>
          <p className={labelClass}>Search Branch / Program</p>
          <input
            type="text"
            placeholder="e.g. Computer Science, Electronics…"
            className={searchInputClass}
            value={filters.branch}
            onChange={(e) => onFilterChange('branch', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
