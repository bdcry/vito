import { api } from '../../../shared/api/axios';
import type { TAdCategory } from '../../ad/model/ads.types';
import type { TGeneratePriceResponse } from '../model/ai.types';

export const suggestPrice = async (
  title: string,
  category: TAdCategory,
  price: string | number,
  params: Record<string, string | undefined>,
) => {
  const response = await api.post<TGeneratePriceResponse>('/ai/price', {
    title,
    category,
    price,
    params,
  });

  return response.data.response.trim();
};
