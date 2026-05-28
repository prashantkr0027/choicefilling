import React, { useMemo } from 'react';

export default function FilterBar({ rows, filters, onFilterChange }) {
  // Derive unique values for dropdowns
  const rounds = useMemo(() => {
    const set = new Set(rows.map((r) => r.round));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const seatTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.seatType));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const quotas = useMemo(() => {
    const set = new Set(rows.map((r) => r.quota));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const genders = useMemo(() => {
    const set = new Set(rows.map((r) => r.gender));
    return ['All', ...Array.from(set).sort()];
  }, [rows]);

  const inputClass = `
    w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
    text-slate-200 text-sm placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    transition-all duration-200
  `;

  const labelClass = 'block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1';

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {/* Institute Search */}
      <div className="col-span-2 xl:col-span-3">
        <label className={labelClass}>Search Institute</label>
        <input
          type="text"
          placeholder="e.g. NIT Warangal, NIT Calicut…"
          className={inputClass}
          value={filters.institute}
          onChange={(e) => onFilterChange('institute', e.target.value)}
        />
      </div>

      {/* Branch Search */}
      <div className="col-span-2 xl:col-span-3">
        <label className={labelClass}>Search Branch / Program</label>
        <input
          type="text"
          placeholder="e.g. Computer Science, Electronics…"
          className={inputClass}
          value={filters.branch}
          onChange={(e) => onFilterChange('branch', e.target.value)}
        />
      </div>

      {/* Round */}
      <div>
        <label className={labelClass}>Round</label>
        <select
          className={inputClass}
          value={filters.round}
          onChange={(e) => onFilterChange('round', e.target.value)}
        >
          {rounds.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Seat Type */}
      <div>
        <label className={labelClass}>Seat Type</label>
        <select
          className={inputClass}
          value={filters.seatType}
          onChange={(e) => onFilterChange('seatType', e.target.value)}
        >
          {seatTypes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Quota */}
      <div>
        <label className={labelClass}>Quota</label>
        <select
          className={inputClass}
          value={filters.quota}
          onChange={(e) => onFilterChange('quota', e.target.value)}
        >
          {quotas.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {/* Gender */}
      <div>
        <label className={labelClass}>Gender</label>
        <select
          className={inputClass}
          value={filters.gender}
          onChange={(e) => onFilterChange('gender', e.target.value)}
        >
          {genders.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
