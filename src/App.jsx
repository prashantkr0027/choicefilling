/**
 * App.jsx
 *
 * Auth flow (powered by Supabase Google OAuth):
 *
 *   mount
 *    └─ onAuthStateChange listener registered
 *        ├─ INITIAL_SESSION, session=null  → 'unauthenticated' (show LoginScreen)
 *        ├─ INITIAL_SESSION, session=user  → boot(user)
 *        ├─ SIGNED_IN                      → boot(user)   (OAuth callback return)
 *        └─ SIGNED_OUT                     → 'unauthenticated'
 *
 *   boot(user):
 *    ├─ migrateFromLocalStorage(user.id)  ← one-shot, then legacy keys deleted
 *    ├─ fetchChoices(user.id)             ← load from Supabase
 *    └─ setAppState('ready')              ← triggers Realtime subscription
 *
 * Mutation contract:
 *   priorityListRef is always current → no stale closures.
 *   setPriorityList updates UI immediately; syncToCloud is fire-and-forget.
 *
 * Realtime:
 *   Self-echoes suppressed by JSON comparison.
 *   Genuine remote changes show a "Synced from another device" toast.
 *   Channel removed on unmount / sign-out.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar       from './components/Navbar';
import LoginScreen  from './components/LoginScreen';
import HomePage     from './pages/HomePage';
import ChoicesPage  from './pages/ChoicesPage';
import {
  supabase,
  signOut,
  fetchChoices,
  upsertChoices,
  subscribeToChoices,
} from './lib/supabase';

// ── Legacy localStorage keys (one-time migration) ─────────────────────────────
const LEGACY_CHOICES_KEY = 'josaa_choices';
const LEGACY_VERSION_KEY = 'josaa_choices_version';
const LEGACY_USER_KEY    = 'josaa_user';

// ── App states ────────────────────────────────────────────────────────────────
// 'checking'       → waiting for INITIAL_SESSION from Supabase
// 'unauthenticated'→ no session — show LoginScreen
// 'loading'        → authenticated, fetching choices from Supabase
// 'ready'          → normal app + Realtime active
// 'error'          → fetch failed after auth

export default function App() {
  const [appState,     setAppState]     = useState('checking');
  const [authUser,     setAuthUser]     = useState(null);   // supabase User object
  const [priorityList, setPriorityList] = useState([]);
  const [loadError,    setLoadError]    = useState(null);

  // Sync toast — shown when a remote Realtime update arrives
  const [syncToast, setSyncToast]  = useState(false);
  const toastTimerRef = useRef(null);

  // Always-current refs — eliminate stale closures in callbacks
  const priorityListRef = useRef([]);
  const authUserRef     = useRef(null);
  priorityListRef.current = priorityList;
  authUserRef.current     = authUser;

  // Guard: prevent boot() from running twice for the same sign-in event
  const bootingRef = useRef(false);

  // ── Auth listener ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          session?.user
        ) {
          if (!bootingRef.current) {
            await boot(session.user);
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
          setAppState('unauthenticated');
        } else if (event === 'SIGNED_OUT') {
          bootingRef.current = false;
          setAuthUser(null);
          setPriorityList([]);
          setAppState('unauthenticated');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(toastTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Boot after authentication ─────────────────────────────────────────────
  async function boot(user) {
    bootingRef.current = true;
    setAuthUser(user);
    setAppState('loading');
    setLoadError(null);
    try {
      await migrateFromLocalStorage(user.id);
      const list = await fetchChoices(user.id);
      setPriorityList(list);
      setAppState('ready');           // triggers the Realtime subscription below
    } catch (err) {
      console.error('[App] Boot failed:', err);
      setLoadError(err.message);
      setAppState('error');
    } finally {
      bootingRef.current = false;
    }
  }

  // ── One-shot localStorage → Supabase migration ────────────────────────────
  async function migrateFromLocalStorage(userId) {
    const raw = localStorage.getItem(LEGACY_CHOICES_KEY);
    if (!raw) return;

    let parsed;
    try { parsed = JSON.parse(raw); } catch { /* corrupt — skip upload */ }

    if (Array.isArray(parsed) && parsed.length > 0) {
      await upsertChoices(userId, parsed);
      console.info(`[Migration] ✓ Migrated ${parsed.length} choices → Supabase`);
    }

    // Always wipe legacy keys so this never runs again
    [LEGACY_CHOICES_KEY, LEGACY_VERSION_KEY, LEGACY_USER_KEY].forEach(
      (k) => localStorage.removeItem(k)
    );
  }

  // ── Realtime subscription — active only while 'ready' ─────────────────────
  useEffect(() => {
    if (appState !== 'ready' || !authUser) return;

    const channel = subscribeToChoices(authUser.id, (incomingList) => {
      // Suppress self-echo: skip if data matches what we already have
      if (JSON.stringify(incomingList) === JSON.stringify(priorityListRef.current)) return;

      console.info('[Realtime] Remote update — applying to UI');
      setPriorityList(incomingList);

      clearTimeout(toastTimerRef.current);
      setSyncToast(true);
      toastTimerRef.current = setTimeout(() => setSyncToast(false), 2500);
    });

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(toastTimerRef.current);
    };
  }, [appState, authUser]);

  // ── Cloud sync ────────────────────────────────────────────────────────────
  const syncToCloud = useCallback(async (list) => {
    const user = authUserRef.current;
    if (!user) return;
    try {
      await upsertChoices(user.id, list);
    } catch (err) {
      console.warn('[App] Sync failed:', err.message);
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
    if (!window.confirm('Clear all choices?')) return;
    setPriorityList([]);
    syncToCloud([]);
  }, [syncToCloud]);

  const handleLogout = useCallback(async () => {
    try { await signOut(); } catch (err) { console.warn('[App] Sign-out error:', err.message); }
    // onAuthStateChange SIGNED_OUT event resets state
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  // Full-screen spinner for 'checking' and 'loading'
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

  // Not authenticated — protect all routes
  if (appState === 'unauthenticated') {
    return <LoginScreen />;
  }

  // Boot failed
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
        onLogout={handleLogout}
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
