import { api } from '../../../shared/api/axios';
import type { TAdEditPayload } from '../model/ads.types';

export const updateAd = async (id: string, data: TAdEditPayload) => {
  const response = await api.put<TAdEditPayload>(`/items/${id}`, data);
  return response.data;
};
