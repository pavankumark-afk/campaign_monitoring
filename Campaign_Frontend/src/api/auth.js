import { apiClient } from './client';

/**
 * Backend contract (Express) — MLAs authentication
 *
 * POST /auth/login
 *   body: { mobile, password }
 *   returns: { message, role, ... }
 *
 * POST /auth/logout
 *   returns: { message }
 */

export const login = async (mobile, password) => {
  const { data } = await apiClient.post('/auth/login', { mobile, password });
  return data;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // best-effort; clearing local token is what actually matters
  }
};
