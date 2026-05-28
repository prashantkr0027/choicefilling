import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ totalRows, priorityCount }) {
  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md print:hidden">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-indigo-500/30">
            J
          </div>
          <div>
            <h1 className="text-slate-100 font-bold text-sm leading-none">JoSAA Choice Filler</h1>
            <p className="text-slate-500 text-[10px] leading-none mt-0.5">NIT / IIT / IIIT Cutoff Explorer</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            🏠 Browse
          </NavLink>
          <NavLink to="/choices" className={navLinkClass}>
            <span>🎯 My Choices</span>
            {priorityCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold leading-none">
                {priorityCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* Stats */}
        <div className="flex items-center gap-4">
          {totalRows > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              <span className="font-mono font-bold text-indigo-300">{totalRows.toLocaleString()}</span>
              <span className="text-slate-500 text-xs">rows</span>
            </div>
          )}
          <a
            href="https://josaa.admissions.nic.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden md:inline"
          >
            josaa.admissions.nic.in ↗
          </a>
        </div>
      </div>
    </header>
  );
}
