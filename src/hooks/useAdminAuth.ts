import { useState, useEffect, useCallback } from 'react';
import type { AdminUser } from '@app-types/index';
import { adminAuthService } from '@services/adminAuth.service';

interface UseAdminAuthReturn {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  clearError: () => void;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const currentUser = await adminAuthService.getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const response = await adminAuthService.login(email, password);

    if (response.error) {
      setError(response.error);
      setIsLoading(false);
      return false;
    }

    setUser(response.user);
    setIsLoading(false);
    return true;
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const response = await adminAuthService.logout();

    if (response.error) {
      setError(response.error);
      setIsLoading(false);
      return false;
    }

    setUser(null);
    setIsLoading(false);
    return true;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
};
