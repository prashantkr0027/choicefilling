/**
 * parseHTML.js
 * Parses a JoSAA Opening/Closing Rank HTML page (Ctrl+S saved).
 * Returns an array of cutoff row objects.
 *
 * Two entry-points:
 *   parseJoSAAHtml(htmlString, filename) — parse an already-loaded string
 *   fetchAndParse(filename)              — fetch from /data/<filename> then parse
 */

import { detectRound } from './roundDetect';

/**
 * Filenames bundled under public/data/.
 * Add new rounds here as they become available.
 */
export const BUNDLED_FILES = [
  // NITs — Rounds 1-4, 6 (no Round 5 data available)
  'JoSAA NIT R1.html',
  'JoSAA NIT R2.html',
  'JoSAA NIT R3.html',
  'JoSAA NIT R4.html',
  'JoSAA NIT R6.html',
  // IIITs — Allahabad, Rounds 1-6
  'JoSAA IIIT Allahabad R1.html',
  'JoSAA IIIT Allahabad R2.html',
  'JoSAA IIIT Allahabad R3.html',
  'JoSAA IIIT Allahabad R4.html',
  'JoSAA IIIT Allahabad R5.html',
  'JoSAA IIIT Allahabad R6.html',
];

/**
 * Fetch a file from /data/<filename>, parse it, and return rows.
 * @param {string} filename  - must match a file in public/data/
 * @returns {Promise<Array<Object>>}
 */
export async function fetchAndParse(filename) {
  const url = `/data/${encodeURIComponent(filename)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
  }
  const htmlString = await response.text();
  return parseJoSAAHtml(htmlString, filename);
}

/**
 * Load all bundled files from public/data/ concurrently.
 * @returns {Promise<Array<Object>>} flat array of all rows from all rounds
 */
export async function loadAllBundledFiles() {
  const results = await Promise.allSettled(
    BUNDLED_FILES.map((name) => fetchAndParse(name))
  );

  const rows = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      rows.push(...result.value);
    } else {
      console.warn(`[parseHTML] Could not load ${BUNDLED_FILES[i]}:`, result.reason);
    }
  });
  return rows;
}

/**
 * @param {string} htmlString  - Full HTML file content as string
 * @param {string} filename    - Original filename, used for round detection
 * @returns {Array<Object>}    - Array of parsed row objects
 */
export function parseJoSAAHtml(htmlString, filename) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const round = detectRound(filename);

  // The main data table
  const table = doc.querySelector('#ctl00_ContentPlaceHolder1_GridView1');
  if (!table) {
    console.warn(`[parseHTML] Table not found in file: ${filename}`);
    return [];
  }

  const rows = table.querySelectorAll('tbody tr');
  const results = [];

  rows.forEach((row, index) => {
    // Skip the header row (has <th> elements)
    if (row.querySelector('th')) return;

    const tds = row.querySelectorAll('td');
    if (tds.length < 7) return;

    const getText = (td) => td?.textContent?.trim() ?? '';

    const institute    = getText(tds[0]);
    const program      = getText(tds[1]);
    const quota        = getText(tds[2]);
    const seatType     = getText(tds[3]);
    const gender       = getText(tds[4]);
    const openingRank  = getText(tds[5]);
    const closingRank  = getText(tds[6]);

    if (!institute || !program) return;

    results.push({
      id: `${filename}-${index}`,
      institute,
      program,
      quota,
      seatType,
      gender,
      openingRank,
      closingRank,
      round,
      filename,
    });
  });

  return results;
}
