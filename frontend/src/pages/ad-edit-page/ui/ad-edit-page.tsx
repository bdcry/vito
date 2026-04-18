import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Form,
  InputGroup,
  Modal,
  Placeholder,
  Spinner,
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './ad-edit-page.module.css';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdDetails } from '../../../entities/ad/api/getAdDetails';
import { adTypeOptions } from '../../../entities/ad/lib/get-param-labels';
import { useForm, useWatch } from 'react-hook-form';
import { updateAd } from '../../../entities/ad/api/update-ad';
import { buildPayload } from '../../../entities/ad/lib/build-payload';
import type {
  TAdCategory,
  TAdDetails,
  TAdEditFormValues,
  TAdEditPayload,
} from '../../../entities/ad/model/ads.types';
import { generateDescription } from '../../../entities/ai-ollama/api/generate-description';
import { suggestPrice } from '../../../entities/ai-ollama/api/suggest-price';
import { analyzeAd } from '../../../entities/ai-ollama/api/analyze-ad';
import { useAuth } from '../../../entities/auth/model/auth-context';
import { canManageAd } from '../../../entities/ad/lib/can-manage-ad';
import { deleteAd } from '../../../entities/ad/api/delete-ad';

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

const getInitialFormValues = (ad: TAdDetails): TAdEditFormValues => {
  const baseValues = {
    title: ad.title,
    price: ad.price === null ? '' : String(ad.price),
    description: ad.description ?? '',
  };

  if (ad.category === 'auto') {
    return {
      ...baseValues,
      category: 'auto',
      params: {
        ...emptyParamsByCategory.auto,
        brand: ad.params.brand ?? '',
        model: ad.params.model ?? '',
        yearOfManufacture: ad.params.yearOfManufacture?.toString() ?? '',
        transmission: ad.params.transmission ?? '',
        mileage: ad.params.mileage?.toString() ?? '',
        enginePower: ad.params.enginePower?.toString() ?? '',
      },
    };
  }

  if (ad.category === 'real_estate') {
    return {
      ...baseValues,
      category: 'real_estate',
      params: {
        ...emptyParamsByCategory.real_estate,
        type: ad.params.type ?? '',
        address: ad.params.address ?? '',
        area: ad.params.area?.toString() ?? '',
        floor: ad.params.floor?.toString() ?? '',
      },
    };
  }

  return {
    ...baseValues,
    category: 'electronics',
    params: {
      ...emptyParamsByCategory.electronics,
      type: ad.params.type ?? '',
      brand: ad.params.brand ?? '',
      model: ad.params.model ?? '',
      condition: ad.params.condition ?? '',
      color: ad.params.color ?? '',
    },
  };
};

const mergeDraftWithInitialValues = (
  initialValues: TAdEditFormValues,
  parsedDraft: Partial<TAdEditFormValues>,
  draftCategory: TAdCategory,
): TAdEditFormValues => {
  const draftParams = (parsedDraft.params ?? {}) as Record<string, string | undefined>;
  const mergedBaseValues = {
    title: parsedDraft.title ?? initialValues.title,
    price: parsedDraft.price ?? initialValues.price,
    description: parsedDraft.description ?? initialValues.description,
  };

  if (draftCategory === 'auto') {
    return {
      ...mergedBaseValues,
      category: 'auto',
      params: {
        ...emptyParamsByCategory.auto,
        brand: draftParams.brand ?? '',
        model: draftParams.model ?? '',
        yearOfManufacture: draftParams.yearOfManufacture ?? '',
        transmission:
          draftParams.transmission === 'automatic' || draftParams.transmission === 'manual'
            ? draftParams.transmission
            : '',
        mileage: draftParams.mileage ?? '',
        enginePower: draftParams.enginePower ?? '',
      },
    };
  }

  if (draftCategory === 'real_estate') {
    return {
      ...mergedBaseValues,
      category: 'real_estate',
      params: {
        ...emptyParamsByCategory.real_estate,
        type:
          draftParams.type === 'flat' || draftParams.type === 'house' || draftParams.type === 'room'
            ? draftParams.type
            : '',
        address: draftParams.address ?? '',
        area: draftParams.area ?? '',
        floor: draftParams.floor ?? '',
      },
    };
  }

  return {
    ...mergedBaseValues,
    category: 'electronics',
    params: {
      ...emptyParamsByCategory.electronics,
      type:
        draftParams.type === 'phone' || draftParams.type === 'laptop' || draftParams.type === 'misc'
          ? draftParams.type
          : '',
      brand: draftParams.brand ?? '',
      model: draftParams.model ?? '',
      condition:
        draftParams.condition === 'new' || draftParams.condition === 'used'
          ? draftParams.condition
          : '',
      color: draftParams.color ?? '',
    },
  };
};

export const AdEditPage = (): ReactElement => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routeParams = useParams();
  const adId = String(routeParams.id);
  const { user } = useAuth();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showDeleteSuccessToast, setShowDeleteSuccessToast] = useState(false);
  const [showDeleteErrorToast, setShowDeleteErrorToast] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<TAdEditFormValues>({
    mode: 'onChange',
    // убираем значение из состояние формы, если категория изменилась
    shouldUnregister: true,
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const draftKey = `ad-edit-draft-${adId}`;
  const formValues = useWatch({ control });

  const watchedValues = useWatch({ control });
  const watchedTitle = watchedValues?.title;
  const watchedPrice = watchedValues?.price;
  const watchedCategory = watchedValues?.category;
  const watchedDescription = watchedValues?.description;
  const watchedParams = watchedValues?.params as Record<string, string | undefined> | undefined;

  const {
    data: ad,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['ad', adId],
    queryFn: () => getAdDetails(adId),
  });

  const mutation = useMutation({
    mutationFn: (updateData: TAdEditPayload) => updateAd(adId, updateData),
    onSuccess: () => {
      localStorage.removeItem(draftKey);

      setShowErrorToast(false);
      setShowSuccessToast(true);

      setTimeout(() => {
        void navigate('..');
      }, 1500);
    },
    onError: () => {
      setShowSuccessToast(false);
      setShowErrorToast(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAd(adId),
    onSuccess: () => {
      localStorage.removeItem(draftKey);
      setShowDeleteModal(false);
      setShowDeleteErrorToast(false);
      setShowDeleteSuccessToast(true);
      void queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.removeQueries({ queryKey: ['ad', adId] });
      setTimeout(() => {
        void navigate('/my-ads');
      }, 1100);
    },
    onError: () => {
      setShowDeleteModal(false);
      setShowDeleteSuccessToast(false);
      setShowDeleteErrorToast(true);
    },
  });

  useEffect(() => {
    if (!ad) return;

    const initialValues = getInitialFormValues(ad);

    const rawDraft = localStorage.getItem(draftKey);

    if (!rawDraft) {
      reset(initialValues);
      setIsFormInitialized(true);
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as Partial<TAdEditFormValues>;
      const draftCategory = (parsedDraft.category ?? initialValues.category) as TAdCategory;

      reset(mergeDraftWithInitialValues(initialValues, parsedDraft, draftCategory));
    } catch {
      localStorage.removeItem(draftKey);
      reset(initialValues);
    } finally {
      setIsFormInitialized(true);
    }
  }, [ad, draftKey, reset]);

  useEffect(() => {
    if (!isFormInitialized || !formValues) return;

    localStorage.setItem(draftKey, JSON.stringify(formValues));
  }, [draftKey, formValues, isFormInitialized]);

  // Ollama

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

  if (isPending) {
    return (
      <div className={styles.stateBlock}>
        <div className={styles.fetchingIndicator}>
          <Spinner animation="grow" role="status" variant="primary" />
          <p className={styles.stateText}>Подготавливаем форму редактирования...</p>
        </div>
        <div className={styles.skeletonRows}>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={5} />
          </Placeholder>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={12} />
          </Placeholder>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={12} />
          </Placeholder>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={9} />
          </Placeholder>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger" className={styles.stateAlert}>
        Не удалось загрузить объявление.
      </Alert>
    );
  }

  if (!ad) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.stateText}>Объявление не найдено.</p>
      </div>
    );
  }

  const isMyAdsRoute = location.pathname.startsWith('/my-ads');
  const isOwner = canManageAd(ad, user, { assumeOwnOnMyAdsRoute: isMyAdsRoute });

  if (!isOwner) {
    return (
      <Alert variant="warning" className={styles.stateAlert}>
        Нет доступа к редактированию этого объявления.
      </Alert>
    );
  }

  const descriptionValue = ad.description ?? '';
  const currentCategory = (watchedCategory ?? ad.category) as TAdCategory;
  const currentDescription = watchedDescription ?? descriptionValue;
  const descriptionLength = currentDescription.length;
  const descriptionHelperText = currentDescription.trim()
    ? 'Улучшить описание'
    : 'Придумать описание';

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

  const typeOptions = adTypeOptions[currentCategory];
  const currentTitle = watchedTitle ?? ad.title;
  const currentPrice = watchedPrice ?? (ad.price === null ? '' : String(ad.price));
  const isSaveDisabled =
    currentTitle.trim() === '' ||
    currentPrice.trim() === '' ||
    Number.isNaN(Number(currentPrice)) ||
    Number(currentPrice) < 0 ||
    mutation.isPending;

  const autoDefaults = ad.category === 'auto' ? ad.params : undefined;
  const realEstateDefaults = ad.category === 'real_estate' ? ad.params : undefined;
  const electronicsDefaults = ad.category === 'electronics' ? ad.params : undefined;

  const getOptionalValue = (key: string, fallback?: string | number) => {
    return watchedParams?.[key] ?? (fallback === undefined ? '' : String(fallback));
  };

  const getOptionalFieldClass = (value?: string) => {
    return isSubmitted && (value ?? '').trim() === '' ? styles.optionalField : '';
  };

  const submit = (rawData: TAdEditFormValues) => {
    const payload = buildPayload(rawData);
    mutation.mutate(payload);
  };

  const handleCancel = () => {
    localStorage.removeItem(draftKey);
    void navigate('..');
  };

  const handleGenerateDescription = () => {
    if (isOllamaDescriptionPending) return;

    mutateOllamaDescription({
      title: currentTitle,
      category: currentCategory,
      price: currentPrice,
      params: watchedParams ?? {},
      description: currentDescription,
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

  const handleCloseGeneratedDescription = () => {
    resetOllamaDescriptionMutation();
  };

  const handleGeneratePrice = () => {
    if (isOllamaPricePending) return;

    mutateOllamaPrice({
      title: currentTitle,
      category: currentCategory,
      price: currentPrice,
      params: watchedParams ?? {},
    });
  };

  const handleCloseSuggestedPrice = () => {
    resetOllamaPriceMutation();
  };

  const handleAnalyzeAd = () => {
    if (isOllamaAnalyzePending) return;

    mutateOllamaAnalyze({
      title: currentTitle,
      category: currentCategory,
      price: currentPrice,
      description: currentDescription,
      params: watchedParams ?? {},
    });
  };

  const handleCloseAnalyze = () => {
    resetOllamaAnalyzeMutation();
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

  const handleOpenDeleteModal = () => {
    if (!isOwner || !isMyAdsRoute) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate();
  };

  return (
    <>
      <ToastContainer position="top-end" className={styles.toastContainer}>
        <Toast
          show={showSuccessToast}
          onClose={() => setShowSuccessToast(false)}
          bg="success"
          delay={1500}
          autohide
        >
          <Toast.Body className={styles.toastBody}>Изменения сохранены</Toast.Body>
        </Toast>

        <Toast
          show={showErrorToast}
          onClose={() => setShowErrorToast(false)}
          bg="danger"
          delay={4000}
          autohide
        >
          <Toast.Body className={styles.toastBody}>
            При попытке сохранить изменения произошла ошибка. Попробуйте ещё раз или зайдите позже.
          </Toast.Body>
        </Toast>
        <Toast
          show={showDeleteSuccessToast}
          onClose={() => setShowDeleteSuccessToast(false)}
          bg="success"
          delay={1800}
          autohide
        >
          <Toast.Body className={styles.toastBody}>Объявление удалено</Toast.Body>
        </Toast>
        <Toast
          show={showDeleteErrorToast}
          onClose={() => setShowDeleteErrorToast(false)}
          bg="danger"
          delay={3500}
          autohide
        >
          <Toast.Body className={styles.toastBody}>
            Не удалось удалить объявление. Попробуйте снова.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <header className={styles.headerEdit}>
        <h2 className={styles.headerTitle}>Редактирование объявления</h2>
      </header>

      <section className={styles.page}>
        <Form className={styles.form} onSubmit={(e) => void handleSubmit(submit)(e)}>
          <div className={styles.section}>
            <div className={styles.field}>
              <h3 className={styles.label}>Категория</h3>
              <Form.Select
                defaultValue={ad.category}
                aria-label="Категория объявления"
                {...register('category', {
                  onChange: (e: ChangeEvent<HTMLSelectElement>) => {
                    const newCategory = e.target.value as TAdCategory;
                    setValue(
                      'params',
                      emptyParamsByCategory[newCategory] as TAdEditFormValues['params'],
                      {
                        // при смене категории, отмечает, что params изменились, относительно начального значения
                        // и запускает валидацию
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
                  placeholder={'Название объявления'}
                  aria-label="Введите название объявления"
                  {...register('title', {
                    required: 'Название должно быть заполнено',
                    validate: (value) => value.trim() !== '' || 'Название должно быть заполнено',
                  })}
                  defaultValue={ad.title}
                />
              </InputGroup>
              {errors.title?.message && (
                <p className={styles.fieldErrorText}>{errors.title.message}</p>
              )}
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
                    defaultValue={ad.price ?? ''}
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
              {errors.price?.message && (
                <p className={styles.fieldErrorText}>{errors.price.message}</p>
              )}
              {isOllamaPriceSuccess && ollamaPriceData && (
                <div className={styles.aiResult}>
                  <p className={styles.aiResultTitle}>Ответ AI:</p>
                  <p className={styles.aiResultText}>{ollamaPriceData}</p>
                  <div className={styles.aiActions}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={handleCloseSuggestedPrice}
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
                      onClick={handleCloseSuggestedPrice}
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

            {currentCategory === 'auto' && (
              <>
                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('brand', autoDefaults?.brand),
                  )}`}
                >
                  <p className={styles.label}>Бренд</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите бренд"
                      aria-label="Введите название бренда"
                      defaultValue={autoDefaults?.brand ?? ''}
                      {...register('params.brand')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('model', autoDefaults?.model),
                  )}`}
                >
                  <p className={styles.label}>Модель</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите модель"
                      aria-label="Введите название модели"
                      defaultValue={autoDefaults?.model ?? ''}
                      {...register('params.model')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('yearOfManufacture', autoDefaults?.yearOfManufacture),
                  )}`}
                >
                  <p className={styles.label}>Год выпуска</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите год выпуска"
                      aria-label="Введите год выпуска"
                      defaultValue={autoDefaults?.yearOfManufacture ?? ''}
                      {...register('params.yearOfManufacture')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('transmission', autoDefaults?.transmission),
                  )}`}
                >
                  <p className={styles.label}>Коробка передач</p>
                  <Form.Select
                    aria-label="Коробка передач"
                    defaultValue={autoDefaults?.transmission ?? ''}
                    {...register('params.transmission')}
                  >
                    <option value="">Выберите тип</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('mileage', autoDefaults?.mileage),
                  )}`}
                >
                  <p className={styles.label}>Пробег</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите пробег"
                      aria-label="Введите пробег"
                      defaultValue={autoDefaults?.mileage ?? ''}
                      {...register('params.mileage')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('enginePower', autoDefaults?.enginePower),
                  )}`}
                >
                  <p className={styles.label}>Мощность двигателя</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите мощность двигателя"
                      aria-label="Введите мощность двигателя"
                      defaultValue={autoDefaults?.enginePower ?? ''}
                      {...register('params.enginePower')}
                    />
                  </InputGroup>
                </div>
              </>
            )}

            {currentCategory === 'real_estate' && (
              <>
                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('type', realEstateDefaults?.type),
                  )}`}
                >
                  <p className={styles.label}>Тип</p>
                  <Form.Select
                    aria-label="Тип недвижимости"
                    defaultValue={realEstateDefaults?.type ?? ''}
                    {...register('params.type')}
                  >
                    <option value="">Выберите тип</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('address', realEstateDefaults?.address),
                  )}`}
                >
                  <p className={styles.label}>Адрес</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите адрес"
                      aria-label="Введите адрес"
                      defaultValue={realEstateDefaults?.address ?? ''}
                      {...register('params.address')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('area', realEstateDefaults?.area),
                  )}`}
                >
                  <p className={styles.label}>Площадь</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите площадь"
                      aria-label="Введите площадь"
                      defaultValue={realEstateDefaults?.area ?? ''}
                      {...register('params.area')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('floor', realEstateDefaults?.floor),
                  )}`}
                >
                  <p className={styles.label}>Этаж</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите этаж"
                      aria-label="Введите этаж"
                      defaultValue={realEstateDefaults?.floor ?? ''}
                      {...register('params.floor')}
                    />
                  </InputGroup>
                </div>
              </>
            )}

            {currentCategory === 'electronics' && (
              <>
                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('type', electronicsDefaults?.type),
                  )}`}
                >
                  <p className={styles.label}>Тип</p>
                  <Form.Select
                    aria-label="Тип электроники"
                    defaultValue={electronicsDefaults?.type ?? ''}
                    {...register('params.type')}
                  >
                    <option value="">Выберите тип</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('brand', electronicsDefaults?.brand),
                  )}`}
                >
                  <p className={styles.label}>Бренд</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите бренд"
                      aria-label="Введите название бренда"
                      defaultValue={electronicsDefaults?.brand ?? ''}
                      {...register('params.brand')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('model', electronicsDefaults?.model),
                  )}`}
                >
                  <p className={styles.label}>Модель</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите модель"
                      aria-label="Введите название модели"
                      defaultValue={electronicsDefaults?.model ?? ''}
                      {...register('params.model')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('color', electronicsDefaults?.color),
                  )}`}
                >
                  <p className={styles.label}>Цвет</p>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Введите цвет"
                      aria-label="Введите название цвета"
                      defaultValue={electronicsDefaults?.color ?? ''}
                      {...register('params.color')}
                    />
                  </InputGroup>
                </div>

                <div
                  className={`${styles.field} ${getOptionalFieldClass(
                    getOptionalValue('condition', electronicsDefaults?.condition),
                  )}`}
                >
                  <p className={styles.label}>Состояние</p>
                  <Form.Select
                    aria-label="Состояние"
                    defaultValue={electronicsDefaults?.condition || ''}
                    {...register('params.condition')}
                  >
                    <option value="">Состояние</option>
                    <option value="new">Новый</option>
                    <option value="used">Б/у</option>
                  </Form.Select>
                </div>
              </>
            )}
          </div>

          <div className={styles.section}>
            <div className={`${styles.field} ${getOptionalFieldClass(currentDescription)}`}>
              <h3 className={styles.label}>Описание</h3>
              <InputGroup>
                <Form.Control
                  as="textarea"
                  rows={4}
                  maxLength={1000}
                  defaultValue={descriptionValue}
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
                      onClick={handleCloseGeneratedDescription}
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
                      onClick={handleCloseGeneratedDescription}
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
                    <Button type="button" size="sm" variant="outline-secondary" onClick={handleCloseAnalyze}>
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
                    <Button type="button" size="sm" variant="outline-secondary" onClick={handleCloseAnalyze}>
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
              Сохранить
            </Button>
            <Button variant="outline-secondary" className={styles.button} onClick={handleCancel}>
              Отмена
            </Button>
            {isMyAdsRoute && (
              <Button variant="outline-danger" className={styles.button} onClick={handleOpenDeleteModal}>
                Удалить
              </Button>
            )}
          </div>
        </Form>
      </section>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Удалить объявление?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Это действие нельзя отменить. Объявление будет удалено безвозвратно.</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Удаляем...' : 'Удалить'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
