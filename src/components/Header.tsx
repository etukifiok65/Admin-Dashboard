import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@hooks/useAdminAuth';

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

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1 text-right">
            <p className="text-xs font-semibold text-slate-900">
              {user?.name || '\u00A0'}
            </p>
            <span className="inline-flex h-fit w-fit rounded-full border px-2 py-0.5 text-xs font-semibold capitalize bg-blue-50 border-blue-200 text-blue-700">
              {user?.role.replace('_', ' ') || '\u00A0'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50"
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
