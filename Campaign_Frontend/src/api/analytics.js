import { apiClient } from './client';

export const fetchUserActivityMetrics = async () => {
  const { data } = await apiClient.get('/analytics/user-logins');
  return data;
};
