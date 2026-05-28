/**
 * localStorage.js
 * Persistence helpers for the JoSAA choices list.
 *
 * Key : josaa_choices
 * Version is stored separately; bump STORAGE_VERSION whenever the
 * persisted item schema changes so stale data is automatically cleared.
 */

const STORAGE_KEY    = 'josaa_choices';
const VERSION_KEY    = 'josaa_choices_version';
const STORAGE_VERSION = 2; // v2: grouped items with `rounds` map

/**
 * Write the current list to localStorage immediately (synchronous).
 * Safe to call inside or after a state-update handler.
 */
export function saveChoices(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  } catch (e) {
    console.warn('[localStorage] Write failed:', e);
  }
}

/**
 * Read the list from localStorage synchronously.
 * Returns [] when nothing is stored or the schema version changed.
 * Called once during component initialisation — before any effects run.
 */
export function loadChoices() {
  try {
    const storedVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
    if (storedVersion !== STORAGE_VERSION) {
      // Schema changed — wipe stale data silently
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[localStorage] Read failed:', e);
    return [];
  }
}

/** Remove all persisted data (used by "Clear All"). */
export function clearChoices() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VERSION_KEY);
}

// ── Legacy aliases kept so old imports don't break during refactor ──────────
export const savePriorityList = saveChoices;
export const loadPriorityList = loadChoices;
