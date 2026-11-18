'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, Plus, Trash2, Undo2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Notice, PageHeading, QueryState, Status } from '@/components/WorkspaceUI';
import { errorMessage, useAuth } from '@/context/AuthContext';
import { useWorkspaceQuery } from '@/lib/useWorkspaceQuery';
import { formatDate, type ContractSummary, type Milestone } from '@/lib/workspace';

export default function MilestonesPage() {
  const { apiFetch } = useAuth();
  const { data: milestones, error: queryError, reload } = useWorkspaceQuery<Milestone[]>('/milestones');
  const contracts = useWorkspaceQuery<ContractSummary[]>('/contracts');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');

  async function update(path: string, options: RequestInit, operation: string) {
    setError('');
    setPending(operation);
    try {
      await apiFetch(path, options);
      setShowCreate(false);
      setDeleteTarget(null);
      reload();
    } catch (error) {
      setError(errorMessage(error, 'Unable to update milestones.'));
    } finally {
      setPending('');
    }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void update('/milestones', { method: 'POST', body: JSON.stringify(values) }, 'create');
  }

  function toggle(item: Milestone) {
    const status = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    void update('/milestones/' + item.id, { method: 'PATCH', body: JSON.stringify({ status }) }, item.id);
  }

  function close() {
    if (pending) return;
    setShowCreate(false);
    setDeleteTarget(null);
    setError('');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeading title="Milestones" description="Track deliverables and deadlines across your contracts."
          action={<button type="button" className="action" disabled={!contracts.data?.length}
            onClick={() => { setError(''); setShowCreate(true); }}><Plus size={17} aria-hidden="true" /> New milestone</button>} />
        {error && !showCreate && !deleteTarget && <Notice>{error}</Notice>}
        {!milestones ? <QueryState error={queryError} /> : milestones.length === 0 ? (
          <section className="surface-card p-8">
            <CalendarDays size={24} className="text-brand" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">No milestones yet</h2>
            <p className="mt-2 text-sm text-copy">Add a dated deliverable to start tracking progress.</p>
            {contracts.data?.length === 0 && <Link href="/contracts/upload" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Upload a contract</Link>}
          </section>
        ) : (
          <section className="surface-card overflow-hidden" aria-label="Milestones">
            <ul className="divide-y divide-line">
              {milestones.map(item => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-light text-brand"><CalendarDays size={18} aria-hidden="true" /></span>
                  <div className="min-w-[9rem] flex-1">
                    <p className="break-words text-sm font-semibold">{item.title}</p>
                    <Link href={'/contracts/' + item.contractId} className="mt-1 block w-fit text-xs text-brand hover:underline">{item.contract.title}</Link>
                  </div>
                  <time dateTime={item.dueDate} className="text-sm text-copy">{formatDate(item.dueDate)}</time>
                  <Status status={item.status} />
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" className="action action-secondary action-small" disabled={!!pending} onClick={() => toggle(item)}>
                      {item.status === 'COMPLETED' ? <><Undo2 size={14} aria-hidden="true" /> Reopen</> : <><Check size={14} aria-hidden="true" /> Complete</>}
                    </button>
                    <button type="button" aria-label={'Delete ' + item.title} title="Delete milestone" disabled={!!pending}
                      onClick={() => { setError(''); setDeleteTarget(item); }} className="rounded-md p-2 text-copy hover:bg-red-50 hover:text-red-800">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {showCreate && <Modal title="New milestone" onClose={close}>
        <form onSubmit={create} className="grid gap-4">
          {error && <Notice>{error}</Notice>}
          <label className="grid gap-1.5 text-sm font-semibold">Contract
            <select name="contractId" className="field min-h-11 px-3 font-normal" required>
              <option value="">Choose a contract</option>
              {contracts.data?.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Milestone name
            <input name="title" className="field min-h-11 px-3 font-normal" required maxLength={200} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">Due date
            <input name="dueDate" type="date" className="field min-h-11 px-3 font-normal" required />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="action action-secondary" disabled={!!pending} onClick={close}>Cancel</button>
            <button type="submit" className="action" disabled={!!pending}>{pending ? 'Saving…' : 'Create milestone'}</button>
          </div>
        </form>
      </Modal>}

      {deleteTarget && <Modal title="Delete milestone?" onClose={close}>
        <div className="space-y-4">
          {error && <Notice>{error}</Notice>}
          <p className="text-sm leading-6 text-copy">Remove <strong>{deleteTarget.title}</strong> from the contract. Linked invoices will be retained.</p>
          <div className="flex justify-end gap-3">
            <button type="button" className="action action-secondary" disabled={!!pending} onClick={close}>Cancel</button>
            <button type="button" disabled={!!pending} className="action action-danger"
              onClick={() => void update('/milestones/' + deleteTarget.id, { method: 'DELETE' }, deleteTarget.id)}>
              {pending ? 'Deleting…' : 'Delete milestone'}
            </button>
          </div>
        </div>
      </Modal>}
    </DashboardLayout>
  );
}
