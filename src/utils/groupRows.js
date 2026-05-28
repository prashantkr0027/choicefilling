/**
 * groupRows.js
 * Groups flat cutoff rows by unique (institute, program, quota, seatType, gender).
 * Each group contains a `rounds` map of all round data for that combination.
 */

/**
 * @param {Array<Object>} rows - flat parsed rows from parseHTML
 * @returns {Array<Object>}   - deduplicated grouped items
 */
export function groupRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = [
      row.institute,
      row.program,
      row.quota,
      row.seatType,
      row.gender,
    ].join('|||');

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        institute: row.institute,
        program: row.program,
        quota: row.quota,
        seatType: row.seatType,
        gender: row.gender,
        rounds: {},
      });
    }

    groups.get(key).rounds[row.round] = {
      openingRank: row.openingRank,
      closingRank: row.closingRank,
    };
  }

  return Array.from(groups.values());
}

/**
 * Sort a rounds map by round number ascending.
 * @param {Object} rounds  - { 'Round 1': {...}, 'Round 2': {...} }
 * @returns {Array<[string, Object]>} sorted entries
 */
export function sortedRoundEntries(rounds) {
  return Object.entries(rounds).sort(([a], [b]) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
}

/**
 * Derive sorted list of all unique round labels present in an array of grouped items.
 */
export function deriveAllRounds(items) {
  const set = new Set();
  items.forEach((item) => Object.keys(item.rounds || {}).forEach((r) => set.add(r)));
  return Array.from(set).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
}
