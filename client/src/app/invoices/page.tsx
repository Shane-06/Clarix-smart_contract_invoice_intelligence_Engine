'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CircleDollarSign, Mail, Plus, ReceiptText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Notice, PageHeading, QueryState, Status } from '@/components/WorkspaceUI';
import { errorMessage, useAuth } from '@/context/AuthContext';
import { useWorkspaceQuery } from '@/lib/useWorkspaceQuery';
import { currency, formatDate, formatTimestamp, type ContractSummary, type Invoice, type Milestone } from '@/lib/workspace';

type Draft = { subject: string; body: string; recipient: string | null; demo: boolean; sent: boolean };
type Panel =
  | { name: 'create' }
  | { name: 'payment'; invoice: Invoice; reference: string }
  | { name: 'reminder'; invoice: Invoice; draft: Draft }
  | { name: 'history'; invoice: Invoice };

export default function InvoicesPage() {
  const { apiFetch } = useAuth();
  const { data: invoices, error: queryError, reload } = useWorkspaceQuery<Invoice[]>('/invoices');
  const contracts = useWorkspaceQuery<ContractSummary[]>('/contracts');
  const milestones = useWorkspaceQuery<Milestone[]>('/milestones');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selectedContract, setSelectedContract] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const visible = invoices?.filter(invoice => filter === 'all' || (filter === 'paid' ? invoice.status === 'PAID' : invoice.status !== 'PAID'));

  function show(next: Panel | null) {
    setError('');
    setSuccess('');
    setPanel(next);
  }

  async function run(operation: string, work: () => Promise<void>) {
    setError('');
    setSuccess('');
    setPending(operation);
    try {
      await work();
    } catch (error) {
      setError(errorMessage(error, 'Unable to complete the invoice request.'));
    } finally {
      setPending('');
    }
  }

  function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void run('create', async () => {
      await apiFetch('/invoices', {
        method: 'POST',
        body: JSON.stringify({ ...values, amount: Number(values.amount), milestoneId: values.milestoneId || null }),
      });
      reload();
      setPanel(null);
      setSuccess('Invoice created.');
    });
  }

  function recordPayment(event: FormEvent<HTMLFormElement>, invoice: Invoice, reference: string) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void run('payment', async () => {
      await apiFetch('/invoices/payment', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(values.amount), method: values.method, invoiceId: invoice.id, reference }),
      });
      reload();
      setPanel(null);
      setSuccess('Payment recorded.');
    });
  }

  function getDraft(invoice: Invoice) {
    void run(invoice.id, async () => {
      const draft = await apiFetch<Draft>('/emails/reminder', { method: 'POST', body: JSON.stringify({ invoiceId: invoice.id }) });
      setPanel({ name: 'reminder', invoice, draft });
    });
  }

  function sendReminder(event: FormEvent<HTMLFormElement>, invoice: Invoice, draft: Draft) {
    event.preventDefault();
    const { subject, body } = Object.fromEntries(new FormData(event.currentTarget));
    void run('send', async () => {
      const result = await apiFetch<{ sent: boolean }>('/emails/reminder', {
        method: 'POST', body: JSON.stringify({ invoiceId: invoice.id, delivery: { recipient: draft.recipient, subject, body } }),
      });
      setPanel(null);
      setSuccess(result.sent ? 'Reminder sent to ' + draft.recipient + '.' : 'Demo reminder recorded. No email was sent.');
    });
  }

  function closePanel() {
    if (!pending) show(null);
  }

  function invoiceActions(invoice: Invoice) {
    return <>
      {invoice.payments.length > 0 && <button type="button" className="action action-secondary action-small"
        onClick={() => show({ name: 'history', invoice })}>History</button>}
      {invoice.balance > 0 && <>
        <button type="button" className="action action-secondary action-small" disabled={!!pending}
          onClick={() => show({ name: 'payment', invoice, reference: crypto.randomUUID() })}>
          <CircleDollarSign size={15} aria-hidden="true" /> Record
        </button>
        <button type="button" aria-label={'Draft reminder for ' + invoice.contract.title} title="Draft reminder"
          className="action action-secondary action-small" disabled={!!pending} onClick={() => getDraft(invoice)}>
          {pending === invoice.id ? 'Drafting…' : <Mail size={16} aria-hidden="true" />}
        </button>
      </>}
    </>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeading title="Invoices" description="Track outstanding balances and record payments as they arrive."
          action={<button type="button" className="action" disabled={!contracts.data?.length || !!pending}
            onClick={() => { setSelectedContract(''); show({ name: 'create' }); }}>
            <Plus size={17} aria-hidden="true" /> New invoice
          </button>} />
        {error && !panel && <Notice>{error}</Notice>}
        {success && <Notice success>{success}</Notice>}
        {contracts.error && <Notice>{contracts.error}</Notice>}
        {!invoices ? <QueryState error={queryError} /> : invoices.length === 0 ? (
          <section className="surface-card p-8">
            <ReceiptText size={24} className="text-brand" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">No invoices yet</h2>
            <p className="mt-2 text-sm text-copy">Create an invoice linked to one of your contracts.</p>
            {contracts.data?.length === 0 && <Link href="/contracts/upload" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Upload a contract</Link>}
          </section>
        ) : (
          <section className="surface-card min-w-0 overflow-hidden" aria-label="Invoice register">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <h2 className="text-base font-bold">Invoice register</h2>
              <div className="flex gap-1" aria-label="Filter invoices">
                {(['all', 'open', 'paid'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value}
                  onClick={() => setFilter(value)} className={'rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize ' +
                    (filter === value ? 'bg-brand-light text-brand-dark' : 'text-copy hover:bg-canvas')}>{value}</button>)}
              </div>
            </div>
            {visible?.length ? <>
              <ul className="divide-y divide-line min-[1120px]:hidden">
                {visible.map(invoice => <li key={invoice.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={'/contracts/' + invoice.contractId} className="break-words text-sm font-bold hover:text-brand hover:underline">
                        {invoice.contract.title}
                      </Link>
                      {invoice.milestone && <p className="mt-1 break-words text-xs text-copy">{invoice.milestone.title}</p>}
                    </div>
                    <Status status={invoice.status} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-xs text-copy">Due date</dt><dd className="mt-1">{formatDate(invoice.dueDate)}</dd></div>
                    <div><dt className="text-xs text-copy">Amount</dt><dd className="mt-1 break-words tabular-nums">{currency.format(invoice.amount)}</dd></div>
                    <div><dt className="text-xs text-copy">Balance</dt><dd className="mt-1 break-words font-semibold tabular-nums">{currency.format(invoice.balance)}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2">{invoiceActions(invoice)}</div>
                </li>)}
              </ul>
              <div className="hidden overflow-x-auto min-[1120px]:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line bg-surface-soft text-xs text-copy">
                  <tr><th className="px-5 py-3 font-semibold" scope="col">Contract</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Due date</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Amount</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Balance</th>
                    <th className="px-3 py-3 font-semibold" scope="col">Status</th>
                    <th className="px-5 py-3 text-right font-semibold" scope="col">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map(invoice => <tr key={invoice.id} className="hover:bg-surface-soft">
                    <td className="px-5 py-4">
                      <Link href={'/contracts/' + invoice.contractId} className="block font-semibold text-ink hover:text-brand hover:underline">{invoice.contract.title}</Link>
                      {invoice.milestone && <span className="mt-1 block text-xs text-copy">{invoice.milestone.title}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-copy">{formatDate(invoice.dueDate)}</td>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums">{currency.format(invoice.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-4 font-semibold tabular-nums">{currency.format(invoice.balance)}</td>
                    <td className="whitespace-nowrap px-3 py-4"><Status status={invoice.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5 whitespace-nowrap">{invoiceActions(invoice)}</div>
                    </td>
                  </tr>)}
                </tbody>
              </table>
              </div>
            </> : <p className="px-5 py-8 text-sm text-copy">No invoices match this filter.</p>}
          </section>
        )}
      </div>

      {panel?.name === 'create' && <Modal title="New invoice" onClose={closePanel}>
        <form onSubmit={createInvoice} className="grid gap-4">
          {error && <Notice>{error}</Notice>}
          <label className="grid gap-1.5 text-sm font-semibold">Contract
            <select name="contractId" className="field min-h-11 px-3 font-normal" required value={selectedContract}
              onChange={event => setSelectedContract(event.target.value)}>
              <option value="">Choose a contract</option>
              {contracts.data?.map(contract => <option key={contract.id} value={contract.id}>{contract.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Milestone (optional)
            <select name="milestoneId" className="field min-h-11 px-3 font-normal" key={selectedContract} disabled={!selectedContract || !milestones.data}>
              <option value="">No linked milestone</option>
              {milestones.data?.filter(item => item.contractId === selectedContract).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          {milestones.error && <p className="text-xs text-copy">Milestones are temporarily unavailable.</p>}
          <label className="grid gap-1.5 text-sm font-semibold">Amount (USD)
            <input type="number" name="amount" min="0.01" step="0.01" max="999999999999.99" className="field min-h-11 px-3 font-normal" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Due date
            <input type="date" name="dueDate" className="field min-h-11 px-3 font-normal" required />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="action action-secondary" disabled={!!pending} onClick={closePanel}>Cancel</button>
            <button type="submit" className="action" disabled={!!pending}>{pending ? 'Saving…' : 'Create invoice'}</button>
          </div>
        </form>
      </Modal>}

      {panel?.name === 'payment' && <Modal title="Record payment" onClose={closePanel}>
        <form onSubmit={event => recordPayment(event, panel.invoice, panel.reference)} className="grid gap-4">
          {error && <Notice>{error}</Notice>}
          <p className="rounded-lg border border-line bg-surface-soft px-3 py-3 text-sm text-copy">
            Outstanding balance <strong className="text-ink">{currency.format(panel.invoice.balance)}</strong>
          </p>
          <label className="grid gap-1.5 text-sm font-semibold">Amount received (USD)
            <input name="amount" type="number" min="0.01" step="0.01" max={panel.invoice.balance}
              defaultValue={panel.invoice.balance.toFixed(2)} className="field min-h-11 px-3 font-normal" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Payment method
            <select name="method" className="field min-h-11 px-3 font-normal">
              <option value="bank_transfer">Bank transfer</option><option value="card">Card</option>
              <option value="cash">Cash</option><option value="paypal">PayPal</option><option value="crypto">Crypto</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="action action-secondary" disabled={!!pending} onClick={closePanel}>Cancel</button>
            <button type="submit" className="action" disabled={!!pending}>{pending ? 'Recording…' : 'Record payment'}</button>
          </div>
        </form>
      </Modal>}

      {panel?.name === 'reminder' && <Modal title="Review payment reminder" onClose={closePanel}>
        <form onSubmit={event => sendReminder(event, panel.invoice, panel.draft)} className="grid gap-4">
          {error && <Notice>{error}</Notice>}
          {panel.draft.demo && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Demo mode simulates delivery.</p>}
          <p className="text-sm font-semibold">To{' '}
            <span className="break-all font-normal text-copy">{panel.draft.recipient || 'No client email saved'}</span>
          </p>
          {!panel.draft.recipient && <Link href={'/contracts/' + panel.invoice.contractId} className="text-sm font-semibold text-brand hover:underline">Add an email on the contract</Link>}
          <label className="grid gap-1.5 text-sm font-semibold">Subject
            <input name="subject" defaultValue={panel.draft.subject} className="field min-h-11 px-3 font-normal" maxLength={200} required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Message
            <textarea name="body" rows={7} defaultValue={panel.draft.body} className="field resize-y p-3 font-normal leading-6" maxLength={10000} required />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="action action-secondary" disabled={!!pending} onClick={closePanel}>Close</button>
            <button type="submit" className="action" disabled={!!pending || !panel.draft.recipient}>
              {pending ? 'Processing…' : panel.draft.demo ? 'Simulate sending' : 'Send reminder'}
            </button>
          </div>
        </form>
      </Modal>}

      {panel?.name === 'history' && <Modal title="Payment history" onClose={closePanel}>
        <ul className="divide-y divide-line">
          {panel.invoice.payments.map(payment => <li key={payment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div><p className="font-semibold capitalize">{payment.method.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-copy">{formatTimestamp(payment.date)}</p></div>
            <p className="font-semibold tabular-nums">{currency.format(payment.amount)}</p>
          </li>)}
        </ul>
      </Modal>}
    </DashboardLayout>
  );
}
