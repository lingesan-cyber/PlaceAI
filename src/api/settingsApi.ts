import { apiClient } from '../lib/apiClient';
import type { PortalSettingsResponse, SettingsPayload } from '../types';

export const fetchPortalSettings = async (): Promise<PortalSettingsResponse> => {
  const response = await apiClient.get('/settings');
  return response.data?.data;
};

export const savePortalSettings = async (payload: SettingsPayload): Promise<PortalSettingsResponse> => {
  const response = await apiClient.put('/settings', payload);
  return response.data?.data;
};