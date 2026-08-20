'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  FileText, 
  CheckSquare, 
  DollarSign, 
  TrendingUp, 
  Upload, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ContractSummary {
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

interface InvoiceSummary {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  contract: { title: string };
  milestone: { title: string } | null;
}

interface MilestoneSummary {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  contract: { title: string };
}

export default function DashboardPage() {
  const { apiFetch } = useAuth();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Parallel requests
        const [contractsData, invoicesData, milestonesData] = await Promise.all([
          apiFetch('/contracts'),
          apiFetch('/invoices'),
          apiFetch('/milestones')
        ]);
        setContracts(contractsData);
        setInvoices(invoicesData);
        setMilestones(milestonesData);
      } catch (err: any) {
        console.error('Failed to load dashboard metrics:', err);
        setError(err.message || 'Failed to sync workspace metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

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

  // Calculate statistics
  const totalContracts = contracts.length;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = invoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.amount, 0);
  
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;
  const pendingMilestones = milestones.filter(m => m.status === 'PENDING').length;
  const milestoneProgress = milestones.length > 0 
    ? Math.round((completedMilestones / milestones.length) * 100) 
    : 0;

  const upcomingMilestones = milestones
    .filter(m => m.status === 'PENDING')
    .slice(0, 4);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">Workspace Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">Monitor payments, track contracts, and execute reminder workflows.</p>
          </div>
          <Link
            href="/contracts/upload"
            className="inline-flex items-center gap-2 glow-btn bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-violet-600/10 cursor-pointer w-fit"
          >
            <Upload className="h-4 w-4" /> Upload New Contract
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Contracts Stats */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contracts</span>
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-100">{totalContracts}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Documents parsed and active</p>
          </div>

          {/* Cash Inflow Stats */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Received</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-100">${totalPaid.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Out of ${totalInvoiced.toLocaleString()} invoiced</p>
          </div>

          {/* Outstanding Stats */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Outstanding</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-100">${totalPending.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Overdue & unpaid invoices</p>
          </div>

          {/* Milestones Progress */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Milestones Progress</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <CheckSquare className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-100">{milestoneProgress}%</p>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${milestoneProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Dynamic Inner Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Contracts List */}
          <div className="lg:col-span-2 glass-card rounded-2xl border border-zinc-900 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-200">Recent Contracts</h3>
              <Link href="/contracts" className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                View all
              </Link>
            </div>
            
            <div className="divide-y divide-zinc-900/60 overflow-y-auto flex-1 max-h-[350px]">
              {contracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-zinc-600 mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">No contracts analyzed</p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-[240px]">Upload a contract document to start tracking milestones.</p>
                </div>
              ) : (
                contracts.slice(0, 5).map((contract) => (
                  <div key={contract.id} className="p-6 hover:bg-zinc-900/20 transition-all flex items-center justify-between">
                    <div className="min-w-0 pr-4">
                      <Link href={`/contracts/${contract.id}`} className="text-sm font-bold text-zinc-200 hover:text-violet-400 transition-colors truncate block">
                        {contract.title}
                      </Link>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                        <span>Created {new Date(contract.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{contract._count.milestones} milestones</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {contract.riskScore !== null && (
                        <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                          contract.riskScore > 6 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : contract.riskScore > 3
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          Risk: {contract.riskScore}/10
                        </div>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        contract.status === 'ANALYZED' 
                          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                          : contract.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Milestones Checklist */}
          <div className="glass-card rounded-2xl border border-zinc-900 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-900">
              <h3 className="text-base font-bold text-zinc-200">Upcoming Milestones</h3>
            </div>
            
            <div className="p-6 divide-y divide-zinc-900/60 overflow-y-auto flex-1 space-y-4">
              {upcomingMilestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckSquare className="h-10 w-10 text-zinc-600 mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">All caught up!</p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-[200px]">No upcoming pending milestones scheduled.</p>
                </div>
              ) : (
                upcomingMilestones.map((m) => (
                  <div key={m.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <div className="p-1 rounded bg-violet-600/10 text-violet-400 mt-0.5">
                      <Calendar className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{m.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{m.contract.title}</p>
                      <p className="text-[10px] text-violet-400 mt-1 font-semibold">
                        Due {new Date(m.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
