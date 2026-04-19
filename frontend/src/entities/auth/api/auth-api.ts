import { api } from '../../../shared/api/axios';
import type { TAuthResponse, TLoginPayload, TRegisterPayload, TUserProfile } from '../model/auth.types';

export const login = async (payload: TLoginPayload) => {
  const response = await api.post<TAuthResponse>('/auth/login', payload);
  return response.data;
};

export const register = async (payload: TRegisterPayload) => {
  const response = await api.post<TAuthResponse>('/auth/register', payload);
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get<TUserProfile>('/user/profile');
  return response.data;
};
