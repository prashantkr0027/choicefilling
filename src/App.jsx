/**
 * App.jsx
 *
 * User is always "prashant" — no login screen, no user picker.
 * Supabase is the sole source of truth for choices.
 *
 * Boot sequence:
 *  1. Migrate any legacy josaa_choices data from localStorage → Supabase (once, then deleted).
 *  2. Fetch current preference_list from Supabase for user "prashant".
 *  3. Subscribe to Realtime postgres_changes for that row.
 *
 * Mutation contract:
 *  - priorityListRef is always current — no stale closures in callbacks.
 *  - setPriorityList updates in-memory state immediately.
 *  - syncToCloud upserts as a fire-and-forget side-effect.
 *
 * Realtime:
 *  - Self-echoes (our own upserts bouncing back) are suppressed by JSON comparison.
 *  - Genuine remote changes show a "Synced from another device" toast for 2.5 s.
 *  - Channel is removed on unmount.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar      from './components/Navbar';
import HomePage    from './pages/HomePage';
import ChoicesPage from './pages/ChoicesPage';
import { supabase, fetchChoices, upsertChoices, subscribeToChoices } from './lib/supabase';

// ── Hardcoded user ────────────────────────────────────────────────────────────
const USER = 'prashant';

// ── Legacy localStorage keys to clean up during migration ────────────────────
const LEGACY_CHOICES_KEY = 'josaa_choices';
const LEGACY_VERSION_KEY = 'josaa_choices_version';
const LEGACY_USER_KEY    = 'josaa_user';

// ── App states ────────────────────────────────────────────────────────────────
// 'loading' → migrating + fetching from Supabase
// 'ready'   → normal app + Realtime active
// 'error'   → Supabase fetch failed

export default function App() {
  const [appState,     setAppState]     = useState('loading');
  const [priorityList, setPriorityList] = useState([]);
  const [loadError,    setLoadError]    = useState(null);

  // Sync toast — appears briefly when a remote Realtime update arrives
  const [syncToast, setSyncToast]  = useState(false);
  const toastTimerRef = useRef(null);

  // Ref always holds the latest list — eliminates stale closures in callbacks
  const priorityListRef = useRef([]);
  priorityListRef.current = priorityList;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function boot() {
    setAppState('loading');
    setLoadError(null);
    try {
      await migrateFromLocalStorage(); // no-op if no legacy data
      const list = await fetchChoices(USER);
      setPriorityList(list);
      setAppState('ready');
    } catch (err) {
      console.error('[App] Boot failed:', err);
      setLoadError(err.message);
      setAppState('error');
    }
  }

  // ── One-shot localStorage → Supabase migration ────────────────────────────
  async function migrateFromLocalStorage() {
    const raw = localStorage.getItem(LEGACY_CHOICES_KEY);
    if (!raw) return; // nothing to migrate

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt data — just clean up and move on
      console.warn('[Migration] Could not parse localStorage choices — skipping upload.');
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      await upsertChoices(USER, parsed); // may throw; let boot() catch it
      console.info(`[Migration] ✓ Migrated ${parsed.length} choices from localStorage → Supabase`);
    }

    // Always wipe legacy keys so this never runs again
    localStorage.removeItem(LEGACY_CHOICES_KEY);
    localStorage.removeItem(LEGACY_VERSION_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  }

  // ── Realtime subscription — active while appState === 'ready' ─────────────
  useEffect(() => {
    if (appState !== 'ready') return;

    const channel = subscribeToChoices(USER, (incomingList) => {
      // Suppress self-echo: skip if the data matches what we already have in memory
      if (JSON.stringify(incomingList) === JSON.stringify(priorityListRef.current)) return;

      // Genuine remote change — apply immediately
      console.info('[Realtime] Remote update received — applying to UI');
      setPriorityList(incomingList);

      // Flash the sync toast for 2.5 s
      clearTimeout(toastTimerRef.current);
      setSyncToast(true);
      toastTimerRef.current = setTimeout(() => setSyncToast(false), 2500);
    });

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(toastTimerRef.current);
    };
  }, [appState]);

  // ── Cloud sync — fire-and-forget ──────────────────────────────────────────
  const syncToCloud = useCallback(async (list) => {
    try {
      await upsertChoices(USER, list);
    } catch (err) {
      console.warn('[App] Supabase sync failed (will retry on next change):', err.message);
    }
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const handleAdd = useCallback((item) => {
    const prev = priorityListRef.current;
    if (prev.some((i) => i.id === item.id)) return;
    const next = [...prev, item];
    setPriorityList(next);
    syncToCloud(next);
  }, [syncToCloud]);

  const handleRemove = useCallback((id) => {
    const next = priorityListRef.current.filter((i) => i.id !== id);
    setPriorityList(next);
    syncToCloud(next);
  }, [syncToCloud]);

  const handleReorder = useCallback((newList) => {
    setPriorityList(newList);
    syncToCloud(newList);
  }, [syncToCloud]);

  const handleClear = useCallback(() => {
    if (!window.confirm('Clear all choices from the priority list?')) return;
    setPriorityList([]);
    syncToCloud([]);
  }, [syncToCloud]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (appState === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-200 font-semibold">Loading your choices…</p>
          <p className="text-slate-500 text-xs mt-1">Connecting to Supabase</p>
        </div>
      </div>
    );
  }

  if (appState === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-red-400 font-bold text-lg">Could not connect to Supabase</h2>
        <p className="text-slate-500 text-sm max-w-sm">{loadError}</p>
        <p className="text-slate-600 text-xs max-w-sm">
          Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly in .env
        </p>
        <button
          onClick={boot}
          className="mt-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // appState === 'ready'
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        priorityCount={priorityList.length}
      />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              priorityList={priorityList}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onClear={handleClear}
              onReorder={handleReorder}
            />
          }
        />
        <Route
          path="/choices"
          element={
            <ChoicesPage
              priorityList={priorityList}
              onReorder={handleReorder}
              onRemove={handleRemove}
              onClear={handleClear}
            />
          }
        />
      </Routes>

      {/* ── Realtime sync toast ──────────────────────────────────────────────── */}
      <div
        aria-live="polite"
        className={`
          fixed bottom-6 right-6 z-[300]
          flex items-center gap-2.5
          px-4 py-2.5 rounded-xl
          bg-emerald-900/90 border border-emerald-500/40
          text-emerald-300 text-sm font-medium
          shadow-xl shadow-emerald-900/40 backdrop-blur-md
          transition-all duration-500 ease-out
          ${syncToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Synced from another device
      </div>
    </div>
  );
}
