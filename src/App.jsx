/**
 * App.jsx
 *
 * Owns the shared choices list.  Persistence rules:
 *  - Rehydration : loadChoices() runs synchronously inside useState's
 *    initialiser — the list is populated before any effect or child render.
 *  - Mutations   : every handler computes the next list, writes it to
 *    localStorage synchronously (saveChoices), then calls setPriorityList.
 *    No useEffect is involved so there is zero lag and no risk of the
 *    in-memory state being reset by a storage write.
 */

import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar       from './components/Navbar';
import HomePage     from './pages/HomePage';
import ChoicesPage  from './pages/ChoicesPage';
import { loadChoices, saveChoices } from './utils/localStorage';

export default function App() {
  // Rehydrate synchronously before first render — before any HTML fetching.
  const [priorityList, setPriorityList] = useState(() => loadChoices());

  // ── Mutations — each one: compute next → persist → set state ────────────

  const handleAdd = useCallback((item) => {
    setPriorityList((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev; // guard duplicates
      const next = [...prev, item];
      saveChoices(next); // synchronous write, does not block state update
      return next;
    });
  }, []);

  const handleRemove = useCallback((id) => {
    setPriorityList((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveChoices(next);
      return next;
    });
  }, []);

  const handleReorder = useCallback((newList) => {
    // newList is already computed by the caller (arrayMove)
    saveChoices(newList);
    setPriorityList(newList);
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear all choices from the priority list?')) {
      saveChoices([]);
      setPriorityList([]);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar totalRows={0} priorityCount={priorityList.length} />

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
    </div>
  );
}
