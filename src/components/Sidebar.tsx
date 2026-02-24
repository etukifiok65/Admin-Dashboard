import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@hooks/useAdminAuth';
import { canAccessPage } from '@utils/permissions';
import type { PagePath } from '@utils/permissions';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  requiredPage: PagePath;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊', requiredPage: 'dashboard' },
  { label: 'Users', path: '/users', icon: '👥', requiredPage: 'users' },
  { label: 'Providers', path: '/providers', icon: '⚕️', requiredPage: 'providers' },
  { label: 'Appointments', path: '/appointments', icon: '📅', requiredPage: 'appointments' },
  { label: 'Verifications', path: '/verifications', icon: '✅', requiredPage: 'verifications' },
  { label: 'Financial', path: '/financial', icon: '💰', requiredPage: 'financial' },
  { label: 'Analytics', path: '/analytics', icon: '📈', requiredPage: 'analytics' },
  { label: 'Support', path: '/support-messages', icon: '💬', requiredPage: 'support-messages' },
  { label: 'Settings', path: '/settings', icon: '⚙️', requiredPage: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { user } = useAdminAuth();

  // Filter nav items based on user's role
  const visibleNavItems = navItems.filter(item => 
    canAccessPage(user, item.requiredPage)
  );

  return (
    <>
      {/* Mobile overlay */}
      {!isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static left-0 top-0 h-screen bg-gray-900 text-white w-64 overflow-y-auto transition-transform duration-300 z-50 ${
          !isOpen ? '-translate-x-full lg:translate-x-0' : ''
        }`}
      >
        <nav className="p-6 space-y-2">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
