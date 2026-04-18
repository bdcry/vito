import { api } from '../../../shared/api/axios';
import type { TAdDetails } from '../model/ads.types';

export const getAdDetails = async (id: string) => {
  const response = await api.get<TAdDetails>(`/items/${id}`);
  return response.data;
};
