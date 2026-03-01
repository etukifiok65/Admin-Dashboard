import React, { useEffect, useState } from 'react';
import type { FinancialMetrics, ProviderPayout, TransactionRecord, PlatformRevenueLog, PaginationOptions } from '@app-types/index';
import { adminDashboardService } from '@services/adminDashboard.service';
import { DashboardLayout } from '@components/DashboardLayout';
import ConfirmModal from '@components/ConfirmModal';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

const transactionTypeColorMap: Record<string, string> = {
  topup: 'bg-blue-100 text-blue-800 border-blue-200',
  payment: 'bg-purple-100 text-purple-800 border-purple-200',
  refund: 'bg-orange-100 text-orange-800 border-orange-200',
  withdrawal: 'bg-rose-100 text-rose-800 border-rose-200',
};

const transactionStatusColorMap: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const payoutStatusColorMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const revenueTypeColorMap: Record<string, string> = {
  appointment_commission: 'bg-purple-100 text-purple-800 border-purple-200',
  cancellation_fee: 'bg-orange-100 text-orange-800 border-orange-200',
};

export const FinancialPage: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [payouts, setPayouts] = useState<ProviderPayout[]>([]);
  const [platformRevenueLogs, setPlatformRevenueLogs] = useState<PlatformRevenueLog[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts' | 'platform-revenue'>('transactions');
  const [isLoading, setIsLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'topup' | 'payment' | 'refund' | 'withdrawal'>('all');
  const [transactionStatus, setTransactionStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [payoutStatus, setPayoutStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'appointment_commission' | 'cancellation_fee'>('all');
  const [updatingPayoutId, setUpdatingPayoutId] = useState<string | null>(null);
  const [isPayoutConfirmOpen, setIsPayoutConfirmOpen] = useState(false);
  const [pendingPayoutUpdate, setPendingPayoutUpdate] = useState<{id: string, status: 'pending' | 'processing' | 'completed' | 'failed'} | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setMetricsLoading(true);
      setError(null);
      try {
        const data = await adminDashboardService.getFinancialMetrics();
        if (!data) {
          setError('Failed to fetch metrics - check console for details');
        } else {
          setMetrics(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load metrics';
        console.error('Metrics error:', message, err);
        setError(message);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options: PaginationOptions = {
          page,
          pageSize: ITEMS_PER_PAGE,
        };

        if (activeTab === 'transactions') {
          const response = await adminDashboardService.getTransactions(options, {
            type: transactionFilter,
            status: transactionStatus,
          });

          if (response) {
            setTransactions(response.data);
            setTotal(response.total);
          }
        } else if (activeTab === 'payouts') {
          const response = await adminDashboardService.getProviderPayouts(options, {
            status: payoutStatus as any,
          });

          console.log('Payouts response:', response);
          if (response) {
            setPayouts(response.data);
            setTotal(response.total);
          } else {
            setError('No response from payouts service');
          }
        } else if (activeTab === 'platform-revenue') {
          const response = await adminDashboardService.getPlatformRevenueLogs(options, {
            revenue_type: revenueFilter,
          });

          if (response) {
            setPlatformRevenueLogs(response.data);
            setTotal(response.total);
          } else {
            setError('No response from platform revenue service');
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        console.error('Fetch error:', message, err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, page, transactionFilter, transactionStatus, payoutStatus, revenueFilter]);

  const handleUpdatePayoutStatus = async (payoutId: string, newStatus: 'pending' | 'processing' | 'completed' | 'failed') => {
    // Open confirmation modal
    setPendingPayoutUpdate({ id: payoutId, status: newStatus });
    setIsPayoutConfirmOpen(true);
  };

  const handleConfirmPayoutUpdate = async () => {
    if (!pendingPayoutUpdate) return;

    setUpdatingPayoutId(pendingPayoutUpdate.id);
    setError(null);

    try {
      console.log('Updating payout:', pendingPayoutUpdate);
      const updated = await adminDashboardService.updatePayoutStatus(pendingPayoutUpdate.id, pendingPayoutUpdate.status);
      
      if (updated) {
        console.log('Successfully updated payout:', updated);
        setPayouts(prev =>
          prev.map(p => 
            p.id === pendingPayoutUpdate.id 
              ? { ...p, status: updated.status, completed_at: updated.completed_at } 
              : p
          )
        );
        setError(null);
      } else {
        console.error('No data returned from update');
        setError('Failed to update payout: No response from server');
      }

      setIsPayoutConfirmOpen(false);
      setPendingPayoutUpdate(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update payout status';
      console.error('Payout update error:', err);
      setError(message);
    } finally {
      setUpdatingPayoutId(null);
    }
  };

  const handleCancelPayoutUpdate = () => {
    setIsPayoutConfirmOpen(false);
    setPendingPayoutUpdate(null);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Financial Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Revenue, payouts, and transaction management</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Metrics Loading State */}
        {metricsLoading && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
            <p className="text-sm text-slate-500">Loading financial metrics...</p>
          </div>
        )}

        {/* Metrics Cards */}
        {!metricsLoading && metrics && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Patient Wallets</p>
              <p className="mt-3 text-3xl font-bold text-blue-600">
                ₦{metrics.patientWalletBalance.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-400">Total balance</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Provider Wallets</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">
                ₦{metrics.providerWalletBalance.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-400">Total balance</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Platform Revenue</p>
              <p className="mt-3 text-3xl font-bold text-purple-600">
                ₦{metrics.platformRevenue.toLocaleString()}
              </p>
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div>Commissions: ₦{metrics.platformCommissions.toLocaleString()}</div>
                <div>Cancellation Fees: ₦{metrics.platformCancellationFees.toLocaleString()}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Pending Payouts</p>
              <p className="mt-3 text-3xl font-bold text-amber-600">
                ₦{metrics.pendingPayouts.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-400">Awaiting processing</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Total Top-ups</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                ₦{metrics.totalTopUpRevenue.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-400">All-time total</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab('transactions');
              setPage(1);
            }}
            className={`px-4 py-3 font-semibold text-sm transition ${
              activeTab === 'transactions'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💳 Transactions
          </button>
          <button
            onClick={() => {
              setActiveTab('payouts');
              setPage(1);
            }}
            className={`px-4 py-3 font-semibold text-sm transition ${
              activeTab === 'payouts'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏦 Payouts
          </button>
          <button
            onClick={() => {
              setActiveTab('platform-revenue');
              setPage(1);
            }}
            className={`px-4 py-3 font-semibold text-sm transition ${
              activeTab === 'platform-revenue'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 Platform Revenue
          </button>
        </div>

        {/* Data Table */}
        <div className="rounded-lg border border-slate-200 bg-white/90 shadow-sm">
          {activeTab === 'transactions' && (
            <div className="space-y-4 p-6">
              <div className="flex gap-3">
                <select
                  value={transactionFilter}
                  onChange={(e) => {
                    setTransactionFilter(e.target.value as typeof transactionFilter);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="all">All types</option>
                  <option value="topup">Top up</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
                <select
                  value={transactionStatus}
                  onChange={(e) => {
                    setTransactionStatus(e.target.value as typeof transactionStatus);
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {isLoading ? (
                <div className="text-center py-10">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No transactions found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-left">User</th>
                          <th className="px-6 py-3 text-left">Type</th>
                          <th className="px-6 py-3 text-left">Amount</th>
                          <th className="px-6 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-900">
                                {tx.patient_name || tx.provider_name || 'Unknown'}
                              </div>
                              {tx.patient_name && (
                                <div className="text-xs text-slate-500">Patient</div>
                              )}
                              {!tx.patient_name && tx.provider_name && (
                                <div className="text-xs text-slate-500">Provider</div>
                              )}
                              {tx.reference && <div className="text-xs text-slate-500 mt-1">{tx.reference}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  transactionTypeColorMap[tx.type]
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                              ₦{tx.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  transactionStatusColorMap[tx.status]
                                }`}
                              >
                                {tx.status}
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
                        {Math.min(page * ITEMS_PER_PAGE, total)} of {total} transactions
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
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-4 p-6">
              <select
                value={payoutStatus}
                onChange={(e) => {
                  setPayoutStatus(e.target.value as typeof payoutStatus);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              {isLoading ? (
                <div className="text-center py-10">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading payouts...</p>
                </div>
              ) : payouts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No payouts found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-left">Provider</th>
                          <th className="px-6 py-3 text-left">Amount</th>
                          <th className="px-6 py-3 text-left">Payment Method</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payouts.map((payout) => (
                          <tr key={payout.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-slate-900">{payout.provider_name || 'Unknown'}</div>
                              {payout.reference && <div className="text-xs text-slate-500">{payout.reference}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                              ₦{payout.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-900">
                                {payout.payout_method ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold capitalize">
                                      {payout.payout_method.method_type === 'bank_account' ? '🏦 Bank Account' : '📱 Mobile Money'}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      <div>{payout.payout_method.account_name}</div>
                                      <div className="font-mono">{payout.payout_method.account_number}</div>
                                      {payout.payout_method.bank_name && (
                                        <div className="text-slate-500">{payout.payout_method.bank_name}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Not specified</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  payoutStatusColorMap[payout.status]
                                }`}
                              >
                                {payout.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {payout.status === 'pending' && (
                                <button
                                  onClick={() => {
                                    console.log('Button clicked for payout:', payout.id);
                                    handleUpdatePayoutStatus(payout.id, 'completed');
                                  }}
                                  disabled={updatingPayoutId === payout.id}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                  type="button"
                                >
                                  {updatingPayoutId === payout.id ? 'Updating...' : 'Mark as Paid'}
                                </button>
                              )}
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
                        {Math.min(page * ITEMS_PER_PAGE, total)} of {total} payouts
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
          )}

          {activeTab === 'platform-revenue' && (
            <div className="space-y-4 p-6">
              <select
                value={revenueFilter}
                onChange={(e) => {
                  setRevenueFilter(e.target.value as typeof revenueFilter);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All types</option>
                <option value="appointment_commission">Appointment Commission</option>
                <option value="cancellation_fee">Cancellation Fee</option>
              </select>

              {isLoading ? (
                <div className="text-center py-10">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
                  <p className="text-sm text-slate-500">Loading platform revenue...</p>
                </div>
              ) : platformRevenueLogs.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">No platform revenue logs found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-left">Type</th>
                          <th className="px-6 py-3 text-left">Amount</th>
                          <th className="px-6 py-3 text-left">Appointment ID</th>
                          <th className="px-6 py-3 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {platformRevenueLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  revenueTypeColorMap[log.revenue_type]
                                }`}
                              >
                                {log.revenue_type === 'appointment_commission' ? 'Commission' : 'Cancellation Fee'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                              ₦{log.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-600">
                              {log.related_appointment_id ? `${log.related_appointment_id.substring(0, 8)}...` : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {log.description || '—'}
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
                        {Math.min(page * ITEMS_PER_PAGE, total)} of {total} logs
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
          )}
        </div>
      </div>
      {/* Payout Status Update Confirmation Modal */}
      <ConfirmModal
        isOpen={isPayoutConfirmOpen}
        title="Update Payout Status"
        message={`Are you sure you want to mark this payout as ${pendingPayoutUpdate?.status}?`}
        confirmText="Update Status"
        cancelText="Cancel"
        onConfirm={handleConfirmPayoutUpdate}
        onCancel={handleCancelPayoutUpdate}
        isLoading={updatingPayoutId !== null}
      />    </DashboardLayout>
  );
};
