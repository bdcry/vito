import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../entities/auth/model/auth-context';
import styles from './auth-page.module.css';

type TLoginFormValues = {
  email: string;
  password: string;
};

export const LoginPage = (): ReactElement => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<TLoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/my-ads" replace />;
  }

  const redirectPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const submit = async (values: TLoginFormValues) => {
    try {
      await login(values);
      void navigate(redirectPath || '/my-ads', { replace: true });
    } catch {
      setError('root', { message: 'Неверный email или пароль' });
    }
  };

  return (
    <section className={styles.page}>
      <Card className={styles.card}>
        <Card.Body className={styles.body}>
          <h1 className={styles.title}>Вход</h1>
          <p className={styles.subtitle}>Войдите, чтобы управлять своими объявлениями</p>

          {errors.root?.message && <Alert variant="danger">{errors.root.message}</Alert>}

          <Form className={styles.form} onSubmit={(e) => void handleSubmit(submit)(e)}>
            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email обязателен',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Введите корректный email',
                  },
                })}
              />
              {errors.email?.message && <div className={styles.errorText}>{errors.email.message}</div>}
            </Form.Group>

            <Form.Group>
              <Form.Label>Пароль</Form.Label>
              <Form.Control
                type="password"
                placeholder="Введите пароль"
                {...register('password', {
                  required: 'Пароль обязателен',
                  minLength: {
                    value: 6,
                    message: 'Минимум 6 символов',
                  },
                })}
              />
              {errors.password?.message && <div className={styles.errorText}>{errors.password.message}</div>}
            </Form.Group>

            <Button type="button" variant="outline-secondary" disabled className={styles.govButton}>
              Войти через Госуслуги
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Входим...' : 'Войти'}
            </Button>
          </Form>

          <p className={styles.bottomText}>
            Нет аккаунта? <Link to="/register">Регистрация</Link>
          </p>
        </Card.Body>
      </Card>
    </section>
  );
};
