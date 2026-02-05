
import React, { useState, useEffect } from 'react';
import { X, Save, Key, ExternalLink, Sparkles, Zap, MessageCircle, Globe, Box, FolderPlus, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [polloKey, setPolloKey] = useState('');
  const [jimengKey, setJimengKey] = useState('');
  const [mjKey, setMjKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const checkKeys = async () => {
      const storedPollo = localStorage.getItem('pollo_api_key') || '';
      const storedJimeng = localStorage.getItem('jimeng_api_key') || '';
      const storedMj = localStorage.getItem('mj_api_key') || '';
      const storedOpenai = localStorage.getItem('openai_api_key') || '';
      const storedOpenaiBase = localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1';
      const storedGemini = localStorage.getItem('inkai_api_key') || '';

      setPolloKey(storedPollo);
      setJimengKey(storedJimeng);
      setMjKey(storedMj);
      setOpenaiKey(storedOpenai);
      setOpenaiBaseUrl(storedOpenaiBase);
      setGeminiKey(storedGemini);

      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasGeminiKey(hasKey);
      } else {
        setHasGeminiKey(!!storedGemini);
      }
    };
    if (isOpen) checkKeys();
  }, [isOpen]);

  const exportWorkflows = () => {
    // We need to access workflows from storage or context. 
    // Since this component is isolated, we'll read from localStorage directly for this utility.
    try {
        const stored = localStorage.getItem('inkai-storage-workflows');
        if (!stored) {
            alert('没有可导出的工作流');
            return;
        }
        const data = JSON.parse(stored);
        if (!Array.isArray(data) || data.length === 0) {
            alert('没有可导出的工作流');
            return;
        }
        
        // Export all as a single JSON backup file
        const backup = {
            version: '1.0',
            timestamp: Date.now(),
            workflows: data
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inkai-backup-all-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        alert('导出失败');
    }
  };

  const clearCache = async () => {
      if (!confirm('确定要清除所有生成的媒体缓存吗？这将释放本地存储空间，但会导致已生成的图片/视频无法查看。')) return;
      try {
        // Clear IndexedDB 'assets' store
        // We use idb-keyval library which uses a default store 'keyval-store'.
        // But our storage service uses custom stores? 
        // Let's check storage.ts implementation.
        // Actually, storage.ts uses idb-keyval which puts everything in one store by default unless configured.
        // Wait, storage.ts implementation:
        // export const saveToStorage = async (key: string, value: any) => set(key, value);
        // It uses default store. So 'assets' is just a key.
        // But 'assets' key only stores metadata array.
        // The actual binary data might be inside the 'assets' array if we stored base64 strings (which we do for images).
        // For videos, we might be storing them as base64 strings too in the asset history?
        // Yes, handleAssetGenerated stores src which is data URI.
        // So clearing 'assets' key is enough.
        
        // Also clear 'nodes' key to reset current board state? No, user might want to keep board.
        // But nodes contain image data too.
        // This is tricky. A full cleanup means clearing all data.
        // Let's just clear 'assets' history for now.
        
        const { del } = await import('idb-keyval');
        await del('assets');
        alert('媒体缓存已清理 (需刷新页面生效)');
        window.location.reload();
      } catch (e) {
        alert('清理失败');
      }
  };

  const handleSelectGeminiKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      // Assume success immediately to handle potential race conditions
      setHasGeminiKey(true);
    }
  };

  const handleSave = () => {
    localStorage.setItem('pollo_api_key', polloKey.trim());
    localStorage.setItem('jimeng_api_key', jimengKey.trim());
    localStorage.setItem('mj_api_key', mjKey.trim());
    localStorage.setItem('openai_api_key', openaiKey.trim());
    localStorage.setItem('openai_base_url', openaiBaseUrl.trim());
    localStorage.setItem('inkai_api_key', geminiKey.trim());
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setTimeout(onClose, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-[540px] bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-700/50 rounded-lg">
                <Key size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">API 全局配置 (Settings)</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* 1. Google Gemini Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    <label className="text-xs font-bold text-white uppercase tracking-wider">Google Gemini API</label>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${hasGeminiKey ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {hasGeminiKey ? '已激活 (Active)' : '未配置 (Not Set)'}
                </div>
            </div>
            
            <button 
                onClick={handleSelectGeminiKey}
                className={`w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 transition-all group ${!(window as any).aistudio ? 'hidden' : ''}`}
            >
                <Zap size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-200">选择或更新 Gemini API Key</span>
            </button>
            
            <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Google Gemini API Key (手动配置)</span>
                <input 
                    type="password" 
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                    placeholder="在此粘贴您的 Key (AIzaSy...)"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                />
            </div>
            
            <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                    激活 <strong>Gemini 3 Pro</strong> (文本/推理), <strong>Nano Banana Pro</strong> (高质量生图) 以及 <strong>Veo 3.1</strong> (电影级视频) 核心模型。
                </p>
                <div className="flex items-center gap-3">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-cyan-500 hover:underline flex items-center gap-1">
                        查看计费文档 <ExternalLink size={10} />
                    </a>
                    <span className="text-[10px] text-slate-600">|</span>
                    <span className="text-[10px] text-slate-500 italic">需要绑定付款账户以使用 Veo 模型</span>
                </div>
            </div>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* Data Management Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Box size={16} className="text-purple-400" />
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">数据管理 (Data Management)</label>
             </div>
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={exportWorkflows}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl transition-all group"
                 >
                     <FolderPlus size={20} className="text-slate-400 group-hover:text-purple-400" />
                     <span className="text-xs font-bold text-slate-300">备份所有工作流</span>
                 </button>
                 <button 
                    onClick={clearCache}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl transition-all group"
                 >
                     <Trash2 size={20} className="text-slate-400 group-hover:text-red-400" />
                     <span className="text-xs font-bold text-slate-300 group-hover:text-red-400">清理媒体缓存</span>
                 </button>
             </div>
             <p className="text-[11px] text-slate-500">
                您的数据默认存储在浏览器本地 (IndexedDB)。定期备份可防止意外丢失；清理缓存可释放磁盘空间。
             </p>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* 2. OpenAI (ChatGPT) Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-emerald-400" />
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">OpenAI (ChatGPT) 配置</label>
            </div>
            
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">API Key</span>
                    <input 
                        type="password" 
                        autoComplete="off"
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1"><Globe size={10}/> Base URL (Optional Proxy)</span>
                    <input 
                        type="text" 
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                        placeholder="https://api.openai.com/v1"
                        value={openaiBaseUrl}
                        onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                    />
                </div>
            </div>
            <p className="text-[11px] text-slate-500">
                用于助手面板中的 <strong>GPT-4o / o1</strong> 模型调用，支持自定义代理。
            </p>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* 3. Pollo / Wan 2.5 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pollo.ai API Key (Wan 2.5)</label>
                <a href="https://pollo.ai/dashboard/api-keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
                    <span>获取 Key</span>
                    <ExternalLink size={10} />
                </a>
            </div>
            <input 
                type="password" 
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                placeholder="粘贴您的 Pollo API Key..."
                value={polloKey}
                onChange={(e) => setPolloKey(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">用于激活 <strong>Wan 2.1 / 2.5</strong> 视频生成模型。</p>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* 4. Jimeng */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">即梦 (Jimeng) API Key</label>
            <input 
                type="password" 
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                placeholder="粘贴您的 Jimeng API Key..."
                value={jimengKey}
                onChange={(e) => setJimengKey(e.target.value)}
            />
             <p className="text-[11px] text-slate-500">用于激活 <strong>即梦 (Jimeng 2.1)</strong> 图像生成模型。</p>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* 5. Midjourney */}
          <div className="space-y-4 pb-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Midjourney API Key</label>
            <input 
                type="password" 
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                placeholder="粘贴您的 Midjourney API Key..."
                value={mjKey}
                onChange={(e) => setMjKey(e.target.value)}
            />
             <p className="text-[11px] text-slate-500">用于激活 <strong>Midjourney V7.0</strong> 图像生成模型。</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#121214] flex justify-end">
            <button 
                onClick={handleSave}
                className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-cyan-400 active:scale-95'}`}
            >
                {isSaved ? '已保存 (Saved)' : '保存配置 (Save Changes)'}
            </button>
        </div>
      </div>
    </div>
  );
};
