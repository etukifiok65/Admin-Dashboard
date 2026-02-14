import React from 'react';
import { Header } from './Header';
import { TopNavTabs } from './TopNavTabs';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <Header />
      <TopNavTabs />
      <main className="flex-1 overflow-y-scroll">
        <div className="mx-auto w-full max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-center text-xs text-slate-500">
            © {currentYear} HomiCareplus Technologies. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
