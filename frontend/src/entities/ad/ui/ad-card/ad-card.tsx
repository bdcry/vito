import type { ReactElement } from 'react';
import { Card } from 'react-bootstrap';
import { getCategoryLabel } from '../../lib/get-category-label';
import type { TAd } from '../../model/ads.types';
import styles from './ad-card.module.css';

const placeholderImageSrc = '/placeholder-image.svg';

type TAdCardProps = {
  ad: TAd;
  layout: 'grid' | 'list';
  showRevisionBadge?: boolean;
};

export const AdCard = ({ ad, layout, showRevisionBadge = true }: TAdCardProps): ReactElement => {
  const isListLayout = layout === 'list';
  const normalizedPrice = ad.price === null ? 'Цена не указана' : `${ad.price.toLocaleString('ru-RU')} ₽`;
  const descriptionText = ad.description?.trim() ?? '';

  return (
    <Card className={`${styles.card} ${isListLayout ? styles.listCard : ''}`}>
      <div className={isListLayout ? styles.listImage : styles.imageWrap}>
        <Card.Img variant="top" className={styles.image} src={placeholderImageSrc} alt={ad.title} />
        <div className={styles.imageOverlay}>Без фото</div>
      </div>
      <Card.Body className={styles.body}>
        <div className={styles.content}>
          <div className={styles.badges}>
            <Card.Text className={styles.category}>{getCategoryLabel(ad.category)}</Card.Text>
            {showRevisionBadge && (
              <Card.Text
                className={`${styles.needsRevision} ${!ad.needsRevision ? styles.needsRevisionHidden : ''}`}
              >
                Требует доработок
              </Card.Text>
            )}
          </div>
          <Card.Title className={styles.title}>{ad.title}</Card.Title>
          {descriptionText !== '' && <Card.Text className={styles.summary}>{descriptionText}</Card.Text>}
        </div>
        <div className={styles.footer}>
          <Card.Text className={styles.price}>{normalizedPrice}</Card.Text>
        </div>
      </Card.Body>
    </Card>
  );
};
