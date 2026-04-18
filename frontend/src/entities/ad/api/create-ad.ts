import { api } from '../../../shared/api/axios';
import type { TAdEditPayload } from '../model/ads.types';

type TCreateAdResponse = {
  item: {
    id: number | string;
  };
};

export const createAd = async (data: TAdEditPayload) => {
  const response = await api.post<TCreateAdResponse>('/ads', data);
  return response.data.item;
};
