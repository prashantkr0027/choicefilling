/**
 * src/lib/supabase.js
 *
 * Supabase client + typed helpers for the `choices` table.
 *
 * Table schema (run once in Supabase SQL editor):
 * ─────────────────────────────────────────────────
 *   CREATE TABLE choices (
 *     user_name       TEXT        PRIMARY KEY,
 *     preference_list JSONB       NOT NULL DEFAULT '[]',
 *     updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   -- Allow anon read/write
 *   ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "allow_all" ON choices FOR ALL USING (true) WITH CHECK (true);
 *
 *   -- Enable Realtime for this table (required for subscribeToChoices)
 *   ALTER PUBLICATION supabase_realtime ADD TABLE choices;
 * ─────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch the stored preference list for a user.
 * Returns [] if the user has no row yet.
 *
 * @param {string} userName
 * @returns {Promise<Array>}
 */
export async function fetchChoices(userName) {
  const { data, error } = await supabase
    .from('choices')
    .select('preference_list')
    .eq('user_name', userName)
    .maybeSingle(); // returns null (not an error) when no row exists

  if (error) throw error;
  return Array.isArray(data?.preference_list) ? data.preference_list : [];
}

/**
 * Upsert the full preference list for a user.
 * Inserts a new row if none exists; updates if one does.
 *
 * @param {string} userName
 * @param {Array}  list
 * @returns {Promise<void>}
 */
export async function upsertChoices(userName, list) {
  const { error } = await supabase
    .from('choices')
    .upsert(
      {
        user_name:       userName,
        preference_list: list,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_name' }
    );

  if (error) throw error;
}

/**
 * Subscribe to Realtime postgres_changes on the choices table,
 * filtered to a single user's row.
 *
 * The `onUpdate` callback receives the incoming preference_list whenever
 * an INSERT or UPDATE is committed to the database (from any device/tab).
 *
 * Prerequisite in Supabase dashboard:
 *   ALTER PUBLICATION supabase_realtime ADD TABLE choices;
 *   (or toggle the table on in Table Editor → Realtime)
 *
 * @param {string}               userName
 * @param {(list: Array) => void} onUpdate  called with the new list on each change
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 *   Pass the returned channel to supabase.removeChannel() to unsubscribe.
 */
export function subscribeToChoices(userName, onUpdate) {
  const channel = supabase
    .channel(`choices-${userName}`) // unique channel name per user
    .on(
      'postgres_changes',
      {
        event:  '*',                         // catches INSERT, UPDATE, DELETE
        schema: 'public',
        table:  'choices',
        filter: `user_name=eq.${userName}`,  // server-side row filter
      },
      (payload) => {
        // DELETE events have an empty payload.new — skip them
        const newList = payload.new?.preference_list;
        if (Array.isArray(newList)) {
          onUpdate(newList);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.info(`[Realtime] ✓ Subscribed to choices for "${userName}"`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(
          `[Realtime] Channel error for "${userName}". ` +
          'Ensure Realtime is enabled: ALTER PUBLICATION supabase_realtime ADD TABLE choices;'
        );
      } else {
        console.debug(`[Realtime] Status for "${userName}": ${status}`);
      }
    });

  return channel;
}
