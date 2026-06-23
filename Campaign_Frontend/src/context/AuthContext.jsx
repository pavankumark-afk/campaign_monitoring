import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as loginApi, logout as logoutApi, fetchProfile } from '../api/auth';
import { registerUnauthorizedHandler } from '../api/client';
import { USE_MOCKS } from '../api/mockData';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  AC: 'ac',
};

const AuthContext = createContext(null);

const TOKEN_KEY = 'sir_access_token';
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Wire 401 responses to auto-logout
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearSession();
    });
  }, [clearSession]);

  // On boot: validate token expiry, optionally refresh profile
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    if (USE_MOCKS) {
      // Mock tokens aren't real JWTs — trust the cached user as-is.
      setIsLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const isExpired = decoded.exp && decoded.exp * 1000 < Date.now();
      if (isExpired) {
        clearSession();
        setIsLoading(false);
        return;
      }
    } catch {
      clearSession();
      setIsLoading(false);
      return;
    }

    // Token looks valid — refresh profile from backend (non-blocking on failure)
    fetchProfile()
      .then((profile) => {
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      })
      .catch(() => {
        // keep cached user if /auth/me isn't reachable; interceptor handles true 401
      })
      .finally(() => setIsLoading(false));
  }, [clearSession]);

  const login = useCallback(async (username, password) => {
    setError(null);
    const data = await loginApi(username, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);

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
      isAC: user?.role === ROLES.AC,
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
