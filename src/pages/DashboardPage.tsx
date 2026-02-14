import React, { useEffect, useState } from 'react';
import type { DashboardMetrics } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  tone: 'brand' | 'slate' | 'emerald' | 'amber';
  helper?: string;
}> = ({ title, value, icon, tone, helper }) => {
  const toneClasses = {
    brand: 'from-brand-50 to-white border-brand-200 text-brand-700',
    slate: 'from-slate-50 to-white border-slate-200 text-slate-600',
    emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg border bg-gradient-to-br ${toneClasses[tone]}`}
        >
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading dashboard metrics...');
        const data = await adminDashboardService.getDashboardMetrics();
        console.log('Dashboard metrics received:', data);
        if (data) {
          setMetrics(data);
          console.log('Metrics state updated successfully');
        } else {
          console.error('getDashboardMetrics returned null');
          setError('Failed to load dashboard metrics');
        }
      } catch (err) {
        setError('An error occurred while loading metrics');
        console.error('Error loading dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Platform overview and operational highlights for today.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {metrics && (
          <>
            <div className="rounded-lg border border-slate-200 bg-white/70 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Platform Snapshot</h2>
                  <p className="mt-1 text-sm text-slate-500">Key health indicators for the platform.</p>
                </div>
                <div className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  Live metrics
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Total Users"
                  value={metrics.totalUsers}
                  icon="👥"
                  tone="brand"
                  helper="Patients + providers"
                />
                <StatCard
                  title="Active Patients"
                  value={metrics.activePatients}
                  icon="🏥"
                  tone="emerald"
                  helper="Last 30 days"
                />
                <StatCard
                  title="Verified Providers"
                  value={metrics.verifiedProviders}
                  icon="⚕️"
                  tone="slate"
                  helper="Approved profiles"
                />
                <StatCard
                  title="Pending Verification"
                  value={metrics.pendingProviders}
                  icon="⏳"
                  tone="amber"
                  helper="Awaiting review"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Revenue</h2>
                <p className="mt-1 text-sm text-slate-500">Financial performance overview.</p>
                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <StatCard
                    title="Today's Revenue"
                    value={`₦${metrics.todayRevenue.toLocaleString()}`}
                    icon="💵"
                    tone="emerald"
                    helper="Completed transactions"
                  />
                  <StatCard
                    title="This Month's Revenue"
                    value={`₦${metrics.thisMonthRevenue.toLocaleString()}`}
                    icon="📊"
                    tone="brand"
                    helper="Monthly total"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/70 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Today’s operational workload.</p>
                <div className="mt-6">
                  <StatCard
                    title="Today's Appointments"
                    value={metrics.todayAppointments}
                    icon="📅"
                    tone="slate"
                    helper="Scheduled for today"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg border border-slate-200 bg-white/80 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-500">Jump straight to the critical workflows.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <a
                  href="/verifications"
                  className="group rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-slate-900">Review Pending Verifications</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {metrics.pendingProviders} providers and {metrics.pendingPatients} patients waiting for approval
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-700">
                    Go to verifications →
                  </span>
                </a>
                <a
                  href="/financial"
                  className="group rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-slate-900">Manage Payouts</p>
                  <p className="mt-2 text-xs text-slate-500">View withdrawal requests</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-700">
                    Go to financial →
                  </span>
                </a>
                <a
                  href="/appointments"
                  className="group rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-slate-900">View Appointments</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {metrics.todayAppointments} scheduled today
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-700">
                    Go to appointments →
                  </span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
