import { ArrowRight, CalendarDays, Check, FileText, ListChecks, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import Brand from '@/components/Brand';

const steps = [
  { icon: FileText, title: 'Review the contract', detail: 'Upload a document and extract the payment terms, key obligations, and risks.' },
  { icon: ListChecks, title: 'Track the work', detail: 'Set milestones, log time, and compare new work against the agreed scope.' },
  { icon: ReceiptText, title: 'Manage billing', detail: 'Track invoices, record payments, and draft reminders for outstanding balances.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line">
        <div className="public-container flex min-h-[72px] flex-wrap items-center justify-between gap-3 py-3">
          <Brand />
          <nav className="flex items-center gap-4 sm:gap-7" aria-label="Main navigation">
            <a href="#workflow" className="hidden text-sm font-medium text-copy hover:text-brand sm:block">Workflow</a>
            <Link href="/login" className="text-sm font-semibold text-ink hover:text-brand">Sign in</Link>
            <span className="hidden sm:inline"><Link href="/register" className="action action-small">Get started <ArrowRight size={15} aria-hidden="true" /></Link></span>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-line bg-canvas">
          <div className="public-container grid items-center gap-12 py-14 sm:py-18 lg:grid-cols-[1fr_1fr] lg:gap-17 lg:py-20">
            <div>
              <p className="mb-4 text-sm font-semibold text-brand">For freelancers and service teams</p>
              <h1 className="max-w-[570px] text-[clamp(2.6rem,5.2vw,4.7rem)] font-bold leading-[1.02] tracking-[-0.062em] text-ink">
                Contracts, work, and billing in one place.
              </h1>
              <p className="mt-5 max-w-[440px] text-base leading-7 text-copy sm:text-lg">
                Turn signed agreements into clear milestones and keep track of what clients owe.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className="action">Create an account <ArrowRight size={17} aria-hidden="true" /></Link>
                <a href="#workflow" className="action action-secondary">See how it works</a>
              </div>
            </div>

            <div className="product-preview rounded-2xl p-4 text-white sm:p-7" aria-label="Example contract brief">
              <div className="mb-5 flex items-center gap-2.5">
                <FileText size={18} className="text-[#b9cbf8]" aria-hidden="true" />
                <span className="text-sm font-semibold">Example contract</span>
              </div>
              <div className="rounded-xl bg-white p-5 text-ink sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="text-xs leading-5 text-copy">Service agreement</p>
                    <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">Studio website redesign</p>
                  </div>
                  <span className="rounded-md bg-brand-light px-2 py-1 text-xs font-semibold text-brand-dark">Reviewed</span>
                </div>
                <dl className="grid grid-cols-2 gap-3 border-b border-line py-4">
                  <div><dt className="text-xs text-copy">Contract value</dt><dd className="mt-1 text-lg font-bold">$4,800.00</dd></div>
                  <div><dt className="text-xs text-copy">Payment terms</dt><dd className="mt-1 text-lg font-bold">Net 15</dd></div>
                </dl>
                <div className="mt-4 grid gap-3 text-sm">
                  <p className="flex items-center gap-2.5"><Check size={16} className="text-emerald-700" aria-hidden="true" /> Project kickoff <span className="ml-auto text-xs text-copy">Complete</span></p>
                  <p className="flex items-center gap-2.5"><CalendarDays size={16} className="text-brand" aria-hidden="true" /> Design approval <span className="ml-auto text-xs text-copy">Upcoming</span></p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="public-container py-12 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">From agreement to payment</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, detail }) => (
              <article key={title} className="surface-card p-5 sm:p-6">
                <Icon size={21} className="mb-3 text-brand" aria-hidden="true" />
                <h3 className="text-base font-bold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-copy">{detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="public-container py-6"><Brand /></div>
      </footer>
    </div>
  );
}
