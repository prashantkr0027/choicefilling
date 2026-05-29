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
 *   -- Recreate with TEXT primary key + user_rank column:
 *   CREATE TABLE choices (
 *     user_id         TEXT        PRIMARY KEY,
 *     preference_list JSONB       NOT NULL DEFAULT '[]',
 *     user_rank       INTEGER,
 *     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   -- If table already exists, just add the rank column:
 *   ALTER TABLE choices ADD COLUMN IF NOT EXISTS user_rank INTEGER;
 *
 *   -- Row-Level Security:
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
 * Fetch the stored preference list + user rank for a storage key.
 * Returns { preferenceList: [], userRank: null } if row does not exist.
 *
 * @param {string} storageKey  — resolveStorageKey(user) output
 * @returns {Promise<{ preferenceList: Array, userRank: number|null }>}
 */
export async function fetchChoices(storageKey) {
  const { data, error } = await supabase
    .from('choices')
    .select('preference_list, user_rank')
    .eq('user_id', storageKey)
    .maybeSingle();

  if (error) throw error;
  return {
    preferenceList: Array.isArray(data?.preference_list) ? data.preference_list : [],
    userRank:       data?.user_rank ?? null,
  };
}

/**
 * Upsert the full preference list for a storage key.
 * NEVER modifies user_rank.
 *
 * @param {string} storageKey
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
 * Save (upsert) the user's JEE rank.
 * ONLY updates user_id + user_rank + updated_at — preference_list is NEVER touched.
 *
 * PostgreSQL ON CONFLICT DO UPDATE only sets the columns you include in the
 * payload, so preference_list is left untouched even if the row already exists.
 *
 * @param {string}      storageKey
 * @param {number|null} rank  — pass null to clear
 * @returns {Promise<void>}
 */
export async function saveRank(storageKey, rank) {
  const { error } = await supabase
    .from('choices')
    .upsert(
      {
        user_id:    storageKey,
        user_rank:  rank ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

/**
 * Subscribe to Realtime postgres_changes for a storage key's row.
 * Returns the channel — pass to supabase.removeChannel() to unsubscribe.
 *
 * The callback receives { preferenceList, userRank } — either field may be
 * undefined if that column was not changed in the triggering event.
 *
 * @param {string} storageKey
 * @param {(update: { preferenceList?: Array, userRank?: number|null }) => void} onUpdate
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
        const row = payload.new ?? {};
        onUpdate({
          preferenceList: Array.isArray(row.preference_list) ? row.preference_list : undefined,
          userRank:       'user_rank' in row ? row.user_rank : undefined,
        });
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
