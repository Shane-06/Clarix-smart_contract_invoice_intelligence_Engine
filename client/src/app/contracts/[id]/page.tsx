'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  CheckSquare,
  Plus,
  Play,
  FileCheck
} from 'lucide-react';
import Link from 'next/link';

interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  status: string;
}

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
}

interface WorkLog {
  id: string;
  description: string;
  hours: number;
  date: string;
}

interface Contract {
  id: string;
  title: string;
  fileUrl: string | null;
  summary: string | null;
  riskScore: number | null;
  status: string;
  createdAt: string;
  milestones: Milestone[];
  invoices: Invoice[];
  workLogs: WorkLog[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ContractDetailsPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { id } = useParams();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'summary' | 'milestones' | 'worklogs'>('summary');
  
  // AI Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Work log form states
  const [logDesc, setLogDesc] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  
  // Scope creep state
  const [scopeCreepResult, setScopeCreepResult] = useState<any>(null);
  const [creepLoading, setCreepLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    fetchContractDetails();
  }, [id]);

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/contracts/${id}`);
      setContract(data);
    } catch (err: any) {
      setError(err.message || 'Failed to download contract profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!contract) return;
    setDownloadLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers = new Headers();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const res = await fetch(`${API_BASE_URL}/contracts/${contract.id}/download`, {
        headers
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download contract file from server.');
      }

      const blob = await res.blob();
      
      // Attempt to retrieve filename from Content-Disposition header
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = '';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Fallback filename extraction if header parsing fails
      if (!filename) {
        const urlParts = (contract.fileUrl || '').split('?')[0].split('/');
        const lastPart = urlParts[urlParts.length - 1];
        const dotIndex = lastPart.lastIndexOf('.');
        let ext = '.pdf';
        if (dotIndex !== -1) {
          ext = lastPart.substring(dotIndex).toLowerCase();
        }
        
        let cleanTitle = contract.title.trim();
        if (cleanTitle.toLowerCase().endsWith(ext)) {
          cleanTitle = cleanTitle.substring(0, cleanTitle.length - ext.length).trim();
        }
        const sanitized = cleanTitle.replace(/[^a-zA-Z0-9. \-_]/g, '_');
        filename = `${sanitized}${ext}`;
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSendChatMessage = async (msgText = chatInput) => {
    if (!msgText.trim()) return;
    
    setError('');
    const userMessage: ChatMessage = { role: 'user', content: msgText };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const data = await apiFetch(`/contracts/${id}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: msgText,
          history: chatMessages
        })
      });
      
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.reply };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'AI Chat failed to process message.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDesc || !logHours) return;

    setLogLoading(true);
    setError('');

    try {
      const data = await apiFetch(`/contracts/${id}/worklog`, {
        method: 'POST',
        body: JSON.stringify({
          description: logDesc,
          hours: parseFloat(logHours)
        })
      });

      // Update state local logs
      setContract(prev => {
        if (!prev) return null;
        return {
          ...prev,
          workLogs: [data.workLog, ...prev.workLogs]
        };
      });

      setLogDesc('');
      setLogHours('');
      // Reset scope creep status to trigger manual scan again
      setScopeCreepResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to record work log.');
    } finally {
      setLogLoading(false);
    }
  };

  const handleScanScopeCreep = async () => {
    setCreepLoading(true);
    setError('');
    
    try {
      const data = await apiFetch(`/contracts/${id}/creep`);
      setScopeCreepResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to perform scope creep assessment.');
    } finally {
      setCreepLoading(false);
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

  if (!contract) {
    return (
      <DashboardLayout>
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300">Contract Not Found</h3>
          <p className="text-xs text-zinc-500 mt-1">The contract you are looking for does not exist or has been deleted.</p>
          <Link href="/dashboard" className="text-xs text-violet-400 hover:underline mt-4 inline-block font-semibold">
            Return to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const suggestedQuestions = [
    'What are the payment terms?',
    'What are the deliverables?',
    'What are the termination clauses?',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 truncate max-w-md">{contract.title}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Parsed on {new Date(contract.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          {contract.fileUrl && (
            <button
              onClick={handleDownload}
              disabled={downloadLoading}
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-lg text-xs font-semibold transition-all w-fit cursor-pointer disabled:opacity-50"
            >
              {downloadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              ) : (
                <FileCheck className="h-4 w-4 text-violet-400" />
              )}
              View Document
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Side-by-Side Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Tabs Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab Selectors */}
            <div className="flex border-b border-zinc-900">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'summary' 
                    ? 'border-violet-500 text-violet-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Summary & AI Risk
              </button>
              <button
                onClick={() => setActiveTab('milestones')}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'milestones' 
                    ? 'border-violet-500 text-violet-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Milestones & Invoices
              </button>
              <button
                onClick={() => setActiveTab('worklogs')}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'worklogs' 
                    ? 'border-violet-500 text-violet-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Work Logs & Scope Creep
              </button>
            </div>

            {/* TAB: Summary & AI Risk */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                
                {/* Visual Summary */}
                <div className="glass-card rounded-2xl p-6 border border-zinc-900">
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-3">AI Executive Summary</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                    {contract.summary || 'Summary not generated.'}
                  </p>
                </div>

                {/* Risk assessment dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Score */}
                  <div className="glass-card rounded-2xl p-6 border border-zinc-900 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-2">AI Risk Assessment</h3>
                      <p className="text-xs text-zinc-500">Evaluated against protective freelancing standards.</p>
                    </div>

                    <div className="my-6 flex items-center justify-center relative">
                      <div className="text-center">
                        <span className={`text-6xl font-extrabold ${
                          (contract.riskScore || 0) > 6 
                            ? 'text-rose-500' 
                            : (contract.riskScore || 0) > 3
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}>
                          {contract.riskScore || 'N/A'}
                        </span>
                        <span className="text-zinc-600 font-medium text-sm"> / 10</span>
                        <p className="text-xs font-semibold text-zinc-400 mt-1">Risk Intensity</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="glass-card rounded-2xl p-6 border border-zinc-900">
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-violet-400" /> Recommendations
                    </h3>
                    <ul className="space-y-3 text-xs text-zinc-400 list-disc pl-4">
                      <li>Ensure a formal change request procedure is defined for scope creep prevention.</li>
                      <li>Review payment terms to ensure net 15 or invoice-upon-milestone approval.</li>
                      <li>Add an explicit indemnification limit equal to the contract fee.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Milestones & Invoices */}
            {activeTab === 'milestones' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Milestones Card */}
                <div className="glass-card rounded-2xl p-6 border border-zinc-900">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Milestones Checklist</h3>
                    <Link href="/milestones" className="text-xs text-violet-400 hover:text-violet-300 font-semibold">
                      Manage
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {contract.milestones.length === 0 ? (
                      <p className="text-xs text-zinc-500">No milestones mapped.</p>
                    ) : (
                      contract.milestones.map((m) => (
                        <div key={m.id} className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-900 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-zinc-200 truncate">{m.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Due {new Date(m.dueDate).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            m.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Invoices Card */}
                <div className="glass-card rounded-2xl p-6 border border-zinc-900">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Linked Invoices</h3>
                    <Link href="/invoices" className="text-xs text-violet-400 hover:text-violet-300 font-semibold">
                      Manage
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {contract.invoices.length === 0 ? (
                      <p className="text-xs text-zinc-500">No invoices linked. Track invoices to receive AI payment warnings.</p>
                    ) : (
                      contract.invoices.map((inv) => (
                        <div key={inv.id} className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-900 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-zinc-200">${inv.amount.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Work Logs & Scope Creep */}
            {activeTab === 'worklogs' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Record work logs form */}
                <div className="glass-card rounded-2xl p-6 border border-zinc-900 md:col-span-1 h-fit">
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Work Log
                  </h3>
                  <form onSubmit={handleAddWorkLog} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1.5">Description</label>
                      <input
                        type="text"
                        required
                        value={logDesc}
                        onChange={(e) => setLogDesc(e.target.value)}
                        placeholder="Created navigation bar..."
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1.5">Hours</label>
                      <input
                        type="number"
                        required
                        step="0.5"
                        value={logHours}
                        onChange={(e) => setLogHours(e.target.value)}
                        placeholder="3.5"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={logLoading}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {logLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Log Hours'}
                    </button>
                  </form>
                </div>

                {/* Scope Creep Scan and logs */}
                <div className="md:col-span-2 space-y-6">
                  {/* Creep trigger panel */}
                  <div className="glass-card rounded-2xl p-6 border border-zinc-900">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-200">Scope Creep Scanner</h3>
                        <p className="text-xs text-zinc-500">Scan active logged descriptions against original contract deliverables.</p>
                      </div>
                      <button
                        onClick={handleScanScopeCreep}
                        disabled={creepLoading || contract.workLogs.length === 0}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          contract.workLogs.length === 0
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-500 text-white glow-btn'
                        }`}
                      >
                        {creepLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3 w-3" /> Run AI Scan
                          </>
                        )}
                      </button>
                    </div>

                    {/* Scope creep audit result */}
                    {scopeCreepResult && (
                      <div className={`p-4 rounded-xl border mt-4 ${
                        scopeCreepResult.hasScopeCreep 
                          ? 'bg-rose-500/10 border-rose-500/20' 
                          : 'bg-emerald-500/10 border-emerald-500/20'
                      }`}>
                        <div className="flex items-start gap-2.5">
                          <Sparkles className={`h-5 w-5 mt-0.5 ${
                            scopeCreepResult.hasScopeCreep ? 'text-rose-400' : 'text-emerald-400'
                          }`} />
                          <div>
                            <h4 className={`text-xs font-bold ${
                              scopeCreepResult.hasScopeCreep ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {scopeCreepResult.hasScopeCreep ? 'Scope Creep Warning Flags Found' : 'Deliverables Aligned'}
                            </h4>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              {scopeCreepResult.hasScopeCreep 
                                ? 'The AI scanner flagged tasks that may exceed your contracted agreement.' 
                                : 'All recorded logs correspond with the defined scope.'}
                            </p>

                            {scopeCreepResult.creepItems && scopeCreepResult.creepItems.length > 0 && (
                              <div className="mt-3 space-y-2 border-t border-rose-500/10 pt-3">
                                {scopeCreepResult.creepItems.map((item: any, i: number) => (
                                  <div key={i} className="text-xs bg-zinc-950/60 p-2.5 rounded-lg border border-rose-500/10">
                                    <p className="font-semibold text-zinc-300">Log: &quot;{item.logDescription}&quot;</p>
                                    <p className="text-[10px] text-rose-400 mt-1">Reason: {item.explanation}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Logs list */}
                  <div className="glass-card rounded-2xl p-6 border border-zinc-900">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Work Logs History</h3>
                    <div className="space-y-3">
                      {contract.workLogs.length === 0 ? (
                        <p className="text-xs text-zinc-500">No work hours logged yet.</p>
                      ) : (
                        contract.workLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-900 flex items-center justify-between text-xs">
                            <div className="min-w-0 pr-2">
                              <p className="font-medium text-zinc-200">{log.description}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(log.date).toLocaleDateString()}</p>
                            </div>
                            <span className="font-bold text-violet-400 shrink-0">{log.hours} hrs</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: AI Contract Chat Assistant */}
          <div className="lg:col-span-1 glass-card rounded-2xl border border-zinc-900 flex flex-col h-[580px] overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-950/20 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-400" />
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Contract Assistant</h3>
                <p className="text-[10px] text-zinc-500">Ask questions about clauses, penalties, or rules.</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-4">
                  <HelpCircle className="h-8 w-8 text-zinc-700" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-400">Ask a Question</p>
                    <p className="text-[10px] text-zinc-600 max-w-[200px]">Prompt any queries based on the extracted contract text.</p>
                  </div>
                  
                  {/* Suggestion Prompts */}
                  <div className="w-full pt-4 space-y-2">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChatMessage(q)}
                        className="w-full text-left p-2 rounded-lg bg-zinc-950/60 border border-zinc-900 hover:border-violet-500/30 hover:bg-violet-500/[0.01] text-[10px] text-zinc-400 font-medium transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-none'
                        : 'bg-zinc-900 text-zinc-300 rounded-bl-none border border-zinc-800'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 text-zinc-500 rounded-xl rounded-bl-none border border-zinc-800 px-3 py-2 text-xs flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-zinc-900 bg-zinc-950/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Ask something about this contract..."
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
