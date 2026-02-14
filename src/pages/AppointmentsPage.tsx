import React, { useEffect, useState } from 'react';
import type { AppointmentDetails, PaginationOptions } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';
import ConfirmModal from '@components/ConfirmModal';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

const statusLabelMap: Record<string, string> = {
  Requested: 'Requested',
  Scheduled: 'Scheduled',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

const statusColorMap: Record<string, string> = {
  Requested: 'bg-amber-100 text-amber-800 border-amber-200',
  Scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
};

const urgencyColorMap: Record<string, string> = {
  normal: 'bg-slate-100 text-slate-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentDetails[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'date'>('date');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'Requested' | 'Scheduled' | 'Completed' | 'Cancelled' | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        const response = await adminDashboardService.getAppointments(options, {
          search,
          status: statusFilter,
          sort: sortOrder,
        });

        if (response) {
          setAppointments(response.data);
          setTotal(response.total);
          if (!selectedAppointmentId && response.data.length > 0) {
            setSelectedAppointmentId(response.data[0].id);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load appointments';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [page, search, statusFilter, sortOrder]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedAppointmentId) {
        setSelectedAppointment(null);
        return;
      }

      setIsDetailLoading(true);
      setActionError(null);

      try {
        const details = await adminDashboardService.getAppointmentDetails(selectedAppointmentId);
        setSelectedAppointment(details);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load appointment details';
        setActionError(message);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchDetails();
  }, [selectedAppointmentId]);

  const handleUpdateStatus = async (status: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled') => {
    if (!selectedAppointmentId) return;

    // Open confirmation modal
    setPendingStatus(status);
    setIsConfirmOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedAppointmentId || !pendingStatus) return;

    setIsUpdatingStatus(true);
    setActionError(null);

    // Store original status for rollback in case of error
    const originalApt = appointments.find(apt => apt.id === selectedAppointmentId);
    const originalStatus = originalApt?.status;

    try {
      await adminDashboardService.updateAppointmentStatus(selectedAppointmentId, pendingStatus);
      
      // Only update UI on success
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === selectedAppointmentId ? { ...apt, status: pendingStatus } : apt
        )
      );
      
      if (selectedAppointment) {
        setSelectedAppointment({ ...selectedAppointment, status: pendingStatus });
      }

      setIsConfirmOpen(false);
      setPendingStatus(null);
    } catch (err) {
      // Revert UI changes on error
      if (originalStatus && selectedAppointmentId) {
        setAppointments(prev =>
          prev.map(apt =>
            apt.id === selectedAppointmentId ? { ...apt, status: originalStatus } : apt
          )
        );
        if (selectedAppointment) {
          setSelectedAppointment({ ...selectedAppointment, status: originalStatus });
        }
      }

      const message = err instanceof Error ? err.message : 'Failed to update status';
      setActionError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelStatusUpdate = () => {
    setIsConfirmOpen(false);
    setPendingStatus(null);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Appointments</h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor and manage all appointments
          </p>
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
                    placeholder="Search appointments..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as typeof statusFilter);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="all">All statuses</option>
                  <option value="Requested">Requested</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="date">By appointment date</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 shadow-sm">
              {isLoading ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading appointments...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No appointments found</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {search ? 'Try adjusting your search.' : 'No appointments available.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-left">Patient</th>
                          <th className="px-6 py-3 text-left">Provider</th>
                          <th className="px-6 py-3 text-left">Service</th>
                          <th className="px-6 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {appointments.map((appointment) => (
                          <tr
                            key={appointment.id}
                            onClick={() => setSelectedAppointmentId(appointment.id)}
                            className={`cursor-pointer transition ${
                              selectedAppointmentId === appointment.id 
                                ? 'border-l-4 border-l-brand-600 bg-brand-50 shadow-sm' 
                                : 'border-l-4 border-l-transparent hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {selectedAppointmentId === appointment.id && (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">
                                    ✓
                                  </span>
                                )}
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {format(new Date(appointment.scheduled_date), 'MMM dd, yyyy')}
                                  </div>
                                  {appointment.scheduled_time && (
                                    <div className="text-xs text-slate-500">
                                      {appointment.scheduled_time}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {appointment.patient_name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {appointment.provider_name || 'Unknown'}
                              </div>
                              {appointment.provider_specialty && (
                                <div className="text-xs text-slate-500">
                                  {appointment.provider_specialty}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-700">{appointment.service_type}</div>
                              {appointment.urgency_level && appointment.urgency_level !== 'normal' && (
                                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${urgencyColorMap[appointment.urgency_level]}`}>
                                  {appointment.urgency_level}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColorMap[appointment.status]}`}
                              >
                                {statusLabelMap[appointment.status]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                      <p className="text-sm text-slate-600">
                        Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{' '}
                        {Math.min(page * ITEMS_PER_PAGE, total)} of {total} appointments
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
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page === totalPages}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
            {isDetailLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
              </div>
            ) : selectedAppointment ? (
              <>
                {/* Appointment Indicator Header */}
                <div className="border-b-2 border-brand-100 bg-gradient-to-r from-brand-50 to-brand-25 px-6 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-tight text-brand-700">Currently Viewing</h2>
                    <span className="text-xs font-mono text-slate-500">ID: {selectedAppointment.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-lg font-bold text-slate-900">{selectedAppointment.patient_name || 'Unknown Patient'}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {format(new Date(selectedAppointment.scheduled_date), 'MMM dd, yyyy')}
                        {selectedAppointment.scheduled_time && ` at ${selectedAppointment.scheduled_time}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${statusColorMap[selectedAppointment.status]}`}
                    >
                      {statusLabelMap[selectedAppointment.status]}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Status & Urgency</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusColorMap[selectedAppointment.status]}`}
                      >
                        {statusLabelMap[selectedAppointment.status]}
                      </span>
                      {selectedAppointment.urgency_level && selectedAppointment.urgency_level !== 'normal' && (
                        <span className={`inline-block rounded px-2 py-1 text-xs font-semibold uppercase ${urgencyColorMap[selectedAppointment.urgency_level]}`}>
                          {selectedAppointment.urgency_level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Schedule</h3>
                    <div className="mt-2 text-sm text-slate-600">
                      <p className="font-semibold">
                        {format(new Date(selectedAppointment.scheduled_date), 'MMMM dd, yyyy')}
                      </p>
                      {selectedAppointment.scheduled_time && (
                        <p>{selectedAppointment.scheduled_time}</p>
                      )}
                      {selectedAppointment.duration && (
                        <p className="mt-1 capitalize">
                          Duration: {selectedAppointment.duration}
                          {selectedAppointment.duration === 'daily' && selectedAppointment.number_of_days && 
                            ` (${selectedAppointment.number_of_days} days)`
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Service</h3>
                    <p className="mt-2 text-sm text-slate-600">{selectedAppointment.service_type}</p>
                  </div>

                  {selectedAppointment.location && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Location</h3>
                      <p className="mt-2 text-sm text-slate-600">{selectedAppointment.location}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Patient</h3>
                    <div className="mt-2 text-sm text-slate-600">
                      <p className="font-semibold">{selectedAppointment.patient_name || 'Unknown'}</p>
                      {selectedAppointment.patient_email && <p>{selectedAppointment.patient_email}</p>}
                      {selectedAppointment.patient_phone && <p>{selectedAppointment.patient_phone}</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Provider</h3>
                    <div className="mt-2 text-sm text-slate-600">
                      <p className="font-semibold">{selectedAppointment.provider_name || 'Unknown'}</p>
                      {selectedAppointment.provider_specialty && (
                        <p className="text-slate-500">{selectedAppointment.provider_specialty}</p>
                      )}
                      {selectedAppointment.provider_phone && <p>{selectedAppointment.provider_phone}</p>}
                    </div>
                  </div>

                  {/* Appointment-Specific Medical Information */}
                  {selectedAppointment.medical_info && (
                    <div className="border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-semibold text-indigo-700">Appointment Medical Info (EMR)</h3>
                      <div className="mt-3 space-y-3">
                        {selectedAppointment.medical_info.current_symptoms && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Current Symptoms</p>
                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                              {selectedAppointment.medical_info.current_symptoms}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.medical_info.medical_history && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Medical History</p>
                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                              {selectedAppointment.medical_info.medical_history}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.medical_info.allergies && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Allergies</p>
                            <p className="mt-1 text-sm text-slate-700">
                              {selectedAppointment.medical_info.allergies}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.medical_info.current_medications && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Current Medications</p>
                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                              {selectedAppointment.medical_info.current_medications}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Patient General Medical Information */}
                  {selectedAppointment.patient_medical_info && (
                    <div className="border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-semibold text-purple-700">Patient Medical Profile</h3>
                      <div className="mt-3 space-y-3">
                        {selectedAppointment.patient_medical_info.allergies && 
                         selectedAppointment.patient_medical_info.allergies.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Known Allergies</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedAppointment.patient_medical_info.allergies.map((allergy, idx) => (
                                <span key={idx} className="inline-block rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                                  {allergy}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedAppointment.patient_medical_info.conditions && 
                         selectedAppointment.patient_medical_info.conditions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Medical Conditions</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedAppointment.patient_medical_info.conditions.map((condition, idx) => (
                                <span key={idx} className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                                  {condition}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedAppointment.patient_medical_info.medications && 
                         selectedAppointment.patient_medical_info.medications.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Regular Medications</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedAppointment.patient_medical_info.medications.map((medication, idx) => (
                                <span key={idx} className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                  {medication}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedAppointment.patient_medical_info.surgeries && 
                         selectedAppointment.patient_medical_info.surgeries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Previous Surgeries</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedAppointment.patient_medical_info.surgeries.map((surgery, idx) => (
                                <span key={idx} className="inline-block rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">
                                  {surgery}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Visit Notes/Clinical Records */}
                  {selectedAppointment.visit_notes && (
                    <div className="border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-semibold text-teal-700">📋 Visit Records</h3>
                      <div className="mt-3 space-y-3 rounded-lg bg-teal-50 p-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Provider's Visit Notes</p>
                          <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap rounded bg-white p-2 border border-teal-100">
                            {selectedAppointment.visit_notes.note_text}
                          </p>
                        </div>
                        {selectedAppointment.visit_notes.provider_signature && (
                          <div>
                            <p className="text-xs font-semibold text-slate-600">Provider Signature</p>
                            <p className="mt-1 text-sm font-serif italic text-slate-700">
                              {selectedAppointment.visit_notes.provider_signature}
                            </p>
                          </div>
                        )}
                        <div className="border-t border-teal-100 pt-2">
                          <p className="text-xs text-slate-500">
                            Recorded: {format(new Date(selectedAppointment.visit_notes.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {selectedAppointment.visit_notes.updated_at !== selectedAppointment.visit_notes.created_at && (
                            <p className="text-xs text-slate-500">
                              Last updated: {format(new Date(selectedAppointment.visit_notes.updated_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.total_cost && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Cost</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedAppointment.currency || 'NGN'} {selectedAppointment.total_cost.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
                      <p className="mt-2 text-sm text-slate-600">{selectedAppointment.notes}</p>
                    </div>
                  )}

                  {selectedAppointment.cancellation_reason && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-700">Cancellation Reason</h3>
                      <p className="mt-2 text-sm text-red-600">{selectedAppointment.cancellation_reason}</p>
                    </div>
                  )}

                  <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700">Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAppointment.status === 'Requested' && (
                        <button
                          onClick={() => handleUpdateStatus('Scheduled')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          Mark as Scheduled
                        </button>
                      )}
                      {selectedAppointment.status === 'Scheduled' && (
                        <button
                          onClick={() => handleUpdateStatus('Completed')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Mark as Completed
                        </button>
                      )}
                      {['Requested', 'Scheduled'].includes(selectedAppointment.status) && (
                        <button
                          onClick={() => handleUpdateStatus('Cancelled')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      Created: {format(new Date(selectedAppointment.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                    {selectedAppointment.updated_at !== selectedAppointment.created_at && (
                      <p className="text-xs text-slate-500">
                        Updated: {format(new Date(selectedAppointment.updated_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-slate-500">Select an appointment to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this appointment as ${pendingStatus}?`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={handleConfirmStatusUpdate}
        onCancel={handleCancelStatusUpdate}
        isLoading={isUpdatingStatus}
      />
    </DashboardLayout>
  );
};
