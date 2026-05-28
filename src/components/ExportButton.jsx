import React from 'react';
import { sortedRoundEntries } from '../utils/groupRows';

export default function ExportButton({ items }) {
  const handleExport = () => {
    if (items.length === 0) return;

    const lines = items.map((item, index) => {
      const rounds = sortedRoundEntries(item.rounds || {});
      const rankStr = rounds
        .map(([round, data]) => `${round.replace(/round\s*/i, 'R')}: OR ${data.openingRank} → CR ${data.closingRank}`)
        .join('  |  ');

      const num = String(index + 1).padStart(3, ' ');
      return (
        `${num}. ${item.institute}\n` +
        `     Program   : ${item.program}\n` +
        `     Quota     : ${item.quota} | Seat Type: ${item.seatType} | Gender: ${item.gender}\n` +
        `     Ranks     : ${rankStr}\n`
      );
    });

    const header =
      '='.repeat(72) + '\n' +
      '  JoSAA Choice Filler — Preference List Export\n' +
      `  Generated : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
      `  Choices   : ${items.length}\n` +
      '='.repeat(72) + '\n\n';

    const content = header + lines.join('\n') + '\n' + '='.repeat(72);

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JoSAA_Preferences_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={items.length === 0}
      className={`
        w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm
        transition-all duration-200
        ${items.length === 0
          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
          : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
        }
      `}
    >
      <span>⬇</span>
      <span>
        {items.length === 0
          ? 'Add choices to export'
          : `Export ${items.length} choice${items.length !== 1 ? 's' : ''} as .txt`
        }
      </span>
    </button>
  );
}
