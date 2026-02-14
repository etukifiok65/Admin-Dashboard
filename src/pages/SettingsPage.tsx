import React, { useEffect, useState } from 'react';
import type { AdminUserSettings, PlatformConfiguration, ServiceTypeConfig, AppointmentStatusConfig } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';

export const SettingsPage: React.FC = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUserSettings[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfiguration | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
  const [appointmentStatuses, setAppointmentStatuses] = useState<AppointmentStatusConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'platform' | 'services' | 'statuses'>('admin');
  const [editingConfig, setEditingConfig] = useState(false);
  const [configValues, setConfigValues] = useState<PlatformConfiguration | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [admins, config, types, statuses] = await Promise.all([
          adminDashboardService.getAdminUsers(),
          adminDashboardService.getPlatformConfig(),
          adminDashboardService.getServiceTypes(),
          adminDashboardService.getAppointmentStatuses(),
        ]);

        if (admins) setAdminUsers(admins);
        if (config) {
          setPlatformConfig(config);
          setConfigValues(config);
        }
        if (types) setServiceTypes(types);
        if (statuses) setAppointmentStatuses(statuses);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load settings';
        console.error('Settings error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveConfig = async () => {
    if (!configValues) return;
    try {
      await adminDashboardService.updatePlatformConfig(configValues);
      setPlatformConfig(configValues);
      setEditingConfig(false);
    } catch (err) {
      setError('Failed to save configuration');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
            <p className="text-sm text-slate-500">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">Platform configuration and administration</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {[
            { id: 'admin', label: 'Admin Management' },
            { id: 'services', label: 'Service Types' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-semibold text-sm transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Admin Management Tab */}
        {activeTab === 'admin' && (
          <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Admin Users</h2>
              <button className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition">
                + Add Admin
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Created</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUsers.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{admin.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                          {admin.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          admin.is_active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-sm text-brand-600 hover:text-brand-700 font-semibold">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Types Tab */}
        {activeTab === 'services' && (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Service Types</h2>
              <button className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition">
                + Add Service Type
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {serviceTypes.map((service) => (
                <div key={service.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{service.name}</h3>
                      <p className="text-sm text-slate-500">{service.description}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      service.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm text-brand-600 hover:text-brand-700 font-semibold">Edit</button>
                    <button className="text-sm text-red-600 hover:text-red-700 font-semibold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
