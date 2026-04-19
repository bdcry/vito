import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, login, register } from '../api/auth-api';
import { tokenStorage } from '../lib/token-storage';
import type { TLoginPayload, TRegisterPayload, TUserProfile } from './auth.types';

type TAuthContextValue = {
  user: TUserProfile | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isAuthChecked: boolean;
  login: (payload: TLoginPayload) => Promise<void>;
  register: (payload: TRegisterPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<TAuthContextValue | null>(null);

type TAuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: TAuthProviderProps) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<TUserProfile | null>(null);
  const token = tokenStorage.get();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: getProfile,
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (profile) {
      setUser(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (isError) {
      tokenStorage.clear();
      setUser(null);
    }
  }, [isError]);

  const handleLogin = async (payload: TLoginPayload) => {
    const response = await login(payload);
    tokenStorage.set(response.accessToken);
    setUser(response.user);
    void queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
  };

  const handleRegister = async (payload: TRegisterPayload) => {
    const response = await register(payload);
    tokenStorage.set(response.accessToken);
    setUser(response.user);
    void queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
  };

  const handleLogout = () => {
    tokenStorage.clear();
    setUser(null);
    queryClient.removeQueries({ queryKey: ['auth'] });
    queryClient.removeQueries({ queryKey: ['ads'] });
    queryClient.removeQueries({ queryKey: ['ad'] });
  };

  const value = useMemo<TAuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading: Boolean(token) && isLoading,
      isAuthChecked: !token || !isLoading,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
