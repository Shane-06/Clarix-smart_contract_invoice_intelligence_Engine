'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  X,
  Trash2,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Contract {
  id: string;
  title: string;
}

interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  contract: { title: string };
  contractId: string;
}

export default function MilestonesPage() {
  const { apiFetch } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Milestone state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [mTitle, setMTitle] = useState('');
  const [mDueDate, setMDueDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchMilestonesAndContracts();
  }, []);

  const fetchMilestonesAndContracts = async () => {
    try {
      setLoading(true);
      const [milestonesData, contractsData] = await Promise.all([
        apiFetch('/milestones'),
        apiFetch('/contracts')
      ]);
      setMilestones(milestonesData);
      setContracts(contractsData);
    } catch (err: any) {
      setError(err.message || 'Failed to download milestone records.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !mTitle || !mDueDate) return;

    setFormLoading(true);
    setError('');

    try {
      await apiFetch('/milestones', {
        method: 'POST',
        body: JSON.stringify({
          contractId: selectedContractId,
          title: mTitle,
          dueDate: mDueDate,
        })
      });

      setShowCreateModal(false);
      setMTitle('');
      setSelectedContractId('');
      setMDueDate('');

      await fetchMilestonesAndContracts();
    } catch (err: any) {
      setError(err.message || 'Failed to generate milestone item.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setError('');
    const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
    
    // Optimistic UI update
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));

    try {
      await apiFetch(`/milestones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err: any) {
      // Revert on error
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, status: currentStatus } : m));
      setError(err.message || 'Failed to toggle milestone state.');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    
    setError('');
    
    try {
      await apiFetch(`/milestones/${id}`, { method: 'DELETE' });
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to remove milestone item.');
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
            <h1 className="text-2xl font-bold text-zinc-100">Project Milestones</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-normal">Track deadlines, check off deliverables, and trigger payment cycles.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 glow-btn bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-md shadow-violet-600/10 cursor-pointer w-fit"
          >
            <Plus className="h-4 w-4" /> Add Milestone
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Milestones grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {milestones.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-12 border border-zinc-900 text-center flex flex-col items-center justify-center">
              <CheckSquare className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No milestones tracked</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm">Milestones are auto-extracted during contract uploads, or you can register them manually.</p>
            </div>
          ) : (
            milestones.map((m) => (
              <div 
                key={m.id} 
                className={`glass-card rounded-2xl p-5 border relative flex flex-col justify-between min-h-[160px] ${
                  m.status === 'COMPLETED' ? 'border-emerald-500/10' : 'border-zinc-900'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <span className="text-[10px] font-semibold text-zinc-500 truncate max-w-[70%]">{m.contract.title}</span>
                    
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleStatus(m.id, m.status)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        m.status === 'COMPLETED' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {m.status === 'COMPLETED' ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                      {m.status}
                    </button>
                  </div>
                  
                  <h3 className="text-sm font-bold text-zinc-200 line-clamp-2 leading-snug">{m.title}</h3>
                </div>

                <div className="flex justify-between items-center mt-6 pt-3 border-t border-zinc-900/60">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                    <span>Due {new Date(m.dueDate).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteMilestone(m.id)}
                    className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Delete Milestone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL: Create Milestone */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-zinc-800 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-bold text-zinc-200 mb-6">Add New Milestone</h2>
              <form onSubmit={handleCreateMilestone} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Link to Contract
                  </label>
                  <select
                    required
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Select Contract --</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Milestone Title
                  </label>
                  <input
                    type="text"
                    required
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                    placeholder="e.g. Design handoff, Frontend integration"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={mDueDate}
                    onChange={(e) => setMDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full glow-btn bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Milestone'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
