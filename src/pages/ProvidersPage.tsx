import React, { useEffect, useMemo, useState } from 'react';
import type { PaginationOptions, Provider, ProviderDetails } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';

const ITEMS_PER_PAGE = 10;

const statusLabelMap: Record<string, string> = {
  pending: 'Pending Review',
  document_pending: 'Documents Needed',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

const pendingStatuses: Provider['account_status'][] = [
  'pending',
  'document_pending',
  'pending_approval',
];

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'document_pending' | 'pending_approval'
  >('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        const response = await adminDashboardService.getProviders(options, {
          search,
          status: statusFilter,
          sort: sortOrder,
        });

        if (response) {
          setProviders(response.data);
          setTotal(response.total);
          if (!selectedProviderId && response.data.length > 0) {
            setSelectedProviderId(response.data[0].id);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load providers';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, [page, search, sortOrder, statusFilter]);

  useEffect(() => {
    const fetchProviderDetail = async () => {
      if (!selectedProviderId) {
        setSelectedProvider(null);
        return;
      }

      setIsDetailLoading(true);
      const provider = await adminDashboardService.getProviderDetails(selectedProviderId);
      setSelectedProvider(provider);
      setIsDetailLoading(false);
    };

    fetchProviderDetail();
  }, [selectedProviderId]);

  const totalPages = useMemo(() => Math.ceil(total / ITEMS_PER_PAGE), [total]);

  const statusBadge = (status?: Provider['account_status']) => {
    if (status === 'approved') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (status === 'rejected') {
      return 'bg-rose-100 text-rose-700';
    }
    if (status === 'pending_approval') {
      return 'bg-amber-100 text-amber-700';
    }
    if (status === 'document_pending') {
      return 'bg-slate-100 text-slate-600';
    }
    return 'bg-brand-50 text-brand-700';
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    const headers = [
      'Provider ID',
      'Name',
      'Email',
      'Phone',
      'Specialty',
      'License',
      'Status',
      'Verified',
      'Joined',
    ];

    const rows = providers.map((provider) => [
      provider.id,
      provider.name,
      provider.email || '',
      provider.phone_number || '',
      provider.specialty || '',
      provider.license_number || '',
      provider.account_status,
      provider.is_verified ? 'yes' : 'no',
      new Date(provider.created_at).toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `providers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleUpdateStatus = async (
    providerId: string,
    status: 'approved' | 'rejected'
  ) => {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.updateProviderStatus(providerId, status);
      if (!updated) {
        throw new Error('Unable to update status');
      }

      setProviders((prev) =>
        prev.map((provider) =>
          provider.id === providerId
            ? {
                ...provider,
                account_status: updated.account_status,
                is_verified: updated.is_verified,
              }
            : provider
        )
      );

      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider({
          ...selectedProvider,
          account_status: updated.account_status,
          is_verified: updated.is_verified,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setActionError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSuspendProvider = async (providerId: string) => {
    const confirmed = confirm('Are you sure you want to suspend this provider account? They will not be able to accept appointments.');
    if (!confirmed) return;

    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.suspendProviderAccount(providerId);
      if (!updated) {
        throw new Error('Unable to suspend provider account');
      }

      setProviders((prev) =>
        prev.map((provider) =>
          provider.id === providerId
            ? { ...provider, is_active: updated.is_active }
            : provider
        )
      );

      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider({
          ...selectedProvider,
          is_active: updated.is_active,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend account';
      setActionError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReactivateProvider = async (providerId: string) => {
    const confirmed = confirm('Are you sure you want to reactivate this provider account?');
    if (!confirmed) return;

    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.reactivateProviderAccount(providerId);
      if (!updated) {
        throw new Error('Unable to reactivate provider account');
      }

      setProviders((prev) =>
        prev.map((provider) =>
          provider.id === providerId
            ? { ...provider, is_active: updated.is_active }
            : provider
        )
      );

      if (selectedProvider && selectedProvider.id === providerId) {
        setSelectedProvider({
          ...selectedProvider,
          is_active: updated.is_active,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate account';
      setActionError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Providers</h1>
          <p className="mt-2 text-sm text-slate-500">
            Search, filter, and review provider profiles from one place.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {actionError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <input
                    type="text"
                    placeholder="Search providers by name, specialty, or license..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as typeof statusFilter);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="document_pending">Documents needed</option>
                  <option value="pending_approval">Pending approval</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
                >
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedProviderId(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 shadow-sm">
              {isLoading ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading providers...</p>
                </div>
              ) : providers.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No providers found</p>
                  <p className="mt-2 text-xs text-slate-500">Try adjusting your filters.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Provider</th>
                          <th className="px-6 py-3 text-left">Specialty</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {providers.map((provider) => (
                          <tr
                            key={provider.id}
                            onClick={() => setSelectedProviderId(provider.id)}
                            className={`cursor-pointer transition ${
                              selectedProviderId === provider.id 
                                ? 'border-l-4 border-l-brand-600 bg-brand-50 shadow-sm' 
                                : 'border-l-4 border-l-transparent hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {selectedProviderId === provider.id && (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">
                                    ✓
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{provider.name}</p>
                                  <p className="text-xs text-slate-500">
                                    {provider.phone_number || 'Phone not available'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{provider.specialty}</td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                                  provider.account_status
                                )}`}
                              >
                                {statusLabelMap[provider.account_status] || provider.account_status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-slate-600">
                                  {new Date(provider.created_at).toLocaleDateString()}
                                </span>
                                {pendingStatuses.includes(provider.account_status) && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleUpdateStatus(provider.id, 'approved');
                                      }}
                                      disabled={isUpdatingStatus}
                                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleUpdateStatus(provider.id, 'rejected');
                                      }}
                                      disabled={isUpdatingStatus}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-sm text-slate-600">
                    <p>
                      Showing{' '}
                      <span className="font-semibold text-slate-900">
                        {(page - 1) * ITEMS_PER_PAGE + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-slate-900">
                        {Math.min(page * ITEMS_PER_PAGE, total)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-900">{total}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500">
                        Page {page} of {totalPages || 1}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Provider Details</h2>
              {selectedProvider && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                    selectedProvider.account_status
                  )}`}
                >
                  {statusLabelMap[selectedProvider.account_status] || selectedProvider.account_status}
                </span>
              )}
            </div>

            {isDetailLoading ? (
              <div className="mt-8 text-center">
                <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                <p className="text-sm text-slate-500">Loading profile...</p>
              </div>
            ) : selectedProvider ? (
              <div className="mt-6 space-y-6 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Profile</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selectedProvider.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedProvider.email || 'Email not available'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Phone</p>
                    <p className="mt-1 text-slate-700">{selectedProvider.phone_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Specialty</p>
                    <p className="mt-1 text-slate-700">{selectedProvider.specialty || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">License</p>
                    <p className="mt-1 text-slate-700">{selectedProvider.license_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Experience</p>
                    <p className="mt-1 text-slate-700">{selectedProvider.experience || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Qualification</p>
                    <p className="mt-1 text-slate-700">{selectedProvider.qualification || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Address</p>
                    <p className="mt-1 text-slate-700">{selectedProvider.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Joined</p>
                    <p className="mt-1 text-slate-700">
                      {new Date(selectedProvider.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Profile Health</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span>Account status</span>
                    <span className="font-semibold text-slate-900">
                      {statusLabelMap[selectedProvider.account_status] || selectedProvider.account_status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span>Verified</span>
                    <span className="font-semibold text-slate-900">
                      {selectedProvider.is_verified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Capabilities</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Languages</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProvider.languages?.length
                          ? selectedProvider.languages.join(', ')
                          : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Specializations</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProvider.specializations?.length
                          ? selectedProvider.specializations.join(', ')
                          : 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {(selectedProvider.about || selectedProvider.bio) && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">About</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedProvider.about || selectedProvider.bio}
                    </p>
                  </div>
                )}

                {pendingStatuses.includes(selectedProvider.account_status) && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedProvider.id, 'approved')}
                      disabled={isUpdatingStatus}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      Approve Provider
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedProvider.id, 'rejected')}
                      disabled={isUpdatingStatus}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Reject Provider
                    </button>
                  </div>
                )}

                {/* Account Suspension Actions */}
                {selectedProvider.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleSuspendProvider(selectedProvider.id)}
                    disabled={isUpdatingStatus}
                    className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                  >
                    🔒 Suspend Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReactivateProvider(selectedProvider.id)}
                    disabled={isUpdatingStatus}
                    className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-60"
                  >
                    🔓 Reactivate Account
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center">
                <p className="text-sm font-semibold text-slate-800">Select a provider</p>
                <p className="mt-2 text-xs text-slate-500">Choose a provider to view their details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
