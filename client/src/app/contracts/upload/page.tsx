'use client';

import React, { useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function ContractUploadPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Sending file to backend server...',
    'Uploading document securely to Cloudinary...',
    'Extracting document content (PDF/DOCX)...',
    'Analyzing terms & milestones with OpenAI...',
    'Creating contract registry in PostgreSQL...',
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError('');
    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (!validMimes.includes(selectedFile.type)) {
      setError('Invalid file type. Only PDF and Word documents (DOCX) are supported.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size too large. Maximum size allowed is 10MB.');
      return;
    }

    setFile(selectedFile);
    if (!title) {
      // Set default title based on filename (strip extension)
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop a contract file.');
      return;
    }

    setError('');
    setLoading(true);
    setCurrentStep(0);

    // Simulate stepping through progress
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 2800);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      // Perform multipart upload
      const data = await apiFetch('/contracts/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(stepInterval);
      setCurrentStep(steps.length - 1);
      
      // Short delay for visual completion, then redirect to details page
      setTimeout(() => {
        router.push(`/contracts/${data.contract.id}`);
      }, 1000);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Failed to complete contract analysis.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Upload Contract</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Import freelance contracts to parse metadata and extract milestones.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="glass-card rounded-2xl p-8 border border-zinc-900 flex flex-col items-center justify-center text-center space-y-6 py-16">
            <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-200">Analyzing Document</h3>
              <p className="text-xs text-zinc-500 max-w-sm">This can take up to 20 seconds. Please do not close or reload the page.</p>
            </div>
            
            {/* Step Indicators */}
            <div className="w-full max-w-md space-y-3 text-left bg-zinc-950/50 p-4 rounded-xl border border-zinc-900">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  {currentStep > idx ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : currentStep === idx ? (
                    <Loader2 className="h-4 w-4 text-violet-500 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-800 flex-shrink-0"></div>
                  )}
                  <span className={currentStep === idx ? 'text-zinc-200 font-semibold' : currentStep > idx ? 'text-zinc-400' : 'text-zinc-600'}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-zinc-900 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Contract Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Acme Web App Development Contract"
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Upload PDF / Word File
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                    dragActive 
                      ? 'border-violet-500 bg-violet-600/[0.03]' 
                      : file 
                      ? 'border-emerald-500/40 bg-emerald-500/[0.01]' 
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/10'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt"
                  />
                  
                  {file ? (
                    <>
                      <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-200 truncate max-w-sm">{file.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <p className="text-xs text-violet-400 hover:text-violet-300 mt-3 font-semibold">Change selected file</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-300">Drag and drop file here, or click to browse</p>
                      <p className="text-xs text-zinc-500 mt-1">Accepts PDF, DOCX and TXT files (Max 10MB)</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file}
              className={`w-full glow-btn text-white py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/10 ${
                file ? 'bg-violet-600 hover:bg-violet-500' : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              Analyze and Parse Contract <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
