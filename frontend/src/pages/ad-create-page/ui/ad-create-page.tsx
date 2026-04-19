import { useState, type ChangeEvent, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Form,
  InputGroup,
  Spinner,
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import styles from './ad-create-page.module.css';
import { adTypeOptions } from '../../../entities/ad/lib/get-param-labels';
import type { TAdCategory, TAdEditFormValues } from '../../../entities/ad/model/ads.types';
import { buildPayload } from '../../../entities/ad/lib/build-payload';
import { createAd } from '../../../entities/ad/api/create-ad';
import { generateDescription } from '../../../entities/ai-ollama/api/generate-description';
import { suggestPrice } from '../../../entities/ai-ollama/api/suggest-price';
import { analyzeAd } from '../../../entities/ai-ollama/api/analyze-ad';

const emptyParamsByCategory = {
  auto: {
    brand: '',
    model: '',
    yearOfManufacture: '',
    transmission: '',
    mileage: '',
    enginePower: '',
  },
  real_estate: {
    type: '',
    address: '',
    area: '',
    floor: '',
  },
  electronics: {
    type: '',
    brand: '',
    model: '',
    condition: '',
    color: '',
  },
};

const defaultValues: TAdEditFormValues = {
  category: 'auto',
  title: '',
  price: '',
  description: '',
  params: emptyParamsByCategory.auto,
};

export const AdCreatePage = (): ReactElement => {
  const navigate = useNavigate();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [createdAdId, setCreatedAdId] = useState<string>('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<TAdEditFormValues>({
    mode: 'onChange',
    shouldUnregister: true,
    defaultValues,
  });

  const watchedValues = useWatch({ control });
  const watchedTitle = watchedValues?.title ?? '';
  const watchedPrice = watchedValues?.price ?? '';
  const watchedCategory = (watchedValues?.category ?? 'auto') as TAdCategory;
  const watchedDescription = watchedValues?.description ?? '';
  const watchedParams = watchedValues?.params as Record<string, string | undefined> | undefined;

  const createMutation = useMutation({
    mutationFn: createAd,
    onSuccess: (createdItem) => {
      setCreatedAdId(String(createdItem.id));
      setShowErrorToast(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        void navigate(`/ads/${createdItem.id}`);
      }, 1200);
    },
    onError: () => {
      setShowSuccessToast(false);
      setShowErrorToast(true);
    },
  });

  const {
    mutate: mutateOllamaDescription,
    data: ollamaDescriptionData,
    isPending: isOllamaDescriptionPending,
    isSuccess: isOllamaDescriptionSuccess,
    isError: isOllamaDescriptionError,
    reset: resetOllamaDescriptionMutation,
  } = useMutation({
    mutationFn: (payload: {
      title: string;
      category: TAdCategory;
      price: string | number;
      params: Record<string, string | undefined>;
      description?: string;
    }) =>
      generateDescription(
        payload.title,
        payload.category,
        payload.price,
        payload.params,
        payload.description,
      ),
  });

  const {
    mutate: mutateOllamaPrice,
    data: ollamaPriceData,
    isPending: isOllamaPricePending,
    isSuccess: isOllamaPriceSuccess,
    isError: isOllamaPriceError,
    reset: resetOllamaPriceMutation,
  } = useMutation({
    mutationFn: (payload: {
      title: string;
      category: TAdCategory;
      price: string | number;
      params: Record<string, string | undefined>;
    }) => suggestPrice(payload.title, payload.category, payload.price, payload.params),
  });

  const {
    mutate: mutateOllamaAnalyze,
    data: ollamaAnalyzeData,
    isPending: isOllamaAnalyzePending,
    isSuccess: isOllamaAnalyzeSuccess,
    isError: isOllamaAnalyzeError,
    reset: resetOllamaAnalyzeMutation,
  } = useMutation({
    mutationFn: (payload: {
      title: string;
      category: TAdCategory;
      price: string | number;
      description: string;
      params: Record<string, string | undefined>;
    }) =>
      analyzeAd(
        payload.title,
        payload.category,
        payload.price,
        payload.description,
        payload.params,
      ),
  });

  const descriptionLength = watchedDescription.length;
  const descriptionHelperText = watchedDescription.trim() ? 'Улучшить описание' : 'Придумать описание';
  const priceHelperText = isOllamaPricePending
    ? 'Выполняется запрос'
    : isOllamaPriceSuccess || isOllamaPriceError
      ? 'Повторить запрос'
      : 'Узнать рыночную цену';
  const analyzeHelperText = isOllamaAnalyzePending
    ? 'Выполняется запрос'
    : isOllamaAnalyzeSuccess || isOllamaAnalyzeError
      ? 'Повторить анализ'
      : 'Проанализировать объявление';
  const typeOptions = adTypeOptions[watchedCategory];
  const isSaveDisabled =
    watchedTitle.trim() === '' ||
    watchedPrice.trim() === '' ||
    Number.isNaN(Number(watchedPrice)) ||
    Number(watchedPrice) < 0 ||
    createMutation.isPending;

  const getOptionalValue = (key: string) => watchedParams?.[key] ?? '';
  const getOptionalFieldClass = (value?: string) => {
    return isSubmitted && (value ?? '').trim() === '' ? styles.optionalField : '';
  };

  const submit = (rawData: TAdEditFormValues) => {
    const payload = buildPayload(rawData);
    createMutation.mutate(payload);
  };

  const handleCancel = () => {
    void navigate('/my-ads');
  };

  const handleGenerateDescription = () => {
    if (isOllamaDescriptionPending) return;

    mutateOllamaDescription({
      title: watchedTitle,
      category: watchedCategory,
      price: watchedPrice,
      params: watchedParams ?? {},
      description: watchedDescription,
    });
  };

  const handleApplyGeneratedDescription = () => {
    if (!ollamaDescriptionData) return;

    setValue('description', ollamaDescriptionData, {
      shouldDirty: true,
      shouldValidate: true,
    });
    resetOllamaDescriptionMutation();
  };

  const handleGeneratePrice = () => {
    if (isOllamaPricePending) return;

    mutateOllamaPrice({
      title: watchedTitle,
      category: watchedCategory,
      price: watchedPrice,
      params: watchedParams ?? {},
    });
  };

  const handleAnalyzeAd = () => {
    if (isOllamaAnalyzePending) return;

    mutateOllamaAnalyze({
      title: watchedTitle,
      category: watchedCategory,
      price: watchedPrice,
      description: watchedDescription,
      params: watchedParams ?? {},
    });
  };

  const renderAnalyzeList = (items: string[], emptyText: string) => {
    if (items.length === 0) {
      return <p className={styles.aiResultText}>{emptyText}</p>;
    }

    return (
      <ul className={styles.aiList}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className={styles.aiListItem}>
            {item}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <ToastContainer position="top-end" className={styles.toastContainer}>
        <Toast
          show={showSuccessToast}
          onClose={() => setShowSuccessToast(false)}
          bg="success"
          delay={2000}
          autohide
        >
          <Toast.Body className={styles.toastBody}>
            Объявление создано {createdAdId ? `(ID: ${createdAdId})` : ''}
          </Toast.Body>
        </Toast>

        <Toast
          show={showErrorToast}
          onClose={() => setShowErrorToast(false)}
          bg="danger"
          delay={4000}
          autohide
        >
          <Toast.Body className={styles.toastBody}>
            Не удалось создать объявление. Попробуйте ещё раз или зайдите позже.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <header className={styles.headerEdit}>
        <h2 className={styles.headerTitle}>Создание объявления</h2>
      </header>

      <section className={styles.page}>
        <Form className={styles.form} onSubmit={(e) => void handleSubmit(submit)(e)}>
          <div className={styles.section}>
            <div className={styles.field}>
              <h3 className={styles.label}>Категория</h3>
              <Form.Select
                aria-label="Категория объявления"
                {...register('category', {
                  onChange: (e: ChangeEvent<HTMLSelectElement>) => {
                    const newCategory = e.target.value as TAdCategory;
                    setValue(
                      'params',
                      emptyParamsByCategory[newCategory] as TAdEditFormValues['params'],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  },
                })}
              >
                <option value="auto">Авто</option>
                <option value="electronics">Электроника</option>
                <option value="real_estate">Недвижимость</option>
              </Form.Select>
            </div>

            <hr />

            <div className={`${styles.field} ${errors.title ? styles.requiredField : ''}`}>
              <h3 className={styles.label}>
                <span className={styles.requiredIcon}>*</span>Название
              </h3>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Название объявления"
                  aria-label="Введите название объявления"
                  {...register('title', {
                    required: 'Название должно быть заполнено',
                    validate: (value) => value.trim() !== '' || 'Название должно быть заполнено',
                  })}
                />
              </InputGroup>
              {errors.title?.message && <p className={styles.fieldErrorText}>{errors.title.message}</p>}
            </div>

            <hr />

            <div className={`${styles.field} ${errors.price ? styles.requiredField : ''}`}>
              <h3 className={styles.label}>
                <span className={styles.requiredIcon}>*</span>Цена
              </h3>
              <div className={styles.inlineField}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Введите цену объявления"
                    aria-label="Введите цену объявления"
                    {...register('price', {
                      required: 'Цена должна быть заполнена',
                      validate: (value) => {
                        const normalizedValue = value.trim();

                        if (normalizedValue === '') {
                          return 'Цена должна быть заполнена';
                        }

                        const numericValue = Number(normalizedValue);

                        if (Number.isNaN(numericValue) || numericValue < 0) {
                          return 'Цена должна быть неотрицательным числом';
                        }

                        return true;
                      },
                    })}
                  />
                </InputGroup>
                <Alert
                  variant="warning"
                  className={`${styles.helperAction} ${styles.helperActionInline} ${isOllamaPricePending ? styles.helperActionDisabled : ''}`}
                  onClick={handleGeneratePrice}
                >
                  <span className={styles.helperActionContent}>
                    {isOllamaPricePending && (
                      <Spinner animation="border" size="sm" role="status" variant="warning" />
                    )}
                    {priceHelperText}
                  </span>
                </Alert>
              </div>
              {errors.price?.message && <p className={styles.fieldErrorText}>{errors.price.message}</p>}
              {isOllamaPriceSuccess && ollamaPriceData && (
                <div className={styles.aiResult}>
                  <p className={styles.aiResultTitle}>Ответ AI:</p>
                  <p className={styles.aiResultText}>{ollamaPriceData}</p>
                  <div className={styles.aiActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => resetOllamaPriceMutation()}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
              {isOllamaPriceError && (
                <div className={`${styles.aiResult} ${styles.aiResultError}`}>
                  <p className={styles.aiResultTitle}>Произошла ошибка при запросе к AI</p>
                  <p className={styles.aiResultText}>
                    Попробуйте повторить запрос или закройте уведомление.
                  </p>
                  <div className={styles.aiActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => resetOllamaPriceMutation()}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Характеристики</h3>

            {watchedCategory === 'auto' && (
              <>
                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('brand'))}`}>
                  <p className={styles.label}>Бренд</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите бренд"
                      aria-label="Введите название бренда"
                      {...register('params.brand')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('model'))}`}>
                  <p className={styles.label}>Модель</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите модель"
                      aria-label="Введите название модели"
                      {...register('params.model')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('yearOfManufacture'))}`}
                >
                  <p className={styles.label}>Год выпуска</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите год выпуска"
                      aria-label="Введите год выпуска"
                      {...register('params.yearOfManufacture')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('transmission'))}`}>
                  <p className={styles.label}>Коробка передач</p>
                  <Form.Select aria-label="Коробка передач" {...register('params.transmission')}>
                    <option value="">Выберите тип</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('mileage'))}`}>
                  <p className={styles.label}>Пробег</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите пробег"
                      aria-label="Введите пробег"
                      {...register('params.mileage')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('enginePower'))}`}>
                  <p className={styles.label}>Мощность двигателя</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите мощность двигателя"
                      aria-label="Введите мощность двигателя"
                      {...register('params.enginePower')}
                    />
                  </InputGroup>
                </div>
              </>
            )}

            {watchedCategory === 'real_estate' && (
              <>
                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('type'))}`}>
                  <p className={styles.label}>Тип</p>
                  <Form.Select aria-label="Тип недвижимости" {...register('params.type')}>
                    <option value="">Выберите тип</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('address'))}`}>
                  <p className={styles.label}>Адрес</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите адрес"
                      aria-label="Введите адрес"
                      {...register('params.address')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('area'))}`}>
                  <p className={styles.label}>Площадь</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите площадь"
                      aria-label="Введите площадь"
                      {...register('params.area')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('floor'))}`}>
                  <p className={styles.label}>Этаж</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите этаж"
                      aria-label="Введите этаж"
                      {...register('params.floor')}
                    />
                  </InputGroup>
                </div>
              </>
            )}

            {watchedCategory === 'electronics' && (
              <>
                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('type'))}`}>
                  <p className={styles.label}>Тип</p>
                  <Form.Select aria-label="Тип электроники" {...register('params.type')}>
                    <option value="">Выберите тип</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('brand'))}`}>
                  <p className={styles.label}>Бренд</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите бренд"
                      aria-label="Введите название бренда"
                      {...register('params.brand')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('model'))}`}>
                  <p className={styles.label}>Модель</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите модель"
                      aria-label="Введите название модели"
                      {...register('params.model')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('color'))}`}>
                  <p className={styles.label}>Цвет</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите цвет"
                      aria-label="Введите название цвета"
                      {...register('params.color')}
                    />
                  </InputGroup>
                </div>

                <div className={`${styles.field} ${getOptionalFieldClass(getOptionalValue('condition'))}`}>
                  <p className={styles.label}>Состояние</p>
                  <Form.Select aria-label="Состояние" {...register('params.condition')}>
                    <option value="">Состояние</option>
                    <option value="new">Новый</option>
                    <option value="used">Б/у</option>
                  </Form.Select>
                </div>
              </>
            )}
          </div>

          <div className={styles.section}>
            <div className={`${styles.field} ${getOptionalFieldClass(watchedDescription)}`}>
              <h3 className={styles.label}>Описание</h3>
              <InputGroup>
                <Form.Control
                  as="textarea"
                  rows={4}
                  maxLength={1000}
                  aria-label="Введите описание объявления"
                  {...register('description')}
                />
              </InputGroup>
              <div className={styles.descriptionFooter}>
                <Alert
                  variant="warning"
                  className={`${styles.helperAction} ${isOllamaDescriptionPending ? styles.helperActionDisabled : ''}`}
                  onClick={handleGenerateDescription}
                >
                  <span className={styles.helperActionContent}>
                    {isOllamaDescriptionPending && (
                      <Spinner animation="border" size="sm" role="status" variant="warning" />
                    )}
                    {isOllamaDescriptionPending ? 'Выполняется запрос' : descriptionHelperText}
                  </span>
                </Alert>
                <span className={styles.descriptionCounter}>{descriptionLength} / 1000</span>
              </div>
              {isOllamaDescriptionSuccess && ollamaDescriptionData && (
                <div className={styles.aiResult}>
                  <p className={styles.aiResultTitle}>Ответ AI:</p>
                  <p className={styles.aiResultText}>{ollamaDescriptionData}</p>
                  <div className={styles.aiActions}>
                    <Button type="button" size="sm" onClick={handleApplyGeneratedDescription}>
                      Применить
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => resetOllamaDescriptionMutation()}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
              {isOllamaDescriptionError && (
                <div className={`${styles.aiResult} ${styles.aiResultError}`}>
                  <p className={styles.aiResultTitle}>Произошла ошибка при запросе к AI</p>
                  <p className={styles.aiResultText}>
                    Попробуйте повторить запрос или закройте уведомление.
                  </p>
                  <div className={styles.aiActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => resetOllamaDescriptionMutation()}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.field}>
              <h3 className={styles.sectionTitle}>AI-анализ объявления</h3>
              <Alert
                variant="warning"
                className={`${styles.helperAction} ${isOllamaAnalyzePending ? styles.helperActionDisabled : ''}`}
                onClick={handleAnalyzeAd}
              >
                <span className={styles.helperActionContent}>
                  {isOllamaAnalyzePending && (
                    <Spinner animation="border" size="sm" role="status" variant="warning" />
                  )}
                  {analyzeHelperText}
                </span>
              </Alert>

              {isOllamaAnalyzeSuccess && ollamaAnalyzeData && (
                <div className={styles.aiResult}>
                  <p className={styles.aiResultTitle}>Краткий итог</p>
                  <p className={styles.aiResultText}>{ollamaAnalyzeData.summary}</p>

                  <p className={styles.aiResultTitle}>Сильные стороны</p>
                  {renderAnalyzeList(
                    ollamaAnalyzeData.strengths,
                    'Сильные стороны не выделены. Добавьте больше конкретики в объявление.',
                  )}

                  <p className={styles.aiResultTitle}>Слабые стороны</p>
                  {renderAnalyzeList(
                    ollamaAnalyzeData.weaknesses,
                    'Явные слабые стороны не найдены.',
                  )}

                  <p className={styles.aiResultTitle}>Рекомендации</p>
                  {renderAnalyzeList(
                    ollamaAnalyzeData.recommendations,
                    'Рекомендации не найдены. Попробуйте повторить анализ.',
                  )}

                  <div className={styles.aiActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => resetOllamaAnalyzeMutation()}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}

              {isOllamaAnalyzeError && (
                <div className={`${styles.aiResult} ${styles.aiResultError}`}>
                  <p className={styles.aiResultTitle}>Произошла ошибка при анализе объявления</p>
                  <p className={styles.aiResultText}>
                    Попробуйте повторить запрос или закройте уведомление.
                  </p>
                  <div className={styles.aiActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => resetOllamaAnalyzeMutation()}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="primary"
              className={styles.button}
              type="submit"
              disabled={isSaveDisabled}
            >
              Создать
            </Button>
            <Button variant="outline-secondary" className={styles.button} onClick={handleCancel}>
              Отмена
            </Button>
          </div>
        </Form>
      </section>
    </>
  );
};
