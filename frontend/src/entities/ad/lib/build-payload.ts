import type { TAdEditFormValues, TAdEditPayload } from '../model/ads.types';

const toOptionalString = (value: string) => {
  const normalizedValue = value.trim();
  return normalizedValue === '' ? undefined : normalizedValue;
};

const toOptionalNumber = (value: string) => {
  const normalizedValue = value.trim();
  return normalizedValue === '' ? undefined : Number(normalizedValue);
};

export const buildPayload = (data: TAdEditFormValues): TAdEditPayload => {
  const basePayload = {
    category: data.category,
    title: data.title.trim(),
    price: Number(data.price),
    description: toOptionalString(data.description),
  } as const;

  if (data.category === 'electronics') {
    return {
      ...basePayload,
      category: 'electronics',
      params: {
        type: data.params.type || undefined,
        brand: toOptionalString(data.params.brand),
        model: toOptionalString(data.params.model),
        condition: data.params.condition || undefined,
        color: toOptionalString(data.params.color),
      },
    };
  }

  if (data.category === 'auto') {
    return {
      ...basePayload,
      category: 'auto',
      params: {
        brand: toOptionalString(data.params.brand),
        model: toOptionalString(data.params.model),
        yearOfManufacture: toOptionalNumber(data.params.yearOfManufacture),
        transmission: data.params.transmission || undefined,
        mileage: toOptionalNumber(data.params.mileage),
        enginePower: toOptionalNumber(data.params.enginePower),
      },
    };
  }

  return {
    ...basePayload,
    category: 'real_estate',
    params: {
      type: data.params.type || undefined,
      address: toOptionalString(data.params.address),
      area: toOptionalNumber(data.params.area),
      floor: toOptionalNumber(data.params.floor),
    },
  };
};
