import { api } from '../../../shared/api/axios';
import type { TAdCategory } from '../../ad/model/ads.types';
import type { TAdAnalyzeResult } from '../model/ai.types';

export const analyzeAd = async (
  title: string,
  category: TAdCategory,
  price: string | number,
  description: string,
  params: Record<string, string | undefined>,
) => {
  const response = await api.post<TAdAnalyzeResult>('/ai/analyze', {
    title,
    category,
    price,
    description,
    params,
  });

  return response.data;
};
