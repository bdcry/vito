import type { ReactElement } from 'react';
import type { TAd } from '../../../entities/ad/model/ads.types';
import { AdCard } from '../../../entities/ad/ui/ad-card/ad-card';
import styles from './ads-list.module.css';
import { Link } from 'react-router-dom';

type TAdsListProps = {
  items: TAd[];
  layout: 'grid' | 'list';
  showRevisionBadge?: boolean;
};

export const AdsList = ({ items, layout, showRevisionBadge = true }: TAdsListProps): ReactElement => {
  return (
    <ul className={`${styles.list} ${styles[`list${layout}`]}`}>
      {items.map((ad) => (
        <li key={ad.id}>
          <Link to={`${ad.id}`} key={ad.id} className={styles.link}>
            <AdCard ad={ad} layout={layout} showRevisionBadge={showRevisionBadge} />
          </Link>
        </li>
      ))}
    </ul>
  );
};
