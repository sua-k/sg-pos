import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { UserSession } from '@/types/auth'

export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    include: { branch: true },
  })

  if (!dbUser) return null

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as UserSession['role'],
    branchId: dbUser.branchId,
    branchCode: dbUser.branch.code,
    branchName: dbUser.branch.name,
  }
}

/**
 * Require authentication — throws if not authenticated.
 * Use in API routes.
 */
export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require specific role — throws if insufficient permissions.
 */
export async function requireRole(...roles: UserSession['role'][]): Promise<UserSession> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}
