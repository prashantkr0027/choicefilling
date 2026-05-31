/**
 * groupRows.js
 * Groups flat cutoff rows by unique combination of source + instituteType +
 * institute + program + quota + seatType + gender.
 *
 * KEY DESIGN:
 *   JoSAA items — key = "NIT|||institute|||..."          (NO source prefix)
 *   CSAB items  — key = "CSAB|||NIT|||institute|||..."   ('CSAB|||' prefix)
 *
 * Keeping JoSAA items without a source prefix preserves all existing IDs
 * that users may have stored in their Supabase preference_list, so switching
 * to CSAB support never invalidates saved JoSAA choices.
 */

/**
 * @param {Array<Object>} rows - flat parsed rows from parseHTML
 * @returns {Array<Object>}    - deduplicated grouped items
 */
export function groupRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const isCSAB = row.source === 'CSAB';

    // JoSAA keeps legacy key format (no source prefix) to preserve stored IDs.
    // CSAB gets a 'CSAB|||' prefix so it forms distinct groups from JoSAA rows
    // for the same institute/program — both can live in the priority list together.
    const key = isCSAB
      ? ['CSAB', row.instituteType, row.institute, row.program, row.quota, row.seatType, row.gender].join('|||')
      : [        row.instituteType, row.institute, row.program, row.quota, row.seatType, row.gender].join('|||');

    if (!groups.has(key)) {
      groups.set(key, {
        id:           key,
        source:       row.source,       // 'JoSAA' | 'CSAB'
        instituteType: row.instituteType,
        institute:    row.institute,
        program:      row.program,
        quota:        row.quota,
        seatType:     row.seatType,
        gender:       row.gender,
        rounds:       {},
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
 * Works for both JoSAA ('Round 1', 'Round 6') and
 * CSAB ('CSAB Round 1', 'CSAB Round 3') round labels.
 *
 * @param {Object} rounds  - { 'Round 1': {...}, 'CSAB Round 2': {...} }
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
