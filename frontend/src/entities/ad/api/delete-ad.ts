import { api } from '../../../shared/api/axios';

type TDeleteAdResponse = {
  success: boolean;
  message?: string;
};

export const deleteAd = async (id: string) => {
  const response = await api.delete<TDeleteAdResponse>(`/ads/${id}`);
  return response.data;
};
