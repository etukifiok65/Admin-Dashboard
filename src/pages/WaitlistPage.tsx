import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@components/index';
import adminDashboardService from '@services/adminDashboard.service';
import type { WaitlistEntry, WaitlistStatus } from '@app-types/index';

const statusStyles: Record<WaitlistStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-blue-100 text-blue-800',
  onboarded: 'bg-green-100 text-green-800',
};

const PAGE_SIZE = 20;

export const WaitlistPage: React.FC = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | ''>('');
  const [sortBy, setSortBy] = useState<'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminDashboardService.getWaitlist({
        page,
        pageSize: PAGE_SIZE,
        search,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
      });
      setEntries(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load waitlist');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Reset to page 1 when filters change
  const prevFiltersRef = React.useRef({ search, statusFilter, sortBy, sortDir });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.search !== search ||
      prev.statusFilter !== statusFilter ||
      prev.sortBy !== sortBy ||
      prev.sortDir !== sortDir
    ) {
      setPage(1);
      prevFiltersRef.current = { search, statusFilter, sortBy, sortDir };
    }
  }, [search, statusFilter, sortBy, sortDir]);

  const handleStatusChange = async (id: number, newStatus: WaitlistStatus) => {
    setUpdatingId(id);
    try {
      await adminDashboardService.updateWaitlistStatus(id, newStatus);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const all = await adminDashboardService.getWaitlistForExport({
        search,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
      });
      const headers = ['ID', 'Full Name', 'Email', 'Status', 'Created At'];
      const rows = all.map(e => [
        e.id,
        `"${e.fullName.replace(/"/g, '""')}"`,
        `"${e.email.replace(/"/g, '""')}"`,
        e.status,
        e.created_at,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Waitlist</h1>
            <p className="mt-1 text-sm text-slate-500">Manage platform waitlist</p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || total === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>

        {/* Total Count */}
        <div className="text-sm text-slate-700">
          <span className="font-semibold">Total Entries:</span> {total}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 w-64"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as WaitlistStatus | '')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="onboarded">Onboarded</option>
          </select>
          <select
            value={`${sortBy}_${sortDir}`}
            onChange={e => {
              const parts = e.target.value.split('_');
              const dir = parts.pop() as 'asc' | 'desc';
              const col = parts.join('_') as 'created_at';
              setSortBy(col);
              setSortDir(dir);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          >
            <option value="created_at_desc">Joined (Newest)</option>
            <option value="created_at_asc">Joined (Oldest)</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-red-600">{error}</div>
          ) : isLoading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No waitlist entries found.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.fullName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={entry.status}
                        onChange={e => handleStatusChange(entry.id, e.target.value as WaitlistStatus)}
                        disabled={updatingId === entry.id}
                        className={`rounded-full px-2 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 ${statusStyles[entry.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="onboarded">Onboarded</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {startItem}–{endItem} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
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
