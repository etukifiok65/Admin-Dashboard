import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@hooks/useAdminAuth';
import { canAccessPage } from '@utils/permissions';
import type { PagePath } from '@utils/permissions';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredPage: PagePath;
}

/**
 * RoleBasedRoute provides role-based access control
 * Only users with the appropriate role can access the protected page
 */
export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  requiredPage 
}) => {
  const { user, isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPage(user, requiredPage)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-slate-600">
            Your role ({user?.role.replace('_', ' ')}) doesn't have access to this page.
          </p>
          <a 
            href="/dashboard"
            className="inline-block mt-4 rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
