export type UserRole = 'admin' | 'manager' | 'staff'

export interface UserSession {
  id: string
  email: string
  name: string
  role: UserRole
  branchId: string
  branchCode: string
  branchName: string
}

// Route access map
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/settings': ['admin'],
  '/zoho': ['admin'],
  '/reconciliation': ['admin'],
  '/products/new': ['admin', 'manager'],
  '/inventory': ['admin', 'manager'],
  '/compliance': ['admin', 'manager'],
  '/transfers': ['admin', 'manager'],
  '/purchases': ['admin', 'manager'],
  '/analytics': ['admin', 'manager'],
  '/prescribers': ['admin', 'manager'],
  '/': ['admin', 'manager', 'staff'],
  '/pos': ['admin', 'manager', 'staff'],
  '/customers': ['admin', 'manager', 'staff'],
  '/transactions': ['admin', 'manager', 'staff'],
  '/cash-drawers': ['admin', 'manager', 'staff'],
  '/prescriptions': ['admin', 'manager', 'staff'],
}
