import { api } from '../../../shared/api/axios';
import type { TAds, TGetAdsParams } from '../model/ads.types';

export const getAds = async (params?: TGetAdsParams) => {
  const response = await api.get<TAds>('/items', { params });
  return response.data;
};
