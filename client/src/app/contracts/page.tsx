'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  FileText, 
  Upload, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Contract {
  id: string;
  title: string;
  fileUrl: string | null;
  summary: string | null;
  riskScore: number | null;
  status: string;
  createdAt: string;
  _count: {
    milestones: number;
    invoices: number;
  };
}

export default function ContractsPage() {
  const { apiFetch } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/contracts');
      setContracts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to download contract records.');
    } finally {
      setLoading(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Contracts Registry</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-normal">Manage all uploaded agreements, review summary cards, and trigger AI audits.</p>
          </div>
          <Link
            href="/contracts/upload"
            className="inline-flex items-center gap-2 glow-btn bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-md shadow-violet-600/10 cursor-pointer w-fit"
          >
            <Upload className="h-4 w-4" /> Upload Contract
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* List of Contracts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contracts.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-12 border border-zinc-900 text-center flex flex-col items-center justify-center">
              <FileText className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No contracts registered</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm">Upload a PDF or Word document to parse deliverables and assess compliance.</p>
            </div>
          ) : (
            contracts.map((c) => (
              <div 
                key={c.id} 
                className="glass-card rounded-2xl p-6 border border-zinc-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="text-base font-bold text-zinc-200 line-clamp-1">{c.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      c.status === 'ANALYZED'
                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-450 leading-relaxed line-clamp-3 mb-6 font-normal">
                    {c.summary || 'Summary pending analysis...'}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-900/60 text-xs">
                  <div className="flex items-center gap-3">
                    {c.riskScore !== null && (
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.riskScore > 6 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : c.riskScore > 3
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        Risk: {c.riskScore}/10
                      </div>
                    )}
                    <span className="text-[10px] text-zinc-500 font-semibold">{c._count.milestones} Milestones</span>
                  </div>

                  <Link 
                    href={`/contracts/${c.id}`} 
                    className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 font-bold transition-all"
                  >
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
