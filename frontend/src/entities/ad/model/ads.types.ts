export type TAdCategory = 'auto' | 'real_estate' | 'electronics';

export type TSellerProfile = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  city?: string;
};

export type TAd = {
  id: number;
  category: TAdCategory;
  title: string;
  price: number | null;
  description?: string;
  ownerId?: string;
  isMine?: boolean;
  seller?: TSellerProfile;
  needsRevision: boolean;
};

export type TAds = {
  items: TAd[];
  total: number;
};

export type TAutoItemParams = {
  brand?: string;
  model?: string;
  yearOfManufacture?: number;
  transmission?: 'automatic' | 'manual';
  mileage?: number;
  enginePower?: number;
};

export type TRealEstateItemParams = {
  type?: 'flat' | 'house' | 'room';
  address?: string;
  area?: number;
  floor?: number;
};

export type TElectronicsItemParams = {
  type?: 'phone' | 'laptop' | 'misc';
  brand?: string;
  model?: string;
  condition?: 'new' | 'used';
  color?: string;
};

type TAdDetailsBase = TAd & { description?: string; createdAt: string; updatedAt: string };

export type TAdDetails =
  | (TAdDetailsBase & { category: 'auto'; params: TAutoItemParams })
  | (TAdDetailsBase & { category: 'real_estate'; params: TRealEstateItemParams })
  | (TAdDetailsBase & { category: 'electronics'; params: TElectronicsItemParams });

export type TSortValue = 'createdAt-desc' | 'createdAt-asc' | 'title-asc' | 'title-desc';

type TSortColumn = 'createdAt' | 'title';
type TSortDirection = 'asc' | 'desc';

export type TSortParams = {
  sortColumn: TSortColumn;
  sortDirection: TSortDirection;
};

export type TGetAdsParams = {
  q?: string;
  sortColumn?: TSortColumn;
  sortDirection?: TSortDirection;
  needsRevision?: boolean;
  mine?: boolean;
  categories?: string;
  limit?: number;
  skip?: number;
};

type TAdEditFormBase = {
  category: TAdCategory;
  title: string;
  price: string;
  description: string;
};

export type TAutoAdEditFormValues = TAdEditFormBase & {
  category: 'auto';
  params: {
    brand: string;
    model: string;
    yearOfManufacture: string;
    transmission: '' | 'automatic' | 'manual';
    mileage: string;
    enginePower: string;
  };
};

export type TRealEstateAdEditFormValues = TAdEditFormBase & {
  category: 'real_estate';
  params: {
    type: '' | 'flat' | 'house' | 'room';
    address: string;
    area: string;
    floor: string;
  };
};

export type TElectronicsAdEditFormValues = TAdEditFormBase & {
  category: 'electronics';
  params: {
    type: '' | 'phone' | 'laptop' | 'misc';
    brand: string;
    model: string;
    condition: '' | 'new' | 'used';
    color: string;
  };
};

export type TAdEditFormValues =
  | TAutoAdEditFormValues
  | TRealEstateAdEditFormValues
  | TElectronicsAdEditFormValues;

type TUpdateAdBase = {
  category: TAdCategory;
  title: string;
  price: number;
  description?: string;
};

export type TAdEditPayload =
  | (TUpdateAdBase & { category: 'auto'; params: TAutoItemParams })
  | (TUpdateAdBase & {
      category: 'real_estate';
      params: TRealEstateItemParams;
    })
  | (TUpdateAdBase & {
      category: 'electronics';
      params: TElectronicsItemParams;
    });
