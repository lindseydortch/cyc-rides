import { createContext, useContext, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { supabaseBrowserClient } from '#/lib/supabase/client'
import { getAuthSession } from '#/lib/auth/server-functions'
import type { AuthSession } from '#/lib/auth/types'

export const authSessionQueryKey = ['auth-session'] as const

interface AuthContextValue {
  session: AuthSession | null | undefined
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: session, isLoading } = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: () => getAuthSession(),
  })

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: authSessionQueryKey })
      router.invalidate()
    })

    return () => subscription.unsubscribe()
  }, [queryClient, router])

  const signOut = async () => {
    await supabaseBrowserClient.auth.signOut()
    queryClient.invalidateQueries({ queryKey: authSessionQueryKey })
    await router.invalidate()
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
