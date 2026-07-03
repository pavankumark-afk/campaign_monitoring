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
  const baseURL = apiClient.defaults.baseURL;
  const url = `${baseURL}/auth/login`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mobile, password }),
    credentials: 'include',
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.error || data?.message || 'Login failed';
    throw new Error(message);
  }

  return data;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // best-effort; clearing local token is what actually matters
  }
};

export const requestOtp = async (mobile) => {
  const baseURL = apiClient.defaults.baseURL;
  const url = `${baseURL}/auth/request-otp`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: String(mobile || '') }),
    credentials: 'include',
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || data?.error || 'OTP request failed';
    throw new Error(message);
  }

  return data;
};

export const verifyOtp = async (mobile, otp) => {
  const baseURL = apiClient.defaults.baseURL;
  const url = `${baseURL}/auth/verify-otp`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: String(mobile || ''), otp: String(otp || '') }),
    credentials: 'include',
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || data?.error || 'OTP verification failed';
    throw new Error(message);
  }

  return data;
};
