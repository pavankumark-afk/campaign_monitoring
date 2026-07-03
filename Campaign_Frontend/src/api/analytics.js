import { apiClient } from './client';

export const fetchUserActivityMetrics = async ({ role } = {}) => {
  const path = role === 'super_admin' ? '/analytics/user-logins' : '/analytics/mla/user-logins';
  const { data } = await apiClient.get(path);
  return data;
};
