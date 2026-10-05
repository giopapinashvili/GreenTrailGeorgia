import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './lib/theme'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui/Toast'
import Layout from './components/layout/Layout'
import { PageSpinner } from './components/ui/Spinner'
import HomePage from './pages/HomePage'
import RoutesPage from './pages/RoutesPage'
import NotFound from './pages/NotFound'

const RoutePage = lazy(() => import('./pages/RoutePage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const PostPage = lazy(() => import('./pages/PostPage'))
const PostEditPage = lazy(() => import('./pages/PostEditPage'))
const TipsPage = lazy(() => import('./pages/TipsPage'))
const ArticlePage = lazy(() => import('./pages/ArticlePage'))
const GuidesPage = lazy(() => import('./pages/GuidesPage'))
const TourPage = lazy(() => import('./pages/TourPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const MePage = lazy(() => import('./pages/MePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPage = lazy(() => import('./pages/auth/ForgotPage'))
const ResetPage = lazy(() => import('./pages/auth/ResetPage'))
const WelcomePage = lazy(() => import('./pages/auth/WelcomePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'))
const AdminRouteEdit = lazy(() => import('./pages/admin/AdminRouteEdit'))
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'))
const AdminGuides = lazy(() => import('./pages/admin/AdminGuides'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminTools = lazy(() => import('./pages/admin/AdminTools'))

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<PageSpinner />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="routes" element={<RoutesPage />} />
                    <Route path="routes/:slug" element={<RoutePage />} />
                    <Route path="map" element={<MapPage />} />
                    <Route path="planner" element={<PlannerPage />} />
                    <Route path="blog" element={<BlogPage />} />
                    <Route path="blog/new" element={<PostEditPage />} />
                    <Route path="blog/:id" element={<PostPage />} />
                    <Route path="blog/:id/edit" element={<PostEditPage />} />
                    <Route path="tips" element={<TipsPage />} />
                    <Route path="tips/:slug" element={<ArticlePage />} />
                    <Route path="guides" element={<GuidesPage />} />
                    <Route path="tours/:id" element={<TourPage />} />
                    <Route path="u/:username" element={<ProfilePage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="messages/:id" element={<MessagesPage />} />
                    <Route path="me" element={<MePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="settings/:tab" element={<SettingsPage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="forgot" element={<ForgotPage />} />
                    <Route path="reset-password" element={<ResetPage />} />
                    <Route path="welcome" element={<WelcomePage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="routes" element={<AdminRoutes />} />
                      <Route path="routes/new" element={<AdminRouteEdit />} />
                      <Route path="routes/:id" element={<AdminRouteEdit />} />
                      <Route path="articles" element={<AdminArticles />} />
                      <Route path="guides" element={<AdminGuides />} />
                      <Route path="reports" element={<AdminReports />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="tools" element={<AdminTools />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
