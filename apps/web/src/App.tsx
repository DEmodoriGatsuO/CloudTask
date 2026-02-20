import { useState, useCallback, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from '@cloudtask/shared';
import { AuthContext } from './stores/auth-store';
import { ThemeProvider } from './hooks/useTheme';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/common/Spinner';
import { getToken, clearToken } from './api/client';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProjectListPage = lazy(() => import('./pages/ProjectListPage').then(m => ({ default: m.ProjectListPage })));
const ProjectBoardPage = lazy(() => import('./pages/ProjectBoardPage').then(m => ({ default: m.ProjectBoardPage })));
const ProjectListViewPage = lazy(() => import('./pages/ProjectListViewPage').then(m => ({ default: m.ProjectListViewPage })));
const ProjectGanttPage = lazy(() => import('./pages/ProjectGanttPage').then(m => ({ default: m.ProjectGanttPage })));
const ProjectActivityPage = lazy(() => import('./pages/ProjectActivityPage').then(m => ({ default: m.ProjectActivityPage })));
const ProjectSettingsPage = lazy(() => import('./pages/ProjectSettingsPage').then(m => ({ default: m.ProjectSettingsPage })));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage').then(m => ({ default: m.ProfileSettingsPage })));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage').then(m => ({ default: m.NotificationSettingsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const WikiPageView = lazy(() => import('./pages/WikiPageView').then(m => ({ default: m.WikiPageView })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then(m => ({ default: m.TemplatesPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cloudtask_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setTokenState] = useState<string | null>(() =>
    getToken(),
  );

  const setAuth = useCallback((u: User, t: string) => {
    setUser(u);
    setTokenState(t);
    localStorage.setItem('cloudtask_user', JSON.stringify(u));
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem('cloudtask_user');
    clearToken();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, setAuth, clearAuth }}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectListPage />} />
                <Route path="/projects/:projectId/board" element={<ProjectBoardPage />} />
                <Route path="/projects/:projectId/list" element={<ProjectListViewPage />} />
                <Route path="/projects/:projectId/gantt" element={<ProjectGanttPage />} />
                <Route path="/projects/:projectId/activity" element={<ProjectActivityPage />} />
                <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
                <Route path="/projects/:projectId/wiki" element={<WikiPageView />} />
                <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
                <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
              </Route>

              {/* Redirect root */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
            </BrowserRouter>
          </QueryClientProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
