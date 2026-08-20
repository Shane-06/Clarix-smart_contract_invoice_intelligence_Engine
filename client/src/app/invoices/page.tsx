'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  DollarSign, 
  Plus, 
  Mail, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  X,
  Send,
  CreditCard
} from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  milestones: { id: string; title: string }[];
}

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  contract: { title: string };
  milestone: { title: string } | null;
}

export default function InvoicesPage() {
  const { apiFetch } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Invoice Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Payment Record Form states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  
  // Email preview states
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ subject: string; body: string; to: string } | null>(null);

  useEffect(() => {
    fetchInvoicesAndContracts();
  }, []);

  const fetchInvoicesAndContracts = async () => {
    try {
      setLoading(true);
      const [invoicesData, contractsData] = await Promise.all([
        apiFetch('/invoices'),
        apiFetch('/contracts')
      ]);
      setInvoices(invoicesData);
      
      // For each contract, fetch details to get milestones list
      const richContracts = [];
      for (const c of contractsData) {
        try {
          const detail = await apiFetch(`/contracts/${c.id}`);
          richContracts.push(detail);
        } catch (err) {
          richContracts.push({ ...c, milestones: [] });
        }
      }
      setContracts(richContracts);
    } catch (err: any) {
      setError(err.message || 'Failed to download billing registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !invoiceAmount || !invoiceDueDate) return;

    setFormLoading(true);
    setError('');

    try {
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          contractId: selectedContractId,
          milestoneId: selectedMilestoneId || undefined,
          amount: parseFloat(invoiceAmount),
          dueDate: invoiceDueDate,
        })
      });
      
      setShowCreateModal(false);
      // Reset form fields
      setSelectedContractId('');
      setSelectedMilestoneId('');
      setInvoiceAmount('');
      setInvoiceDueDate('');
      
      // Refresh list
      await fetchInvoicesAndContracts();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoiceId || !payAmount || !payMethod) return;

    setFormLoading(true);
    setError('');

    try {
      await apiFetch('/invoices/payment', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: activeInvoiceId,
          amount: parseFloat(payAmount),
          method: payMethod
        })
      });

      setShowPaymentModal(false);
      setPayAmount('');
      setActiveInvoiceId('');

      // Refresh list
      await fetchInvoicesAndContracts();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    setReminderLoading(invoiceId);
    setError('');

    try {
      const data = await apiFetch('/emails/reminder', {
        method: 'POST',
        body: JSON.stringify({ invoiceId })
      });

      setEmailPreview({
        subject: data.subject,
        body: data.body,
        to: data.recipient
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate payment warning email.');
    } finally {
      setReminderLoading(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page title header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Invoices & Billing</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-normal">Manage invoices, record client payments, and dispatch AI email reminders.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 glow-btn bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-md shadow-violet-600/10 cursor-pointer w-fit"
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoice Grid */}
        <div className="glass-card rounded-2xl border border-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/30 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">Contract</th>
                  <th className="p-4">Milestone</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No invoices recorded. Press &quot;Create Invoice&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-900/10 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-zinc-200">{inv.contract.title}</td>
                      <td className="p-4 text-zinc-400">{inv.milestone ? inv.milestone.title : 'N/A'}</td>
                      <td className="p-4 font-bold text-zinc-200">${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-4 text-zinc-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1 ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {inv.status === 'PAID' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right space-x-2">
                        {inv.status !== 'PAID' && (
                          <>
                            <button
                              onClick={() => {
                                setActiveInvoiceId(inv.id);
                                setPayAmount(inv.amount.toString());
                                setShowPaymentModal(true);
                              }}
                              className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                              title="Record Payment"
                            >
                              <CreditCard className="h-3.5 w-3.5 text-violet-400" /> Pay
                            </button>
                            <button
                              onClick={() => handleSendReminder(inv.id)}
                              disabled={reminderLoading === inv.id}
                              className="inline-flex items-center gap-1 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                              title="Send Reminder Email"
                            >
                              {reminderLoading === inv.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Mail className="h-3.5 w-3.5" /> Remind
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Create Invoice */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-zinc-800 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-bold text-zinc-200 mb-6">Create New Invoice</h2>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Select Contract
                  </label>
                  <select
                    required
                    value={selectedContractId}
                    onChange={(e) => {
                      setSelectedContractId(e.target.value);
                      setSelectedMilestoneId('');
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Choose Contract --</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {selectedContractId && selectedContract && selectedContract.milestones && (
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Select Milestone (Optional)
                    </label>
                    <select
                      value={selectedMilestoneId}
                      onChange={(e) => setSelectedMilestoneId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    >
                      <option value="">-- No Milestone --</option>
                      {selectedContract.milestones.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Invoice Amount ($)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="2500.00"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full glow-btn bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Invoice'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Record Payment */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-zinc-800 shadow-2xl relative">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-bold text-zinc-200 mb-6">Record Payment</h2>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Amount Received ($)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    required
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Credit Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Cryptocurrency</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full glow-btn bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Transaction'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Email Preview & Send Confirmation */}
        {emailPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl glass-card rounded-2xl p-6 border border-zinc-800 shadow-2xl relative flex flex-col h-[520px]">
              <button
                onClick={() => setEmailPreview(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-base font-bold text-zinc-200 mb-2 flex items-center gap-2">
                <Send className="h-4 w-4 text-violet-400" /> AI Reminder Sent Successfully
              </h2>
              <p className="text-[11px] text-zinc-500 mb-4 border-b border-zinc-800 pb-3">
                The notification warning email was generated and delivered to client inbox. Below is a copy of the dispatch metadata:
              </p>

              {/* Email Envelope Display */}
              <div className="flex-1 bg-zinc-950/60 rounded-xl p-4 border border-zinc-900 overflow-y-auto space-y-3 font-normal text-xs text-zinc-300">
                <div>
                  <span className="text-zinc-600 font-semibold uppercase pr-2">To:</span>
                  <span>{emailPreview.to}</span>
                </div>
                <div>
                  <span className="text-zinc-600 font-semibold uppercase pr-2">Subject:</span>
                  <span className="font-bold text-zinc-100">{emailPreview.subject}</span>
                </div>
                <div className="border-t border-zinc-900 pt-4 leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: emailPreview.body }} />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setEmailPreview(null)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
