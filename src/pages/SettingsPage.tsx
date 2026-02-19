import React, { useEffect, useState } from 'react';
import type { AdminUserSettings, ServiceTypeConfig, AuditLog } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';
import AddAdminModal from '@components/AddAdminModal';
import EditAdminModal from '@components/EditAdminModal';
import EditServiceModal from '@components/EditServiceModal';

export const SettingsPage: React.FC = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUserSettings[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'platform' | 'services' | 'statuses' | 'audit'>('admin');
  const [auditFilter, setAuditFilter] = useState<'all' | 'admin_users' | 'patients' | 'providers'>('all');

  // Modal states
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUserSettings | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceTypeConfig | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [admins, types, logs] = await Promise.all([
          adminDashboardService.getAdminUsers(),
          adminDashboardService.getServiceTypes(),
          adminDashboardService.getAdminAuditLogs(100, auditFilter === 'all' ? undefined : auditFilter),
        ]);

        if (admins) setAdminUsers(admins);
        if (types) setServiceTypes(types);
        if (logs) setAuditLogs(logs);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load settings';
        console.error('Settings error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [auditFilter]);

  const refreshData = async () => {
    try {
      const [admins, types, logs] = await Promise.all([
        adminDashboardService.getAdminUsers(),
        adminDashboardService.getServiceTypes(),
        adminDashboardService.getAdminAuditLogs(100, auditFilter === 'all' ? undefined : auditFilter),
      ]);
      if (admins) setAdminUsers(admins);
      if (types) setServiceTypes(types);
      if (logs) setAuditLogs(logs);
    } catch (err) {
      setError('Failed to refresh data');
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
            <p className="mt-2 text-sm text-slate-500">Platform configuration and administration</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
            <p className="text-xs font-semibold text-amber-900">
              🔒 Super Admin Only
            </p>
          </div>
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
            { id: 'audit', label: 'Audit Trail' },
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
              <button 
                onClick={() => setIsAddAdminModalOpen(true)}
                className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition"
              >
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
                        <button 
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setIsEditAdminModalOpen(true);
                          }}
                          className="text-sm text-brand-600 hover:text-brand-700 font-semibold"
                        >
                          Edit
                        </button>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {serviceTypes.map((service) => (
                <div key={service.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{service.name}</h3>
                      <p className="text-sm text-slate-500 mb-1">{service.description}</p>
                      <p className="text-xs text-slate-600">
                        Price Range: ₦{service.minRate.toLocaleString()} - ₦{service.maxRate.toLocaleString()} • {service.duration}
                      </p>
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
                    <button 
                      onClick={() => {
                        setSelectedService(service);
                        setIsEditServiceModalOpen(true);
                      }}
                      className="text-sm text-brand-600 hover:text-brand-700 font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">System Activity Audit Trail</h2>
                <p className="text-sm text-slate-500 mt-1">Track all system activities and changes</p>
              </div>
              <button 
                onClick={refreshData}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
              {[
                { id: 'all', label: 'All Activities' },
                { id: 'admin_users', label: 'Admin Users' },
                { id: 'patients', label: 'Patients' },
                { id: 'providers', label: 'Providers' },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setAuditFilter(filter.id as any)}
                  className={`px-4 py-2 font-semibold text-sm transition ${
                    auditFilter === filter.id
                      ? 'border-b-2 border-brand-600 text-brand-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No audit logs found</p>
                <p className="text-sm text-slate-400 mt-1">
                  {auditFilter === 'all' ? 'Activity will appear here once changes are made' : `No ${auditFilter.replace('_', ' ')} activities recorded yet`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => {
                  const getEntityDescription = () => {
                    if (log.table_name === 'admin_users') {
                      if (log.operation === 'INSERT') return 'Created a new admin user';
                      if (log.operation === 'UPDATE') return 'Updated admin user settings';
                      if (log.operation === 'DELETE') return 'Deleted an admin user';
                    }
                    if (log.table_name === 'patients') {
                      if (log.operation === 'INSERT') return 'Registered a new patient';
                      if (log.operation === 'UPDATE') return 'Updated patient information';
                      if (log.operation === 'DELETE') return 'Deleted a patient';
                    }
                    if (log.table_name === 'providers') {
                      if (log.operation === 'INSERT') return 'Registered a new provider';
                      if (log.operation === 'UPDATE') return 'Updated provider information';
                      if (log.operation === 'DELETE') return 'Deleted a provider';
                    }
                    return `${log.operation} on ${log.table_name}`;
                  };

                  return (
                    <div 
                      key={log.id} 
                      className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              log.operation === 'INSERT'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : log.operation === 'UPDATE'
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                            }`}>
                              {log.operation}
                            </span>
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize">
                              {log.table_name.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {log.admin_user?.name || 'System'}
                            </span>
                            {log.admin_user && (
                              <span className="text-xs text-slate-500">
                                ({log.admin_user.email})
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-600 mb-2">
                            {getEntityDescription()}
                          </p>

                          {log.new_data && (log.operation === 'INSERT' || log.operation === 'UPDATE') && (
                            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 mt-2">
                              {log.operation === 'INSERT' && (
                                <>
                                  <strong>New Record:</strong> {log.new_data.name || log.new_data.email || 'Record created'}
                                  {log.new_data.email && ` (${log.new_data.email})`}
                                  {log.new_data.role && ` - Role: ${log.new_data.role}`}
                                  {log.new_data.verification_status && ` - Status: ${log.new_data.verification_status}`}
                                </>
                              )}
                              {log.operation === 'UPDATE' && log.old_data && (
                                <div className="space-y-1">
                                  {Object.keys(log.new_data).filter(key => 
                                    log.old_data![key] !== log.new_data![key] && 
                                    !['updated_at', 'last_login_at', 'id', 'auth_id', 'created_at'].includes(key)
                                  ).map(key => (
                                    <div key={key}>
                                      <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong>{' '}
                                      <span className="line-through text-red-600">{String(log.old_data![key] ?? 'null')}</span>
                                      {' → '}
                                      <span className="text-emerald-600">{String(log.new_data![key] ?? 'null')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {log.old_data && log.operation === 'DELETE' && (
                            <div className="text-xs text-slate-500 bg-red-50 rounded p-2 mt-2">
                              <strong>Deleted:</strong> {log.old_data.name || log.old_data.email || 'Record'}
                              {log.old_data.email && ` (${log.old_data.email})`}
                            </div>
                          )}
                        </div>

                        <div className="text-right text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onSuccess={refreshData}
      />

      <EditAdminModal
        isOpen={isEditAdminModalOpen}
        onClose={() => {
          setIsEditAdminModalOpen(false);
          setSelectedAdmin(null);
        }}
        onSuccess={refreshData}
        admin={selectedAdmin}
      />

      <EditServiceModal
        isOpen={isEditServiceModalOpen}
        onClose={() => {
          setIsEditServiceModalOpen(false);
          setSelectedService(null);
        }}
        onSuccess={refreshData}
        service={selectedService}
      />
    </DashboardLayout>
  );
};
