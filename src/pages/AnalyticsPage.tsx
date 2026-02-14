import React, { useEffect, useState } from 'react';
import type { AnalyticsMetrics } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';
import { format } from 'date-fns';

type TrendType = 'daily' | 'weekly' | 'monthly';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendType, setTrendType] = useState<TrendType>('monthly');

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching analytics metrics...');
        const data = await adminDashboardService.getAnalyticsMetrics();
        console.log('Analytics data received:', data);
        if (!data) {
          setError('Failed to load analytics - no data returned');
        } else {
          setMetrics(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load analytics';
        console.error('Analytics error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
            <p className="text-sm text-slate-500">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-2 text-sm text-slate-500">Platform metrics and performance insights</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {metrics && (
          <div className="space-y-8">
            {/* Appointments by Service Type */}
            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Appointments by Service Type</h2>
              {metrics.appointmentsByService.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No appointment data available</p>
              ) : (
                <div className="space-y-6">
                  {metrics.appointmentsByService.map((service) => (
                    <div key={service.serviceType}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700">{service.serviceType}</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 border border-brand-200">
                          {service.count} appointments • {service.percentage}%
                        </span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-8 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 flex items-center justify-end pr-3 transition-all duration-700"
                          style={{ width: `${service.percentage}%` }}
                        >
                          {service.percentage > 10 && (
                            <span className="text-xs font-bold text-white drop-shadow">{service.percentage}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Locations */}
            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Top Locations</h2>
              {metrics.topLocations.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No location data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3 text-left">Location</th>
                        <th className="px-6 py-3 text-left">Appointments</th>
                        <th className="px-6 py-3 text-left">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.topLocations.map((location, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{location.location}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{location.appointmentCount}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            ₦{location.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Earning Providers */}
            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Top Earning Providers</h2>
              {metrics.topEarningProviders.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No provider earnings data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3 text-left">Provider</th>
                        <th className="px-6 py-3 text-left">Appointments</th>
                        <th className="px-6 py-3 text-left">Total Earnings</th>
                        <th className="px-6 py-3 text-left">Average per Appointment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.topEarningProviders.map((provider) => (
                        <tr key={provider.providerId} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{provider.providerName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{provider.appointmentCount}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            ₦{provider.totalEarnings.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            ₦{provider.averageEarnings.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Providers by Rating */}
            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Top Providers by Rating</h2>
              {metrics.topProvidersByRating.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No provider rating data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3 text-left">Rank</th>
                        <th className="px-6 py-3 text-left">Provider</th>
                        <th className="px-6 py-3 text-left">Average Rating</th>
                        <th className="px-6 py-3 text-left">Total Reviews</th>
                        <th className="px-6 py-3 text-left">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.topProvidersByRating.map((provider, index) => (
                        <tr key={provider.providerId} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">#{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">{provider.providerName}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              ⭐ {provider.averageRating.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{provider.totalReviews} reviews</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={star <= Math.round(provider.averageRating) ? 'text-amber-400' : 'text-slate-300'}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Appointment Trends */}
            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Appointment Trends</h2>
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTrendType(type)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        trendType === type
                          ? 'bg-brand-100 text-brand-700 border border-brand-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-150'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {metrics.appointmentTrends[trendType].length === 0 ? (
                <p className="text-center py-8 text-slate-500">No trend data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Appointments</th>
                        <th className="px-6 py-3 text-left">Revenue</th>
                        <th className="px-6 py-3 text-left">Visual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.appointmentTrends[trendType].map((trend) => {
                        const maxRevenue = Math.max(
                          ...metrics.appointmentTrends[trendType].map(t => t.revenue),
                          1
                        );
                        const barWidth = (trend.revenue / maxRevenue) * 100;

                        return (
                          <tr key={trend.date} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {format(new Date(trend.date), trendType === 'daily' ? 'MMM dd' : trendType === 'weekly' ? 'MMM dd' : 'MMM yyyy')}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{trend.appointments}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                              ₦{trend.revenue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-24 h-6 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                                  style={{ width: `${barWidth}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
