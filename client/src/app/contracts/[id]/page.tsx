'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, LoaderCircle, MessageSquare, RefreshCw, Send } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Modal, Notice, PageHeading, QueryState, Status } from '@/components/WorkspaceUI';
import { errorMessage, useAuth } from '@/context/AuthContext';
import { useWorkspaceQuery } from '@/lib/useWorkspaceQuery';
import { currency, formatDate, formatTimestamp, type ContractSummary, type Invoice, type Milestone } from '@/lib/workspace';

type WorkLog = { id: string; description: string; hours: number; date: string };
type ScopeResult = { hasScopeCreep: boolean; creepItems: { logDescription: string; explanation: string }[] };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Section = 'Summary' | 'Milestones' | 'Work logs';
type Contract = Omit<ContractSummary, '_count'> & {
  hasFile: boolean;
  clientEmail: string | null;
  milestones: Milestone[];
  invoices: Invoice[];
  workLogs: WorkLog[];
  analysis: {
    clientName: string;
    contractValue: number;
    paymentTerms: string;
    milestones: { title: string; dueDate: string }[];
    deliverables: string[];
    clauses: { title: string; description: string; riskLevel: string }[];
  } | null;
  riskDetails: { missingClauses: string[]; recommendations: string[] } | null;
};

export default function ContractDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useWorkspaceQuery<Contract>('/contracts/' + id);
  return (
    <DashboardLayout>
      <div className="space-y-5">
        <Link href="/contracts" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Contracts
        </Link>
        {data ? <ContractDetails key={id} contract={data} reload={reload} /> : <QueryState error={error} />}
      </div>
    </DashboardLayout>
  );
}

function ContractDetails({ contract, reload }: { contract: Contract; reload: () => void }) {
  const { apiFetch, apiResponse } = useAuth();
  const [section, setSection] = useState<Section>('Summary');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [editContact, setEditContact] = useState(false);
  const [contactError, setContactError] = useState('');
  const [scope, setScope] = useState<ScopeResult | null>(null);
  const endpoint = '/contracts/' + contract.id;

  async function run(action: string, work: () => Promise<void>) {
    setError('');
    setBusy(action);
    try {
      await work();
    } catch (error) {
      const message = errorMessage(error, 'Unable to complete the request.');
      if (action === 'contact') setContactError(message);
      else setError(message);
    } finally {
      setBusy('');
    }
  }

  function download() {
    void run('download', async () => {
      const response = await apiResponse(endpoint + '/download');
      const name = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/i)?.[1] || 'contract';
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('clientEmail')).trim();
    setContactError('');
    void run('contact', async () => {
      await apiFetch(endpoint + '/contact', { method: 'PATCH', body: JSON.stringify({ clientEmail: email || null }) });
      setEditContact(false);
      reload();
    });
  }

  function logWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    void run('log', async () => {
      await apiFetch(endpoint + '/worklog', {
        method: 'POST',
        body: JSON.stringify({ description: values.get('description'), hours: Number(values.get('hours')) }),
      });
      form.reset();
      setScope(null);
      reload();
    });
  }

  return (
    <>
      <PageHeading title={contract.title} description={'Added ' + formatTimestamp(contract.createdAt)}
        action={contract.hasFile && <button type="button" className="action action-secondary" onClick={download} disabled={!!busy}>
          <Download size={16} aria-hidden="true" /> {busy === 'download' ? 'Downloading…' : 'Download original'}
        </button>} />
      {error && <Notice>{error}</Notice>}
      {contract.isDemo && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Demo analysis uses sample terms and risk findings. Your uploaded file is available to download.
      </p>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4">
          <section className="surface-card min-w-0" aria-label="Contract details">
            <div className="flex flex-wrap gap-1 border-b border-line px-3 pt-2 sm:px-4">
              {(['Summary', 'Milestones', 'Work logs'] as const).map(item => (
                <button type="button" aria-pressed={section === item} key={item} onClick={() => { setSection(item); setError(''); }}
                  className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (section === item
                    ? 'border-brand text-brand' : 'border-transparent text-copy hover:text-ink')}>
                  {item}
                </button>
              ))}
            </div>
            <div className="p-5 sm:p-6">
              {section === 'Summary' && <ContractSummaryPanel contract={contract} analyzing={busy === 'analysis'} busy={!!busy}
                refresh={() => void run('analysis', async () => { await apiFetch(endpoint + '/analyze', { method: 'POST' }); reload(); })} />}
              {section === 'Milestones' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold">Milestone schedule</h2>
                    <Link href="/milestones" className="text-sm font-semibold text-brand hover:underline">Manage milestones</Link>
                  </div>
                  {!contract.milestones.length ? <p className="mt-4 text-sm text-copy">There are no dated milestones for this contract.</p> :
                    <ul className="mt-3 divide-y divide-line">
                      {contract.milestones.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                        <span className="min-w-[8rem] flex-1 font-semibold">{item.title}</span><span className="text-copy">{formatDate(item.dueDate)}</span><Status status={item.status} />
                      </li>)}
                    </ul>}
                  {contract.analysis?.milestones.some(item => !item.dueDate) && <div className="mt-5 border-t border-line pt-4">
                    <h3 className="text-sm font-semibold">Mentioned without a date</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-copy">{contract.analysis.milestones.filter(item => !item.dueDate)
                      .map((item, index) => <li key={index}>{item.title}</li>)}</ul>
                  </div>}
                </div>
              )}
              {section === 'Work logs' && (
                <div className="space-y-5">
                  <h2 className="text-base font-bold">Log work against the contract</h2>
                  <form onSubmit={logWork} className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
                    <label className="grid gap-1.5 text-sm font-semibold">Activity
                      <input name="description" className="field min-h-10 px-3 font-normal" required maxLength={2000} />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">Hours
                      <input name="hours" className="field min-h-10 px-3 font-normal" required type="number" min="0.01" step="0.01" />
                    </label>
                    <button className="action" type="submit" disabled={!!busy}>{busy === 'log' ? 'Saving…' : 'Add log'}</button>
                  </form>
                  {contract.workLogs.length > 0 ? (
                    <>
                      <ul className="divide-y divide-line border-y border-line">
                        {contract.workLogs.map(item => <li key={item.id} className="flex flex-wrap gap-3 py-3 text-sm">
                          <span className="min-w-32 flex-1 break-words font-semibold">{item.description}</span>
                          <span className="text-copy">{item.hours} hr · {formatTimestamp(item.date)}</span>
                        </li>)}
                      </ul>
                      <button type="button" className="action action-secondary" disabled={!!busy}
                        onClick={() => void run('scope', async () => setScope(await apiFetch<ScopeResult>(endpoint + '/creep')))}>
                        {busy === 'scope' ? 'Checking…' : 'Check against scope'}
                      </button>
                    </>
                  ) : <p className="text-sm text-copy">No work logged yet.</p>}
                  {scope && <div role="status" className="rounded-lg border border-line bg-canvas p-4 text-sm">
                    <h3 className="font-bold">{scope.hasScopeCreep ? 'Potential scope changes' : 'No out-of-scope work identified'}</h3>
                    {scope.creepItems.map((item, index) => <p key={index} className="mt-2 text-copy"><strong>{item.logDescription}</strong> · {item.explanation}</p>)}
                  </div>}
                </div>
              )}
            </div>
          </section>

          <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold">Client contact</h2>
              <p className="mt-1 break-all text-sm text-copy">{contract.clientEmail || 'No email added'}</p>
            </div>
            <button type="button" className="action action-secondary action-small"
              onClick={() => { setContactError(''); setEditContact(true); }}>Edit email</button>
          </section>

          {contract.invoices.length > 0 && <section className="surface-card p-5">
            <div className="flex justify-between gap-3"><h2 className="text-sm font-bold">Linked invoices</h2>
              <Link href="/invoices" className="text-sm font-semibold text-brand hover:underline">View invoices</Link></div>
            <ul className="mt-3 divide-y divide-line">
              {contract.invoices.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="flex-1 font-semibold">{currency.format(item.amount)}</span><span className="text-copy">Due {formatDate(item.dueDate)}</span>
                <Status status={item.status} />
              </li>)}
            </ul>
          </section>}
        </div>
        <ContractChat endpoint={endpoint} />
      </div>
      {editContact && <Modal title="Edit client email" onClose={() => { if (!busy) setEditContact(false); }}>
        <form onSubmit={saveContact} className="grid gap-4">
          {contactError && <Notice>{contactError}</Notice>}
          <label className="grid gap-1.5 text-sm font-semibold">Client email
            <input type="email" name="clientEmail" className="field min-h-11 px-3 font-normal" maxLength={254}
              defaultValue={contract.clientEmail || ''} />
            <span className="text-xs font-normal text-copy">Used for reminders. Leave blank to remove the email.</span>
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="action action-secondary" disabled={!!busy} onClick={() => setEditContact(false)}>Cancel</button>
            <button type="submit" className="action" disabled={!!busy}>{busy ? 'Saving…' : 'Save email'}</button>
          </div>
        </form>
      </Modal>}
    </>
  );
}

function ContractSummaryPanel({ contract, refresh, analyzing, busy }: {
  contract: Contract; refresh: () => void; analyzing: boolean; busy: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5"><h2 className="text-base font-bold">Contract summary</h2><Status status={contract.status} demo={contract.isDemo} /></div>
        <button type="button" onClick={refresh} disabled={busy} className="action action-secondary action-small">
          <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} aria-hidden="true" /> {analyzing ? 'Analyzing…' : 'Reanalyze'}
        </button>
      </div>
      <p className="text-sm leading-6 text-copy">{contract.summary || 'A summary is unavailable.'}</p>
      <dl className="grid gap-4 rounded-lg border border-line bg-surface-soft p-4 sm:grid-cols-3">
        <div><dt className="text-xs font-semibold text-copy">Client</dt><dd className="mt-1 break-words text-sm font-semibold">{contract.analysis?.clientName || '—'}</dd></div>
        <div><dt className="text-xs font-semibold text-copy">Contract value</dt><dd className="mt-1 text-sm font-semibold">
          {contract.analysis?.contractValue ? currency.format(contract.analysis.contractValue) : '—'}</dd></div>
        <div><dt className="text-xs font-semibold text-copy">Risk score</dt><dd className="mt-1 text-sm font-semibold">{contract.riskScore === null ? '—' : contract.riskScore + '/10'}</dd></div>
      </dl>
      {contract.analysis?.paymentTerms && <div><h3 className="text-sm font-bold">Payment terms</h3><p className="mt-1 text-sm leading-6 text-copy">{contract.analysis.paymentTerms}</p></div>}
      {!!contract.analysis?.deliverables.length && <TextList title="Deliverables" items={contract.analysis.deliverables} />}
      {!!contract.analysis?.clauses.length && <div>
        <h3 className="text-sm font-bold">Key clauses</h3>
        <ul className="mt-2 space-y-2 text-sm text-copy">{contract.analysis.clauses.map((clause, index) =>
          <li key={index}><strong className="text-ink">{clause.title}</strong> · {clause.description}</li>)}</ul>
      </div>}
      {!!contract.riskDetails?.missingClauses.length && <TextList title="Clauses to verify" items={contract.riskDetails.missingClauses} />}
      {!!contract.riskDetails?.recommendations.length && <TextList title="Recommendations" items={contract.riskDetails.recommendations} />}
    </div>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="text-sm font-bold">{title}</h3>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-copy">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  </div>;
}

function ContractChat({ endpoint }: { endpoint: string }) {
  const { apiFetch } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const thread = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setPending(true);
    setError('');
    try {
      const result = await apiFetch<{ reply: string }>(endpoint + '/chat', {
        method: 'POST', body: JSON.stringify({ message, history: messages.slice(-20).map(item => ({ ...item, content: item.content.slice(0, 16000) })) }),
      });
      setMessages(previous => [...previous, { role: 'user', content: message }, { role: 'assistant', content: result.reply }]);
      setQuestion('');
      requestAnimationFrame(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; });
    } catch (error) {
      setError(errorMessage(error, 'Unable to answer the question.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="surface-card min-w-0" aria-label="Contract assistant">
      <div className="flex items-center gap-2.5 border-b border-line p-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-light text-brand"><MessageSquare size={16} aria-hidden="true" /></span>
        <h2 className="text-sm font-bold">Ask this contract</h2>
      </div>
      <div ref={thread} aria-live="polite" className="max-h-[460px] min-h-[160px] overflow-y-auto p-4">
        {messages.length === 0 ? <div className="space-y-3">
          <p className="text-sm text-copy">Ask about deadlines, obligations, or payment terms.</p>
          <div className="flex flex-wrap gap-2">
            {['What are the payment terms?', 'What are the key deadlines?'].map(prompt =>
              <button key={prompt} type="button" disabled={pending} onClick={() => void send(prompt)}
                className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-light">{prompt}</button>)}
          </div>
        </div> : <ul className="space-y-3">
          {messages.map((item, index) => <li key={index} className={'max-w-[94%] rounded-lg p-3 text-sm leading-6 whitespace-pre-wrap wrap-anywhere ' +
            (item.role === 'user' ? 'ml-auto bg-brand-light text-brand-dark' : 'bg-canvas text-ink')}>
            {item.content}
          </li>)}
        </ul>}
        {pending && <p className="mt-3 flex items-center gap-2 text-xs text-copy"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Reading contract…</p>}
        {error && <div className="mt-3"><Notice>{error}</Notice></div>}
      </div>
      <form onSubmit={event => { event.preventDefault(); void send(question); }} className="flex items-center gap-2 border-t border-line p-3">
        <input aria-label="Question about this contract" value={question} onChange={event => setQuestion(event.target.value)}
          placeholder="Ask a question…" className="field min-h-10 w-full min-w-0 px-3 text-sm" maxLength={2000} />
        <button className="action action-small size-10 shrink-0" type="submit" aria-label="Send question" disabled={!question.trim() || pending}>
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
