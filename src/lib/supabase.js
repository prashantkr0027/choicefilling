/**
 * src/lib/supabase.js
 *
 * Supabase client + typed helpers for the `choices` table.
 *
 * ── Table schema (run once in Supabase SQL editor) ───────────────────────────
 *
 *   -- Drop old table first if you had the user_name TEXT version:
 *   DROP TABLE IF EXISTS choices;
 *
 *   CREATE TABLE choices (
 *     user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     preference_list JSONB       NOT NULL DEFAULT '[]',
 *     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   -- Row-Level Security: each user can only touch their own row
 *   ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "own_row" ON choices
 *     FOR ALL
 *     USING  (auth.uid() = user_id)
 *     WITH CHECK (auth.uid() = user_id);
 *
 *   -- Enable Realtime
 *   ALTER PUBLICATION supabase_realtime ADD TABLE choices;
 *
 * ── Supabase dashboard: Authentication → Providers → Google ─────────────────
 *   Enable Google, add Client ID + Secret, set redirect URL:
 *     https://<your-project>.supabase.co/auth/v1/callback
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.\n' +
    'Copy .env.example → .env and fill in your project credentials.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Trigger Google OAuth sign-in. Redirects to Google and back.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: import.meta.env.VITE_SITE_URL || window.location.origin,
    },
  });
  if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Choices helpers ───────────────────────────────────────────────────────────

/**
 * Fetch the stored preference list for an authenticated user.
 * Returns [] if the user has no row yet.
 *
 * @param {string} userId  — auth user UUID
 * @returns {Promise<Array>}
 */
export async function fetchChoices(userId) {
  const { data, error } = await supabase
    .from('choices')
    .select('preference_list')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.preference_list) ? data.preference_list : [];
}

/**
 * Upsert the full preference list for an authenticated user.
 *
 * @param {string} userId  — auth user UUID
 * @param {Array}  list
 * @returns {Promise<void>}
 */
export async function upsertChoices(userId, list) {
  const { error } = await supabase
    .from('choices')
    .upsert(
      {
        user_id:         userId,
        preference_list: list,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

/**
 * Subscribe to Realtime postgres_changes for a user's row.
 * Returns the channel — pass to supabase.removeChannel() to unsubscribe.
 *
 * @param {string}               userId
 * @param {(list: Array) => void} onUpdate
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 */
export function subscribeToChoices(userId, onUpdate) {
  const channel = supabase
    .channel(`choices-${userId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'choices',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newList = payload.new?.preference_list;
        if (Array.isArray(newList)) onUpdate(newList);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info(`[Realtime] ✓ Subscribed to choices for user ${userId.slice(0, 8)}…`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Channel error — ensure Realtime is enabled on the choices table.');
      }
    });

  return channel;
}
