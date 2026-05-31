/**
 * NoteEditor.jsx
 * Inline note editor for priority list items.
 * Manages its own edit/view state; calls onSave(noteText) to persist.
 *
 * Props:
 *   note       — current saved note string (or undefined/null)
 *   onSave(s)  — called with trimmed text when saved, or '' to delete
 */
import React, { useState, useRef, useEffect } from 'react';

const MAX = 200;

// ── Pencil icon (inline SVG so no extra dep) ──────────────────────────────────
function PencilIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function NoteEditor({ note, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const textareaRef = useRef(null);

  // Auto-focus + move cursor to end when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const openEditor = () => {
    setDraft(note || '');
    setEditing(true);
  };

  const handleSave = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  const handleDelete = () => {
    onSave('');
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  // ── Editing mode ─────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          onKeyDown={handleKeyDown}
          placeholder="Add a personal note… (Ctrl+Enter to save)"
          rows={2}
          className="
            w-full bg-slate-900/90 border border-slate-700 rounded-lg
            px-2.5 py-2 text-[11px] text-slate-300 placeholder-slate-600
            focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50
            resize-none transition-colors leading-relaxed
          "
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[9px] tabular-nums ${draft.length >= MAX ? 'text-amber-400' : 'text-slate-600'}`}>
            {draft.length}/{MAX}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded-md text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode — note exists ──────────────────────────────────────────────────
  if (note) {
    return (
      <div className="mt-1.5 flex items-start gap-1 group/note">
        {/* Italic note text — click to edit */}
        <p
          className="flex-1 text-[10px] italic text-slate-500 leading-relaxed break-words cursor-pointer hover:text-slate-400 transition-colors"
          onClick={openEditor}
          title="Click to edit note"
        >
          {note}
        </p>
        {/* Edit + Delete — appear on hover */}
        <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity">
          <button
            onClick={openEditor}
            title="Edit note"
            className="flex items-center justify-center text-slate-600 hover:text-indigo-400 transition-colors rounded"
            style={{ width: 18, height: 18 }}
          >
            <PencilIcon size={9} />
          </button>
          <button
            onClick={handleDelete}
            title="Delete note"
            className="flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors text-[9px] leading-none rounded"
            style={{ width: 18, height: 18 }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── View mode — no note ──────────────────────────────────────────────────────
  return (
    <button
      onClick={openEditor}
      className="flex items-center gap-1 mt-1.5 text-[9px] text-slate-700 hover:text-slate-500 transition-colors group/add"
    >
      <span className="group-hover/add:text-slate-400 transition-colors">
        <PencilIcon size={9} />
      </span>
      Add note
    </button>
  );
}
