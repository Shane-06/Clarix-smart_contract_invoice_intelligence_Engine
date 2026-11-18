'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Upload } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { PageHeading, QueryState, Status } from '@/components/WorkspaceUI';
import { useWorkspaceQuery } from '@/lib/useWorkspaceQuery';
import { formatTimestamp, type ContractSummary } from '@/lib/workspace';

export default function ContractsPage() {
  const { data: contracts, error } = useWorkspaceQuery<ContractSummary[]>('/contracts');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeading title="Contracts" description="Review agreements, risk assessments, and linked milestones."
          action={<Link href="/contracts/upload" className="action"><Upload size={16} aria-hidden="true" /> Upload contract</Link>} />
        {!contracts ? <QueryState error={error} /> : contracts.length === 0 ? (
          <section className="surface-card p-8 sm:p-10">
            <FileText size={24} className="text-brand" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Add your first contract</h2>
            <p className="mt-2 text-sm text-copy">Upload an agreement to start tracking the work and payments it covers.</p>
            <Link href="/contracts/upload" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
              Upload a contract <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contracts.map(contract => (
              <Link href={'/contracts/' + contract.id} key={contract.id} className="surface-card surface-link flex min-w-0 flex-col p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-light text-brand"><FileText size={17} aria-hidden="true" /></span>
                  <Status status={contract.status} demo={contract.isDemo} />
                </div>
                <h2 className="break-words text-lg font-bold tracking-tight">{contract.title}</h2>
                <p className="mt-2 mb-4 line-clamp-2 text-sm leading-6 text-copy">{contract.summary || 'Summary unavailable.'}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs text-copy">
                  <p>Added {formatTimestamp(contract.createdAt)}</p>
                  <p>{contract._count.milestones} {contract._count.milestones === 1 ? 'milestone' : 'milestones'}</p>
                  {contract.riskScore !== null && <p>Risk {contract.riskScore}/10</p>}
                  <ArrowRight size={16} className="ml-auto text-brand" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
