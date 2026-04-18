import type { TAdCategory } from '../model/ads.types';

const categoryLabels: Record<TAdCategory, string> = {
  auto: 'Транспорт',
  real_estate: 'Недвижимость',
  electronics: 'Электроника',
};

export const getCategoryLabel = (category: TAdCategory) => {
  return categoryLabels[category];
};
