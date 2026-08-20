'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Sparkles, 
  ShieldAlert, 
  DollarSign, 
  Mail, 
  ArrowRight,
  MessageSquare,
  Compass
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      title: 'AI Contract Extraction',
      description: 'Upload your contract PDFs or DOCX. AI automatically extracts client terms, payments, and key details in seconds.',
      icon: FileText,
      color: 'from-violet-500 to-purple-500'
    },
    {
      title: 'Auto Milestone Tracking',
      description: 'Milestones are automatically identified and imported into your checklist, giving you exact deadlines.',
      icon: Compass,
      color: 'from-indigo-500 to-blue-500'
    },
    {
      title: 'Risk Clause Intelligence',
      description: 'Calculates a visual Risk Score (1-10) and flags missing protections (like Indemnity or Termination Notice).',
      icon: ShieldAlert,
      color: 'from-pink-500 to-rose-500'
    },
    {
      title: 'Smart Invoice Reminders',
      description: 'Convert milestones to invoices instantly, and dispatch personalized, professional, AI-written reminders via Resend.',
      icon: Mail,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      title: 'Contract Q&A Chat',
      description: 'Ask questions about your contract directly in the context-aware sidebar chatbot (e.g. \"What is the cancellation term?\").',
      icon: MessageSquare,
      color: 'from-amber-500 to-orange-500'
    },
    {
      title: 'Scope Creep Detection',
      description: 'Log your completed hours. AI compares daily work descriptions against the deliverables to detect scope creep.',
      icon: Sparkles,
      color: 'from-cyan-500 to-sky-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-mesh flex flex-col">
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-6 md:px-12 border-b border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">
            I
          </div>
          <span className="font-bold tracking-tight text-lg text-white">InvoiceIntel</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="glow-btn bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-violet-500/10"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-semibold mb-6 animate-pulse">
          <Sparkles className="h-3 w-3" /> Introducing AI Contract Intelligence
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 mb-6 max-w-3xl leading-[1.1]">
          Manage Freelance Contracts, Payments, and Milestones with AI
        </h1>
        
        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed">
          Upload PDF or Word contracts. Auto-extract deliverables, construct client milestones, detect contract risk clauses, and trigger polite payment reminder emails.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
          <Link 
            href="/register" 
            className="glow-btn bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 active:scale-95"
          >
            Start Analyzing Contracts <ArrowRight className="h-5 w-5" />
          </Link>
          <Link 
            href="/login" 
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 px-8 py-3.5 rounded-xl text-base font-semibold transition-all border border-zinc-800 flex items-center justify-center hover:border-zinc-700 active:scale-95"
          >
            Access Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left pt-12 border-t border-zinc-900/60">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx}
                className="glass-card rounded-2xl p-6 border border-zinc-900 relative overflow-hidden"
              >
                <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-200 mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-6 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} InvoiceIntel Engine. All rights reserved. Created for Next-Gen Freelance Management.
      </footer>
    </div>
  );
}
