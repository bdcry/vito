import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';

export const AdsLayout = (): ReactElement => {
  return (
    <>
      <Outlet />
    </>
  );
};
