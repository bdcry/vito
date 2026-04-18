import type { ReactElement } from 'react';
import { AdsCatalogPage } from '../../ads-catalog-page/ui/ads-catalog-page';

export const AllAdsPage = (): ReactElement => {
  return <AdsCatalogPage mode="all" title="Объявления" />;
};
