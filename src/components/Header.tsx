import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@hooks/useAdminAuth';

const getInitials = (name?: string) => {
  if (!name) {
    return 'AD';
  }

  const parts = name.trim().split(' ');
  const first = parts[0]?.[0] || 'A';
  const second = parts[1]?.[0] || 'D';
  return `${first}${second}`.toUpperCase();
};

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src="/HomiCare Logo.png"
            alt="HomiCare Plus"
            className="h-12 w-30"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm min-w-[240px]">
            <div className="flex-1 text-xs min-w-0">
              <p className="font-semibold text-slate-900 leading-tight truncate">
                {user?.name || '\u00A0'}
              </p>
              <p className="text-slate-500 truncate">
                {user?.email || '\u00A0'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
