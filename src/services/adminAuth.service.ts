import { supabase } from './supabase';
import type { AdminUser } from '@app-types/index';

export interface AdminAuthResponse {
  user: AdminUser | null;
  error: string | null;
}

class AdminAuthService {
  /**
   * Login admin user with email and password
   */
  async login(email: string, password: string): Promise<AdminAuthResponse> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      // Check if user has admin role via JWT claims
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        return { user: null, error: 'User not found' };
      }

      // Get admin user profile
      const { data: adminProfile, error: profileError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_id', user.user.id)
        .single();

      if (profileError || !adminProfile) {
        // Fallback: check if user has admin role in custom claims
        const userRole = (user.user.user_metadata?.role || user.user.app_metadata?.role);
        
        // Check if user has any valid admin role
        const validRoles = ['super_admin', 'admin', 'moderator'];
        if (!validRoles.includes(userRole as string)) {
          await supabase.auth.signOut();
          return { user: null, error: 'User is not an admin' };
        }

        // Create admin user object from auth user
        const adminUser: AdminUser = {
          id: user.user.id,
          email: user.user.email || '',
          name: user.user.user_metadata?.name || user.user.email || '',
          role: (user.user.user_metadata?.role || user.user.app_metadata?.role || 'admin') as 'super_admin' | 'admin' | 'moderator',
          created_at: user.user.created_at || new Date().toISOString(),
        };

        return { user: adminUser, error: null };
      }

      const adminUser: AdminUser = {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.name,
        role: adminProfile.role,
        created_at: adminProfile.created_at,
      };

      return { user: adminUser, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      return { user: null, error: errorMessage };
    }
  }

  /**
   * Logout admin user
   */
  async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during logout';
      return { error: errorMessage };
    }
  }

  /**
   * Get current admin user
   */
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      // Prefer admin_users table to validate admin access on refresh
      const { data: adminProfile } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminProfile) {
        return {
          id: adminProfile.id,
          email: adminProfile.email,
          name: adminProfile.name,
          role: adminProfile.role,
          created_at: adminProfile.created_at,
        };
      }

      // Fallback: check if user has admin role in custom claims
      const userRole = (user.user_metadata?.role || user.app_metadata?.role);

      const validRoles = ['super_admin', 'admin', 'moderator'];
      if (!validRoles.includes(userRole as string)) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email || '',
        role: (user.user_metadata?.role || user.app_metadata?.role || 'admin') as 'super_admin' | 'admin' | 'moderator',
        created_at: user.created_at || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if user session is still valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      return { error: errorMessage };
    }
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
