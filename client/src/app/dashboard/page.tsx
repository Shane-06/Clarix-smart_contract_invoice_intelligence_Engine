'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, CircleDollarSign, FileText, ReceiptText, Wallet } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { PageHeading, QueryState, Status } from '@/components/WorkspaceUI';
import { useWorkspaceQuery } from '@/lib/useWorkspaceQuery';
import { currency, formatDate, formatTimestamp, type ContractSummary, type Invoice, type Milestone } from '@/lib/workspace';

export default function DashboardPage() {
  const contracts = useWorkspaceQuery<ContractSummary[]>('/contracts');
  const invoices = useWorkspaceQuery<Invoice[]>('/invoices');
  const milestones = useWorkspaceQuery<Milestone[]>('/milestones');
  const error = contracts.error || invoices.error || milestones.error;

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <PageHeading title="Overview" description="See what’s active, what’s due, and what’s been paid."
          action={<Link href="/contracts/upload" className="action">Upload contract <ArrowRight size={17} aria-hidden="true" /></Link>} />
        {contracts.data && invoices.data && milestones.data
          ? <Overview contracts={contracts.data} invoices={invoices.data} milestones={milestones.data} />
          : <QueryState error={error} />}
      </div>
    </DashboardLayout>
  );
}

function Overview({ contracts, invoices, milestones }: { contracts: ContractSummary[]; invoices: Invoice[]; milestones: Milestone[] }) {
  const totals = invoices.reduce((total, item) => ({
    billed: total.billed + Math.round(item.amount * 100),
    paid: total.paid + Math.round(item.paidAmount * 100),
    due: total.due + Math.round(item.balance * 100),
  }), { billed: 0, paid: 0, due: 0 });
  const stats = [
    { icon: FileText, label: 'Contracts', value: contracts.length },
    { icon: ReceiptText, label: 'Invoiced', value: currency.format(totals.billed / 100) },
    { icon: CircleDollarSign, label: 'Collected', value: currency.format(totals.paid / 100), color: 'text-emerald-800 bg-emerald-50' },
    { icon: Wallet, label: 'Outstanding', value: currency.format(totals.due / 100), color: 'text-amber-900 bg-amber-50' },
  ];
  const openMilestones = milestones.filter(item => item.status !== 'COMPLETED');
  const nextMilestones = openMilestones.slice(0, 5);
  const completed = milestones.length - openMilestones.length;

  return (
    <>
      <dl className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="surface-card flex items-start gap-3 p-4 sm:p-5">
            <span className={'grid size-9 shrink-0 place-items-center rounded-lg ' + (color || 'bg-brand-light text-brand')}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-copy sm:text-sm">{label}</dt>
              <dd className="mt-1 break-words text-xl font-bold tracking-tight tabular-nums sm:text-2xl">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <section className="surface-card min-w-0 self-start">
          <SectionHeader title="Recent contracts" href="/contracts" />
          {contracts.length === 0 ? <div className="px-5 py-8">
            <FileText size={22} className="text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">No contracts yet</p>
            <p className="mt-1 text-sm text-copy">Upload an agreement to review its terms and add milestones.</p>
            <Link href="/contracts/upload" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              Upload a contract <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div> : <ul className="divide-y divide-line">
            {contracts.slice(0, 5).map(contract => <li key={contract.id}>
              <Link href={'/contracts/' + contract.id} className="flex min-w-0 items-center gap-3 px-5 py-3.5 hover:bg-surface-soft">
                <FileText size={18} className="shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{contract.title}</span>
                  <span className="mt-1 block text-xs text-copy">Added {formatTimestamp(contract.createdAt)}</span>
                </span>
                <Status status={contract.status} demo={contract.isDemo} />
              </Link>
            </li>)}
          </ul>}
        </section>

        <section className="surface-card min-w-0 self-start">
          <SectionHeader title="Open milestones" href="/milestones" />
          {milestones.length > 0 && <div className="grid gap-2 border-b border-line px-5 py-3">
            <p className="text-xs font-semibold text-copy">{completed} of {milestones.length} complete</p>
            <progress aria-label="Milestone completion" max={milestones.length} value={completed}
              className="h-1.5 w-full rounded-full bg-brand-light accent-brand" />
          </div>}
          {nextMilestones.length === 0 ? <div className="px-5 py-8">
            <CalendarDays size={22} className="text-brand" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">No open milestones</p>
            <p className="mt-1 text-sm text-copy">Milestones with due dates will appear here.</p>
          </div> : <ul className="divide-y divide-line">
            {nextMilestones.map(milestone => <li key={milestone.id} className="flex min-w-0 items-center gap-3 px-5 py-3.5">
              <CalendarDays size={18} className="shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{milestone.title}</p>
                <p className="mt-1 truncate text-xs text-copy">{milestone.contract.title}</p>
              </div>
              <time dateTime={milestone.dueDate} className="shrink-0 text-xs font-semibold text-copy">{formatDate(milestone.dueDate)}</time>
            </li>)}
          </ul>}
        </section>
      </div>
    </>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
    <h2 className="text-base font-bold tracking-tight">{title}</h2>
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
      View all <ArrowRight size={15} aria-hidden="true" />
    </Link>
  </div>;
}
