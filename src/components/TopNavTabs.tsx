import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TabItem {
  label: string;
  path: string;
}

const tabs: TabItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Patients', path: '/users' },
  { label: 'Providers', path: '/providers' },
  { label: 'Verifications', path: '/verifications' },
  { label: 'Appointments', path: '/appointments' },
  { label: 'Financial', path: '/financial' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Support Messages', path: '/support-messages' },
  { label: 'Settings', path: '/settings' },
];

export const TopNavTabs: React.FC = () => {
  const location = useLocation();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-2 py-4 text-sm font-semibold transition ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
