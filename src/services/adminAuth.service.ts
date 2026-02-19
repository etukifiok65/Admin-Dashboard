import { supabase } from './supabase';
import type { AdminUser } from '@app-types/index';

const LOGIN_ATTEMPTS_STORAGE_KEY = 'admin_login_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

interface LoginAttemptState {
  failedAttempts: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

export interface AdminAuthResponse {
  user: AdminUser | null;
  error: string | null;
}

class AdminAuthService {
  private getAttemptsMap(): Record<string, LoginAttemptState> {
    try {
      const raw = localStorage.getItem(LOGIN_ATTEMPTS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, LoginAttemptState>;
      return parsed || {};
    } catch {
      return {};
    }
  }

  private setAttemptsMap(map: Record<string, LoginAttemptState>): void {
    try {
      localStorage.setItem(LOGIN_ATTEMPTS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // no-op: storage may be unavailable
    }
  }

  private getLoginAttemptState(email: string): LoginAttemptState | null {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const attemptsMap = this.getAttemptsMap();
    const state = attemptsMap[normalizedEmail];
    if (!state) return null;

    const now = Date.now();

    if (state.lockedUntil && state.lockedUntil <= now) {
      delete attemptsMap[normalizedEmail];
      this.setAttemptsMap(attemptsMap);
      return null;
    }

    if (!state.lockedUntil && now - state.firstFailedAt > ATTEMPT_WINDOW_MS) {
      delete attemptsMap[normalizedEmail];
      this.setAttemptsMap(attemptsMap);
      return null;
    }

    return state;
  }

  private recordFailedLogin(email: string): { locked: boolean; minutesRemaining: number; attemptsRemaining: number } {
    const normalizedEmail = email.trim().toLowerCase();
    const attemptsMap = this.getAttemptsMap();
    const now = Date.now();

    const currentState = this.getLoginAttemptState(normalizedEmail);

    let nextState: LoginAttemptState;
    if (!currentState) {
      nextState = {
        failedAttempts: 1,
        firstFailedAt: now,
        lockedUntil: null,
      };
    } else {
      nextState = {
        ...currentState,
        failedAttempts: currentState.failedAttempts + 1,
      };
    }

    if (nextState.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      nextState.lockedUntil = now + LOCKOUT_DURATION_MS;
    }

    attemptsMap[normalizedEmail] = nextState;
    this.setAttemptsMap(attemptsMap);

    if (nextState.lockedUntil) {
      return {
        locked: true,
        minutesRemaining: Math.max(1, Math.ceil((nextState.lockedUntil - now) / 60000)),
        attemptsRemaining: 0,
      };
    }

    return {
      locked: false,
      minutesRemaining: 0,
      attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - nextState.failedAttempts),
    };
  }

  private clearFailedLogin(email: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    const attemptsMap = this.getAttemptsMap();
    if (attemptsMap[normalizedEmail]) {
      delete attemptsMap[normalizedEmail];
      this.setAttemptsMap(attemptsMap);
    }
  }

  private getLockoutMessage(email: string): string | null {
    const state = this.getLoginAttemptState(email);
    if (!state || !state.lockedUntil) return null;

    const minutesRemaining = Math.max(1, Math.ceil((state.lockedUntil - Date.now()) / 60000));
    return `Too many failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`;
  }

  /**
   * Login admin user with email and password
   */
  async login(email: string, password: string): Promise<AdminAuthResponse> {
    try {
      const lockoutMessage = this.getLockoutMessage(email);
      if (lockoutMessage) {
        return { user: null, error: lockoutMessage };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const attemptResult = this.recordFailedLogin(email);
        if (attemptResult.locked) {
          return {
            user: null,
            error: `Too many failed login attempts. Try again in ${attemptResult.minutesRemaining} minute${attemptResult.minutesRemaining > 1 ? 's' : ''}.`,
          };
        }

        const attemptsHint = attemptResult.attemptsRemaining > 0
          ? ` (${attemptResult.attemptsRemaining} attempt${attemptResult.attemptsRemaining > 1 ? 's' : ''} remaining before temporary lockout)`
          : '';

        return { user: null, error: `${error.message}${attemptsHint}` };
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
          this.recordFailedLogin(email);
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

        this.clearFailedLogin(email);

        return { user: adminUser, error: null };
      }

      const adminUser: AdminUser = {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.name,
        role: adminProfile.role,
        created_at: adminProfile.created_at,
      };

      this.clearFailedLogin(email);

      return { user: adminUser, error: null };
    } catch (err) {
      this.recordFailedLogin(email);
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
