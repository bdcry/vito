import type { ReactElement } from 'react';
import { Accordion, Button, Card, Form } from 'react-bootstrap';
import { getCategoryLabel } from '../../../entities/ad/lib/get-category-label';
import styles from './ads-filters.module.css';
import type { TAdCategory } from '../../../entities/ad/model/ads.types';

type TAdsFiltersProps = {
  selectedCategories: TAdCategory[];
  needsRevision: boolean;
  showNeedsRevisionFilter?: boolean;
  onCategoryChange: (category: TAdCategory) => void;
  onNeedsRevisionChange: (needsRevision: boolean) => void;
  onResetFilters: () => void;
};

export const AdsFilters = ({
  selectedCategories,
  onCategoryChange,
  needsRevision,
  showNeedsRevisionFilter = true,
  onNeedsRevisionChange,
  onResetFilters,
}: TAdsFiltersProps): ReactElement => {
  return (
    <Card className={styles.card}>
      <Card.Header className={styles.header}>Фильтры</Card.Header>
      <Card.Body className={styles.filters}>
        <Accordion defaultActiveKey="0" className={styles.accordion}>
          <Accordion.Item eventKey="0" className={styles.accordionItem}>
            <Accordion.Header>Категории</Accordion.Header>
            <Accordion.Body className={styles.accordionBody}>
              <Form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                <Form.Check
                  type="checkbox"
                  label={getCategoryLabel('auto')}
                  checked={selectedCategories.includes('auto')}
                  onChange={() => onCategoryChange('auto')}
                ></Form.Check>
                <Form.Check
                  type="checkbox"
                  label={getCategoryLabel('electronics')}
                  checked={selectedCategories.includes('electronics')}
                  onChange={() => onCategoryChange('electronics')}
                ></Form.Check>
                <Form.Check
                  type="checkbox"
                  label={getCategoryLabel('real_estate')}
                  checked={selectedCategories.includes('real_estate')}
                  onChange={() => onCategoryChange('real_estate')}
                ></Form.Check>
                {showNeedsRevisionFilter && (
                  <Form.Check
                    className={styles.switch}
                    type="switch"
                    label="Только требующие доработок"
                    checked={needsRevision}
                    onChange={(e) => onNeedsRevisionChange(e.target.checked)}
                  />
                )}
              </Form>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
        <Button variant="outline-secondary" className={styles.resetButton} onClick={onResetFilters}>
          Сбросить фильтры
        </Button>
      </Card.Body>
    </Card>
  );
};
