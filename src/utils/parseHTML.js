/**
 * parseHTML.js
 * Parses a JoSAA Opening/Closing Rank HTML page (Ctrl+S saved from the portal).
 * Returns an array of cutoff row objects.
 *
 * Filename convention for bundled files:
 *   NITs R1.html  → instituteType = 'NIT',  round = 'Round 1'
 *   IIITs R3.html → instituteType = 'IIIT', round = 'Round 3'
 *   IITs R6.html  → instituteType = 'IIT',  round = 'Round 6'
 *   GFTIs R2.html → instituteType = 'GFTI', round = 'Round 2'
 */

import { detectRound } from './roundDetect';

// ── Institute-type detection ───────────────────────────────────────────────────

/**
 * Derive the institute type label from a filename.
 * NOTE: IIIT must be checked before IIT (IIIT contains 'IIT' as a substring).
 */
export function detectInstituteType(filename) {
  if (!filename) return 'Unknown';
  // Plural forms: NITs, IIITs, IITs, GFTIs  (and singular JoSAA NIT …)
  if (/\bIIITs?\b/i.test(filename)) return 'IIIT';
  if (/\bIITs?\b/i.test(filename))  return 'IIT';
  if (/\bNITs?\b/i.test(filename))  return 'NIT';
  if (/\bGFTIs?\b/i.test(filename)) return 'GFTI';
  return 'Unknown';
}

// ── Bundled file list ─────────────────────────────────────────────────────────

/**
 * All HTML files present under public/data/.
 * Only the comprehensive per-type files are listed here.
 * The old single-institute files (JoSAA NIT R1.html, etc.) are superseded.
 */
export const BUNDLED_FILES = [
  'NITs R1.html', 'NITs R2.html', 'NITs R3.html',
  'NITs R4.html', 'NITs R5.html', 'NITs R6.html',

  'IIITs R1.html', 'IIITs R2.html', 'IIITs R3.html',
  'IIITs R4.html', 'IIITs R5.html', 'IIITs R6.html',

  'IITs R1.html', 'IITs R2.html', 'IITs R3.html',
  'IITs R4.html', 'IITs R5.html', 'IITs R6.html',

  'GFTIs R1.html', 'GFTIs R2.html', 'GFTIs R3.html',
  'GFTIs R4.html', 'GFTIs R5.html', 'GFTIs R6.html',
];

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch a file from /data/<filename>, parse it, and return rows.
 * @param {string} filename
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
 * Files that fail are skipped with a console warning.
 * @returns {Promise<Array<Object>>} flat array of all rows from all files
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
      console.warn(`[parseHTML] Could not load "${BUNDLED_FILES[i]}":`, result.reason?.message);
    }
  });
  return rows;
}

// ── Core parser ───────────────────────────────────────────────────────────────

/**
 * Parse a JoSAA HTML cutoff page and return rows with instituteType + round tags.
 *
 * @param {string} htmlString  - Full HTML file content
 * @param {string} filename    - Original filename (used for round + type detection)
 * @returns {Array<Object>}
 */
export function parseJoSAAHtml(htmlString, filename) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(htmlString, 'text/html');

  const round         = detectRound(filename);
  const instituteType = detectInstituteType(filename);

  // The main data table rendered by the JoSAA portal
  const table = doc.querySelector('#ctl00_ContentPlaceHolder1_GridView1');
  if (!table) {
    console.warn(`[parseHTML] Table not found in "${filename}"`);
    return [];
  }

  const rows    = table.querySelectorAll('tbody tr');
  const results = [];

  rows.forEach((row, index) => {
    if (row.querySelector('th')) return;   // skip header row

    const tds = row.querySelectorAll('td');
    if (tds.length < 7) return;

    const getText = (td) => td?.textContent?.trim() ?? '';

    const institute   = getText(tds[0]);
    const program     = getText(tds[1]);
    const quota       = getText(tds[2]);
    const seatType    = getText(tds[3]);
    const gender      = getText(tds[4]);
    const openingRank = getText(tds[5]);
    const closingRank = getText(tds[6]);

    if (!institute || !program) return;

    results.push({
      id:           `${filename}-${index}`,
      institute,
      program,
      quota,
      seatType,
      gender,
      openingRank,
      closingRank,
      round,
      instituteType,
      filename,
    });
  });

  return results;
}
