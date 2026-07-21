import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isOwner: boolean
  isTenant: boolean
  apartmentNo: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const activeUserIdRef = useRef<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    activeUserIdRef.current = userId
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) console.warn('Profile load failed:', error.message)
    if (activeUserIdRef.current !== userId) return null
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    activeUserIdRef.current = session?.user?.id ?? null
  }, [session])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      activeUserIdRef.current = data.session?.user?.id ?? null
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      activeUserIdRef.current = next?.user?.id ?? null
      if (next?.user) {
        loadProfile(next.user.id)
      } else {
        setProfile(null)
      }
      if (event === 'SIGNED_OUT') {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { error: error.message }
    if (!data.session) {
      return { error: 'Login failed — session not created. Check Supabase Auth settings.' }
    }

    const userId = data.session.user.id
    activeUserIdRef.current = userId
    setSession(data.session)

    const loaded = await loadProfile(userId)
    if (!loaded) {
      activeUserIdRef.current = null
      setSession(null)
      setProfile(null)
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        /* ignore */
      }
      return {
        error:
          'No profile found for this email. Ask the administrator to create your owner/tenant account in User Management.',
      }
    }

    return { error: null }
  }, [loadProfile])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    activeUserIdRef.current = null
    setSession(null)
    setProfile(null)
    setLoading(false)

    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        /* local state already cleared */
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      isOwner: profile?.role === 'owner',
      isTenant: profile?.role === 'tenant',
      apartmentNo: profile?.apartment_no ?? null,
      signIn,
      resetPassword,
      signOut,
    }),
    [session, profile, loading, signIn, resetPassword, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
