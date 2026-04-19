import type { ReactElement } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useAuth } from '../../entities/auth/model/auth-context';
import styles from './app-header.module.css';

export const AppHeader = (): ReactElement => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/ads" className={styles.logo}>
          VITO
        </Link>

        {isAuthenticated && (
          <nav className={styles.nav}>
            <NavLink
              to="/ads"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              Объявления
            </NavLink>
            <NavLink
              to="/my-ads"
              end
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              Мои объявления
            </NavLink>
            <NavLink
              to="/my-ads/create"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              Разместить
            </NavLink>
          </nav>
        )}

        <div className={styles.actions}>
          {isAuthenticated ? (
            <Button variant="outline-secondary" className={styles.actionButton} onClick={logout}>
              Выйти
            </Button>
          ) : (
            <Button as={Link} to="/login" className={styles.actionButton}>
              Войти
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
