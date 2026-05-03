import { Outlet, Navigate } from 'react-router-dom'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/admin':          'დეშბორდი',
  '/admin/routes':   'მარშრუტების მართვა',
  '/admin/hotels':   'სასტუმროების მართვა',
  '/admin/guides':   'გიდების მართვა',
  '/admin/users':    'მომხმარებლების მართვა',
  '/admin/stories':  'ისტორიების მართვა',
  '/admin/reviews':  'შეფასებების მართვა',
  '/admin/settings': 'პარამეტრები',
}

export default function AdminLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080e1a' }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader title={PAGE_TITLES[pathname] ?? 'Admin'} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
