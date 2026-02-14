import React, { useEffect, useMemo, useState } from 'react';
import type { Patient, PatientDetails, PaginationOptions } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';

const ITEMS_PER_PAGE = 10;

export const UsersPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        const response = await adminDashboardService.getPatients(options, {
          search,
          status: statusFilter,
          sort: sortOrder,
        });

        if (response) {
          setPatients(response.data);
          setTotal(response.total);
          if (!selectedPatientId && response.data.length > 0) {
            setSelectedPatientId(response.data[0].id);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load patients';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [page, search, statusFilter, sortOrder]);

  useEffect(() => {
    const fetchPatientDetail = async () => {
      if (!selectedPatientId) {
        setSelectedPatient(null);
        return;
      }

      setIsDetailLoading(true);
      const patient = await adminDashboardService.getPatientDetails(selectedPatientId);
      setSelectedPatient(patient);
      setIsDetailLoading(false);
    };

    fetchPatientDetail();
  }, [selectedPatientId]);

  const totalPages = useMemo(() => Math.ceil(total / ITEMS_PER_PAGE), [total]);

  const statusBadge = (status?: Patient['verification_status']) => {
    if (status === 'approved') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (status === 'rejected') {
      return 'bg-rose-100 text-rose-700';
    }
    return 'bg-amber-100 text-amber-700';
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    const headers = ['Patient ID', 'Name', 'Email', 'Phone', 'Status', 'Joined'];

    const rows = patients.map((patient) => [
      patient.id,
      patient.name,
      patient.email || '',
      patient.phone_number || '',
      patient.verification_status,
      new Date(patient.created_at).toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patients-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleUpdateStatus = async (
    patientId: string,
    status: 'approved' | 'rejected'
  ) => {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.updatePatientStatus(patientId, status);
      if (!updated) {
        throw new Error('Unable to update status');
      }

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId
            ? { ...patient, verification_status: updated.verification_status }
            : patient
        )
      );

      if (selectedPatient && selectedPatient.id === patientId) {
        setSelectedPatient({
          ...selectedPatient,
          verification_status: updated.verification_status,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setActionError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSuspendPatient = async (patientId: string) => {
    const confirmed = confirm('Are you sure you want to suspend this patient account? They will not be able to book or access appointments.');
    if (!confirmed) return;

    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.suspendPatientAccount(patientId);
      if (!updated) {
        throw new Error('Unable to suspend patient account');
      }

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId
            ? { ...patient, is_active: updated.is_active }
            : patient
        )
      );

      if (selectedPatient && selectedPatient.id === patientId) {
        setSelectedPatient({
          ...selectedPatient,
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

  const handleReactivatePatient = async (patientId: string) => {
    const confirmed = confirm('Are you sure you want to reactivate this patient account?');
    if (!confirmed) return;

    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const updated = await adminDashboardService.reactivatePatientAccount(patientId);
      if (!updated) {
        throw new Error('Unable to reactivate patient account');
      }

      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId
            ? { ...patient, is_active: updated.is_active }
            : patient
        )
      );

      if (selectedPatient && selectedPatient.id === patientId) {
        setSelectedPatient({
          ...selectedPatient,
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
          <h1 className="text-3xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-2 text-sm text-slate-500">
            Search, filter, and review patient profiles from one place.
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
                    placeholder="Search patients by name or phone..."
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
                    setSelectedPatientId(null);
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
                  <p className="text-sm text-slate-500">Loading patients...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No patients found</p>
                  <p className="mt-2 text-xs text-slate-500">Try adjusting your filters.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Patient</th>
                          <th className="px-6 py-3 text-left">Phone</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patients.map((patient) => (
                          <tr
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`cursor-pointer transition ${
                              selectedPatientId === patient.id 
                                ? 'border-l-4 border-l-brand-600 bg-brand-50 shadow-sm' 
                                : 'border-l-4 border-l-transparent hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {selectedPatientId === patient.id && (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">
                                    ✓
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                                  <p className="text-xs text-slate-500">{patient.email || 'Email not available'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{patient.phone_number}</td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                                  patient.verification_status
                                )}`}
                              >
                                {patient.verification_status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-slate-600">
                                  {new Date(patient.created_at).toLocaleDateString()}
                                </span>
                                {patient.verification_status === 'pending' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleUpdateStatus(patient.id, 'approved');
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
                                        handleUpdateStatus(patient.id, 'rejected');
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
              <h2 className="text-lg font-semibold text-slate-900">Patient Details</h2>
              {selectedPatient && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
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
                <p className="text-sm text-slate-500">Loading profile...</p>
              </div>
            ) : selectedPatient ? (
              <div className="mt-6 space-y-6 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Profile</p>
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
                  <p className="text-xs font-semibold uppercase text-slate-400">Profile Health</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span>Verification status</span>
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

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Addresses</p>
                    <div className="mt-2 space-y-3">
                      {(selectedPatient.patient_addresses || []).length === 0 ? (
                        <p className="text-xs text-slate-500">No addresses available</p>
                      ) : (
                        selectedPatient.patient_addresses?.map((address) => (
                          <div key={address.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {address.title || 'Home Address'}
                              {address.is_default && (
                                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {address.address_line_1}, {address.city}, {address.state}, {address.country}
                            </p>
                            {address.landmark && (
                              <p className="mt-1 text-xs text-slate-400">Landmark: {address.landmark}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Emergency Contacts</p>
                    <div className="mt-2 space-y-3">
                      {(selectedPatient.emergency_contacts || []).length === 0 ? (
                        <p className="text-xs text-slate-500">No emergency contacts available</p>
                      ) : (
                        selectedPatient.emergency_contacts?.map((contact) => (
                          <div key={contact.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {contact.name}
                              {contact.is_primary && (
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  Primary
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {contact.relationship} • {contact.phone_number}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Medical Info</p>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                      {selectedPatient.medical_info ? (
                        <div className="space-y-3 text-xs text-slate-600">
                          <div>
                            <p className="font-semibold text-slate-800">Allergies</p>
                            <p>{selectedPatient.medical_info.allergies?.join(', ') || 'None reported'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">Conditions</p>
                            <p>{selectedPatient.medical_info.conditions?.join(', ') || 'None reported'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">Medications</p>
                            <p>{selectedPatient.medical_info.medications?.join(', ') || 'None reported'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">Surgeries</p>
                            <p>{selectedPatient.medical_info.surgeries?.join(', ') || 'None reported'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No medical information available</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedPatient.verification_status === 'pending' && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPatient.id, 'approved')}
                      disabled={isUpdatingStatus}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      Approve Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedPatient.id, 'rejected')}
                      disabled={isUpdatingStatus}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Reject Patient
                    </button>
                  </div>
                )}

                {/* Account Suspension Actions */}
                {selectedPatient.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleSuspendPatient(selectedPatient.id)}
                    disabled={isUpdatingStatus}
                    className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                  >
                    🔒 Suspend Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReactivatePatient(selectedPatient.id)}
                    disabled={isUpdatingStatus}
                    className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-60"
                  >
                    🔓 Reactivate Account
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center">
                <p className="text-sm font-semibold text-slate-800">Select a patient</p>
                <p className="mt-2 text-xs text-slate-500">Choose a patient to view their profile details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
