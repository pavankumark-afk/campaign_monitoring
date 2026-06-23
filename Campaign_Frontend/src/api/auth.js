import { apiClient } from './client';
import { USE_MOCKS, mockLogin, mockProfile } from './mockData';

/**
 * Backend contract (FastAPI) — adjust paths to match your actual routes.
 *
 * POST /auth/login
 *   body: { username, password }
 *   returns: { access_token, refresh_token?, role: "super_admin" | "ac", ac_id?: string, ac_name?: string, name: string }
 *
 * POST /auth/refresh
 *   body: { refresh_token }
 *   returns: { access_token }
 *
 * GET /auth/me
 *   returns: { id, name, role, ac_id?, ac_name?, phone?, email? }
 */

export const login = async (username, password) => {
  if (USE_MOCKS) return mockLogin(username, password);
  const { data } = await apiClient.post('/auth/login', { username, password });
  return data;
};

export const fetchProfile = async () => {
  if (USE_MOCKS) return mockProfile();
  const { data } = await apiClient.get('/auth/me');
  return data;
};

export const logout = async () => {
  if (USE_MOCKS) return;
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // best-effort; clearing local token is what actually matters
  }
};
