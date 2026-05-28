import React, { useState } from 'react';

/**
 * Hardcoded users.  To add or rename: edit the USERS array below.
 * `key`   → stored in localStorage and used as the Supabase primary key.
 * `label` → displayed on the button.
 * `emoji` → avatar shown on the card.
 * `color` → tailwind gradient classes for the card accent.
 */
const USERS = [
  {
    key:   'Prashant',
    label: 'Prashant',
    emoji: '🎓',
    color: 'from-indigo-500 to-violet-600',
    glow:  'shadow-indigo-500/40',
  },
  {
    key:   'Friend',           // ← update this key if needed
    label: "Friend's Name",   // ← update display name here
    emoji: '🌟',
    color: 'from-emerald-500 to-teal-600',
    glow:  'shadow-emerald-500/40',
  },
];

export default function UserPicker({ onSelect }) {
  const [selecting, setSelecting] = useState(null);

  const handleClick = (user) => {
    if (selecting) return; // prevent double-click
    setSelecting(user.key);
    onSelect(user.key);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/40">
          J
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          JoSAA Choice Filler
        </h1>
        <p className="text-slate-400 text-sm">Choose your profile to continue</p>
      </div>

      {/* User cards */}
      <div className="relative flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {USERS.map((user) => {
          const isLoading = selecting === user.key;
          const isDisabled = selecting !== null && !isLoading;

          return (
            <button
              key={user.key}
              onClick={() => handleClick(user)}
              disabled={!!selecting}
              className={`
                flex-1 group relative rounded-2xl border p-6 flex flex-col items-center gap-3
                transition-all duration-300 cursor-pointer
                ${isDisabled
                  ? 'border-slate-800 bg-slate-900/30 opacity-40 cursor-not-allowed'
                  : isLoading
                    ? `border-transparent bg-gradient-to-br ${user.color} shadow-2xl ${user.glow} scale-[1.03]`
                    : `border-slate-700/60 bg-slate-900/60 hover:border-slate-500
                       hover:bg-slate-800/80 hover:scale-[1.02] hover:shadow-xl hover:${user.glow}
                       active:scale-[0.98]`
                }
              `}
            >
              {/* Gradient top bar */}
              <div className={`absolute top-0 left-6 right-6 h-0.5 rounded-full bg-gradient-to-r ${user.color} transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />

              {/* Emoji avatar */}
              <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-3xl
                bg-gradient-to-br ${user.color} shadow-lg
                transition-transform duration-300
                ${isLoading ? 'animate-pulse' : 'group-hover:scale-110'}
              `}>
                {isLoading ? (
                  <div className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  user.emoji
                )}
              </div>

              <span className={`font-bold text-lg transition-colors duration-200 ${isLoading ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                {user.label}
              </span>

              <span className={`text-xs transition-colors duration-200 ${isLoading ? 'text-white/70' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {isLoading ? 'Loading your choices…' : 'Tap to continue'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="relative mt-8 text-slate-600 text-xs text-center">
        Choices are saved to the cloud and sync across devices
      </p>
    </div>
  );
}
