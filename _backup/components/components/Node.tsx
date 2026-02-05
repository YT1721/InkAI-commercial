
import { AppNode, NodeStatus, NodeType, ScriptMasterMode, CinematicVersion, ImageGeneratorMode, VideoGenerationMode, VideoGeneratorMode } from '../types';
import { RefreshCw, Play, Image as ImageIcon, Video as VideoIcon, Type, AlertCircle, CheckCircle, Plus, Maximize2, Download, MoreHorizontal, Wand2, Scaling, FileSearch, Edit, Loader2, Layers, Trash2, X, Upload, Scissors, Film, MousePointerClick, Crop as CropIcon, ChevronDown, ChevronUp, GripHorizontal, Link, Copy, Monitor, Music, Pause, Volume2, Mic2, Sparkles, ScrollText, Zap, FileText, Sparkle, LayoutTemplate, Box, Brain, Clapperboard, ImagePlus, PenLine, FileUp, Camera, NotebookTabs, Clock, ScanFace } from 'lucide-react';
import React, { memo, useRef, useState, useEffect, useCallback } from 'react';

interface NodeProps {
  node: AppNode;
  onUpdate: (id: string, data: Partial<AppNode['data']>, size?: { width?: number, height?: number }, title?: string) => void;
  onAction: (id: string, prompt?: string) => void;
  onDelete: (id: string) => void;
  onExpand?: (data: any) => void;
  onCrop?: (id: string, img: string) => void; 
  onNodeMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseUp: (e: React.MouseEvent, id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  onResizeMouseDown: (e: React.MouseEvent, id: string, w: number, h: number) => void;
  isSelected: boolean;
}

const GLASS_PANEL = "bg-[#2c2c2e]/95 backdrop-blur-2xl border border-white/10 shadow-2xl";

const getAvailableModels = (type: NodeType) => {
    switch(type) {
        case NodeType.IMAGE_GENERATOR:
            return [
                { id: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
                { id: 'gemini-2.5-flash-image', label: 'Nano Banana' }
            ];
        case NodeType.VIDEO_GENERATOR:
            return [
                { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast' },
                { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 Pro' }
            ];
        default:
            return [
                { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
                { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' }
            ];
    }
};

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];
const IMAGE_RESOLUTIONS = ['1K', '2K', '4K'];
const VIDEO_RESOLUTIONS = ['720p', '1080p'];
const DURATIONS = [6, 10]; 

const NodeComponent: React.FC<NodeProps> = ({ node, onUpdate, onAction, onDelete, onExpand, onCrop, onNodeMouseDown, onPortMouseDown, onPortMouseUp, onNodeContextMenu, onResizeMouseDown, isSelected }) => {
  const isWorking = node.status === NodeStatus.WORKING;
  const mediaRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false); 
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(node.data.prompt || '');
  
  // Picker visibility states
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showRatioPicker, setShowRatioPicker] = useState(false);
  const [showResPicker, setShowResPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalPrompt(node.data.prompt || ''); }, [node.data.prompt]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'sourceScript' | 'video' = 'image') => { 
      const files = e.target.files; 
      if (!files || files.length === 0) return;
      
      const isMulti = (node.type === NodeType.IMAGE_GENERATOR && node.data.imageMode === 'I2I') || (node.type === NodeType.VIDEO_GENERATOR && node.data.videoMode !== 'T2V');

      if (isMulti) {
          const newImages: string[] = [...(node.data.images || [])];
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const reader = new FileReader();
              const base64 = await new Promise<string>((res) => {
                  reader.onload = (ev) => res(ev.target?.result as string);
                  reader.readAsDataURL(file);
              });
              newImages.push(base64);
          }
          onUpdate(node.id, { images: newImages.slice(0, 5), image: newImages[0] });
      } else {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              const img = new Image();
              img.onload = () => {
                  const ratio = img.naturalWidth / img.naturalHeight;
                  const standardWidth = 420;
                  const calculatedHeight = Math.max(380, standardWidth / ratio);
                  onUpdate(node.id, { image: base64, images: [base64] }, { width: standardWidth, height: calculatedHeight });
              };
              img.src = base64;
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const assetType = e.dataTransfer.getData('assetType');
      const assetSrc = e.dataTransfer.getData('assetSrc');
      if (!assetSrc) return;

      if (node.type === NodeType.IMAGE_GENERATOR) {
          if (node.data.imageMode === 'I2I') {
              const currentImages = node.data.images || [];
              if (!currentImages.includes(assetSrc)) {
                  onUpdate(node.id, { images: [...currentImages, assetSrc].slice(0, 5), image: assetSrc });
              }
          } else {
              onUpdate(node.id, { image: assetSrc, images: [assetSrc] });
          }
      } else if (node.type === NodeType.VIDEO_GENERATOR) {
          if (assetType === 'image') {
              const vMode = node.data.videoMode || 'T2V';
              if (vMode === 'T2V') {
                  onUpdate(node.id, { videoMode: 'I2V', image: assetSrc, images: [assetSrc] });
              } else if (node.data.generationMode === 'FIRST_LAST_FRAME') {
                  onUpdate(node.id, { lastFrameImage: assetSrc });
              } else {
                  const currentImages = node.data.images || [];
                  onUpdate(node.id, { images: [...currentImages, assetSrc].slice(0, 3), image: assetSrc });
              }
          } else if (assetType === 'video') {
              onUpdate(node.id, { videoUri: assetSrc });
          }
      }
  };

  const handleDownload = (resolution: string) => {
      const src = node.data.image || node.data.videoUri;
      if (!src) return;
      const link = document.createElement('a');
      link.href = src;
      link.download = `${node.title || 'asset'}_${resolution}.${node.data.image ? 'png' : 'mp4'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowDownloadMenu(false);
  };

  const renderScriptMasterUI = () => {
    const mode = node.data.scriptMode || 'CREATE';
    const result = node.data.remixedScript;
    const sourceText = node.data.displayResult; 

    return (
        <div className="w-full h-full p-4 flex flex-col gap-3">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full shrink-0">
                {[
                    { id: 'CREATE', label: '剧本创作', icon: PenLine },
                    { id: 'REMIX', label: '剧本改编', icon: RefreshCw },
                    { id: 'DESCRIBE', label: '视觉导演', icon: Camera }
                ].map(m => (
                    <button 
                        key={m.id} 
                        onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { scriptMode: m.id as ScriptMasterMode }); }}
                        className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg transition-all ${mode === m.id ? 'bg-[#3a3a3c] text-white shadow-xl ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <m.icon size={14} className={mode === m.id ? 'text-cyan-400' : ''} />
                        <span className="text-[9px] font-bold">{m.label}</span>
                    </button>
                ))}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-60">
                        {mode === 'REMIX' ? '待改编素材' : '创作参考'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-400 transition-colors">
                            <FileUp size={10} /> 注入剧本
                        </button>
                    </div>
                </div>
                <textarea 
                    className="flex-1 bg-black/40 rounded-xl text-[11px] text-slate-300 p-3 focus:outline-none resize-none border border-white/5 custom-scrollbar min-h-24"
                    placeholder={mode === 'REMIX' ? "在此粘贴需要改编的内容..." : "粘贴参考灵感..."}
                    value={sourceText || ''}
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => onUpdate(node.id, { displayResult: e.target.value })}
                />
            </div>
            <div className={`flex-1 min-h-0 bg-black/30 rounded-2xl border border-white/5 p-4 overflow-y-auto custom-scrollbar flex flex-col ${!result && !isWorking ? 'items-center justify-center' : ''}`}>
                {isWorking ? (
                    <div className="flex flex-col items-center gap-4 m-auto text-center opacity-50">
                        <Loader2 className="animate-spin text-[#ffb400]" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">正在处理...</span>
                    </div>
                ) : result ? (
                    <div className="w-full h-full text-xs text-slate-300 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-500 select-text cursor-text">
                        {result}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 opacity-20 pointer-events-none text-center">
                        <ScrollText size={48} strokeWidth={1} />
                        <span className="text-[10px] font-bold tracking-widest">等待生成...</span>
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.doc,.docx" onChange={(e) => handleUploadFile(e, 'sourceScript')} />
        </div>
    );
  };

  const renderImageGeneratorUI = () => {
    const hasImageResult = !!node.data.image && node.status === NodeStatus.SUCCESS;
    const refImages = node.data.images || [];
    const mode = node.data.imageMode || 'T2I';
    const cVers = node.data.cinematicVersion || 'V1';

    if (hasImageResult) {
        return (
            <div className="w-full h-full relative group/media overflow-hidden flex items-center justify-center bg-black" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
                <img src={node.data.image} className="w-full h-full object-contain" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }} className="p-1.5 bg-black/60 rounded-lg text-white/50 hover:text-cyan-400 shadow-xl"><Download size={14}/></button>
                        {showDownloadMenu && (
                            <div className="absolute top-full right-0 mt-2 w-32 bg-[#1c1c1e] border border-white/10 rounded-xl p-1 shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                                {IMAGE_RESOLUTIONS.map(res => (
                                    <button key={res} onClick={(e) => { e.stopPropagation(); handleDownload(res); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">{res}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onAction(node.id, "STORYBOARD"); }} title="以此图生成分镜" className="p-1.5 bg-cyan-500/80 rounded-lg text-black hover:bg-cyan-400 flex items-center gap-1.5 shadow-xl">
                        <LayoutTemplate size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-tighter">STORYBOARD</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { image: undefined, images: undefined }); }} className="p-1.5 bg-black/60 rounded-lg text-white/50 hover:text-red-400 shadow-xl"><Trash2 size={14}/></button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 flex flex-col gap-4" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full shrink-0">
                {[
                    { id: 'T2I', label: '文生图', icon: Type },
                    { id: 'I2I', label: '图生图', icon: ImagePlus },
                    { id: 'STORYBOARD', label: '导演分镜', icon: Clapperboard }
                ].map(m => (
                    <button 
                        key={m.id} 
                        onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { imageMode: m.id as ImageGeneratorMode, images: [], image: undefined }); }}
                        className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${mode === m.id ? 'bg-[#3a3a3c] text-white shadow-xl ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <m.icon size={13} className={mode === m.id ? 'text-cyan-400' : ''} />
                        <span className="text-[8px] font-black">{m.label}</span>
                    </button>
                ))}
            </div>
            {mode === 'STORYBOARD' && (
                <div className="flex gap-1 justify-center animate-in fade-in slide-in-from-top-1 duration-300">
                    {['V1', 'V2', 'V3'].map(v => (
                        <button 
                            key={v} 
                            onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { cinematicVersion: v as CinematicVersion }); }}
                            className={`px-4 py-1 rounded-full text-[10px] font-black transition-all border ${cVers === v ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300'}`}
                        >
                            {v} {v === 'V1' ? '静态' : v === 'V2' ? '叙事' : '创意'}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex-1 min-h-0 relative">
                {mode === 'T2I' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 gap-3 border border-white/5 rounded-2xl bg-black/20">
                        <ImageIcon size={48} strokeWidth={1} />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase">Ready to Create</span>
                    </div>
                ) : (
                    <div className={`w-full h-full relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center group/slot overflow-hidden ${refImages.length > 0 ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                        {refImages.length > 0 ? (
                            <div className="w-full h-full flex flex-col p-2 gap-2 overflow-hidden bg-black/20 relative">
                                 <div className="flex-1 min-h-0 flex items-center justify-center">
                                     <img src={refImages[0]} className="max-w-full max-h-full object-contain" />
                                 </div>
                                 {mode === 'I2I' && (
                                     <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                         {refImages.map((img, idx) => (
                                             <div key={idx} className="w-12 h-12 rounded bg-black/40 border border-white/10 shrink-0 relative group/thumb">
                                                 <img src={img} className="w-full h-full object-cover rounded" />
                                                 <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { images: refImages.filter((_, i) => i !== idx) }); }} className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"><X size={8}/></button>
                                             </div>
                                         ))}
                                         <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="w-12 h-12 rounded border border-dashed border-white/20 flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Plus size={16}/></button>
                                     </div>
                                 )}
                                 <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { image: undefined, images: undefined }); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white/70 hover:text-red-400 opacity-0 group-hover/slot:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                            </div>
                        ) : (
                             <div className="flex flex-col items-center gap-3 text-slate-500 cursor-pointer p-10 text-center" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                 <ImagePlus size={32} strokeWidth={1} />
                                 <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                     {mode === 'I2I' ? '点击或拖入多张参考图' : '点击或拖入分镜基准图'}
                                 </span>
                             </div>
                         )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple={mode === 'I2I'} onChange={(e) => handleUploadFile(e)} />
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderVideoGeneratorUI = () => {
    const mode = node.data.videoMode || 'T2V';
    const gMode = node.data.generationMode || 'DEFAULT';
    const hasVideoResult = !!node.data.videoUri && node.status === NodeStatus.SUCCESS;
    const refImages = node.data.images || [];
    const lastFrame = node.data.lastFrameImage;

    if (hasVideoResult) {
        return (
            <div className="w-full h-full relative group/media overflow-hidden" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
                <video ref={mediaRef} src={node.data.videoUri} className="w-full h-full object-cover bg-zinc-900" loop muted onMouseEnter={() => mediaRef.current?.play()} onMouseLeave={() => { mediaRef.current?.pause(); mediaRef.current.currentTime = 0; }} />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/media:opacity-100 transition-opacity">
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }} className="p-1.5 bg-black/60 rounded-lg text-white/50 hover:text-cyan-400 shadow-xl"><Download size={14}/></button>
                        {showDownloadMenu && (
                            <div className="absolute top-full right-0 mt-2 w-32 bg-[#1c1c1e] border border-white/10 rounded-xl p-1 shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                                {VIDEO_RESOLUTIONS.map(res => (
                                    <button key={res} onClick={(e) => { e.stopPropagation(); handleDownload(res); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">{res}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { videoUri: undefined, videoMetadata: undefined }); }} className="p-1.5 bg-black/60 rounded-lg text-white/50 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 flex flex-col gap-3" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full shrink-0">
                {[
                    { id: 'T2V', label: '文生视频', icon: Clapperboard },
                    { id: 'I2V', label: '图生视频', icon: VideoIcon },
                    { id: 'DIRECTOR', label: '导演模式', icon: Film }
                ].map(m => (
                    <button 
                        key={m.id} 
                        onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { videoMode: m.id as VideoGeneratorMode, images: [], image: undefined, generationMode: 'DEFAULT' }); }}
                        className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${mode === m.id ? 'bg-[#3a3a3c] text-white shadow-xl ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <m.icon size={13} className={mode === m.id ? 'text-purple-400' : ''} />
                        <span className="text-[8px] font-black">{m.label}</span>
                    </button>
                ))}
            </div>

            {mode === 'DIRECTOR' && (
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 w-full overflow-x-auto custom-scrollbar shrink-0">
                    {[
                        { id: 'CONTINUE', label: '视频延展', icon: RefreshCw },
                        { id: 'FIRST_LAST_FRAME', label: '首尾帧', icon: Link },
                        { id: 'CUT', label: '分镜抽取', icon: Scissors },
                        { id: 'CHARACTER_REF', label: '角色迁移', icon: ScanFace }
                    ].map(g => (
                        <button 
                            key={g.id} 
                            onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { generationMode: g.id as VideoGenerationMode }); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded transition-all whitespace-nowrap ${gMode === g.id ? 'bg-purple-500/20 text-purple-200' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <g.icon size={10} />
                            <span className="text-[8px] font-bold">{g.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 min-h-0 relative">
                {mode === 'T2V' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 gap-3 border border-white/5 rounded-2xl bg-black/20">
                        <VideoIcon size={48} strokeWidth={1} />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase">Cinema Ready</span>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 flex gap-2 h-full">
                        <div className={`flex-1 relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center group/slot overflow-hidden ${refImages.length > 0 ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                            {refImages.length > 0 ? (
                                <div className="w-full h-full flex flex-col p-2 gap-2 overflow-hidden bg-black/20 relative">
                                    <div className="flex-1 min-h-0 flex items-center justify-center">
                                        <img src={refImages[0]} className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                        {refImages.map((img, idx) => (
                                            <div key={idx} className="w-10 h-10 rounded bg-black/40 border border-white/10 shrink-0 relative group/thumb">
                                                <img src={img} className="w-full h-full object-cover rounded" />
                                                <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { images: refImages.filter((_, i) => i !== idx) }); }} className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"><X size={8}/></button>
                                            </div>
                                        ))}
                                        {refImages.length < 3 && <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="w-10 h-10 rounded border border-dashed border-white/20 flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Plus size={14}/></button>}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { images: [], image: undefined }); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white/70 hover:text-red-400 opacity-0 group-hover/slot:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer text-center px-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                    <ImagePlus size={20} />
                                    <span className="text-[8px] font-black uppercase">{gMode === 'FIRST_LAST_FRAME' ? '起始帧' : '参考图 (1-3)'}</span>
                                </div>
                            )}
                        </div>

                        {gMode === 'FIRST_LAST_FRAME' && (
                             <div className={`flex-1 relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center group/slot2 overflow-hidden ${lastFrame ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                                {lastFrame ? (
                                    <div className="relative w-full h-full group/vpreview2 flex items-center justify-center bg-black">
                                        <img src={lastFrame} className="w-full h-full object-contain" />
                                        <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, {lastFrameImage: undefined}); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white/50 hover:text-red-400 opacity-0 group-hover/vpreview2:opacity-100 transition-opacity"><X size={10}/></button>
                                        <div className="absolute bottom-1 left-1 px-1 bg-black/60 rounded text-[8px] font-bold text-cyan-400 uppercase">END</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-slate-500 cursor-pointer" onClick={(e) => {
                                        e.stopPropagation();
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = async (ev: any) => {
                                            const file = ev.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (rev) => onUpdate(node.id, { lastFrameImage: rev.target?.result as string });
                                                reader.readAsDataURL(file);
                                            }
                                        };
                                        input.click();
                                    }}>
                                        <ImagePlus size={20} />
                                        <span className="text-[8px] font-black uppercase">结束帧</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple={mode !== 'T2V'} onChange={(e) => handleUploadFile(e)} />
        </div>
    );
  };

  const renderMediaContent = () => {
      if (node.type === NodeType.VIDEO_GENERATOR) return renderVideoGeneratorUI();
      if (node.type === NodeType.IMAGE_GENERATOR) return renderImageGeneratorUI();
      if (node.type === NodeType.SCRIPT_MASTER) return renderScriptMasterUI();
      
      const result = node.data.displayResult || node.data.analysis;
      return (
        <div className="w-full h-full p-4 flex flex-col">
           <div className="flex-1 bg-black/20 rounded-xl border border-white/5 p-3 overflow-y-auto custom-scrollbar text-xs text-slate-300 whitespace-pre-wrap select-text" onMouseDown={e => e.stopPropagation()}>
              {isWorking ? <Loader2 className="animate-spin text-cyan-500 m-auto" size={24} /> : result || "等待指令..."}
           </div>
        </div>
      );
  };

  const models = getAvailableModels(node.type);
  const currentModelLabel = models.find(m => m.id === node.data.model)?.label || '选择模型';
  const currentRatio = node.data.aspectRatio || '16:9';
  const currentRes = node.data.resolution || (node.type === NodeType.IMAGE_GENERATOR ? '1K' : '720p');
  const currentTime = node.data.duration || 6;

  return (
    <div 
        className={`absolute rounded-[28px] group ${isSelected ? 'ring-2 ring-cyan-500/50 shadow-[0_0_60px_-10px_rgba(34,211,238,0.4)] z-30' : 'ring-1 ring-white/10 hover:ring-white/20 z-10'}`}
        style={{ left: node.x, top: node.y, width: node.width || 420, height: node.height || 380, background: isSelected ? 'rgba(28, 28, 30, 0.95)' : 'rgba(28, 28, 30, 0.75)', transition: 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)', backdropFilter: 'blur(32px)' }}
        onMouseDown={e => onNodeMouseDown(e, node.id)} 
        onContextMenu={e => onNodeContextMenu(e, node.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setShowModelPicker(false); setShowRatioPicker(false); setShowResPicker(false); setShowTimePicker(false); }}
    >
        <div className={`absolute -top-10 left-0 w-full flex items-center justify-between px-1 transition-all duration-300 ${isSelected || isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
             <div className="flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20"><Trash2 size={14}/></button>
             </div>
             <div className="flex items-center gap-2 px-4 py-1.5 bg-black/60 border border-white/10 rounded-full backdrop-blur-xl shadow-lg"><div className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-[#ffb400] animate-pulse shadow-[0_0_8px_#ffb400]' : 'bg-green-500'}`} /><span className="text-[10px] font-black uppercase tracking-widest text-slate-200">{node.title}</span></div>
        </div>
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white/20 bg-[#1c1c1e] flex items-center justify-center cursor-crosshair z-50 hover:scale-125 transition-transform" onMouseDown={e => onPortMouseDown(e, node.id)} onMouseUp={e => onPortMouseUp(e, node.id)}><Plus size={12} className="text-white/50" /></div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white/20 bg-[#1c1c1e] flex items-center justify-center cursor-crosshair z-50 hover:scale-125 transition-transform" onMouseDown={e => onPortMouseDown(e, node.id)} onMouseUp={e => onPortMouseUp(e, node.id)}><Plus size={12} className="text-white/50" /></div>
        <div className="w-full h-full rounded-[28px] overflow-hidden bg-zinc-950/50 shadow-inner">{renderMediaContent()}</div>
        
        {/* Fixed Footer UI: Increased z-index and strictly preventing bubbling onMouseDown */}
        <div 
            className={`absolute top-[96%] left-1/2 -translate-x-1/2 w-[94%] pt-4 z-[100] flex flex-col items-center transition-all duration-500 ${isHovered || isInputFocused || isSelected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[-10px] scale-95 pointer-events-none'}`}
            onMouseDown={e => e.stopPropagation()}
        >
            <div className={`w-full rounded-[24px] p-2 flex flex-col gap-2 ${GLASS_PANEL}`}>
                <textarea 
                    className="w-full bg-black/30 rounded-[18px] text-[13px] text-slate-100 p-4 focus:outline-none resize-none min-h-[70px] custom-scrollbar font-medium border border-white/5 focus:border-cyan-500/20 transition-all" 
                    placeholder={node.type === NodeType.SCRIPT_MASTER ? "输入剧本需求..." : "输入生成指令..."}
                    value={localPrompt} 
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => setLocalPrompt(e.target.value)} 
                    onFocus={() => setIsInputFocused(true)} 
                    onBlur={() => setIsInputFocused(false)} 
                />
                <div className="flex items-center justify-between px-2 pb-1 relative">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" onMouseDown={e => e.stopPropagation()}>
                        {/* Model Selector */}
                        <div className="relative">
                            <button 
                                onMouseDown={(e) => { e.stopPropagation(); setShowModelPicker(!showModelPicker); setShowRatioPicker(false); setShowResPicker(false); setShowTimePicker(false); }} 
                                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-400 flex items-center gap-1 transition-all border border-white/5 whitespace-nowrap"
                            >
                                {currentModelLabel}
                                <ChevronDown size={8} />
                            </button>
                            {showModelPicker && (
                                <div className="absolute bottom-full left-0 mb-2 w-36 bg-[#1c1c1e] border border-white/10 rounded-xl p-1 shadow-2xl z-[110] animate-in fade-in slide-in-from-bottom-2">
                                    {models.map(m => (
                                        <button key={m.id} onMouseDown={(e) => { e.stopPropagation(); onUpdate(node.id, { model: m.id }); setShowModelPicker(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${node.data.model === m.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>{m.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Ratio Selector */}
                        {(node.type === NodeType.IMAGE_GENERATOR || node.type === NodeType.VIDEO_GENERATOR) && (
                            <div className="relative">
                                <button 
                                    onMouseDown={(e) => { e.stopPropagation(); setShowRatioPicker(!showRatioPicker); setShowModelPicker(false); setShowResPicker(false); setShowTimePicker(false); }} 
                                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-400 flex items-center gap-1 transition-all border border-white/5 whitespace-nowrap"
                                >
                                    <Scaling size={10} className="text-cyan-500/50" />
                                    {currentRatio}
                                </button>
                                {showRatioPicker && (
                                    <div className="absolute bottom-full left-0 mb-2 w-20 bg-[#1c1c1e] border border-white/10 rounded-xl p-1 shadow-2xl z-[110] animate-in fade-in slide-in-from-bottom-2">
                                        {ASPECT_RATIOS.map(r => (
                                            <button key={r} onMouseDown={(e) => { e.stopPropagation(); onUpdate(node.id, { aspectRatio: r }); setShowRatioPicker(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${currentRatio === r ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>{r}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Resolution Selector */}
                        {(node.type === NodeType.IMAGE_GENERATOR || node.type === NodeType.VIDEO_GENERATOR) && (
                            <div className="relative">
                                <button 
                                    onMouseDown={(e) => { e.stopPropagation(); setShowResPicker(!showResPicker); setShowModelPicker(false); setShowRatioPicker(false); setShowTimePicker(false); }} 
                                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-400 flex items-center gap-1 transition-all border border-white/5 whitespace-nowrap"
                                >
                                    <Maximize2 size={10} className="text-purple-500/50" />
                                    {currentRes}
                                </button>
                                {showResPicker && (
                                    <div className="absolute bottom-full left-0 mb-2 w-24 bg-[#1c1c1e] border border-white/10 rounded-xl p-1 shadow-2xl z-[110] animate-in fade-in slide-in-from-bottom-2">
                                        {(node.type === NodeType.IMAGE_GENERATOR ? IMAGE_RESOLUTIONS : VIDEO_RESOLUTIONS).map(r => (
                                            <button key={r} onMouseDown={(e) => { e.stopPropagation(); onUpdate(node.id, { resolution: r }); setShowResPicker(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${currentRes === r ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>{r}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Duration Selector (Only Video) */}
                        {node.type === NodeType.VIDEO_GENERATOR && (
                             <div className="relative">
                                <button 
                                    onMouseDown={(e) => { e.stopPropagation(); setShowTimePicker(!showTimePicker); setShowModelPicker(false); setShowRatioPicker(false); setShowResPicker(false); }} 
                                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-400 flex items-center gap-1 transition-all border border-white/5 whitespace-nowrap"
                                >
                                    <Clock size={10} className="text-amber-500/50" />
                                    {currentTime}s
                                </button>
                                {showTimePicker && (
                                    <div className="absolute bottom-full left-0 mb-2 w-20 bg-[#1c1c1e] border border-white/10 rounded-xl p-1 shadow-2xl z-[110] animate-in fade-in slide-in-from-bottom-2">
                                        {DURATIONS.map(d => (
                                            <button key={d} onMouseDown={(e) => { e.stopPropagation(); onUpdate(node.id, { duration: d }); setShowTimePicker(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${currentTime === d ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>{d}s</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button 
                        onMouseDown={e => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onAction(node.id, localPrompt); }} 
                        disabled={isWorking} 
                        className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-[10px] text-white transition-all bg-gradient-to-r from-cyan-500 to-blue-600 shadow-xl shadow-cyan-900/40 hover:scale-105 active:scale-95 disabled:opacity-50 group/render`}
                    >
                        {isWorking ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} className="group-hover/render:fill-white" />}
                        <span>
                            {node.data.imageMode === 'STORYBOARD' ? '生成分镜' : 
                            (node.type === NodeType.IMAGE_GENERATOR ? '生成图像' : 
                            (node.type === NodeType.SCRIPT_MASTER ? '开始创作' : '生成视频'))}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export const Node = memo(NodeComponent);
