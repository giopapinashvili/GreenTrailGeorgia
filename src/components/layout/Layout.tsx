import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'
import MobileTabs from './MobileTabs'
import { useAuth } from '../../lib/auth'
import { safeNext, withNext } from '../account/authUtils'

// pages a first-time Google user may still open before picking a name (the rules open from /welcome)
const OPEN_BEFORE_WELCOME = /^\/(welcome|about)(?:\/|$)/

export default function Layout() {
  const { pathname, search } = useLocation()
  const { user, profile } = useAuth()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  // after the first Google sign-in: ask once for name + username, then come back here
  if (user && profile && !profile.onboarded && !OPEN_BEFORE_WELCOME.test(pathname)) {
    const back = /^\/(login|register)$/.test(pathname) ? safeNext(new URLSearchParams(search).get('next')) : safeNext(pathname + search)
    return <Navigate to={withNext('/welcome', back)} replace />
  }

  const bare = pathname === '/map' || pathname.startsWith('/messages')
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!bare && <Footer />}
      <MobileTabs />
    </div>
  )
}
