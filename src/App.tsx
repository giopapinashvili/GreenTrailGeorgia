import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

/* Layouts */
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import AdminLayout from './layouts/AdminLayout'
import UserLayout from './layouts/UserLayout'

/* Public pages */
import HomePage from './pages/HomePage'
import RoutesPage from './pages/RoutesPage'
import HotelsPage from './pages/HotelsPage'
import GuidesPage from './pages/GuidesPage'
import CommunityPage from './pages/CommunityPage'
import BlogPage from './pages/BlogPage'
import LoginPage from './pages/LoginPage'

/* Admin pages */
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRoutes from './pages/admin/AdminRoutes'
import AdminHotels from './pages/admin/AdminHotels'
import AdminGuides from './pages/admin/AdminGuides'
import AdminUsers from './pages/admin/AdminUsers'
import AdminStories from './pages/admin/AdminStories'
import AdminReviews from './pages/admin/AdminReviews'
import AdminSettings from './pages/admin/AdminSettings'

/* User pages */
import UserDashboard from './pages/user/UserDashboard'
import UserProfile from './pages/user/UserProfile'
import UserSaved from './pages/user/UserSaved'
import UserStories from './pages/user/UserStories'
import UserReviews from './pages/user/UserReviews'
import UserSettings from './pages/user/UserSettings'

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080e1a' }}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public site */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/routes" element={<PublicLayout><RoutesPage /></PublicLayout>} />
          <Route path="/hotels" element={<PublicLayout><HotelsPage /></PublicLayout>} />
          <Route path="/guides" element={<PublicLayout><GuidesPage /></PublicLayout>} />
          <Route path="/community" element={<PublicLayout><CommunityPage /></PublicLayout>} />
          <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin panel */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="routes"   element={<AdminRoutes />} />
            <Route path="hotels"   element={<AdminHotels />} />
            <Route path="guides"   element={<AdminGuides />} />
            <Route path="users"    element={<AdminUsers />} />
            <Route path="stories"  element={<AdminStories />} />
            <Route path="reviews"  element={<AdminReviews />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* User panel */}
          <Route path="/dashboard" element={<UserLayout />}>
            <Route index element={<UserDashboard />} />
            <Route path="profile"  element={<UserProfile />} />
            <Route path="saved"    element={<UserSaved />} />
            <Route path="stories"  element={<UserStories />} />
            <Route path="reviews"  element={<UserReviews />} />
            <Route path="settings" element={<UserSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
