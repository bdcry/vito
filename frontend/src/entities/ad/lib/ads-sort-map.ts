import type { TSortParams, TSortValue } from '../model/ads.types';

export const adsSortMap: Record<TSortValue, TSortParams> = {
  'createdAt-desc': {
    sortColumn: 'createdAt',
    sortDirection: 'desc',
  },
  'createdAt-asc': {
    sortColumn: 'createdAt',
    sortDirection: 'asc',
  },
  'title-asc': {
    sortColumn: 'title',
    sortDirection: 'asc',
  },
  'title-desc': {
    sortColumn: 'title',
    sortDirection: 'desc',
  },
};
