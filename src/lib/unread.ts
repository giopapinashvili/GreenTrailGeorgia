import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** Total unread messages for the signed-in user, kept fresh with realtime. */
export function useUnread() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['unread', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('unread_total')
      if (error) throw error
      return Number(data ?? 0)
    },
    refetchInterval: 60_000,
  })
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: ['unread'] })
        qc.invalidateQueries({ queryKey: ['conversations'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, qc])
  return user ? q.data ?? 0 : 0
}
