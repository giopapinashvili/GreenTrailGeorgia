import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { PageSpinner } from '../ui/Spinner'
import Empty from '../ui/Empty'

/** Renders children only for signed-in users; otherwise sends them to /login and back afterwards. */
export default function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, profile, loading, isAdmin } = useAuth()
  const loc = useLocation()
  if (loading || (user && !profile)) return <PageSpinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (profile?.is_banned) {
    return (
      <div className="page py-16">
        <Empty title="ანგარიში შეზღუდულია" text="შენი ანგარიში დროებით შეზღუდულია. თუ ფიქრობ, რომ ეს შეცდომაა, მოგვწერე." />
      </div>
    )
  }
  if (admin && !isAdmin) {
    return (
      <div className="page py-16">
        <Empty title="წვდომა არ გაქვს" text="ეს გვერდი მხოლოდ ადმინისტრატორებისთვისაა." />
      </div>
    )
  }
  return <>{children}</>
}
