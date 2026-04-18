import type { ReactElement } from 'react';
import { AdsCatalogPage } from '../../ads-catalog-page/ui/ads-catalog-page';

export const MyAdsPage = (): ReactElement => {
  return <AdsCatalogPage mode="my" title="Мои объявления" />;
};
