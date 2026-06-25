import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { login as loginApi, logout as logoutApi } from '../api/auth';
import { registerUnauthorizedHandler } from '../api/client';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  AC: 'ac',
  MLA: 'mla',
};

const AuthContext = createContext(null);

const USER_KEY = 'sir_user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Wire 401 responses to auto-logout
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearSession();
    });
  }, [clearSession]);

  // On boot: rely on cached user profile; cookie auth is handled server-side.
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    const data = await loginApi(username, password);

    const profile = {
      id: data.id ?? data.user_id ?? username,
      name: data.name,
      role: data.role,
      acId: data.ac_id ?? null,
      acName: data.ac_name ?? null,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isAC: user?.role === ROLES.AC || user?.role === ROLES.MLA,
      login,
      logout,
    }),
    [user, isLoading, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
