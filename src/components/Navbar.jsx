import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ priorityCount, userEmail, isShared, onLogout }) {
  const navLinkClass = ({ isActive }) =>
    `px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md print:hidden">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 h-13 sm:h-14 flex items-center justify-between gap-2 sm:gap-4" style={{ height: '3.25rem' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
            J
          </div>
          {/* Title hidden on very small screens */}
          <div className="hidden sm:block">
            <h1 className="text-slate-100 font-bold text-sm leading-none">JoSAA Choice Filler</h1>
            <p className="text-slate-500 text-[10px] leading-none mt-0.5">NIT / IIT / IIIT Cutoff Explorer</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <span className="hidden xs:inline">🏠 </span>Browse
          </NavLink>
          <NavLink to="/choices" className={navLinkClass}>
            <span className="hidden xs:inline">🎯 </span>
            <span className="hidden sm:inline">My </span>Choices
            {priorityCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold leading-none">
                {priorityCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* Right: user + logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* External link — hidden on mobile */}
          <a
            href="https://josaa.admissions.nic.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors hidden xl:inline"
          >
            josaa.admissions.nic.in ↗
          </a>

          {userEmail && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-slate-800">
              {/* Avatar initial — always visible */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md shadow-indigo-500/30">
                {userEmail[0].toUpperCase()}
              </div>
              {/* Email — hidden on mobile */}
              <span className="text-xs text-slate-400 hidden md:inline max-w-[150px] truncate">
                {userEmail}
              </span>
              {/* Shared badge */}
              {isShared && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 tracking-wide hidden sm:inline">
                  Shared
                </span>
              )}
              {/* Logout — icon-only on mobile, text on sm+ */}
              <button
                onClick={onLogout}
                title="Sign out"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-150 min-w-[32px] min-h-[32px] justify-center"
              >
                {/* Icon always visible */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
