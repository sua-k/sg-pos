"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/types/auth"

interface AuthUser {
  id: string
  email: string
  role: UserRole | null
  branchId: string | null
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

function parseJwtClaims(accessToken: string): { user_role?: string; branch_id?: string } {
  try {
    const payload = accessToken.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const claims = parseJwtClaims(session.access_token)
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          role: (claims.user_role as UserRole) ?? null,
          branchId: claims.branch_id ?? null,
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const claims = parseJwtClaims(session.access_token)
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            role: (claims.user_role as UserRole) ?? null,
            branchId: claims.branch_id ?? null,
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
