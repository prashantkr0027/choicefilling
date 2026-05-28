/**
 * App.jsx
 *
 * Supabase is the sole source of truth for choices.
 * localStorage stores only the selected user name (josaa_user).
 *
 * Mutation contract:
 *  - Every handler reads the latest list from `priorityListRef` (no stale closures).
 *  - setPriorityList updates in-memory state immediately — never waits for cloud.
 *  - syncToCloud fires an async upsert as a side-effect — never blocks state.
 *
 * Realtime:
 *  - After login, App subscribes to postgres_changes filtered to the current user.
 *  - Incoming payloads are compared to the in-memory ref to suppress self-echoes
 *    (i.e. the reflection of our own upserts back through Realtime).
 *  - The channel is removed on unmount or user switch.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar      from './components/Navbar';
import HomePage    from './pages/HomePage';
import ChoicesPage from './pages/ChoicesPage';
import UserPicker  from './components/UserPicker';
import { supabase, fetchChoices, upsertChoices, subscribeToChoices } from './lib/supabase';
import { saveUser, loadUser, clearUser } from './utils/localStorage';

// ── App states ────────────────────────────────────────────────────────────────
// 'init'    → checking localStorage (flash, <1 frame)
// 'picking' → UserPicker fullscreen
// 'loading' → fetching row from Supabase after user is known
// 'ready'   → normal app + Realtime active
// 'error'   → Supabase fetch failed on login

export default function App() {
  const [appState,     setAppState]     = useState('init');
  const [currentUser,  setCurrentUser]  = useState(null);
  const [priorityList, setPriorityList] = useState([]);
  const [loadError,    setLoadError]    = useState(null);

  // Brief toast shown when a Realtime update arrives from another device/tab
  const [syncToast, setSyncToast] = useState(false);
  const toastTimerRef = useRef(null);

  // Refs — always current, no stale-closure issues in callbacks
  const priorityListRef = useRef([]);
  const currentUserRef  = useRef(null);
  priorityListRef.current = priorityList;
  currentUserRef.current  = currentUser;

  // ── Boot: check saved user ─────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadUser();
    if (saved) {
      loginUser(saved);
    } else {
      setAppState('picking');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription — active while appState === 'ready' ──────────────
  useEffect(() => {
    if (appState !== 'ready' || !currentUser) return;

    const channel = subscribeToChoices(currentUser, (incomingList) => {
      // Suppress self-echo: if the incoming data matches our current in-memory
      // list (i.e. it's the reflection of our own upsert), ignore it.
      const currentJSON  = JSON.stringify(priorityListRef.current);
      const incomingJSON = JSON.stringify(incomingList);

      if (incomingJSON === currentJSON) return;

      // Genuine remote change — apply it and flash the sync toast
      console.info('[Realtime] Remote change detected — updating priority list');
      setPriorityList(incomingList);

      // Show toast for 2.5 s
      clearTimeout(toastTimerRef.current);
      setSyncToast(true);
      toastTimerRef.current = setTimeout(() => setSyncToast(false), 2500);
    });

    // Cleanup: remove channel on unmount or when user/appState changes
    return () => {
      console.info(`[Realtime] Unsubscribing from choices for "${currentUser}"`);
      supabase.removeChannel(channel);
      clearTimeout(toastTimerRef.current);
    };
  }, [currentUser, appState]);

  // ── Login: select user → fetch Supabase → subscribe → enter app ───────────
  async function loginUser(userName) {
    setAppState('loading');
    setLoadError(null);
    try {
      const list = await fetchChoices(userName);
      setCurrentUser(userName);
      setPriorityList(list);
      saveUser(userName);
      setAppState('ready'); // triggers the Realtime subscription useEffect
    } catch (err) {
      console.error('[App] Supabase fetch failed:', err);
      setLoadError(err.message);
      setAppState('error');
    }
  }

  // ── Cloud sync — fire-and-forget, never blocks state ──────────────────────
  const syncToCloud = useCallback(async (list) => {
    const user = currentUserRef.current;
    if (!user) return;
    try {
      await upsertChoices(user, list);
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

  const handleSwitchUser = useCallback(() => {
    clearUser();
    setCurrentUser(null);
    setPriorityList([]);
    setSyncToast(false);
    setAppState('picking');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (appState === 'init' || appState === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-200 font-semibold">
            {appState === 'init' ? 'Starting…' : 'Loading your choices…'}
          </p>
          <p className="text-slate-500 text-xs mt-1">Connecting to Supabase</p>
        </div>
      </div>
    );
  }

  if (appState === 'picking') {
    return <UserPicker onSelect={loginUser} />;
  }

  if (appState === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-red-400 font-bold text-lg">Supabase connection failed</h2>
        <p className="text-slate-500 text-sm max-w-sm">{loadError}</p>
        <p className="text-slate-600 text-xs max-w-sm">
          Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly in .env
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleSwitchUser}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-slate-500 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => loginUser(currentUserRef.current ?? loadUser())}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
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
        totalRows={0}
        priorityCount={priorityList.length}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
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

      {/* ── Realtime sync toast ─────────────────────────────────────────────── */}
      <div
        className={`
          fixed bottom-6 right-6 z-[300]
          flex items-center gap-2.5
          px-4 py-2.5 rounded-xl
          bg-emerald-900/90 border border-emerald-500/40
          text-emerald-300 text-sm font-medium
          shadow-xl shadow-emerald-900/40
          backdrop-blur-md
          transition-all duration-500 ease-out
          ${syncToast
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
        aria-live="polite"
      >
        {/* Animated pulse dot */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Synced from another device
      </div>
    </div>
  );
}
