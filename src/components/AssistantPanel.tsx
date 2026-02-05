
import React, { useRef, useEffect, useState } from 'react';
import { X, Eraser, Copy, CornerDownLeft, Loader2, Sparkles, Brain, PenLine, Wand2, Film } from 'lucide-react';
import { sendChatMessage } from '@/services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Rich Text Rendering Helpers ---

const parseInlineStyles = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return <span key={i} className="text-white font-bold mx-0.5">{content}</span>;
      }
      return part;
  });
};

const renderFormattedMessage = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, index) => {
    const key = `line-${index}`;
    const trimmed = line.trim();
    
    if (!trimmed) {
       elements.push(<div key={key} className="h-2" />);
       return;
    }

    if (line.startsWith('# ')) {
        elements.push(<h1 key={key} className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mt-5 mb-3 border-b border-white/10 pb-2">{line.replace(/^#\s/, '')}</h1>);
        return;
    }
    
    if (line.startsWith('## ')) {
         elements.push(<h2 key={key} className="text-sm font-bold text-white mt-4 mb-2 flex items-center gap-2"><span className="w-1 h-4 bg-cyan-500 rounded-full inline-block" />{line.replace(/^##\s/, '')}</h2>);
         return;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const content = trimmed.replace(/^[\*\-]\s/, '');
        elements.push(<div key={key} className="flex gap-2 ml-1 mb-1.5 items-start group/list"><span className="w-1.5 h-1.5 rounded-full bg-white/20 mt-[7px] shrink-0 group-hover/list:bg-cyan-400 transition-colors" /><div className="text-[13px] leading-relaxed text-slate-300 flex-1">{parseInlineStyles(content)}</div></div>);
        return;
    }

    elements.push(<div key={key} className="text-[13px] leading-relaxed text-slate-300 mb-1">{parseInlineStyles(line)}</div>);
  });
  
  return <div className="space-y-0.5 select-text cursor-text">{elements}</div>;
};

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: '你好！我是您的创意助手。开启“影业级增强”模式，我将以导演视角为您打磨电影感内容。' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isCinematicMode, setIsCinematicMode] = useState(false);
  const [isHelpMeWriteActive, setIsHelpMeWriteActive] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => { if (isOpen) { setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); } }, [messages, isLoading, isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input; setInput(''); 
    const newMessages: Message[] = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages); setIsLoading(true);

    try {
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const responseText = await sendChatMessage(history, userText, { isThinkingMode, isCinematicMode, isHelpMeWrite: isHelpMeWriteActive });
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error: any) {
        setMessages(prev => [...prev, { role: 'model', text: error.message || "连接错误" }]);
    } finally {
        setIsLoading(false);
    }
  };

  const SPRING_ANIMATION = "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

  return (
    <div ref={panelRef} className={`fixed right-6 top-1/2 -translate-y-1/2 h-[85vh] w-[420px] bg-[#1c1c1e]/95 backdrop-blur-3xl rounded-[24px] border border-white/10 shadow-2xl z-40 flex flex-col overflow-hidden ${SPRING_ANIMATION} ${isOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-95 pointer-events-none'}`} onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-md z-10 shrink-0">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors group"><X size={14} className="group-hover:scale-110 transition-transform" /></button>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end"><span className="text-xs font-bold text-slate-200 tracking-wide">AI 创意助手</span><span className="text-[10px] text-slate-500 font-medium">影业级大师联调</span></div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-inner"><Sparkles size={14} className="text-cyan-400" /></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-[#0a0a0c]/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[92%] gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 px-1"><span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-wider">{m.role === 'model' ? 'InkAI' : 'You'}</span></div>
                <div className="group relative transition-all w-full">
                    <div className={`relative px-5 py-4 rounded-2xl shadow-sm border select-text cursor-text ${m.role === 'user' ? 'bg-[#2c2c2e] border-white/10 text-slate-100 rounded-tr-sm' : 'bg-[#1c1c1e] border-white/5 text-slate-300 rounded-tl-sm w-full pr-10'}`}>
                        {m.role === 'model' ? renderFormattedMessage(m.text) : <p className="leading-6 text-[13px] whitespace-pre-wrap">{m.text}</p>}
                        <button onClick={() => { navigator.clipboard.writeText(m.text); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 2000); }} className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/20 hover:bg-black/50 border border-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:scale-110 z-10`}>{copiedIndex === i ? <span className="text-[10px] font-bold text-green-400">OK</span> : <Copy size={10} />}</button>
                    </div>
                </div>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start w-full animate-in fade-in slide-in-from-bottom-2"><div className="flex flex-col gap-2 max-w-[85%]"><span className={`text-[10px] font-bold uppercase tracking-wider px-1 ${isThinkingMode ? 'text-indigo-400' : 'text-cyan-500/80'}`}>{isThinkingMode ? 'Deep Thinking' : 'Thinking'}</span><div className={`px-5 py-4 bg-[#1c1c1e] border rounded-2xl rounded-tl-sm flex items-center gap-3 w-fit shadow-lg ${isThinkingMode ? 'border-indigo-500/30 shadow-indigo-900/20' : 'border-white/5 shadow-cyan-900/10'}`}><Loader2 size={16} className={`animate-spin ${isThinkingMode ? 'text-indigo-400' : 'text-cyan-500'}`} /><span className={`text-xs font-medium tracking-wide ${isThinkingMode ? 'text-indigo-200' : 'text-slate-400'}`}>{isCinematicMode ? "影业级导演规划中..." : "正在思考..."}</span></div></div></div>}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-[#1c1c1e] border-t border-white/5 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
             <div className="flex items-center gap-2">
                 <button onClick={() => { setIsThinkingMode(!isThinkingMode); setIsCinematicMode(false); }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${isThinkingMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-white/5 text-slate-500 border-transparent'}`}><Brain size={12} /><span>深度推理</span></button>
                 <button onClick={() => { setIsCinematicMode(!isCinematicMode); setIsThinkingMode(false); }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${isCinematicMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-white/5 text-slate-500 border-transparent'}`}><Film size={12} /><span>影业级增强</span></button>
                 <button onClick={() => { setIsHelpMeWriteActive(!isHelpMeWriteActive); }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${isHelpMeWriteActive ? 'bg-pink-500/20 text-pink-300 border-pink-500/50' : 'bg-white/5 text-slate-500 border-transparent'}`}><Wand2 size={12} /><span>帮我写</span></button>
             </div>
        </div>
        <div className="relative group/input">
          <textarea className="w-full bg-black/20 border border-white/10 rounded-[20px] pl-4 pr-12 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-black/40 focus:border-cyan-500/30 transition-all resize-none custom-scrollbar leading-5" placeholder={isCinematicMode ? "输入描述，AI 将以导演视角应用影视工业级 Prompt 指南..." : "输入您的想法..."} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} rows={1} style={{ minHeight: '48px', maxHeight: '120px' }} />
          <button onClick={handleSendMessage} disabled={!input.trim() || isLoading} className={`absolute right-2 top-2 p-2 rounded-full transition-all duration-300 ${input.trim() && !isLoading ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-white/5 text-slate-600'}`}><CornerDownLeft size={16} /></button>
        </div>
      </div>
    </div>
  );
};
