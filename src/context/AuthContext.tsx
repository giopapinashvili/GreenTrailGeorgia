import { createContext, useContext, useState, type ReactNode } from 'react'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
  avatar: string
  joinedAt: string
}

interface AuthCtx {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

/* ── mock accounts ── */
const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: 1,
    name: 'Admin Giorgi',
    email: 'admin@greentrail.ge',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
    joinedAt: '2024-01-01',
  },
  {
    id: 2,
    name: 'Nino Beridze',
    email: 'user@greentrail.ge',
    password: 'user123',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80',
    joinedAt: '2024-03-15',
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem('gt_user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  const login = async (email: string, password: string) => {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password)
    if (!found) return { ok: false, error: 'არასწორი ელ-ფოსტა ან პაროლი' }
    const { password: _, ...u } = found
    setUser(u)
    localStorage.setItem('gt_user', JSON.stringify(u))
    return { ok: true }
  }

  const register = async (name: string, email: string, _password: string) => {
    if (MOCK_USERS.find(u => u.email === email)) return { ok: false, error: 'ეს ელ-ფოსტა უკვე გამოყენებულია' }
    const newUser: AuthUser = {
      id: Date.now(),
      name,
      email,
      role: 'user',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22c55e&color=fff`,
      joinedAt: new Date().toISOString().split('T')[0],
    }
    setUser(newUser)
    localStorage.setItem('gt_user', JSON.stringify(newUser))
    return { ok: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('gt_user')
  }

  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
