/**
 * App.jsx
 *
 * Auth flow (Supabase Google OAuth):
 *
 *   mount → onAuthStateChange registered
 *     ├─ INITIAL_SESSION, session=null  → 'unauthenticated'
 *     ├─ INITIAL_SESSION, session=user  → boot(user)
 *     ├─ SIGNED_IN, !hasBooted         → boot(user)   (OAuth callback)
 *     ├─ TOKEN_REFRESHED / USER_UPDATED → ignored (tab focus, etc.)
 *     └─ SIGNED_OUT                    → reset + 'unauthenticated'
 *
 *   boot(user):
 *     hasBootedRef = true  immediately  ← blocks any re-entry for this session
 *     migrateFromLocalStorage()         ← fire-and-forget, does not block timeout
 *     fetchChoices()  vs  5s timeout    ← whichever resolves first
 *       timeout → show app with current list (empty on first load)
 *       success → setPriorityList(list)
 *     → 'ready' in both cases
 *
 * Tab focus / visibility changes:
 *   Supabase may emit TOKEN_REFRESHED (or even SIGNED_IN on some versions).
 *   hasBootedRef stays true after the first boot, so those events are no-ops.
 *
 * Realtime:
 *   Self-echoes suppressed by JSON comparison.
 *   Remote changes → "Synced from another device" toast for 2.5 s.
 *   Channel removed on unmount / sign-out.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar      from './components/Navbar';
import LoginScreen from './components/LoginScreen';
import HomePage    from './pages/HomePage';
import ChoicesPage from './pages/ChoicesPage';
import {
  supabase,
  signOut,
  fetchChoices,
  upsertChoices,
  subscribeToChoices,
  resolveStorageKey,
  SHARED_KEY,
  saveRank,
} from './lib/supabase';

// ── Legacy localStorage keys (one-time migration) ─────────────────────────────
const LEGACY_CHOICES_KEY = 'josaa_choices';
const LEGACY_VERSION_KEY = 'josaa_choices_version';
const LEGACY_USER_KEY    = 'josaa_user';

// ── Timeout for Supabase fetch on boot (ms) ───────────────────────────────────
const BOOT_TIMEOUT_MS = 5000;

// ── Sentinel value to distinguish timeout from a real list ────────────────────
const TIMEOUT_SENTINEL = '__TIMEOUT__';

// ── App states ────────────────────────────────────────────────────────────────
// 'checking'        → waiting for INITIAL_SESSION
// 'unauthenticated' → no session — show LoginScreen
// 'loading'         → authenticated, fetching choices
// 'ready'           → normal app + Realtime active
// 'error'           → unrecoverable fetch failure

export default function App() {
  const [appState,     setAppState]     = useState('checking');
  const [authUser,     setAuthUser]     = useState(null);
  const [priorityList, setPriorityList] = useState([]);
  const [userRank,     setUserRank]     = useState(null);
  const [loadError,    setLoadError]    = useState(null);
  const [mode,         setMode]         = useState('josaa'); // 'josaa' | 'csab'

  const [syncToast, setSyncToast] = useState(false);
  const toastTimerRef    = useRef(null);
  const rankSaveTimerRef = useRef(null);

  // Always-current refs — no stale closures in callbacks
  const priorityListRef = useRef([]);
  const authUserRef     = useRef(null);
  const storageKeyRef   = useRef(null);   // resolveStorageKey(user) — set once per session
  priorityListRef.current = priorityList;
  authUserRef.current     = authUser;

  /**
   * hasBootedRef — set to true the moment boot() begins.
   * Stays true for the lifetime of the authenticated session.
   * Only reset on SIGNED_OUT.
   *
   * This ensures that tab-focus events (TOKEN_REFRESHED, or a duplicate
   * SIGNED_IN emitted by some Supabase client versions) never re-trigger
   * the loading spinner.
   */
  const hasBootedRef = useRef(false);

  // ── Auth listener — registered once on mount ──────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (session?.user && !hasBootedRef.current) {
            boot(session.user);
          } else if (!session) {
            setAppState('unauthenticated');
          }
          // If INITIAL_SESSION fires after we've already booted (shouldn't
          // happen, but defensive) → ignore.

        } else if (event === 'SIGNED_IN') {
          // OAuth callback after Google redirect — only boot once.
          if (session?.user && !hasBootedRef.current) {
            boot(session.user);
          }
          // If already booted (e.g. duplicate SIGNED_IN on tab focus) → ignore.

        } else if (event === 'SIGNED_OUT') {
          hasBootedRef.current = false;
          setAuthUser(null);
          setPriorityList([]);
          setUserRank(null);
          setSyncToast(false);
          clearTimeout(toastTimerRef.current);
          clearTimeout(rankSaveTimerRef.current);
          setAppState('unauthenticated');
        }

        // TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY → intentionally ignored.
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(toastTimerRef.current);
      clearTimeout(rankSaveTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Boot — runs exactly once per authenticated session ────────────────────
  async function boot(user) {
    // Claim the slot immediately — prevents any concurrent/subsequent calls
    hasBootedRef.current = true;

    // Resolve storage key FIRST — this determines which Supabase row we own
    const storageKey = resolveStorageKey(user);
    storageKeyRef.current = storageKey;

    setAuthUser(user);
    setAppState('loading');
    setLoadError(null);

    // Migration is fire-and-forget — does not count against the 5-second timeout
    migrateFromLocalStorage(storageKey).catch((err) =>
      console.warn('[Migration] Background migration failed:', err.message)
    );

    try {
      const result = await Promise.race([
        fetchChoices(storageKey),
        new Promise((resolve) =>
          setTimeout(() => resolve(TIMEOUT_SENTINEL), BOOT_TIMEOUT_MS)
        ),
      ]);

      if (result === TIMEOUT_SENTINEL) {
        console.warn(
          `[App] Supabase fetch timed out after ${BOOT_TIMEOUT_MS / 1000}s ` +
          '— showing app with current list.'
        );
      } else {
        setPriorityList(result.preferenceList);
        if (result.userRank !== null) setUserRank(result.userRank);
      }

      setAppState('ready');
    } catch (err) {
      console.error('[App] Boot failed:', err);
      setLoadError(err.message);
      setAppState('error');
      hasBootedRef.current = false;
    }
  }

  // ── One-shot localStorage → Supabase migration ────────────────────────────
  async function migrateFromLocalStorage(storageKey) {
    const raw = localStorage.getItem(LEGACY_CHOICES_KEY);
    if (!raw) return;

    let parsed;
    try { parsed = JSON.parse(raw); } catch { /* corrupt — skip upload */ }

    if (Array.isArray(parsed) && parsed.length > 0) {
      await upsertChoices(storageKey, parsed);
      console.info(`[Migration] ✓ Migrated ${parsed.length} choices → Supabase (key: ${storageKey})`);
    }

    [LEGACY_CHOICES_KEY, LEGACY_VERSION_KEY, LEGACY_USER_KEY].forEach(
      (k) => localStorage.removeItem(k)
    );
  }

  // ── Realtime subscription — active only while 'ready' ─────────────────────
  useEffect(() => {
    if (appState !== 'ready' || !authUser) return;

    const storageKey = storageKeyRef.current;
    const channel = subscribeToChoices(storageKey, ({ preferenceList, userRank: remoteRank }) => {
      // — Preference list update —
      if (preferenceList !== undefined) {
        if (JSON.stringify(preferenceList) !== JSON.stringify(priorityListRef.current)) {
          console.info('[Realtime] Remote preference_list update — applying to UI');
          setPriorityList(preferenceList);
          clearTimeout(toastTimerRef.current);
          setSyncToast(true);
          toastTimerRef.current = setTimeout(() => setSyncToast(false), 2500);
        }
      }
      // — Rank update —
      if (remoteRank !== undefined) {
        setUserRank(remoteRank);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(toastTimerRef.current);
    };
  }, [appState, authUser]);

  // ── Cloud sync — fire-and-forget ──────────────────────────────────────────
  const syncToCloud = useCallback(async (list) => {
    const storageKey = storageKeyRef.current;
    if (!storageKey) return;
    try {
      await upsertChoices(storageKey, list);
    } catch (err) {
      console.warn('[App] Sync failed:', err.message);
    }
  }, []);

  // ── Rank save — debounced 800 ms ────────────────────────────────────────
  const handleRankChange = useCallback((newRank) => {
    // Update local state immediately for responsive UI
    const rankNum = newRank ? parseInt(String(newRank), 10) : null;
    setUserRank(isNaN(rankNum) ? null : rankNum);

    // Debounce the Supabase write
    clearTimeout(rankSaveTimerRef.current);
    rankSaveTimerRef.current = setTimeout(async () => {
      const storageKey = storageKeyRef.current;
      if (!storageKey) return;
      try {
        await saveRank(storageKey, isNaN(rankNum) ? null : rankNum);
        console.info('[App] Rank saved:', rankNum);
      } catch (err) {
        console.warn('[App] Rank save failed:', err.message);
      }
    }, 800);
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
    if (!window.confirm('Clear all choices?')) return;
    setPriorityList([]);
    syncToCloud([]);
  }, [syncToCloud]);

  // Update the note on a single priority list item, then sync to cloud.
  // Setting note to '' or undefined removes the field from the JSON payload.
  const handleNoteChange = useCallback((itemId, note) => {
    const prev = priorityListRef.current;
    const next = prev.map((item) =>
      item.id === itemId
        ? { ...item, note: note || undefined }  // undefined is omitted by JSON.stringify
        : item
    );
    setPriorityList(next);
    syncToCloud(next);
  }, [syncToCloud]);

  const handleLogout = useCallback(async () => {
    try { await signOut(); } catch (err) { console.warn('[App] Sign-out error:', err.message); }
    // onAuthStateChange SIGNED_OUT resets all state
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (appState === 'checking' || appState === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-200 font-semibold">
            {appState === 'checking' ? 'Checking session…' : 'Loading your choices…'}
          </p>
          <p className="text-slate-500 text-xs mt-1">Connecting to Supabase</p>
        </div>
      </div>
    );
  }

  if (appState === 'unauthenticated') {
    return <LoginScreen />;
  }

  if (appState === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-red-400 font-bold text-lg">Could not load your choices</h2>
        <p className="text-slate-500 text-sm max-w-sm">{loadError}</p>
        <p className="text-slate-600 text-xs max-w-sm">
          Check your .env credentials and that the Supabase table exists.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={() => boot(authUserRef.current)}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // appState === 'ready'
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        priorityCount={priorityList.length}
        userEmail={authUser?.email ?? null}
        isShared={storageKeyRef.current === SHARED_KEY}
        onLogout={handleLogout}
        mode={mode}
        onModeChange={handleModeChange}
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
              onNoteChange={handleNoteChange}
              userRank={userRank}
              onRankChange={handleRankChange}
              mode={mode}
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
              onNoteChange={handleNoteChange}
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
