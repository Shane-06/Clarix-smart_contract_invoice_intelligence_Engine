'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Notice, PageHeading } from '@/components/WorkspaceUI';
import { errorMessage, useAuth } from '@/context/AuthContext';

export default function UploadContractPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function chooseFile(newFile?: File) {
    if (!newFile) return;
    setFile(null);
    if (!/\.(pdf|docx|txt)$/i.test(newFile.name)) {
      setError('Choose a PDF, DOCX, or TXT file.');
      return;
    }
    if (newFile.size > 10 * 1024 * 1024) {
      setError('The file must be 10 MB or smaller.');
      return;
    }
    setError('');
    setFile(newFile);
    if (!title) setTitle(newFile.name.replace(/\.[^.]+$/, '').slice(0, 200));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const form = new FormData(event.currentTarget);
    form.set('file', file);
    setError('');
    setBusy(true);
    try {
      const result = await apiFetch<{ contract: { id: string } }>('/contracts/upload', { method: 'POST', body: form });
      router.push('/contracts/' + result.contract.id);
    } catch (error) {
      setError(errorMessage(error, 'Unable to upload the contract.'));
      setBusy(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-[780px] space-y-5">
        <Link href="/contracts" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Contracts
        </Link>
        <PageHeading title="Upload contract" description="Add a document to extract milestones, payment terms, and potential risks." />
        <form onSubmit={submit} className="surface-card grid gap-5 p-5 sm:p-7">
          {error && <Notice>{error}</Notice>}
          <div>
            <p className="mb-2 text-sm font-semibold">Contract document</p>
            {file ? <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-4">
              <FileText size={22} className="shrink-0 text-brand" aria-hidden="true" />
              <p className="min-w-0 flex-1 break-words text-sm font-semibold">{file.name}</p>
              <button type="button" title="Remove file" aria-label="Remove file" disabled={busy} onClick={() => {
                setFile(null);
                if (fileInput.current) fileInput.current.value = '';
              }} className="rounded-md p-2 text-copy hover:bg-surface"><X size={17} aria-hidden="true" /></button>
            </div> : (
              <div onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
                onDragLeave={() => setDragging(false)} onDrop={event => {
                  event.preventDefault();
                  setDragging(false);
                  if (!busy) chooseFile(event.dataTransfer.files[0]);
                }}
                className={'grid justify-items-center rounded-xl border border-dashed px-4 py-9 text-center ' +
                  (dragging ? 'border-brand bg-brand-light' : 'border-[#b7c6dd] bg-surface-soft')}>
                <span className="grid size-10 place-items-center rounded-lg bg-brand-light text-brand"><Upload size={19} aria-hidden="true" /></span>
                <p className="mt-3 text-sm font-semibold">Drag your contract here</p>
                <p className="mt-1 text-xs text-copy">PDF, DOCX, or TXT, up to 10 MB</p>
                <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="action action-secondary action-small mt-4">Choose file</button>
              </div>
            )}
            <input ref={fileInput} type="file" accept=".pdf,.docx,.txt" hidden onChange={event => chooseFile(event.target.files?.[0])} />
          </div>
          <label className="grid gap-1.5 text-sm font-semibold">
            Contract title
            <input name="title" className="field min-h-11 px-3 font-normal" value={title} onChange={event => setTitle(event.target.value)}
              placeholder="e.g. Studio website redesign" maxLength={200} required disabled={busy} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Client email <span className="font-normal text-copy">(optional)</span></span>
            <input name="clientEmail" className="field min-h-11 px-3 font-normal" type="email" placeholder="client@example.com" disabled={busy} />
            <span className="text-xs font-normal text-copy">Used when you choose to send an invoice reminder.</span>
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
            <Link href="/contracts" className="action action-secondary">Cancel</Link>
            <button type="submit" className="action" disabled={!file || busy}>
              {busy ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Analyzing…</> :
                <>Upload and analyze <ArrowRight size={17} aria-hidden="true" /></>}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
