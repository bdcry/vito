import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';

export const AdDetailsLayout = (): ReactElement => {
  return (
    <>
      <Outlet />
    </>
  );
};
