
import React, { useState, useRef, useEffect } from 'react';
import { 
    Plus, RotateCcw, History, MessageSquare, FolderHeart, X, 
    ImageIcon, Video as VideoIcon, Film, Save, FolderPlus, 
    Edit, Trash2, Box, ScanFace, Brush, Type, Workflow as WorkflowIcon,
    Clapperboard, Mic2, Settings, ScrollText, Check, ChevronRight
} from 'lucide-react';
import { NodeType, Workflow } from '../types';

interface SidebarDockProps {
    onAddNode: (type: NodeType) => void;
    onUndo: () => void;
    isChatOpen: boolean;
    onToggleChat: () => void;
    isMultiFrameOpen: boolean;
    onToggleMultiFrame: () => void;
    isSonicStudioOpen?: boolean;
    onToggleSonicStudio?: () => void;
    assetHistory: any[];
    onHistoryItemClick: (item: any) => void;
    onDeleteAsset: (id: string) => void;
    workflows: Workflow[];
    selectedWorkflowId: string | null;
    onSelectWorkflow: (id: string | null) => void;
    onSaveWorkflow: () => void;
    onDeleteWorkflow: (id: string) => void;
    onRenameWorkflow: (id: string, title: string) => void;
    onOpenSettings: () => void;
}

const getNodeNameCN = (t: string) => {
    switch(t) {
        case NodeType.PROMPT_INPUT: return '提示工程';
        case NodeType.IMAGE_GENERATOR: return '图片生成';
        case NodeType.VIDEO_GENERATOR: return '视频生成';
        case NodeType.AUDIO_GENERATOR: return '灵感音乐';
        case NodeType.VIDEO_ANALYZER: return '视频分析';
        case NodeType.IMAGE_EDITOR: return '图像编辑';
        case NodeType.SCRIPT_MASTER: return '剧本大师';
        default: return t;
    }
};

const getNodeIcon = (t: string) => {
    switch(t) {
        case NodeType.PROMPT_INPUT: return Type;
        case NodeType.IMAGE_GENERATOR: return ImageIcon;
        case NodeType.VIDEO_GENERATOR: return Film;
        case NodeType.AUDIO_GENERATOR: return Mic2;
        case NodeType.VIDEO_ANALYZER: return ScanFace;
        case NodeType.IMAGE_EDITOR: return Brush;
        case NodeType.SCRIPT_MASTER: return ScrollText;
        default: return Plus;
    }
};

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

export const SidebarDock: React.FC<SidebarDockProps> = ({
    onAddNode, onUndo, isChatOpen, onToggleChat, isMultiFrameOpen, onToggleMultiFrame, isSonicStudioOpen, onToggleSonicStudio, assetHistory, onHistoryItemClick, onDeleteAsset, workflows, selectedWorkflowId, onSelectWorkflow, onSaveWorkflow, onDeleteWorkflow, onRenameWorkflow, onOpenSettings
}) => {
    const [activePanel, setActivePanel] = useState<'history' | 'workflow' | 'add' | null>(null);
    const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState('');

    const handleDragStart = (e: React.DragEvent, asset: any) => {
        e.dataTransfer.setData('assetType', asset.type);
        e.dataTransfer.setData('assetSrc', asset.src);
        e.dataTransfer.setData('assetTitle', asset.title || '');
    };

    const renderPanelContent = () => {
        if (activePanel === 'add') {
            return (
                <>
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <button onClick={() => setActivePanel(null)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Node Hub</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                        {[NodeType.PROMPT_INPUT, NodeType.IMAGE_GENERATOR, NodeType.VIDEO_GENERATOR, NodeType.AUDIO_GENERATOR, NodeType.VIDEO_ANALYZER, NodeType.IMAGE_EDITOR, NodeType.SCRIPT_MASTER].map(t => {
                            const ItemIcon = getNodeIcon(t);
                            return (
                                <button key={t} onClick={() => { onAddNode(t); setActivePanel(null); }} className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-3 text-sm text-slate-200 transition-all border border-transparent hover:border-white/5 hover:translate-x-1">
                                    <div className="p-2 bg-white/5 rounded-lg text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-colors"><ItemIcon size={16} /></div> 
                                    <span className="font-bold text-xs">{getNodeNameCN(t)}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            );
        }

        if (activePanel === 'workflow') {
            return (
                <>
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <button onClick={() => setActivePanel(null)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Workflows</span>
                    </div>
                    <div className="p-3">
                        <button 
                            onClick={() => { onSaveWorkflow(); setActivePanel('workflow'); }}
                            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                        >
                            <Save size={14} /> 保存当前工作流
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                        {workflows.length === 0 ? (
                            <div className="text-center py-10 opacity-30 flex flex-col items-center gap-3">
                                <WorkflowIcon size={32} strokeWidth={1} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">暂无已存工作流</p>
                            </div>
                        ) : (
                            workflows.map(wf => (
                                <div key={wf.id} className={`group relative p-3 rounded-xl border transition-all ${selectedWorkflowId === wf.id ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectWorkflow(wf.id)}>
                                        <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center border border-white/5">
                                            {wf.thumbnail ? <img src={wf.thumbnail} className="w-full h-full object-cover" /> : <WorkflowIcon size={16} className="text-slate-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {editingWorkflowId === wf.id ? (
                                                <input 
                                                    autoFocus
                                                    className="w-full bg-black/40 border border-cyan-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                                                    value={tempTitle}
                                                    onChange={e => setTempTitle(e.target.value)}
                                                    onBlur={() => { onRenameWorkflow(wf.id, tempTitle); setEditingWorkflowId(null); }}
                                                    onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                                                />
                                            ) : (
                                                <p className="text-xs font-bold text-slate-200 truncate">{wf.title}</p>
                                            )}
                                            <p className="text-[9px] text-slate-500 mt-0.5 font-mono uppercase">Nodes: {wf.nodes.length}</p>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingWorkflowId(wf.id); setTempTitle(wf.title); }} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"><Edit size={12}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteWorkflow(wf.id); }} className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            );
        }

        if (activePanel === 'history') {
            return (
                <>
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <button onClick={() => setActivePanel(null)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">History Assets</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                        {assetHistory.length === 0 ? (
                            <div className="text-center py-10 opacity-30 flex flex-col items-center gap-3">
                                <History size={32} strokeWidth={1} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">暂无生成记录</p>
                            </div>
                        ) : (
                            assetHistory.map(asset => (
                                <div 
                                    key={asset.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, asset)}
                                    className="group relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer active:scale-95" 
                                    onClick={() => onHistoryItemClick(asset)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-black overflow-hidden flex items-center justify-center border border-white/5">
                                            {asset.type === 'image' ? <img src={asset.src} className="w-full h-full object-cover" /> : asset.type === 'video' ? <video src={asset.src} className="w-full h-full object-cover" muted /> : <Mic2 className="text-cyan-500" size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-slate-300 truncate pr-6">{asset.title || 'Untitled'}</p>
                                            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">{asset.type} • {new Date(asset.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.id); }}
                                        className="absolute right-2 top-2 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            );
        }

        return null;
    };

    return (
        <>
            <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 p-2 bg-[#1c1c1e]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-left-10 duration-500 ease-[${SPRING}]">
                {[
                    { id: 'add', icon: Plus, action: () => setActivePanel(activePanel === 'add' ? null : 'add') },
                    { id: 'workflow', icon: FolderHeart, action: () => setActivePanel(activePanel === 'workflow' ? null : 'workflow') }, 
                    { id: 'history', icon: History, action: () => setActivePanel(activePanel === 'history' ? null : 'history') },
                    { id: 'smart_sequence', icon: Clapperboard, action: onToggleMultiFrame, active: isMultiFrameOpen },
                    { id: 'chat', icon: MessageSquare, action: onToggleChat, active: isChatOpen },
                    { id: 'undo', icon: RotateCcw, action: onUndo },
                    { id: 'settings', icon: Settings, action: onOpenSettings },
                ].map(item => (
                    <button 
                        key={item.id} 
                        onClick={item.action} 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${activePanel === item.id || item.active ? 'bg-white text-black shadow-lg' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
                        title={item.id.toUpperCase()}
                    >
                        <item.icon size={18} />
                    </button>
                ))}
            </div>
            
            <div className={`fixed left-24 top-1/2 -translate-y-1/2 max-h-[85vh] h-[600px] w-72 bg-[#1c1c1e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-500 ease-[${SPRING}] z-40 flex flex-col overflow-hidden ${activePanel ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0 pointer-events-none scale-95'}`}>
                {activePanel && renderPanelContent()}
            </div>
        </>
    );
};
