
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from './components/Node';
import { SidebarDock } from '././components/SidebarDock';
import { AssistantPanel } from './components/AssistantPanel';
import { ImageCropper } from './components/ImageCropper';
import { SketchEditor } from './components/SketchEditor'; 
import { SmartSequenceDock } from './components/SmartSequenceDock';
import { SonicStudio } from './components/SonicStudio'; 
import { SettingsModal } from './components/SettingsModal';
import { AppNode, NodeType, NodeStatus, Connection, ContextMenuState, Group, Workflow, SmartSequenceItem } from './types';
import { 
    generateImageFromText, generateVideo, analyzeVideo, planStoryboard, 
    orchestrateVideoPrompt, compileMultiFramePrompt, urlToBase64, extractLastFrame, 
    generateAudio, sendChatMessage, createScriptFromText, 
    expandVisualDescription, createCinematicV1, createCinematicV2, createCinematicV3,
    adaptScriptProfessional
} from './services/geminiService';
import { getGenerationStrategy } from './services/videoStrategies';
import { saveToStorage, loadFromStorage } from './services/storage';
import { 
    Plus, Copy, Trash2, Type, Image as ImageIcon, Video as VideoIcon, 
    ScanFace, Brush, MousePointerClick, LayoutTemplate, X, Film, Link, RefreshCw, Upload,
    Minus, FolderHeart, Unplug, Sparkles, ChevronLeft, ChevronRight, Scan, Music, Mic2, Loader2,
    Zap, PlayCircle, Layers, Settings, ScrollText
} from 'lucide-react';

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";
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

const getApproxNodeHeight = (node: AppNode) => {
    if (node.height) return node.height;
    if (['PROMPT_INPUT', 'VIDEO_ANALYZER', 'IMAGE_EDITOR', 'SCRIPT_MASTER'].includes(node.type)) return 380;
    if (node.type === NodeType.AUDIO_GENERATOR) return 200;
    return 380;
};
const getNodeBounds = (node: AppNode) => {
    const h = node.height || getApproxNodeHeight(node);
    const w = node.width || 420;
    return { x: node.x, y: node.y, width: w, height: h, r: node.x + w, b: node.y + h };
};

const ExpandedView = ({ media, onClose }: { media: any, onClose: () => void }) => {
    const [visible, setVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
    useEffect(() => { if (media) { requestAnimationFrame(() => setVisible(true)); setCurrentIndex(media.initialIndex || 0); } else setVisible(false); }, [media]);
    const handleClose = useCallback(() => { setVisible(false); setTimeout(onClose, 400); }, [onClose]);
    useEffect(() => {
        if (!media) return;
        const currentSrc = media.images ? media.images[currentIndex] : media.src;
        const isVideo = (media.type === 'video') && !(currentSrc && currentSrc.startsWith('data:image'));
        if (isVideo) {
            if (currentSrc.startsWith('blob:') || currentSrc.startsWith('data:')) { setVideoBlobUrl(currentSrc); return; }
            let active = true;
            fetch(currentSrc).then(res => res.blob()).then(blob => { if (active) setVideoBlobUrl(URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }))); });
            return () => { active = false; };
        } else setVideoBlobUrl(null);
    }, [media, currentIndex]);
    if (!media) return null;
    const currentSrc = media.images ? media.images[currentIndex] : media.src;
    const isVideo = (media.type === 'video') && !(currentSrc && currentSrc.startsWith('data:image'));
    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ease-[${SPRING}] ${visible ? 'bg-black/90 backdrop-blur-xl' : 'bg-transparent pointer-events-none opacity-0'}`} onClick={handleClose}>
             <div className={`relative w-full h-full flex items-center justify-center p-8 transition-all duration-500 ease-[${SPRING}] ${visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`} onClick={e => e.stopPropagation()}>
                {media.images?.length > 1 && (<button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + media.images.length) % media.images.length); }} className="absolute left-8 p-3 bg-white/10 rounded-full text-white"><ChevronLeft size={32} /></button>)}
                <div className="relative max-w-full max-h-full">
                    {!isVideo ? <img key={currentSrc} src={currentSrc} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" /> : videoBlobUrl && <video key={videoBlobUrl} src={videoBlobUrl} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" controls autoPlay />}
                </div>
                {media.images?.length > 1 && (<button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % media.images.length); }} className="absolute right-8 p-3 bg-white/10 rounded-full text-white"><ChevronRight size={32} /></button>)}
             </div>
             <button onClick={handleClose} className="absolute top-6 left-6 p-3 bg-white/10 rounded-full text-white"><X size={24} /></button>
        </div>
    );
};

export const App = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]); 
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); 
  const [isSketchEditorOpen, setIsSketchEditorOpen] = useState(false);
  const [isMultiFrameOpen, setIsMultiFrameOpen] = useState(false);
  const [isSonicStudioOpen, setIsSonicStudioOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{width: number, height: number} | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{x: number, y: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<any>(null);
  const [croppingNodeId, setCroppingNodeId] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ id: string, x: number, y: number } | null>(null);
  
  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const groupsRef = useRef(groups);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const connectionStartRef = useRef(connectionStart);
  const rafRef = useRef<number | null>(null);
  const dragNodeRef = useRef<any>(null);
  const dragGroupRef = useRef<any>(null);

  useEffect(() => {
      nodesRef.current = nodes; connectionsRef.current = connections; groupsRef.current = groups;
      historyRef.current = history; historyIndexRef.current = historyIndex; connectionStartRef.current = connectionStart;
  }, [nodes, connections, groups, history, historyIndex, connectionStart]);

  useEffect(() => {
      if (window.aistudio) window.aistudio.hasSelectedApiKey().then(hasKey => { if (!hasKey) window.aistudio.openSelectKey(); });
      const loadData = async () => {
          try {
            const sAssets = await loadFromStorage<any[]>('assets'); if (sAssets) setAssetHistory(sAssets);
            const sWfs = await loadFromStorage<Workflow[]>('workflows'); if (sWfs) setWorkflows(sWfs);
            const sNodes = await loadFromStorage<AppNode[]>('nodes'); if (sNodes) setNodes(sNodes);
            const sConns = await loadFromStorage<Connection[]>('connections'); if (sConns) setConnections(sConns);
            const sGroups = await loadFromStorage<Group[]>('groups'); if (sGroups) setGroups(sGroups);
          } catch (e) {} finally { setIsLoaded(true); }
      };
      loadData();
  }, []);

  useEffect(() => {
      if (!isLoaded) return; 
      saveToStorage('assets', assetHistory); saveToStorage('workflows', workflows); saveToStorage('nodes', nodes); saveToStorage('connections', connections); saveToStorage('groups', groups);
  }, [assetHistory, workflows, nodes, connections, groups, isLoaded]);

  const saveHistory = useCallback(() => {
      const current = { nodes: JSON.parse(JSON.stringify(nodesRef.current)), connections: JSON.parse(JSON.stringify(connectionsRef.current)), groups: JSON.parse(JSON.stringify(groupsRef.current)) };
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(current); if (newHistory.length > 50) newHistory.shift(); 
      setHistory(newHistory); setHistoryIndex(newHistory.length - 1);
  }, []);

  const undo = useCallback(() => {
      const idx = historyIndexRef.current; if (idx > 0) { const prev = historyRef.current[idx - 1]; setNodes(prev.nodes); setConnections(prev.connections); setGroups(prev.groups); setHistoryIndex(idx - 1); }
  }, []);

  const deleteNodes = useCallback((ids: string[]) => { 
      if (ids.length === 0) return;
      saveHistory(); 
      setNodes(p => p.filter(n => !ids.includes(n.id)).map(n => ({...n, inputs: n.inputs.filter(i => !ids.includes(i))}))); 
      setConnections(p => p.filter(c => !ids.includes(c.from) && !ids.includes(c.to))); 
      setSelectedNodeIds([]); 
  }, [saveHistory]);

  const addNode = useCallback((type: NodeType, x?: number, y?: number, initialData?: any) => {
      if (type === NodeType.IMAGE_EDITOR) { setIsSketchEditorOpen(true); return; }
      saveHistory();
      const defaults: any = { 
          model: 'gemini-3-pro-preview',
          aspectRatio: '16:9',
          scriptMode: type === NodeType.SCRIPT_MASTER ? 'CREATE' : undefined,
          ...initialData
      };
      const safeX = x !== undefined ? x : (-pan.x + window.innerWidth/2)/scale - 210;
      const safeY = y !== undefined ? y : (-pan.y + window.innerHeight/2)/scale - 180;
      const newNode: AppNode = { id: `n-${Date.now()}-${Math.floor(Math.random()*1000)}`, type, x: isNaN(safeX) ? 100 : safeX, y: isNaN(safeY) ? 100 : safeY, width: 420, title: getNodeNameCN(type), status: NodeStatus.IDLE, data: defaults, inputs: [] };
      setNodes(prev => [...prev, newNode]); 
  }, [pan, scale, saveHistory]);

  const handleAssetGenerated = useCallback((type: 'image' | 'video' | 'audio', src: string, title: string) => {
      setAssetHistory(h => { const exists = h.find(a => a.src === src); if (exists) return h; return [{ id: `a-${Date.now()}`, type, src, title, timestamp: Date.now() }, ...h]; });
  }, []);

  const handleNodeUpdate = useCallback((id: string, data: any, size?: any, title?: string) => {
      setNodes(prev => prev.map(n => {
          if (n.id === id) {
              const updated = { ...n, data: { ...n.data, ...data }, title: title || n.title };
              if (size) { if (size.width) updated.width = size.width; if (size.height) updated.height = size.height; }
              if (data.image) handleAssetGenerated('image', data.image, updated.title);
              if (data.videoUri) handleAssetGenerated('video', data.videoUri, updated.title);
              if (data.audioUri) handleAssetGenerated('audio', data.audioUri, updated.title);
              return updated;
          }
          return n;
      }));
  }, [handleAssetGenerated]);

  const handleNodeAction = useCallback(async (id: string, promptOverride?: string) => {
      const node = nodesRef.current.find(n => n.id === id); if (!node) return;
      handleNodeUpdate(id, { error: undefined });
      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING } : n));
      try {
          const inputs = node.inputs.map(i => nodesRef.current.find(n => n.id === i)).filter(Boolean) as AppNode[];
          const upstreamTexts = inputs.map(n => n.data.remixedScript || n.data.displayResult || n.data.analysis || n.data.prompt).filter(t => t && t.trim().length > 0) as string[];
          const upstreamImages = inputs.map(n => n.data.croppedFrame || n.data.image).filter(Boolean) as string[];
          
          let prompt = promptOverride || node.data.prompt || '';
          const combinedUpstream = upstreamTexts.join('\n\n');

          if (node.type === NodeType.SCRIPT_MASTER) {
              const mode = node.data.scriptMode || 'CREATE';
              let result = "";

              if (mode === 'CREATE') {
                  // 创作：参考源 (displayResult) + 需求 (prompt)
                  const reference = node.data.displayResult || combinedUpstream;
                  result = await createScriptFromText(reference, prompt);
              } else if (mode === 'REMIX') {
                  // 专业改编逻辑
                  const sourceText = node.data.displayResult || combinedUpstream;
                  const sourceVideo = node.data.videoUri || inputs.find(n => n.data.videoUri)?.data.videoUri;
                  let videoAnalysis = "";
                  if (sourceVideo) {
                      let vidData = sourceVideo; if (sourceVideo.startsWith('http')) vidData = await urlToBase64(vidData);
                      videoAnalysis = await analyzeVideo(vidData, "提取该视频的动作逻辑、视觉风格和人设特征。", "gemini-3-flash-preview");
                  }
                  result = await adaptScriptProfessional(sourceText, videoAnalysis, prompt);
              } else {
                  // 描述：扩展创意描述
                  result = await expandVisualDescription(prompt || combinedUpstream);
              }
              handleNodeUpdate(id, { remixedScript: result });
          } else if (node.type === NodeType.IMAGE_GENERATOR) {
              if (promptOverride === "STORYBOARD") {
                   const sourceContent = node.data.prompt || combinedUpstream;
                   if (!sourceContent) throw new Error("缺少 Prompt 或剧本输入");
                   const storyboardPrompts = await planStoryboard(sourceContent);
                   if (storyboardPrompts.length > 0) {
                      saveHistory();
                      const newNodes: AppNode[] = [];
                      const newConnections: Connection[] = [];
                      const COLS = 3, GAP_X = 460, GAP_Y = 420, START_X = node.x + 500, START_Y = node.y;
                      storyboardPrompts.forEach((pStr, idx) => {
                          const col = idx % COLS, row = Math.floor(idx / COLS), nodeId = `n-story-${Date.now()}-${idx}`;
                          newNodes.push({ id: nodeId, type: NodeType.IMAGE_GENERATOR, x: START_X + col * GAP_X, y: START_Y + row * GAP_Y, width: 420, title: `分镜 ${idx + 1}`, status: NodeStatus.IDLE, data: { prompt: pStr, model: 'gemini-3-pro-image-preview', aspectRatio: node.data.aspectRatio || '16:9' }, inputs: [node.id] });
                          newConnections.push({ from: node.id, to: nodeId });
                      });
                      setGroups(prev => [...prev, { id: `g-story-${Date.now()}`, title: '导演分镜组', x: START_X - 40, y: START_Y - 40, width: (COLS * GAP_X), height: (Math.ceil(storyboardPrompts.length / COLS) * GAP_Y) }]);
                      setNodes(prev => [...prev, ...newNodes]); setConnections(prev => [...prev, ...newConnections]); handleNodeUpdate(id, { status: NodeStatus.SUCCESS });
                      return;
                   }
              }
              const refImages = [...upstreamImages];
              if (node.data.image && !refImages.includes(node.data.image)) refImages.push(node.data.image);
              const res = await generateImageFromText(prompt || combinedUpstream, node.data.model!, refImages, { aspectRatio: node.data.aspectRatio });
              handleNodeUpdate(id, { image: res[0], images: res });
          } else if (node.type === NodeType.VIDEO_GENERATOR) {
              const strategy = await getGenerationStrategy(node, inputs, prompt || combinedUpstream);
              const res = await generateVideo(strategy.finalPrompt, node.data.model!, { aspectRatio: node.data.aspectRatio }, strategy.inputImageForGeneration, strategy.videoInput, strategy.referenceImages, strategy.lastFrameImage);
              handleNodeUpdate(id, { videoUri: res.uri, videoMetadata: res.videoMetadata });
          } else if (node.type === NodeType.AUDIO_GENERATOR) {
              const uri = await generateAudio(prompt || combinedUpstream);
              handleNodeUpdate(id, { audioUri: uri });
          } else if (node.type === NodeType.PROMPT_INPUT) {
              const responseText = await sendChatMessage([], prompt || combinedUpstream, { isThinkingMode: true });
              handleNodeUpdate(id, { displayResult: responseText });
          } else if (node.type === NodeType.VIDEO_ANALYZER) {
              const vid = node.data.videoUri || inputs.find(n => n.data.videoUri)?.data.videoUri;
              if (!vid) throw new Error("无视频");
              let vd = vid; if (vid.startsWith('http')) vd = await urlToBase64(vid);
              const txt = await analyzeVideo(vd, prompt || "分析视频内容", node.data.model!);
              handleNodeUpdate(id, { analysis: txt });
          }
          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
      } catch (e: any) { 
          handleNodeUpdate(id, { error: e.message }); 
          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.ERROR } : n)); 
      }
  }, [handleNodeUpdate, saveHistory]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (contextMenu) setContextMenu(null); setSelectedGroupId(null);
      if (e.button === 0 && !e.shiftKey) { setIsDraggingCanvas(true); setLastMousePos({ x: e.clientX, y: e.clientY }); }
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (isDraggingCanvas) { const dx = e.clientX - lastMousePos.x, dy = e.clientY - lastMousePos.y; setPan(p => ({ x: p.x + dx, y: p.y + dy })); setLastMousePos({ x: e.clientX, y: e.clientY }); }
          if (draggingNodeId && dragNodeRef.current) {
             const { startX, startY, mouseStartX, mouseStartY } = dragNodeRef.current;
             const dx = (e.clientX - mouseStartX) / scale, dy = (e.clientY - mouseStartY) / scale;
             setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: startX + dx, y: startY + dy } : n));
          }
          if (dragGroupRef.current) {
              const { id, startX, startY, mouseStartX, mouseStartY, childNodes } = dragGroupRef.current;
              const dx = (e.clientX - mouseStartX) / scale, dy = (e.clientY - mouseStartY) / scale;
              setGroups(prev => prev.map(g => g.id === id ? { ...g, x: startX + dx, y: startY + dy } : g));
              if (childNodes.length > 0) setNodes(prev => prev.map(n => { const child = childNodes.find((c:any) => c.id === n.id); return child ? { ...n, x: child.startX + dx, y: child.startY + dy } : n; }));
          }
      });
  }, [isDraggingCanvas, draggingNodeId, scale, lastMousePos]);

  const handleGlobalMouseUp = useCallback(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
      if (draggingNodeId || dragGroupRef.current) saveHistory();
      setIsDraggingCanvas(false); setDraggingNodeId(null); dragNodeRef.current = null; dragGroupRef.current = null;
  }, [saveHistory, draggingNodeId]);

  useEffect(() => { window.addEventListener('mousemove', handleGlobalMouseMove); window.addEventListener('mouseup', handleGlobalMouseUp); return () => { window.removeEventListener('mousemove', handleGlobalMouseMove); window.removeEventListener('mouseup', handleGlobalMouseUp); }; }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a0c]">
      <div className="w-full h-full relative" onMouseDown={handleCanvasMouseDown} onWheel={(e) => { e.preventDefault(); const newScale = Math.min(Math.max(0.2, scale - e.deltaY * 0.001), 3); setScale(newScale); }}>
          <div className="absolute inset-0 noise-bg opacity-[0.03]" />

          <div className="absolute top-8 left-12 z-50 pointer-events-none opacity-20">
              <h1 className="text-4xl font-black italic tracking-tighter text-white">InkAI</h1>
          </div>

          {/* Homepage / Landing UI when board is empty */}
          {nodes.length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-40 transition-all duration-1000 animate-in fade-in slide-in-from-bottom-12">
                <div className="flex flex-col items-center justify-center mb-16 select-none">
                    <h1 className="text-8xl md:text-[140px] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] px-4 pb-2 italic text-center">InkAI</h1>
                    <p className="text-zinc-500 text-sm font-bold tracking-[0.4em] uppercase mt-[-20px] opacity-40">Turning ideas into reality</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl px-6 w-full">
                    <div onClick={() => addNode(NodeType.IMAGE_GENERATOR)} className="group relative h-48 bg-[#121214]/60 backdrop-blur-2xl border border-white/5 hover:border-cyan-500/30 rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400"><ImageIcon size={18} /></div>
                            <div><h3 className="text-xl font-bold text-white mb-1">图片生成</h3><p className="text-[11px] text-zinc-500 font-medium leading-relaxed">生成高精细节的视觉原画</p></div>
                        </div>
                    </div>
                    <div onClick={() => addNode(NodeType.VIDEO_GENERATOR)} className="group relative h-48 bg-[#121214]/60 backdrop-blur-2xl border border-white/5 hover:border-purple-500/30 rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400"><Film size={18} /></div>
                            <div><h3 className="text-xl font-bold text-white mb-1">视频生成</h3><p className="text-[11px] text-zinc-500 font-medium leading-relaxed">打造电影级动态镜头</p></div>
                        </div>
                    </div>
                    <div onClick={() => addNode(NodeType.SCRIPT_MASTER)} className="group relative h-48 bg-[#121214]/60 backdrop-blur-2xl border border-white/5 hover:border-amber-500/30 rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400"><ScrollText size={18} /></div>
                            <div><h3 className="text-xl font-bold text-white mb-1">剧本大师</h3><p className="text-[11px] text-zinc-500 font-medium leading-relaxed">创作、重构与灵感扩写</p></div>
                        </div>
                    </div>
                </div>
             </div>
          )}

          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, width: '100%', height: '100%', transformOrigin: '0 0' }}>
              {groups.map(g => (
                  <div key={g.id} className={`absolute rounded-[32px] border transition-all ${selectedGroupId === g.id ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10 bg-white/5'}`} style={{ left: g.x, top: g.y, width: g.width, height: g.height }} onMouseDown={e => { e.stopPropagation(); setSelectedGroupId(g.id); const childNodes = nodes.filter(n => { const b = getNodeBounds(n); return (b.x+b.width/2)>g.x && (b.x+b.width/2)<g.x+g.width && (b.y+160)>g.y && (b.y+160)<g.y+g.height; }).map(n=>({id:n.id, startX:n.x, startY:n.y})); dragGroupRef.current = { id: g.id, startX: g.x, startY: g.y, mouseStartX: e.clientX, mouseStartY: e.clientY, childNodes }; }}><div className="absolute -top-8 left-4 text-xs font-bold text-white/40 uppercase tracking-widest">{g.title}</div></div>
              ))}
              <svg className="absolute inset-0 overflow-visible pointer-events-none">
                  {connections.map((conn) => {
                      const f = nodes.find(n => n.id === conn.from), t = nodes.find(n => n.id === conn.to); if (!f || !t) return null;
                      const fH = f.height || getApproxNodeHeight(f), tH = t.height || getApproxNodeHeight(t);
                      const fx = f.x + (f.width||420) + 3, fy = f.y + fH/2, tx = t.x - 3, ty = t.y + tH/2;
                      return <path key={`${conn.from}-${conn.to}`} d={`M ${fx} ${fy} C ${fx + (tx-fx)*0.5} ${fy} ${tx - (tx-fx)*0.5} ${ty} ${tx} ${ty}`} stroke="rgba(34,211,238,0.3)" strokeWidth="3" fill="none" />;
                  })}
              </svg>
              {nodes.map(node => (
              <Node
                  key={node.id} node={node} onUpdate={handleNodeUpdate} onAction={handleNodeAction} onDelete={id => deleteNodes([id])} onExpand={setExpandedMedia} onCrop={(id, img) => { setCroppingNodeId(id); setImageToCrop(img); }}
                  onNodeMouseDown={(e, id) => { e.stopPropagation(); setSelectedNodeIds([id]); const n = nodes.find(x => x.id === id); if (n) { dragNodeRef.current = { id, startX: n.x, startY: n.y, mouseStartX: e.clientX, mouseStartY: e.clientY }; setDraggingNodeId(id); } }}
                  onPortMouseDown={(e, id) => { e.stopPropagation(); setConnectionStart({ id, x: e.clientX, y: e.clientY }); }}
                  onPortMouseUp={(e, id) => { e.stopPropagation(); const start = connectionStartRef.current; if (start && start.id !== id) { setConnections(p => [...p, { from: start.id, to: id }]); setNodes(p => p.map(n => n.id === id ? { ...n, inputs: [...n.inputs, start.id] } : n)); } setConnectionStart(null); }}
                  onNodeContextMenu={(e, id) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, id }); }}
                  onResizeMouseDown={(e, id, w, h) => { e.stopPropagation(); setResizingNodeId(id); setInitialSize({ width: w, height: h }); setResizeStartPos({ x: e.clientX, y: e.clientY }); }}
                  isSelected={selectedNodeIds.includes(node.id)} 
              />
              ))}
          </div>
          <SidebarDock onAddNode={addNode} onUndo={undo} isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen(!isChatOpen)} isMultiFrameOpen={isMultiFrameOpen} onToggleMultiFrame={() => setIsMultiFrameOpen(!isMultiFrameOpen)} assetHistory={assetHistory} onHistoryItemClick={item => addNode(item.type==='image' ? NodeType.IMAGE_GENERATOR : NodeType.VIDEO_GENERATOR, undefined, undefined, item.type==='image'?{image:item.src}:{videoUri:item.src})} onDeleteAsset={id => setAssetHistory(prev => prev.filter(a => a.id !== id))} workflows={workflows} selectedWorkflowId={selectedWorkflowId} onSelectWorkflow={id => { const wf = workflows.find(w => w.id === id); if (wf) { setNodes(JSON.parse(JSON.stringify(wf.nodes))); setConnections(JSON.parse(JSON.stringify(wf.connections))); setGroups(JSON.parse(JSON.stringify(wf.groups))); setSelectedWorkflowId(id); } }} onSaveWorkflow={() => { const newWf = { id: `wf-${Date.now()}`, title: `工作流 ${new Date().toLocaleDateString()}`, thumbnail: nodes.find(n => n.data.image)?.data.image || '', nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)), groups: JSON.parse(JSON.stringify(groups)) }; setWorkflows(prev => [newWf, ...prev]); }} onDeleteWorkflow={id => setWorkflows(prev => prev.filter(w => w.id !== id))} onRenameWorkflow={(id, title) => setWorkflows(prev => prev.map(w => w.id === id ? { ...w, title } : w))} onOpenSettings={() => setIsSettingsOpen(true)} />
          <ExpandedView media={expandedMedia} onClose={() => setExpandedMedia(null)} />
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          <AssistantPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          {croppingNodeId && imageToCrop && <ImageCropper imageSrc={imageToCrop} onCancel={() => {setCroppingNodeId(null); setImageToCrop(null);}} onConfirm={(b) => {handleNodeUpdate(croppingNodeId, {croppedFrame: b}); setCroppingNodeId(null); setImageToCrop(null);}} />}
          {isSketchEditorOpen && <SketchEditor onClose={() => setIsSketchEditorOpen(false)} onGenerate={(type, result, prompt) => { addNode(type === 'image' ? NodeType.IMAGE_GENERATOR : NodeType.VIDEO_GENERATOR, undefined, undefined, type === 'image' ? { image: result, prompt } : { videoUri: result, prompt }); }} />}
          <SmartSequenceDock isOpen={isMultiFrameOpen} onClose={() => setIsMultiFrameOpen(false)} onGenerate={async (frames) => { const prompt = compileMultiFramePrompt(frames); const res = await generateVideo(prompt, 'veo-3.1-fast-generate-preview', { aspectRatio: '16:9' }, frames[0].src); return res.uri; }} />
          <SonicStudio isOpen={isSonicStudioOpen} onClose={() => setIsSonicStudioOpen(false)} history={assetHistory.filter(a => a.type === 'audio')} onGenerate={(src, prompt) => handleAssetGenerated('audio', src, prompt)} />
      </div>
    </div>
  );
};
