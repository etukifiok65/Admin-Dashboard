import React, { useEffect, useState } from 'react';
import type { SupportMessage, SupportMessageDetails, PaginationOptions } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

const statusColorMap: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  responded: 'bg-purple-100 text-purple-800 border-purple-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-800 border-slate-200',
};

const priorityColorMap: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

const categoryColorMap: Record<string, string> = {
  general: 'bg-slate-100 text-slate-700 border-slate-200',
  technical: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  billing: 'bg-green-100 text-green-700 border-green-200',
  appointment: 'bg-purple-100 text-purple-700 border-purple-200',
  complaint: 'bg-red-100 text-red-700 border-red-200',
  feedback: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export const SupportMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<SupportMessageDetails[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'responded' | 'resolved' | 'closed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'general' | 'technical' | 'billing' | 'appointment' | 'complaint' | 'feedback'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'normal' | 'high' | 'urgent'>('all');
  
  // Response form state
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<'in_progress' | 'responded' | 'resolved'>('responded');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  // Fetch messages list
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        const response = await adminDashboardService.getSupportMessages(options, {
          search: searchTerm || undefined,
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
        });

        if (response) {
          setMessages(response.data);
          setTotal(response.total);
        } else {
          setError('Failed to load support messages');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load messages';
        console.error('Fetch error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [page, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  // Fetch selected message details
  useEffect(() => {
    const fetchMessageDetails = async () => {
      if (!selectedMessageId) {
        setSelectedMessage(null);
        return;
      }

      setIsDetailLoading(true);
      try {
        const message = await adminDashboardService.getSupportMessage(selectedMessageId);
        if (message) {
          setSelectedMessage(message);
          // Pre-fill response with existing response if any
          if (message.admin_response) {
            setResponseText(message.admin_response);
          } else {
            setResponseText('');
          }
        }
      } catch (err) {
        console.error('Error fetching message details:', err);
      } finally {
        setIsDetailLoading(false);
      }
    };

    fetchMessageDetails();
  }, [selectedMessageId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleSubmitResponse = async () => {
    if (!selectedMessageId || !responseText.trim()) {
      setResponseError('Please enter a response');
      return;
    }

    setIsSubmittingResponse(true);
    setResponseError(null);

    try {
      const updated = await adminDashboardService.respondToSupportMessage(
        selectedMessageId,
        responseText.trim(),
        responseStatus
      );

      if (updated) {
        // Refresh the message details
        const refreshed = await adminDashboardService.getSupportMessage(selectedMessageId);
        if (refreshed) {
          setSelectedMessage(refreshed);
        }

        // Refresh the list
        const options: PaginationOptions = { page, pageSize: ITEMS_PER_PAGE };
        const response = await adminDashboardService.getSupportMessages(options, {
          search: searchTerm || undefined,
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
        });
        if (response) {
          setMessages(response.data);
          setTotal(response.total);
        }

        setResponseError(null);
      } else {
        setResponseError('Failed to submit response');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit response';
      setResponseError(message);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'new' | 'in_progress' | 'responded' | 'resolved' | 'closed') => {
    if (!selectedMessageId) return;

    try {
      const updated = await adminDashboardService.updateSupportMessageStatus(selectedMessageId, newStatus);
      if (updated) {
        // Refresh details
        const refreshed = await adminDashboardService.getSupportMessage(selectedMessageId);
        if (refreshed) {
          setSelectedMessage(refreshed);
        }

        // Refresh list
        const options: PaginationOptions = { page, pageSize: ITEMS_PER_PAGE };
        const response = await adminDashboardService.getSupportMessages(options, {
          search: searchTerm || undefined,
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
        });
        if (response) {
          setMessages(response.data);
          setTotal(response.total);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleUpdateFields = async (fields: { priority?: SupportMessage['priority']; category?: SupportMessage['category'] }) => {
    if (!selectedMessageId) return;

    try {
      const updated = await adminDashboardService.updateSupportMessageFields(selectedMessageId, fields);
      if (updated) {
        // Refresh details
        const refreshed = await adminDashboardService.getSupportMessage(selectedMessageId);
        if (refreshed) {
          setSelectedMessage(refreshed);
        }

        // Refresh list
        const options: PaginationOptions = { page, pageSize: ITEMS_PER_PAGE };
        const response = await adminDashboardService.getSupportMessages(options, {
          search: searchTerm || undefined,
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
        });
        if (response) {
          setMessages(response.data);
          setTotal(response.total);
        }
      }
    } catch (err) {
      console.error('Error updating fields:', err);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Support Messages</h1>
          <p className="mt-2 text-sm text-slate-500">Manage customer enquiries from the website contact form</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          {/* Messages List */}
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Search by name, email, subject, or message..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                
                <div className="flex flex-wrap gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as typeof statusFilter);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="responded">Responded</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value as typeof categoryFilter);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="appointment">Appointment</option>
                    <option value="complaint">Complaint</option>
                    <option value="feedback">Feedback</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value as typeof priorityFilter);
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Messages Table */}
            <div className="rounded-lg border border-slate-200 bg-white/90 shadow-sm">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-slate-800">No messages found</p>
                  <p className="mt-1 text-xs text-slate-500">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Sender</th>
                          <th className="px-6 py-3 text-left">Subject</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Priority</th>
                          <th className="px-6 py-3 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {messages.map((message) => (
                          <tr
                            key={message.id}
                            onClick={() => setSelectedMessageId(message.id)}
                            className={`cursor-pointer transition hover:bg-slate-50 ${
                              selectedMessageId === message.id ? 'bg-brand-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-900">{message.name}</div>
                              <div className="text-xs text-slate-500">{message.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-900 line-clamp-2">{message.subject}</div>
                              <div className="mt-1">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${categoryColorMap[message.category]}`}>
                                  {message.category}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  statusColorMap[message.status]
                                }`}
                              >
                                {message.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  priorityColorMap[message.priority]
                                }`}
                              >
                                {message.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {format(new Date(message.created_at), 'MMM dd, yyyy HH:mm')}
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
                        {Math.min(page * ITEMS_PER_PAGE, total)} of {total} messages
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

          {/* Message Details Panel */}
          <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
            {!selectedMessageId ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-semibold">Select a message</p>
                <p className="mt-1 text-xs">Click on a message to view details</p>
              </div>
            ) : isDetailLoading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                <p className="text-sm text-slate-500">Loading details...</p>
              </div>
            ) : selectedMessage ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Message Details</h2>
                </div>

                {/* Sender Information */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Sender</label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedMessage.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
                    <p className="mt-1 text-sm text-slate-900">{selectedMessage.email}</p>
                  </div>
                  {selectedMessage.phone && (
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Phone</label>
                      <p className="mt-1 text-sm text-slate-900">{selectedMessage.phone}</p>
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Subject</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedMessage.subject}</p>
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Message</label>
                  <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Category</label>
                    <select
                      value={selectedMessage.category}
                      onChange={(e) => handleUpdateFields({ category: e.target.value as SupportMessage['category'] })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="general">General</option>
                      <option value="technical">Technical</option>
                      <option value="billing">Billing</option>
                      <option value="appointment">Appointment</option>
                      <option value="complaint">Complaint</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Priority</label>
                    <select
                      value={selectedMessage.priority}
                      onChange={(e) => handleUpdateFields({ priority: e.target.value as SupportMessage['priority'] })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Status</label>
                  <select
                    value={selectedMessage.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as SupportMessage['status'])}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="responded">Responded</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Received</label>
                  <p className="mt-1 text-sm text-slate-600">
                    {format(new Date(selectedMessage.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>

                {/* Existing Response */}
                {selectedMessage.admin_response && selectedMessage.responded_at && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <label className="text-xs font-semibold uppercase text-emerald-700">Previous Response</label>
                    <p className="mt-2 text-sm text-slate-900">{selectedMessage.admin_response}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      Responded by {selectedMessage.responded_by_name || 'Admin'} on{' '}
                      {format(new Date(selectedMessage.responded_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}

                {/* Response Form */}
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <label className="text-xs font-semibold uppercase text-slate-500">Admin Response</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response here..."
                    rows={6}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />

                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Update Status To</label>
                    <select
                      value={responseStatus}
                      onChange={(e) => setResponseStatus(e.target.value as typeof responseStatus)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="responded">Responded</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {responseError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {responseError}
                    </div>
                  )}

                  <button
                    onClick={handleSubmitResponse}
                    disabled={isSubmittingResponse || !responseText.trim()}
                    className="w-full rounded-lg border border-brand-200 bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {isSubmittingResponse ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-semibold">Message not found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
