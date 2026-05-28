/**
 * localStorage.js — user identity only.
 *
 * Choices are now stored exclusively in Supabase.
 * This file only persists the selected user name so the picker
 * is skipped on subsequent visits.
 */

const USER_KEY = 'josaa_user';

export function saveUser(name) {
  localStorage.setItem(USER_KEY, name);
}

export function loadUser() {
  return localStorage.getItem(USER_KEY) ?? null;
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}
