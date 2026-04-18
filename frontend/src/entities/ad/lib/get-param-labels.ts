import type { TAdCategory, TAdDetails } from '../model/ads.types';

const paramLabels: Record<string, string> = {
  type: 'Тип',
  brand: 'Бренд',
  model: 'Модель',
  yearOfManufacture: 'Год выпуска',
  transmission: 'Коробка передач',
  mileage: 'Пробег',
  enginePower: 'Мощность двигателя',
  address: 'Адрес',
  area: 'Площадь',
  floor: 'Этаж',
  condition: 'Состояние',
  color: 'Цвет',
};

const realEstateTypeLabels: Record<string, string> = {
  flat: 'Квартира',
  house: 'Дом',
  room: 'Комната',
};

const electronicsTypeLabels: Record<string, string> = {
  phone: 'Телефон',
  laptop: 'Ноутбук',
  misc: 'Другое',
};

const transmissionLabels: Record<string, string> = {
  automatic: 'Автомат',
  manual: 'Механика',
};

const conditionLabels: Record<string, string> = {
  new: 'Новый',
  used: 'Б/у',
};

const requiredParamsByCategory: Record<TAdCategory, string[]> = {
  auto: ['brand', 'model', 'yearOfManufacture', 'transmission', 'mileage', 'enginePower'],
  real_estate: ['type', 'address', 'area', 'floor'],
  electronics: ['type', 'brand', 'model', 'condition', 'color'],
};

export const getParamlabel = (key: string) => paramLabels[key] ?? key;

export const getParamValueLabel = (
  category: TAdCategory,
  key: string,
  value: string | number | boolean,
) => {
  if (key === 'type' && category === 'real_estate' && typeof value === 'string') {
    return realEstateTypeLabels[value] ?? value;
  }

  if (key === 'type' && category === 'electronics' && typeof value === 'string') {
    return electronicsTypeLabels[value] ?? value;
  }

  if (key === 'transmission' && typeof value === 'string') {
    return transmissionLabels[value] ?? value;
  }

  if (key === 'condition' && typeof value === 'string') {
    return conditionLabels[value] ?? value;
  }

  return String(value);
};

export const getMissingFields = (adDetails: TAdDetails) => {
  const missingFields: string[] = [];
  const isBlankString = (value: unknown): value is string => {
    return typeof value === 'string' && value.trim() === '';
  };

  if (!adDetails.description?.trim()) {
    missingFields.push('Описание');
  }

  const requiredParams = requiredParamsByCategory[adDetails.category];

  requiredParams.forEach((field) => {
    const value = adDetails.params[field as keyof typeof adDetails.params];

    const isEmptyString = isBlankString(value);
    const isEmptyValue = value === undefined || value === null || isEmptyString;

    if (isEmptyValue) {
      missingFields.push(getParamlabel(field));
    }
  });

  return missingFields;
};

export const adTypeOptions = {
  auto: [
    { value: 'automatic', label: 'Автоматическая' },
    { value: 'manual', label: 'Механическая' },
  ],
  real_estate: [
    { value: 'flat', label: 'Квартира' },
    { value: 'house', label: 'Дом' },
    { value: 'room', label: 'Комната' },
  ],
  electronics: [
    { value: 'phone', label: 'Телефон' },
    { value: 'laptop', label: 'Ноутбук' },
    { value: 'misc', label: 'Другое' },
  ],
};
