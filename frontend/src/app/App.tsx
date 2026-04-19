import { Navigate, Route, Routes } from 'react-router-dom';
import { AllAdsPage } from '../pages/all-ads-page/ui/all-ads-page';
import { AdDetailsPage } from '../pages/ad-details-page/ui/ad-details-page';
import { AdDetailsLayout } from './routes/ad-details-layout';
import { AdEditPage } from '../pages/ad-edit-page/ui/ad-edit-page';
import { AdsLayout } from './routes/ads-layout';
import { MyAdsPage } from '../pages/my-ads-page/ui/my-ads-page';
import { AdCreatePage } from '../pages/ad-create-page/ui/ad-create-page';
import { LoginPage } from '../pages/login-page/ui/login-page';
import { RegisterPage } from '../pages/register-page/ui/register-page';
import { RequireAuth } from '../entities/auth/ui/require-auth';
import { AppHeader } from './ui/app-header';

const App = () => {
  return (
    <>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/ads" replace />} />

          <Route path="/ads" element={<AdsLayout />}>
            <Route index element={<AllAdsPage />} />

            <Route path=":id" element={<AdDetailsLayout />}>
              <Route index element={<AdDetailsPage />} />
              <Route element={<RequireAuth />}>
                <Route path="edit" element={<AdEditPage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/my-ads" element={<AdsLayout />}>
              <Route index element={<MyAdsPage />} />
              <Route path="create" element={<AdCreatePage />} />

              <Route path=":id" element={<AdDetailsLayout />}>
                <Route index element={<AdDetailsPage />} />
                <Route path="edit" element={<AdEditPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="*" element={<Navigate to="/ads" replace />} />
        </Routes>
      </main>
    </>
  );
};

export default App;
