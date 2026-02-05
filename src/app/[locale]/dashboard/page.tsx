'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plus, LayoutTemplate, Clock, MoreHorizontal, Trash2, Search, ArrowLeft } from 'lucide-react';
import { loadFromStorage, saveToStorage } from '@/services/storage';
import { Workflow } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardPage({params: {locale}}: {params: {locale: string}}) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFromStorage<Workflow[]>('workflows').then(wfs => {
        if (wfs) setWorkflows(wfs);
        setIsLoading(false);
    });
  }, []);

  const createNewWorkflow = () => {
      const newId = `wf-${Date.now()}`;
      // In a real app, we might redirect to the studio with this ID
      // and let the studio initialize it.
      router.push(`/${locale}/studio/${newId}`);
  };

  const deleteWorkflow = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newWfs = workflows.filter(w => w.id !== id);
      setWorkflows(newWfs);
      saveToStorage('workflows', newWfs);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Link href={`/${locale}`} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <ArrowLeft size={20} />
              </Link>
              <h1 className="text-3xl font-black italic tracking-tighter">My Workflows</h1>
          </div>
          <div className="flex items-center gap-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" placeholder="Search..." className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 w-64" />
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500" />
          </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* New Workflow Card */}
          <button onClick={createNewWorkflow} className="group aspect-video rounded-3xl border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-cyan-500/20 flex items-center justify-center transition-colors">
                  <Plus size={32} className="text-slate-500 group-hover:text-cyan-400" />
              </div>
              <span className="font-bold text-slate-500 group-hover:text-cyan-400">New Workflow</span>
          </button>

          {/* Workflow Cards */}
          {workflows.map(wf => (
              <div key={wf.id} onClick={() => router.push(`/${locale}/studio/${wf.id}`)} className="group relative aspect-video bg-[#1c1c1e] rounded-3xl border border-white/5 overflow-hidden hover:border-white/20 transition-all cursor-pointer">
                  {wf.thumbnail ? (
                      <img src={wf.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <LayoutTemplate size={48} className="text-white/10" />
                      </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-6">
                      <h3 className="font-bold text-lg mb-1">{wf.title || 'Untitled Workflow'}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock size={12} />
                          <span>{new Date(parseInt(wf.id.split('-')[1] || Date.now().toString())).toLocaleDateString()}</span>
                      </div>
                  </div>

                  <button onClick={(e) => deleteWorkflow(wf.id, e)} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/50 hover:text-red-400 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                  </button>
              </div>
          ))}
      </div>
    </div>
  );
}
