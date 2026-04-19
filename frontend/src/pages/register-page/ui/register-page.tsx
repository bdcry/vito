import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../entities/auth/model/auth-context';
import styles from '../../login-page/ui/auth-page.module.css';

type TRegisterFormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const RegisterPage = (): ReactElement => {
  const navigate = useNavigate();
  const { isAuthenticated, register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<TRegisterFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/my-ads" replace />;
  }

  const submit = async (values: TRegisterFormValues) => {
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
      void navigate('/my-ads', { replace: true });
    } catch {
      setError('root', { message: 'Не удалось зарегистрироваться' });
    }
  };

  return (
    <section className={styles.page}>
      <Card className={styles.card}>
        <Card.Body className={styles.body}>
          <h1 className={styles.title}>Регистрация</h1>
          <p className={styles.subtitle}>Создайте аккаунт для управления объявлениями</p>

          {errors.root?.message && <Alert variant="danger">{errors.root.message}</Alert>}

          <Form className={styles.form} onSubmit={(e) => void handleSubmit(submit)(e)}>
            <Form.Group>
              <Form.Label>Имя</Form.Label>
              <Form.Control
                type="text"
                placeholder="Иван Иванов"
                {...register('fullName', { required: 'Имя обязательно' })}
              />
              {errors.fullName?.message && <div className={styles.errorText}>{errors.fullName.message}</div>}
            </Form.Group>

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

            <Form.Group>
              <Form.Label>Подтверждение пароля</Form.Label>
              <Form.Control
                type="password"
                placeholder="Повторите пароль"
                {...register('confirmPassword', {
                  required: 'Подтвердите пароль',
                  validate: (value) => value === watch('password') || 'Пароли не совпадают',
                })}
              />
              {errors.confirmPassword?.message && (
                <div className={styles.errorText}>{errors.confirmPassword.message}</div>
              )}
            </Form.Group>

            <Button type="button" variant="outline-secondary" disabled className={styles.govButton}>
              Войти через Госуслуги
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Создаем...' : 'Зарегистрироваться'}
            </Button>
          </Form>

          <p className={styles.bottomText}>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </Card.Body>
      </Card>
    </section>
  );
};
