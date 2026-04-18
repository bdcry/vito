import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getAdDetails } from '../../../entities/ad/api/getAdDetails';

import styles from './ad-details-page.module.css';
import { Alert, Button, Modal, Placeholder, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import {
  getMissingFields,
  getParamlabel,
  getParamValueLabel,
} from '../../../entities/ad/lib/get-param-labels';
import { useAuth } from '../../../entities/auth/model/auth-context';
import { canManageAd } from '../../../entities/ad/lib/can-manage-ad';
import { deleteAd } from '../../../entities/ad/api/delete-ad';

const placeholderImageSrc = '../../../public/placeholder-image.svg';

export const AdDetailsPage = (): ReactElement => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccessToast, setShowDeleteSuccessToast] = useState(false);
  const [showDeleteErrorToast, setShowDeleteErrorToast] = useState(false);
  const adId = String(params.id);
  const isMyAdsRoute = location.pathname.startsWith('/my-ads');

  const {
    data: adDetails,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['ad', params.id],
    queryFn: () => getAdDetails(String(params.id)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAd(adId),
    onSuccess: () => {
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

  if (isPending) {
    return (
      <div className={styles.stateBlock}>
        <div className={styles.fetchingIndicator}>
          <Spinner animation="grow" role="status" variant="primary" />
          <p className={styles.stateText}>Загружаем карточку объявления...</p>
        </div>
        <div className={styles.skeletonRows}>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={11} />
          </Placeholder>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={12} />
          </Placeholder>
          <Placeholder as="div" animation="glow">
            <Placeholder xs={8} />
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

  if (!adDetails) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.stateText}>Объявление не найдено.</p>
      </div>
    );
  }

  const formatAdDate = (value: string) => {
    if (!value) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(new Date(value))
      .replace(' в ', ' ');
  };

  const paramsEntries = Object.entries(adDetails.params);
  const missingFields = getMissingFields(adDetails);
  const isOwner = canManageAd(adDetails, user, { assumeOwnOnMyAdsRoute: isMyAdsRoute });
  const sellerName = adDetails.seller?.name?.trim() || (isOwner ? user?.fullName : undefined) || 'Имя не указано';
  const sellerEmail = adDetails.seller?.email?.trim() || (isOwner ? user?.email : undefined);
  const sellerInitial = sellerName.trim().charAt(0).toUpperCase() || 'П';

  const handleNavigateToEdit = () => {
    if (!isOwner) return;
    void navigate('edit');
  };

  const handleNavigateToList = () => {
    void navigate(isMyAdsRoute ? '/my-ads' : '/ads');
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
          show={showDeleteSuccessToast}
          onClose={() => setShowDeleteSuccessToast(false)}
          bg="success"
          delay={1500}
          autohide
        >
          <Toast.Body className={styles.toastBody}>Объявление удалено</Toast.Body>
        </Toast>
        <Toast
          show={showDeleteErrorToast}
          onClose={() => setShowDeleteErrorToast(false)}
          bg="danger"
          delay={3000}
          autohide
        >
          <Toast.Body className={styles.toastBody}>
            Не удалось удалить объявление. Попробуйте снова.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>{adDetails.title}</h1>
          <div className={styles.buttonsContainer}>
            <Button variant="outline-primary" className={styles.btn} onClick={handleNavigateToList}>
              Назад к списку
            </Button>
            {isAuthenticated && isOwner && (
              <Button variant="primary" className={styles.btn} onClick={handleNavigateToEdit}>
                Редактировать
              </Button>
            )}
            {isAuthenticated && isOwner && isMyAdsRoute && (
              <Button variant="outline-danger" className={styles.btn} onClick={handleOpenDeleteModal}>
                Удалить
              </Button>
            )}
          </div>
        </div>
        <div className={styles.infoContainer}>
          <span className={styles.price}>{adDetails.price} ₽</span>
          <div className={styles.date}>
            <span>Опубликовано: {formatAdDate(adDetails.createdAt)}</span>
            <span>Отредактировано: {formatAdDate(adDetails.updatedAt)}</span>
          </div>
        </div>
      </header>
      <hr className={styles.divider} />
      <section className={styles.content}>
        <div className={styles.containerDescription}>
          <img src={placeholderImageSrc} alt={adDetails.title} />
          <div className={styles.contentDescription}>
            <h2 className={styles.subtitle}>Описание</h2>
            <p className={styles.description}>
              {adDetails.description ? adDetails.description : 'Отсутствует'}
            </p>
          </div>
        </div>
        <div className={styles.containerParams}>
          {missingFields.length > 0 && (
            <Alert variant="warning" className={styles.alert}>
              <h2>Требуются доработки</h2>
              <p>У объявления не заполнены поля:</p>
              <ul>
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </Alert>
          )}
          <section className={styles.sellerCard}>
            <h2 className={styles.subtitle}>Продавец</h2>
            <div className={styles.sellerHeader}>
              <div className={styles.sellerAvatarFallback} aria-hidden>
                {sellerInitial}
              </div>
              <div className={styles.sellerMainInfo}>
                <p className={styles.sellerName}>{sellerName}</p>
              </div>
            </div>
            <ul className={styles.sellerContacts}>
              <li className={styles.sellerContactItem}>
                <span className={styles.paramName}>Email</span>
                <span className={styles.paramValue}>{sellerEmail || 'Не указан'}</span>
              </li>
            </ul>
          </section>
          <div className={styles.contentParams}>
            <h2 className={styles.subtitle}>Характеристики</h2>
            <ul className={styles.paramsList}>
              {paramsEntries.map(([key, value], index) => (
                <li className={styles.paramItem} key={index}>
                  <span className={styles.paramName}>{getParamlabel(key)}</span>
                  <span className={styles.paramValue}>
                    {getParamValueLabel(adDetails.category, key, value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Удалить объявление?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          После удаления объявление исчезнет из личного кабинета. Это действие нельзя отменить.
        </Modal.Body>
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
