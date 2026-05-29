/**
 * src/lib/supabase.js
 *
 * Supabase client + typed helpers for the `choices` table.
 *
 * ── Table schema (run once in Supabase SQL editor) ───────────────────────────
 *
 *   -- Drop old table (had UUID PK — incompatible with shared text key):
 *   DROP TABLE IF EXISTS choices;
 *
 *   -- Recreate with TEXT primary key so we can store both UUIDs and
 *   -- hardcoded shared keys like 'shared-prashant-anshul'.
 *   CREATE TABLE choices (
 *     user_id         TEXT        PRIMARY KEY,
 *     preference_list JSONB       NOT NULL DEFAULT '[]',
 *     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   -- Row-Level Security:
 *   --   • Each user can always access their own UUID row.
 *   --   • ANY authenticated user can also access the shared row.
 *   --     (Access to the shared row is controlled by app logic —
 *   --      only the two whitelisted emails are ever routed there.)
 *   ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "own_or_shared_row" ON choices
 *     FOR ALL
 *     USING (
 *       auth.role() = 'authenticated'
 *       AND (
 *         auth.uid()::text = user_id
 *         OR user_id = 'shared-prashant-anshul'
 *       )
 *     )
 *     WITH CHECK (
 *       auth.role() = 'authenticated'
 *       AND (
 *         auth.uid()::text = user_id
 *         OR user_id = 'shared-prashant-anshul'
 *       )
 *     );
 *
 *   -- Enable Realtime
 *   ALTER PUBLICATION supabase_realtime ADD TABLE choices;
 *
 * ── Supabase dashboard: Authentication → Providers → Google ──────────────────
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

// ── Shared-list routing ───────────────────────────────────────────────────────

/**
 * Emails that share a single combined priority list.
 * Stored in lowercase for case-insensitive matching.
 */
const SHARED_EMAILS = new Set([
  'prashant.kr0027@gmail.com',
  'anshul282k@gmail.com',
]);

/** The single Supabase row key used by both shared-list users. */
export const SHARED_KEY = 'shared-prashant-anshul';

/**
 * Resolve the storage key for a given authenticated user.
 *
 * - If the user's email is in SHARED_EMAILS → return SHARED_KEY
 *   (both users read/write the same row)
 * - Otherwise → return user.id (their own UUID row)
 *
 * @param {{ id: string, email?: string }} user  — Supabase auth User object
 * @returns {string}  storage key to use as `user_id` in the choices table
 */
export function resolveStorageKey(user) {
  const email = (user?.email ?? '').toLowerCase().trim();
  if (email && SHARED_EMAILS.has(email)) {
    console.info(`[Storage] "${email}" → shared key`);
    return SHARED_KEY;
  }
  return user.id;
}

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
 * Fetch the stored preference list for a storage key.
 * Returns [] if the row does not exist yet.
 *
 * @param {string} storageKey  — resolveStorageKey(user) output
 * @returns {Promise<Array>}
 */
export async function fetchChoices(storageKey) {
  const { data, error } = await supabase
    .from('choices')
    .select('preference_list')
    .eq('user_id', storageKey)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.preference_list) ? data.preference_list : [];
}

/**
 * Upsert the full preference list for a storage key.
 *
 * @param {string} storageKey  — resolveStorageKey(user) output
 * @param {Array}  list
 * @returns {Promise<void>}
 */
export async function upsertChoices(storageKey, list) {
  const { error } = await supabase
    .from('choices')
    .upsert(
      {
        user_id:         storageKey,
        preference_list: list,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

/**
 * Subscribe to Realtime postgres_changes for a storage key's row.
 * Returns the channel — pass to supabase.removeChannel() to unsubscribe.
 *
 * @param {string}                storageKey
 * @param {(list: Array) => void} onUpdate
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 */
export function subscribeToChoices(storageKey, onUpdate) {
  const channel = supabase
    .channel(`choices-${storageKey}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'choices',
        filter: `user_id=eq.${storageKey}`,
      },
      (payload) => {
        const newList = payload.new?.preference_list;
        if (Array.isArray(newList)) onUpdate(newList);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info(`[Realtime] ✓ Subscribed to choices (key: ${storageKey})`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Channel error — ensure Realtime is enabled on the choices table.');
      }
    });

  return channel;
}
