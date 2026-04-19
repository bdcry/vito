import { api } from '../../../shared/api/axios';
import type { TAdCategory } from '../../ad/model/ads.types';
import type { TGenerateDescriptionResponse } from '../model/ai.types';

export const generateDescription = async (
  title: string,
  category: TAdCategory,
  price: string | number,
  params: Record<string, string | undefined>,
  description?: string,
) => {
  const response = await api.post<TGenerateDescriptionResponse>('/ai/description', {
    title,
    category,
    price,
    params,
    description,
  });

  return response.data.response.trim();
};
