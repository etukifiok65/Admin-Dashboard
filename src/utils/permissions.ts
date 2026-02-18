import type { AdminUser } from '@app-types/index';

export type PagePath = 
  | 'dashboard' 
  | 'users' 
  | 'providers' 
  | 'verifications' 
  | 'appointments' 
  | 'financial' 
  | 'analytics' 
  | 'notifications'
  | 'settings';

export type UserRole = 'super_admin' | 'admin' | 'moderator';

// Define which roles have access to which pages
const rolePermissions: Record<UserRole, PagePath[]> = {
  super_admin: [
    'dashboard',
    'users',
    'providers',
    'verifications',
    'appointments',
    'financial',
    'analytics',
    'notifications',
    'settings',
  ],
  admin: [
    'dashboard',
    'users',
    'providers',
    'verifications',
    'appointments',
    'financial',
    'analytics',
    'notifications',
  ],
  moderator: [
    'dashboard',
    'users',
    'providers',
    'verifications',
    'appointments',
  ],
};

/**
 * Check if a user has access to a specific page
 */
export const canAccessPage = (user: AdminUser | null, page: PagePath): boolean => {
  if (!user) return false;
  return rolePermissions[user.role as UserRole]?.includes(page) ?? false;
};

/**
 * Get all accessible pages for a user role
 */
export const getAccessiblePages = (role: UserRole): PagePath[] => {
  return rolePermissions[role] ?? [];
};

/**
 * Check if a user is super admin
 */
export const isSuperAdmin = (user: AdminUser | null): boolean => {
  return user?.role === 'super_admin';
};

/**
 * Check if a user is admin or super admin
 */
export const isAdmin = (user: AdminUser | null): boolean => {
  return user?.role === 'admin' || user?.role === 'super_admin';
};
