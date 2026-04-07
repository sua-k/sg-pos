"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/types/auth"

interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole | null
  branchId: string | null
  branchCode: string | null
  branchName: string | null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me")
      if (!res.ok) return null
      const data = await res.json()
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        branchId: data.branchId,
        branchCode: data.branchCode,
        branchName: data.branchName,
      }
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Get initial session and fetch user data
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await fetchUserData()
        setUser(userData)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const userData = await fetchUserData()
          setUser(userData)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserData])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
