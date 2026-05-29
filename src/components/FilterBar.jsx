import React, { useState, useEffect, useMemo } from 'react';
import { deriveAllRounds } from '../utils/groupRows';

// ── Fixed filter options ──────────────────────────────────────────────────────

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

// ── Toggle pill group ─────────────────────────────────────────────────────────

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
        const val    = typeof opt === 'string' ? opt : opt.value;
        const label  = typeof opt === 'string' ? opt : opt.label;
        const title  = typeof opt === 'object' ? opt.title : undefined;
        const active = value === val;
        return (
          <button
            key={val}
            title={title}
            onClick={() => onChange(active ? 'All' : val)}
            className={`
              px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 min-h-[36px]
              ${active
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

// ── Number input ──────────────────────────────────────────────────────────────

function NumInput({ value, onChange, placeholder, min = 1, className = '' }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      className={`
        bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2
        text-slate-200 text-sm placeholder-slate-600
        focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50
        transition-all duration-200 min-h-[40px]
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${className}
      `}
    />
  );
}

// ── Main FilterBar ────────────────────────────────────────────────────────────

export default function FilterBar({
  groupedItems,
  filters,
  onFilterChange,
  userRank,
  onRankChange,
}) {
  // Local rank input state (controlled by prop, saved on blur/Enter)
  const [rankInput, setRankInput] = useState(userRank ? String(userRank) : '');

  // Sync from prop (e.g. loaded on login, or updated via Realtime)
  useEffect(() => {
    if (userRank !== null && userRank !== undefined) {
      setRankInput(String(userRank));
    }
  }, [userRank]);

  // Commit rank: save to Supabase + auto-fill range
  const commitRank = () => {
    const raw  = rankInput.trim();
    const rank = raw ? parseInt(raw, 10) : null;
    if (raw && (isNaN(rank) || rank < 1)) return;   // invalid — don't save

    onRankChange(rank);

    if (rank && rank > 0) {
      onFilterChange('minRank', String(Math.max(1, rank - 500)));
      onFilterChange('maxRank', String(rank + 500));
    }
  };

  const handleRankKeyDown = (e) => {
    if (e.key === 'Enter') { e.target.blur(); }
  };

  // Derive available rounds from loaded data
  const allRounds = useMemo(() => deriveAllRounds(groupedItems ?? []), [groupedItems]);

  const labelClass  = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';
  const inputClass  = `
    w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5
    text-slate-200 text-sm placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50
    transition-all duration-200 min-h-[40px]
  `;

  return (
    <div className="flex flex-col gap-3.5">

      {/* ══ RANK SECTION ══════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3 flex flex-col gap-3">

        {/* Your JEE Rank */}
        <div>
          <label className={labelClass}>🎯 Your JEE Rank</label>
          <div className="flex gap-2">
            <NumInput
              value={rankInput}
              onChange={setRankInput}
              placeholder={userRank ? '' : 'Enter your rank…'}
              className="flex-1"
            />
            <button
              onClick={commitRank}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold transition-colors min-h-[40px] flex-shrink-0"
            >
              Set
            </button>
          </div>
          {!userRank && (
            <p className="text-slate-600 text-[10px] mt-1">Enter your JEE rank to filter colleges</p>
          )}
        </div>

        {/* Rank Range + Round selector */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className={`${labelClass} mb-0`}>Rank Range Filter</label>
            {/* Round selector */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Round</span>
              <select
                value={filters.rankRound}
                onChange={(e) => onFilterChange('rankRound', e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
              >
                {allRounds.length > 0
                  ? allRounds.map((r) => (
                      <option key={r} value={r}>{r.replace(/round\s*/i, 'R')}</option>
                    ))
                  : ['Round 1','Round 2','Round 3','Round 4','Round 5','Round 6'].map((r) => (
                      <option key={r} value={r}>{r.replace('Round ', 'R')}</option>
                    ))
                }
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <NumInput
              value={filters.minRank}
              onChange={(v) => onFilterChange('minRank', v)}
              placeholder="Min rank"
              className="flex-1"
            />
            <span className="text-slate-600 text-xs flex-shrink-0">–</span>
            <NumInput
              value={filters.maxRank}
              onChange={(v) => onFilterChange('maxRank', v)}
              placeholder="Max rank"
              className="flex-1"
            />
            {(filters.minRank || filters.maxRank) && (
              <button
                onClick={() => { onFilterChange('minRank', ''); onFilterChange('maxRank', ''); }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 px-1"
                title="Clear range"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Clarification note */}
        <p className="text-[9px] text-slate-600 leading-relaxed border-t border-slate-700/60 pt-2.5 mt-0.5">
          Opening/Closing Ranks for Open Seats represent CRL. Opening/Closing Ranks for EWS, OBC-NCL, SC and ST Seats represent respective Category Ranks. Opening/Closing Ranks for PwD Seats represent PwD Ranks within Respective Categories.
        </p>
      </div>

      {/* ══ INSTITUTE TYPE ════════════════════════════════════════════════════ */}
      <div>
        <p className={labelClass}>Institute Type</p>
        <PillGroup
          options={INSTITUTE_TYPES}
          value={filters.instituteType}
          onChange={(v) => onFilterChange('instituteType', v)}
          accent="indigo"
        />
      </div>

      {/* ══ ROUND ═════════════════════════════════════════════════════════════ */}
      {allRounds.length > 0 && (
        <div>
          <p className={labelClass}>Round</p>
          <PillGroup
            options={allRounds.map((r) => ({ value: r, label: r.replace('Round ', 'R') }))}
            value={filters.round}
            onChange={(v) => onFilterChange('round', v)}
            accent="violet"
          />
        </div>
      )}

      {/* ══ CATEGORY + PwD ════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <p className={`${labelClass} mb-0`}>Category (Seat Type)</p>
          <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PwD</span>
            <div
              onClick={() => onFilterChange('pwd', !filters.pwd)}
              className={`relative rounded-full border transition-all duration-200 flex items-center ${
                filters.pwd ? 'bg-amber-500/30 border-amber-500/60' : 'bg-slate-800 border-slate-700'
              }`}
              style={{ height: 18, width: 32 }}
              role="checkbox"
              aria-checked={filters.pwd}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onFilterChange('pwd', !filters.pwd); }}
            >
              <div className={`absolute w-3 h-3 rounded-full transition-all duration-200 shadow-sm ${
                filters.pwd ? 'bg-amber-400 left-[16px]' : 'bg-slate-500 left-[2px]'
              }`} />
            </div>
            {filters.pwd && <span className="text-[10px] font-bold text-amber-400">(PwD)</span>}
          </label>
        </div>
        <PillGroup
          options={CATEGORIES}
          value={filters.category}
          onChange={(v) => onFilterChange('category', v)}
          accent="emerald"
        />
      </div>

      {/* ══ QUOTA ═════════════════════════════════════════════════════════════ */}
      <div>
        <p className={labelClass}>Quota</p>
        <PillGroup options={QUOTAS} value={filters.quota} onChange={(v) => onFilterChange('quota', v)} accent="sky" />
      </div>

      {/* ══ GENDER ════════════════════════════════════════════════════════════ */}
      <div>
        <p className={labelClass}>Gender</p>
        <PillGroup options={GENDERS} value={filters.gender} onChange={(v) => onFilterChange('gender', v)} accent="rose" />
      </div>

      {/* ══ SEARCH ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-2 pt-0.5">
        <div>
          <p className={labelClass}>Search Institute</p>
          <input
            type="text"
            placeholder="e.g. NIT Warangal, IIT Bombay…"
            className={inputClass}
            value={filters.institute}
            onChange={(e) => onFilterChange('institute', e.target.value)}
          />
        </div>
        <div>
          <p className={labelClass}>Search Branch / Program</p>
          <input
            type="text"
            placeholder="e.g. Computer Science, Electronics…"
            className={inputClass}
            value={filters.branch}
            onChange={(e) => onFilterChange('branch', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
