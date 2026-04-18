import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { getAds } from '../../../entities/ad/api/getAds';
import { AdsList } from '../../../widgets/ads-list/ui/ads-list';
import { AdsToolbar } from '../../../widgets/ads-toolbar/ui/ads-toolbar';
import { AdsFilters } from '../../../widgets/ads-filters/ui/ads-filters';
import styles from './ads-catalog-page.module.css';
import { Alert, Offcanvas, Pagination, Placeholder, Spinner } from 'react-bootstrap';
import { adsSortMap } from '../../../entities/ad/lib/ads-sort-map';
import { type TAdCategory, type TSortValue } from '../../../entities/ad/model/ads.types';

const PAGE_SIZE = 8;

type TAdsCatalogPageProps = {
  mode: 'all' | 'my';
  title: string;
};

export const AdsCatalogPage = ({ mode, title }: TAdsCatalogPageProps): ReactElement => {
  const isMyAdsPage = mode === 'my';

  const [searchValue, setSearchValue] = useState<string>('');
  const [sortValue, setSortValue] = useState<TSortValue>('createdAt-desc');
  const sortParams = adsSortMap[sortValue];

  const [selectedCategories, setSelectedCategories] = useState<TAdCategory[]>([]);
  const [needsRevision, setNeedsRevision] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);

  const {
    data: ads,
    isPending,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['ads', mode, searchValue, sortValue, needsRevision, selectedCategories, currentPage],
    queryFn: () =>
      getAds({
        q: searchValue,
        ...sortParams,
        needsRevision: isMyAdsPage ? needsRevision : undefined,
        // TODO: backend contract for personal feed can be adjusted if different flag is needed
        mine: isMyAdsPage ? true : undefined,
        categories: selectedCategories.join(','),
        limit: PAGE_SIZE,
        skip: (currentPage - 1) * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const { data: needsRevisionAds } = useQuery({
    queryKey: ['ads-needs-revision-total', mode],
    queryFn: () =>
      getAds({
        needsRevision: true,
        mine: isMyAdsPage ? true : undefined,
        limit: 1,
        skip: 0,
      }),
    enabled: isMyAdsPage,
  });

  const onSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const onSortChange = (value: TSortValue) => {
    setSortValue(value);
    setCurrentPage(1);
  };

  const onCategoryChange = (category: TAdCategory) => {
    setSelectedCategories((prevCat) => {
      if (prevCat.includes(category)) {
        return prevCat.filter((cat) => cat !== category);
      } else {
        return [...prevCat, category];
      }
    });
    setCurrentPage(1);
  };

  const onNeedsRevisionChange = (value: boolean) => {
    setNeedsRevision(value);
    setCurrentPage(1);
  };

  const onResetFilters = () => {
    setSelectedCategories([]);
    setNeedsRevision(false);
    setCurrentPage(1);
  };

  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  const handleLayoutChange = (newLayout: 'grid' | 'list') => {
    setLayout(newLayout);
  };

  const adsItems = (ads?.items ?? []).slice(0, PAGE_SIZE);
  const totalAds = ads?.total ?? 0;
  const needsRevisionCount = needsRevisionAds?.total ?? 0;
  const totalPage = Math.ceil(totalAds / PAGE_SIZE);
  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = totalPage === 0 || currentPage === totalPage;
  const hasItems = adsItems.length > 0;
  let adsContent: ReactElement;

  if (isPending) {
    adsContent = (
      <div className={styles.stateBlock}>
        <div className={styles.fetchingIndicator}>
          <Spinner animation="grow" role="status" variant="primary" />
          <p className={styles.stateText}>Подбираем актуальные объявления...</p>
        </div>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div className={styles.skeletonCard} key={index}>
              <Placeholder as="div" animation="glow">
                <Placeholder xs={12} className={styles.skeletonImage} />
              </Placeholder>
              <Placeholder as="div" animation="glow" className={styles.skeletonBody}>
                <Placeholder xs={5} />
                <Placeholder xs={10} />
                <Placeholder xs={7} />
              </Placeholder>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (isError) {
    adsContent = (
      <Alert variant="danger" className={styles.stateAlert}>
        Не удалось загрузить объявления.
      </Alert>
    );
  } else if (hasItems) {
    adsContent = (
      <>
        {isFetching && (
          <div className={styles.fetchingIndicator}>
            <Spinner animation="border" role="status" size="sm" />
            <span className={styles.fetchingText}>Обновляем список...</span>
          </div>
        )}
        <AdsList items={adsItems} layout={layout} showRevisionBadge={isMyAdsPage} />
        <Pagination>
          <Pagination.Prev
            disabled={isPrevDisabled}
            onClick={() => setCurrentPage(currentPage - 1)}
          />
          {totalPage > 1 &&
            new Array(totalPage).fill(0).map((_, index) => (
              <Pagination.Item
                key={index}
                active={index + 1 === currentPage}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
          <Pagination.Next
            disabled={isNextDisabled}
            onClick={() => setCurrentPage(currentPage + 1)}
          />
        </Pagination>
      </>
    );
  } else {
    adsContent = (
      <div className={styles.stateBlock}>
        <p className={styles.stateTitle}>Ничего не найдено</p>
        <p className={styles.stateText}>
          Измените параметры фильтрации или сбросьте фильтры, чтобы увидеть объявления.
        </p>
      </div>
    );
  }

  return (
    <>
      <AdsToolbar
        mode={mode}
        title={title}
        subtitle={
          isMyAdsPage
            ? `Под контролем ${totalAds} объявлений. Управляйте публикациями из одного места.`
            : `В каталоге ${totalAds} объявлений от всех пользователей.`
        }
        totalAds={totalAds}
        needsRevisionCount={needsRevisionCount}
        onSearchChange={onSearchChange}
        searchValue={searchValue}
        onSortChange={onSortChange}
        sortValue={sortValue}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        onOpenFilters={() => setShowMobileFilters(true)}
      />
      <div className={styles.content}>
        <aside className={styles.filtersDesktop}>
          <AdsFilters
            selectedCategories={selectedCategories}
            onCategoryChange={onCategoryChange}
            needsRevision={needsRevision}
            showNeedsRevisionFilter={isMyAdsPage}
            onNeedsRevisionChange={onNeedsRevisionChange}
            onResetFilters={onResetFilters}
          />
        </aside>
        <section className={styles.sectionAds}>{adsContent}</section>
      </div>
      <Offcanvas
        show={showMobileFilters}
        onHide={() => setShowMobileFilters(false)}
        placement="start"
        className={styles.filtersOffcanvas}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Фильтры</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <AdsFilters
            selectedCategories={selectedCategories}
            onCategoryChange={onCategoryChange}
            needsRevision={needsRevision}
            showNeedsRevisionFilter={isMyAdsPage}
            onNeedsRevisionChange={onNeedsRevisionChange}
            onResetFilters={onResetFilters}
          />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};
