import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

import LoginPage            from '../pages/LoginPage.jsx';
import AppShell             from '../components/AppShell.jsx';
import PupilListPage        from '../features/pupils/pages/PupilListPage.jsx';
import PupilRegistrationPage from '../features/pupils/pages/PupilRegistrationPage.jsx';
import PupilDetailPage       from '../features/pupils/pages/PupilDetailPage.jsx';
import PupilEditPage         from '../features/pupils/pages/PupilEditPage.jsx';
import AdminPage             from '../features/admin/pages/AdminPage.jsx';

/** Guard: redirect to /login if not authenticated. */
function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/** Guard: redirect to / if already authenticated. */
function RequireGuest({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <RequireGuest><LoginPage /></RequireGuest>,
  },
  {
    path: '/',
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/pupils" replace /> },
      { path: 'pupils',          element: <PupilListPage /> },
      { path: 'pupils/new',      element: <PupilRegistrationPage /> },
      { path: 'pupils/:id',      element: <PupilDetailPage /> },
      { path: 'pupils/:id/edit', element: <PupilEditPage /> },
      { path: 'admin',           element: <AdminPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
