import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../model/auth-context';

export const RequireAuth = (): ReactElement => {
  const location = useLocation();
  const { isAuthenticated, isAuthChecked } = useAuth();

  if (!isAuthChecked) {
    return <div>Проверяем авторизацию...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
