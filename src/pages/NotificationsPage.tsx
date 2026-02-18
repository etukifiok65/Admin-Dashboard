import React, { useEffect, useState } from 'react';
import type { BroadcastNotification, PaginationOptions } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

const statusColorMap: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const statusBgMap: Record<string, string> = {
  draft: 'bg-slate-50',
  scheduled: 'bg-blue-50',
  sent: 'bg-emerald-50',
};

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'sent'>('all');
  
  // Form state for creating new notification
  const [showForm, setShowForm] = useState(false);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipient_type: 'both' as 'patients' | 'providers' | 'both',
    scheduled_at: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [activeDraftAction, setActiveDraftAction] = useState<'save' | 'send' | null>(null);
  const [actionNotificationId, setActionNotificationId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [page, statusFilter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const options: PaginationOptions = {
        page,
        pageSize: ITEMS_PER_PAGE,
      };

      const response = await adminDashboardService.getBroadcastNotifications(options, {
        status: statusFilter as any,
      });

      if (response) {
        setNotifications(response.data);
        setTotal(response.total);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      console.error('Fetch error:', message, err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFormState = () => {
    setFormData({
      title: '',
      message: '',
      recipient_type: 'both',
      scheduled_at: '',
    });
    setEditingNotificationId(null);
    setShowForm(false);
  };

  const normalizeErrorMessage = (err: unknown, fallbackMessage: string) => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return fallbackMessage;
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      if (!formData.title.trim() || !formData.message.trim()) {
        setCreateError('Title and message are required');
        setIsCreating(false);
        return;
      }

      const payload = {
        title: formData.title,
        message: formData.message,
        recipient_type: formData.recipient_type,
        scheduled_at: formData.scheduled_at || null,
      };

      if (editingNotificationId) {
        await adminDashboardService.updateBroadcastNotificationDraft(editingNotificationId, payload);
      } else {
        await adminDashboardService.createBroadcastNotification(payload);
      }

      resetFormState();
      setPage(1);
      await fetchNotifications();
    } catch (err) {
      const message = normalizeErrorMessage(
        err,
        editingNotificationId ? 'Failed to update draft notification' : 'Failed to create notification'
      );
      console.error('Create error details:', {
        error: err,
        message,
        fullError: JSON.stringify(err, null, 2),
      });
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    setActiveDraftAction('save');
    setCreateError(null);

    try {
      if (!formData.title.trim() || !formData.message.trim()) {
        setCreateError('Title and message are required');
        return;
      }

      const payload = {
        title: formData.title,
        message: formData.message,
        recipient_type: formData.recipient_type,
        scheduled_at: formData.scheduled_at || null,
      };

      if (editingNotificationId) {
        await adminDashboardService.updateBroadcastNotificationDraft(editingNotificationId, payload);
      } else {
        await adminDashboardService.createBroadcastNotification(payload, { saveAsDraft: true });
      }

      resetFormState();
      setPage(1);
      await fetchNotifications();
    } catch (err) {
      const message = normalizeErrorMessage(err, 'Failed to save draft notification');
      setCreateError(message);
    } finally {
      setActiveDraftAction(null);
    }
  };

  const handleEditDraft = (notification: BroadcastNotification) => {
    setCreateError(null);
    setEditingNotificationId(notification.id);
    setFormData({
      title: notification.title,
      message: notification.message,
      recipient_type: notification.recipient_type,
      scheduled_at: notification.scheduled_at
        ? notification.scheduled_at.slice(0, 16)
        : '',
    });
    setShowForm(true);
  };

  const handleSendNow = async (notification: BroadcastNotification) => {
    setActionNotificationId(notification.id);
    setCreateError(null);
    setError(null);

    try {
      await adminDashboardService.sendBroadcastNotificationNow(notification.id);
      await fetchNotifications();

      if (editingNotificationId === notification.id) {
        resetFormState();
      }
    } catch (err) {
      const message = normalizeErrorMessage(err, 'Failed to send notification');
      setCreateError(message);
      setError(message);
    } finally {
      setActionNotificationId(null);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Notifications</h1>
            <p className="mt-2 text-sm text-slate-500">Send and manage push notifications to patients and providers</p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                resetFormState();
                return;
              }
              setShowForm(true);
            }}
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            {showForm ? 'Cancel' : '+ New Notification'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Create Notification Form */}
        {showForm && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">
              {editingNotificationId ? 'Edit Draft Notification' : 'Create Notification'}
            </h2>
            <form onSubmit={handleCreateNotification} className="space-y-6">
              {createError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., System Maintenance"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter notification message..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Send To *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'patients', label: 'Patients Only' },
                    { value: 'providers', label: 'Providers Only' },
                    { value: 'both', label: 'Both' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border border-slate-300 p-3 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="recipient_type"
                        value={option.value}
                        checked={formData.recipient_type === option.value}
                        onChange={(e) =>
                          setFormData({ ...formData, recipient_type: e.target.value as any })
                        }
                        className="cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schedule (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Leave empty to send immediately, or schedule for a specific time
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetFormState}
                  className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={activeDraftAction === 'save'}
                  className="rounded-lg border border-brand-600 px-6 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {activeDraftAction === 'save'
                    ? 'Saving...'
                    : editingNotificationId
                      ? 'Save Draft Changes'
                      : 'Save as Draft'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isCreating
                    ? editingNotificationId
                      ? 'Updating...'
                      : 'Sending...'
                    : editingNotificationId
                      ? 'Save Changes'
                      : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex gap-2">
          {[
            { value: 'all' as const, label: 'All' },
            { value: 'draft' as const, label: 'Draft' },
            { value: 'scheduled' as const, label: 'Scheduled' },
            { value: 'sent' as const, label: 'Sent' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition ${
                statusFilter === filter.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
            <p className="text-sm text-slate-500">Loading notifications...</p>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && notifications.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">No notifications found</p>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border border-slate-200 p-6 shadow-sm transition hover:shadow-md ${
                  statusBgMap[notification.status] || 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{notification.title}</h3>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          statusColorMap[notification.status]
                        }`}
                      >
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">{notification.message}</p>

                    <div className="flex flex-wrap gap-6 text-xs text-slate-500">
                      <div>
                        <span className="font-medium">Recipients:</span>{' '}
                        {notification.recipient_type === 'both'
                          ? 'Patients & Providers'
                          : notification.recipient_type.charAt(0).toUpperCase() +
                            notification.recipient_type.slice(1)}
                      </div>
                      {notification.total_recipients && (
                        <div>
                          <span className="font-medium">Total:</span> {notification.total_recipients}
                        </div>
                      )}
                      {notification.delivered_count !== undefined && (
                        <div>
                          <span className="font-medium">Delivered:</span> {notification.delivered_count}
                        </div>
                      )}
                      {notification.read_count !== undefined && (
                        <div>
                          <span className="font-medium">Read:</span> {notification.read_count}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-8 text-xs text-slate-500">
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      {notification.scheduled_at && (
                        <div>
                          <span className="font-medium">Scheduled:</span>{' '}
                          {format(new Date(notification.scheduled_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                      {notification.sent_at && (
                        <div>
                          <span className="font-medium">Sent:</span>{' '}
                          {format(new Date(notification.sent_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>
                  </div>

                  {notification.status === 'draft' && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditDraft(notification)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Edit Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendNow(notification)}
                        disabled={actionNotificationId === notification.id}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {actionNotificationId === notification.id ? 'Sending...' : 'Send Now'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
