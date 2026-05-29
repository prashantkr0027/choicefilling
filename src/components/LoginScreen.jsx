import React, { useState } from 'react';
import { signInWithGoogle } from '../lib/supabase';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle(); // page will redirect to Google — no return
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 overflow-hidden">

      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-8 flex flex-col items-center gap-6 shadow-2xl shadow-black/40">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-500/40 select-none">
              J
            </div>
            <div className="text-center">
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                JoSAA Choice Filler
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                NIT · IIIT · IIT Cutoff Explorer
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          {/* Sign in section */}
          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Sign in to save your choices and<br />sync them across devices.
            </p>

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-3
                px-5 py-3.5 rounded-2xl
                border font-semibold text-sm
                transition-all duration-200
                ${isLoading
                  ? 'border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800/80 text-slate-100 hover:border-indigo-500/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98]'
                }
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-slate-300 animate-spin" />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  {/* Google SVG icon */}
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 w-full">
                {error}
              </p>
            )}
          </div>

          {/* Footer note */}
          <p className="text-slate-600 text-xs text-center">
            Your choices are stored securely in the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
