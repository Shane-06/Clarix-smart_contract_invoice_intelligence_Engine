'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, LoaderCircle, X } from 'lucide-react';

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-copy">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Notice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <p role={success ? 'status' : 'alert'} className={'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ' +
    (success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800')}>
    {!success && <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}
    {children}
  </p>;
}

export function QueryState({ error }: { error?: string }) {
  return error ? <Notice>{error}</Notice> :
    <p role="status" className="flex items-center gap-2 px-2 py-8 text-sm text-copy">
      <LoaderCircle size={18} className="animate-spin text-brand" aria-hidden="true" /> Loading…
    </p>;
}

const statuses: Record<string, { name: string; color: string }> = {
  ANALYZED: { name: 'Analyzed', color: 'bg-brand-light text-brand-dark' },
  DRAFT: { name: 'Draft', color: 'bg-canvas text-copy' },
  PENDING: { name: 'Pending', color: 'bg-amber-50 text-amber-900' },
  UNPAID: { name: 'Unpaid', color: 'bg-amber-50 text-amber-900' },
  OVERDUE: { name: 'Overdue', color: 'bg-red-50 text-red-800' },
  PAID: { name: 'Paid', color: 'bg-emerald-50 text-emerald-800' },
  COMPLETED: { name: 'Complete', color: 'bg-emerald-50 text-emerald-800' },
  ACTIVE: { name: 'Active', color: 'bg-brand-light text-brand-dark' },
};

export function Status({ status, demo = false }: { status: string; demo?: boolean }) {
  const style = demo ? { name: 'Demo analysis', color: 'bg-amber-50 text-amber-900' } :
    (statuses[status] || { name: status, color: 'bg-canvas text-copy' });
  return <span className={'inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold ' + style.color}>{style.name}</span>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-label={title}
      className="fixed inset-0 m-auto max-h-[calc(100%-2rem)] w-[min(31rem,calc(100%-2rem))] overflow-auto rounded-xl border border-line bg-surface text-ink shadow-xl backdrop:bg-slate-950/35">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-md p-1.5 text-copy hover:bg-canvas">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
