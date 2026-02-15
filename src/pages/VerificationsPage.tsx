import React, { useEffect, useMemo, useState } from 'react';
import type {
  PaginationOptions,
  Patient,
  PatientDetails,
  Provider,
  ProviderDetails,
} from '@app-types/index';
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

export const VerificationsPage: React.FC = () => {
  const [activeQueue, setActiveQueue] = useState<'providers' | 'patients'>('providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(new Set());
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetails | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewingDocumentId, setPreviewingDocumentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('image');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchQueue = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        if (activeQueue === 'providers') {
          const response = await adminDashboardService.getPendingProviders(options, {
            search,
            status: 'all',
            sort: sortOrder,
          });

          if (response) {
            setProviders(response.data);
            setTotal(response.total);
            setSelectedProviderIds(new Set());
            if (!selectedProviderId && response.data.length > 0) {
              setSelectedProviderId(response.data[0].id);
            }
          }
        } else {
          const response = await adminDashboardService.getPatients(options, {
            search,
            status: 'pending', // Verifications page should only show pending patients
            sort: sortOrder,
          });

          if (response) {
            setPatients(response.data);
            setTotal(response.total);
            setSelectedPatientIds(new Set());
            if (!selectedPatientId && response.data.length > 0) {
              setSelectedPatientId(response.data[0].id);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load verification queue';
        console.error('Verifications page error:', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();
  }, [
    activeQueue,
    page,
    refreshKey,
    search,
    sortOrder,
  ]);

  useEffect(() => {
    const fetchDetails = async () => {
      setActionError(null);
      try {
        if (activeQueue === 'providers') {
          if (!selectedProviderId) {
            setSelectedProvider(null);
            setIsDetailLoading(false);
            return;
          }

          setIsDetailLoading(true);
          const provider = await adminDashboardService.getProviderDetails(selectedProviderId);
          setSelectedProvider(provider);
          return;
        }

        if (!selectedPatientId) {
          setSelectedPatient(null);
          setIsDetailLoading(false);
          return;
        }

        setIsDetailLoading(true);
        const patient = await adminDashboardService.getPatientDetails(selectedPatientId);
        setSelectedPatient(patient);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load details';
        setActionError(message);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchDetails();
  }, [activeQueue, selectedProviderId, selectedPatientId]);

  const totalPages = useMemo(() => Math.ceil(total / ITEMS_PER_PAGE), [total]);

  const pageProviderIds = useMemo(
    () => providers.map((provider) => provider.id),
    [providers]
  );

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-rose-100 text-rose-700';
      case 'pending_approval':
        return 'bg-amber-100 text-amber-700';
      case 'document_pending':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-brand-50 text-brand-700';
    }
  };

  const patientStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const handleUpdateProviderStatus = async (
    providerId: string,
    status: 'approved' | 'rejected'
  ) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.updateProviderStatus(providerId, status);
      if (!updated) {
        throw new Error('Unable to update provider status');
      }

      setProviders((prev) =>
        prev.map((provider) =>
          provider.id === providerId
            ? { ...provider, account_status: updated.account_status, is_verified: updated.is_verified }
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
      const message = err instanceof Error ? err.message : 'Failed to update provider';
      setActionError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdate = async (status: 'approved' | 'rejected') => {
    if (selectedProviderIds.size === 0) {
      return;
    }

    setIsUpdating(true);
    setActionError(null);
    try {
      const ids = Array.from(selectedProviderIds);
      await Promise.all(ids.map((id) => adminDashboardService.updateProviderStatus(id, status)));

      setProviders((prev) =>
        prev.map((provider) =>
          selectedProviderIds.has(provider.id)
            ? {
                ...provider,
                account_status: status,
                is_verified: status === 'approved',
              }
            : provider
        )
      );

      if (selectedProvider && selectedProviderIds.has(selectedProvider.id)) {
        setSelectedProvider({
          ...selectedProvider,
          account_status: status,
          is_verified: status === 'approved',
        });
      }

      setSelectedProviderIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update providers';
      setActionError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkPatientUpdate = async (status: 'approved' | 'rejected') => {
    if (selectedPatientIds.size === 0) {
      return;
    }

    setIsUpdating(true);
    setActionError(null);
    try {
      const ids = Array.from(selectedPatientIds);
      await Promise.all(ids.map((id) => adminDashboardService.updatePatientStatus(id, status)));

      setPatients((prev) =>
        prev.map((patient) =>
          selectedPatientIds.has(patient.id)
            ? { ...patient, verification_status: status }
            : patient
        )
      );

      if (selectedPatient && selectedPatientIds.has(selectedPatient.id)) {
        setSelectedPatient({ ...selectedPatient, verification_status: status });
      }

      setSelectedPatientIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update patients';
      setActionError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePatientStatus = async (
    patientId: string,
    status: 'approved' | 'rejected'
  ) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.updatePatientStatus(patientId, status);
      if (!updated) {
        throw new Error('Unable to update patient status');
      }

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId ? { ...patient, verification_status: status } : patient
        )
      );

      if (selectedPatient && selectedPatient.id === patientId) {
        setSelectedPatient({ ...selectedPatient, verification_status: status });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update patient';
      setActionError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDocumentStatus = async (
    documentId: string,
    status: 'approved' | 'rejected'
  ) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.updateProviderDocumentStatus(documentId, status);
      if (!updated) {
        throw new Error('Unable to update document');
      }

      if (selectedProvider) {
        setSelectedProvider({
          ...selectedProvider,
          provider_documents: selectedProvider.provider_documents?.map((doc) =>
            doc.id === documentId
              ? { ...doc, verification_status: updated.verification_status }
              : doc
          ),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update document';
      setActionError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreviewDocument = async (storagePath: string, documentId: string) => {
    setPreviewingDocumentId(documentId);
    setActionError(null);
    try {
      const url = await adminDashboardService.getProviderDocumentSignedUrl(storagePath);
      if (!url) {
        throw new Error('Unable to generate document preview');
      }

      const extension = storagePath.split('.').pop()?.toLowerCase() || '';
      const fileType = extension === 'pdf' ? 'pdf' : 'image';

      setPreviewUrl(url);
      setPreviewTitle(storagePath.split('/').pop() || 'Document Preview');
      setPreviewType(fileType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to preview document';
      setActionError(message);
    } finally {
      setPreviewingDocumentId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Pending Verifications</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review verification documents and approve or reject verification requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveQueue('providers');
              setPage(1);
              setSelectedProviderId(null);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeQueue === 'providers'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            Providers
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveQueue('patients');
              setPage(1);
              setSelectedPatientId(null);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeQueue === 'patients'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            Patients
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
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
                    placeholder={
                      activeQueue === 'providers'
                        ? 'Search by name, specialty, or license...'
                        : 'Search by name or phone...'
                    }
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                {activeQueue === 'providers' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkUpdate('approved')}
                      disabled={isUpdating || selectedProviderIds.size === 0}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      Approve selected
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkUpdate('rejected')}
                      disabled={isUpdating || selectedProviderIds.size === 0}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Reject selected
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkPatientUpdate('approved')}
                      disabled={isUpdating || selectedPatientIds.size === 0}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      Approve selected
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkPatientUpdate('rejected')}
                      disabled={isUpdating || selectedPatientIds.size === 0}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Reject selected
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedProviderId(null);
                    setSelectedPatientId(null);
                    setSelectedProviderIds(new Set());
                    setSelectedPatientIds(new Set());
                    setRefreshKey((value) => value + 1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 shadow-sm">
              {isLoading ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading verification queue...</p>
                </div>
              ) : activeQueue === 'providers' ? (
                providers.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm font-semibold text-slate-800">No pending providers</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {search
                        ? 'Try adjusting your search.'
                        : 'There are no providers awaiting verification.'}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Total: {total}</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                checked={
                                  pageProviderIds.length > 0 &&
                                  pageProviderIds.every((id) => selectedProviderIds.has(id))
                                }
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedProviderIds(new Set(pageProviderIds));
                                  } else {
                                    setSelectedProviderIds(new Set());
                                  }
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                              />
                            </th>
                            <th className="px-6 py-3 text-left">Provider</th>
                            <th className="px-6 py-3 text-left">Specialty</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-left">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {providers.map((provider) => (
                            <tr
                              key={provider.id}
                              onClick={() => setSelectedProviderId(provider.id)}
                              className={`cursor-pointer transition hover:bg-slate-50 ${
                                selectedProviderId === provider.id ? 'bg-brand-50/60' : ''
                              }`}
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedProviderIds.has(provider.id)}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    setSelectedProviderIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(provider.id)) {
                                        next.delete(provider.id);
                                      } else {
                                        next.add(provider.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-slate-900">{provider.name}</p>
                                <p className="text-xs text-slate-500">
                                  {provider.phone_number || 'Phone not available'}
                                </p>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{provider.specialty}</td>
                              <td className="px-6 py-4 text-sm">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                                    provider.account_status
                                  )}`}
                                >
                                  {statusLabelMap[provider.account_status] || provider.account_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {new Date(provider.created_at).toLocaleDateString()}
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
                )
              ) : patients.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No pending patients</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {search
                      ? 'Try adjusting your search.'
                      : 'There are no patients awaiting verification.'}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Total: {total}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={
                                patients.length > 0 &&
                                patients.every((patient) => selectedPatientIds.has(patient.id))
                              }
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedPatientIds(new Set(patients.map((p) => p.id)));
                                } else {
                                  setSelectedPatientIds(new Set());
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600"
                            />
                          </th>
                          <th className="px-6 py-3 text-left">Patient</th>
                          <th className="px-6 py-3 text-left">Phone</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patients.map((patient) => (
                          <tr
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`cursor-pointer transition hover:bg-slate-50 ${
                              selectedPatientId === patient.id ? 'bg-brand-50/60' : ''
                            }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedPatientIds.has(patient.id)}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  setSelectedPatientIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(patient.id)) {
                                      next.delete(patient.id);
                                    } else {
                                      next.add(patient.id);
                                    }
                                    return next;
                                  });
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                              <p className="text-xs text-slate-500">{patient.email || 'Email not available'}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {patient.phone_number || 'Phone not available'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${patientStatusBadge(
                                  patient.verification_status
                                )}`}
                              >
                                {patient.verification_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {new Date(patient.created_at).toLocaleDateString()}
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
            {activeQueue === 'providers' ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Provider Verification</h2>
                  {selectedProvider && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
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
                    <p className="text-sm text-slate-500">Loading provider...</p>
                  </div>
                ) : selectedProvider ? (
                  <div className="mt-6 space-y-6 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Provider</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedProvider.name}
                      </p>
                      <p className="text-sm text-slate-500">{selectedProvider.specialty}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Phone</p>
                        <p className="mt-1 text-slate-700">{selectedProvider.phone_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Address</p>
                        <p className="mt-1 text-slate-700">{selectedProvider.address || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">License</p>
                        <p className="mt-1 text-slate-700">{selectedProvider.license_number || 'N/A'}</p>
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
                        <p className="text-xs font-semibold uppercase text-slate-400">Joined</p>
                        <p className="mt-1 text-slate-700">
                          {new Date(selectedProvider.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-400">Identity</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Gender</span>
                          <span className="font-semibold text-slate-900">
                            {selectedProvider.gender || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Date of birth</span>
                          <span className="font-semibold text-slate-900">
                            {selectedProvider.date_of_birth
                              ? new Date(selectedProvider.date_of_birth).toLocaleDateString()
                              : 'Not provided'}
                          </span>
                        </div>
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

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-400">Document Review</p>
                      <div className="mt-3 space-y-3">
                        {(selectedProvider.provider_documents || []).length === 0 ? (
                          <p className="text-xs text-slate-500">No documents submitted yet.</p>
                        ) : (
                          selectedProvider.provider_documents?.map((doc) => (
                            <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {doc.document_type.replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-xs text-slate-500">{doc.storage_path}</p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                                    doc.verification_status
                                  )}`}
                                >
                                  {doc.verification_status}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewDocument(doc.storage_path, doc.id)}
                                  disabled={previewingDocumentId === doc.id}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
                                >
                                  {previewingDocumentId === doc.id ? 'Opening...' : 'View document'}
                                </button>
                                {doc.verification_status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDocumentStatus(doc.id, 'approved')}
                                      disabled={isUpdating}
                                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDocumentStatus(doc.id, 'rejected')}
                                      disabled={isUpdating}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
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

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateProviderStatus(selectedProvider.id, 'approved')}
                        disabled={isUpdating}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Approve Provider
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateProviderStatus(selectedProvider.id, 'rejected')}
                        disabled={isUpdating}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        Reject Provider
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">Select a provider</p>
                    <p className="mt-2 text-xs text-slate-500">Choose a provider to review documents.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Patient Verification</h2>
                  {selectedPatient && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${patientStatusBadge(
                        selectedPatient.verification_status
                      )}`}
                    >
                      {selectedPatient.verification_status}
                    </span>
                  )}
                </div>

                {isDetailLoading ? (
                  <div className="mt-8 text-center">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                    <p className="text-sm text-slate-500">Loading patient...</p>
                  </div>
                ) : selectedPatient ? (
                  <div className="mt-6 space-y-6 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Patient</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedPatient.name}
                      </p>
                      <p className="text-sm text-slate-500">{selectedPatient.email || 'Email not available'}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Phone</p>
                        <p className="mt-1 text-slate-700">{selectedPatient.phone_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Date of Birth</p>
                        <p className="mt-1 text-slate-700">
                          {selectedPatient.date_of_birth
                            ? new Date(selectedPatient.date_of_birth).toLocaleDateString()
                            : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Gender</p>
                        <p className="mt-1 text-slate-700">{selectedPatient.gender || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">Joined</p>
                        <p className="mt-1 text-slate-700">
                          {new Date(selectedPatient.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-400">Verification</p>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                        <span>Status</span>
                        <span className="font-semibold text-slate-900">
                          {selectedPatient.verification_status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                        <span>Last updated</span>
                        <span className="font-semibold text-slate-900">
                          {new Date(selectedPatient.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdatePatientStatus(selectedPatient.id, 'approved')}
                        disabled={isUpdating}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Approve Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePatientStatus(selectedPatient.id, 'rejected')}
                        disabled={isUpdating}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        Reject Patient
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">Select a patient</p>
                    <p className="mt-2 text-xs text-slate-500">Choose a patient to review verification.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6">
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{previewTitle}</p>
                <p className="text-xs text-slate-500">Secure preview</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-100">
              {previewType === 'pdf' ? (
                <iframe title="Document preview" src={previewUrl} className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center overflow-auto">
                  <img src={previewUrl} alt={previewTitle} className="max-h-full max-w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
