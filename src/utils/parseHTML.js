/**
 * parseHTML.js
 * Parses JoSAA and CSAB Opening/Closing Rank HTML pages (Ctrl+S saved from portals).
 * Returns an array of cutoff row objects.
 *
 * Filename conventions:
 *   NITs R1.html       → source='JoSAA', instituteType='NIT',  round='Round 1'
 *   CSAB R2 NITs.html  → source='CSAB',  instituteType='NIT',  round='CSAB Round 2'
 */

import { detectRound } from './roundDetect';

// ── Source detection ───────────────────────────────────────────────────────────

/**
 * Detect whether a file is from CSAB or JoSAA based on its filename prefix.
 * @param {string} filename
 * @returns {'CSAB' | 'JoSAA'}
 */
export function detectSource(filename) {
  return /^CSAB\b/i.test(filename ?? '') ? 'CSAB' : 'JoSAA';
}

// ── Institute-type detection ───────────────────────────────────────────────────

/**
 * Derive the institute type label from a filename.
 * NOTE: IIIT must be checked before IIT (IIIT contains 'IIT' as a substring).
 */
export function detectInstituteType(filename) {
  if (!filename) return 'Unknown';
  if (/\bIIITs?\b/i.test(filename)) return 'IIIT';
  if (/\bIITs?\b/i.test(filename))  return 'IIT';
  if (/\bNITs?\b/i.test(filename))  return 'NIT';
  if (/\bGFTIs?\b/i.test(filename)) return 'GFTI';
  return 'Unknown';
}

// ── Round name derivation ──────────────────────────────────────────────────────

/**
 * Returns a fully-qualified round label, including the source prefix for CSAB.
 *   JoSAA: "Round 1", "Round 2", …
 *   CSAB:  "CSAB Round 1", "CSAB Round 2", …
 */
export function detectFullRound(filename) {
  const source   = detectSource(filename);
  const rawRound = detectRound(filename); // → 'Round N' or 'Unknown Round'
  return source === 'CSAB' ? rawRound.replace(/^Round/, 'CSAB Round') : rawRound;
}

// ── Bundled file lists ────────────────────────────────────────────────────────

/** All 24 JoSAA files (NITs/IIITs/IITs/GFTIs × Rounds 1-6). */
export const JOSAA_FILES = [
  'NITs R1.html',  'NITs R2.html',  'NITs R3.html',
  'NITs R4.html',  'NITs R5.html',  'NITs R6.html',

  'IIITs R1.html', 'IIITs R2.html', 'IIITs R3.html',
  'IIITs R4.html', 'IIITs R5.html', 'IIITs R6.html',

  'IITs R1.html',  'IITs R2.html',  'IITs R3.html',
  'IITs R4.html',  'IITs R5.html',  'IITs R6.html',

  'GFTIs R1.html', 'GFTIs R2.html', 'GFTIs R3.html',
  'GFTIs R4.html', 'GFTIs R5.html', 'GFTIs R6.html',
];

/** All 9 CSAB Special Round files (NITs/IIITs/GFTIs × R1-R3). No IITs in CSAB. */
export const CSAB_FILES = [
  'CSAB R1 NITs.html',  'CSAB R2 NITs.html',  'CSAB R3 NITs.html',
  'CSAB R1 IIITs.html', 'CSAB R2 IIITs.html', 'CSAB R3 IIITs.html',
  'CSAB R1 GFTIs.html', 'CSAB R2 GFTIs.html', 'CSAB R3 GFTIs.html',
];

/** All bundled files — both JoSAA and CSAB, loaded once at startup. */
export const BUNDLED_FILES = [...JOSAA_FILES, ...CSAB_FILES];

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch a file from /data/<filename>, parse it, and return rows.
 * @param {string} filename
 * @returns {Promise<Array<Object>>}
 */
export async function fetchAndParse(filename) {
  const url      = `/data/${encodeURIComponent(filename)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
  }
  const htmlString = await response.text();
  return parseJoSAAHtml(htmlString, filename);
}

/**
 * Load all bundled files (JoSAA + CSAB) concurrently.
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
 * Parse a JoSAA/CSAB HTML cutoff page and return rows tagged with
 * source, instituteType, and round.
 *
 * @param {string} htmlString  - Full HTML file content
 * @param {string} filename    - Original filename (used for detection)
 * @returns {Array<Object>}
 */
export function parseJoSAAHtml(htmlString, filename) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(htmlString, 'text/html');

  const source        = detectSource(filename);         // 'JoSAA' | 'CSAB'
  const round         = detectFullRound(filename);      // 'Round 3' | 'CSAB Round 2'
  const instituteType = detectInstituteType(filename);  // 'NIT' | 'IIT' | …

  const table = doc.querySelector('#ctl00_ContentPlaceHolder1_GridView1');
  if (!table) {
    console.warn(`[parseHTML] Table not found in "${filename}"`);
    return [];
  }

  const rows    = table.querySelectorAll('tbody tr');
  const results = [];

  rows.forEach((row, index) => {
    if (row.querySelector('th')) return;  // skip header row

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
      id: `${filename}-${index}`,
      source,
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
