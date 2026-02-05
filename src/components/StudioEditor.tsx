'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from '@/components/Node';
import { SidebarDock } from '@/components/SidebarDock';
import { AssistantPanel } from '@/components/AssistantPanel';
import { ImageCropper } from '@/components/ImageCropper';
import { SketchEditor } from '@/components/SketchEditor'; 
import { SmartSequenceDock } from '@/components/SmartSequenceDock';
import { SonicStudio } from '@/components/SonicStudio'; 
import { SettingsModal } from '@/components/SettingsModal';
import { AdminPanel } from '@/components/AdminPanel';
import { AppNode, NodeType, NodeStatus, Connection, ContextMenuState, Group, Workflow, SmartSequenceItem, Character } from '@/types';
import { 
    generateImageFromText, generateVideo, generateVideoSequence, analyzeVideo, planStoryboard, 
    compileMultiFramePrompt, urlToBase64, extractLastFrame, 
    generateAudio, sendChatMessage, createScriptFromText, 
    expandVisualDescription, adaptScriptProfessional
} from '@/services/geminiService';
import { getGenerationStrategy } from '@/services/videoStrategies';
import { saveToStorage, loadFromStorage } from '@/services/storage';
import { 
    Plus, Copy, Trash2, Type, Image as ImageIcon, Video as VideoIcon, 
    ScanFace, Brush, MousePointerClick, LayoutTemplate, X, Film, Link, RefreshCw, Upload,
    Minus, FolderHeart, Unplug, Sparkles, ChevronLeft, ChevronRight, Scan, Music, Mic2, Loader2,
    Zap, PlayCircle, Layers, Settings, ScrollText, LayoutGrid, Shield
} from 'lucide-react';

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";
const getNodeNameCN = (t: string) => {
    switch(t) {
        case NodeType.PROMPT_INPUT: return '提示工程';
        case NodeType.IMAGE_GENERATOR: return '图片生成';
        case NodeType.STORYBOARD_GENERATOR: return '一键分镜';
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
    if (['PROMPT_INPUT', 'VIDEO_ANALYZER', 'IMAGE_EDITOR', 'SCRIPT_MASTER', 'STORYBOARD_GENERATOR'].includes(node.type)) return 380;
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

export default function StudioEditor({ workflowId }: { workflowId: string }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]); 
  const [characters, setCharacters] = useState<Character[]>([]);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(workflowId);
  const [isLoaded, setIsLoaded] = useState(false); 
  const [isSketchEditorOpen, setIsSketchEditorOpen] = useState(false);
  const [isMultiFrameOpen, setIsMultiFrameOpen] = useState(false);
  const [isSonicStudioOpen, setIsSonicStudioOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{width: number, height: number} | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{x: number, y: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<any>(null);
  const [croppingNodeId, setCroppingNodeId] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ id: string, x: number, y: number } | null>(null);
  
  // Interaction State
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

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
      const loadData = async () => {
          // Check Read-only mode
          const params = new URLSearchParams(window.location.search);
          if (params.get('share') === 'true') setIsReadOnly(true);

          try {
            const sAssets = await loadFromStorage<any[]>('assets'); if (sAssets) setAssetHistory(sAssets);
            const sChars = await loadFromStorage<Character[]>('characters'); if (sChars) setCharacters(sChars);
            const sWfs = await loadFromStorage<Workflow[]>('workflows'); if (sWfs) {
                setWorkflows(sWfs);
                // Load specific workflow
                const wf = sWfs.find(w => w.id === workflowId);
                if (wf) {
                    setNodes(wf.nodes);
                    setConnections(wf.connections);
                    setGroups(wf.groups);
                }
            }
            const sNodes = await loadFromStorage<AppNode[]>('nodes'); 
            // Only load global nodes if no workflow selected (backward compatibility)
            if (!workflowId && sNodes) setNodes(sNodes);
            
          } catch (e) {} finally { setIsLoaded(true); }
      };
      loadData();
  }, [workflowId]);

  useEffect(() => {
      if (!isLoaded) return; 
      // Auto-save current workflow
      if (workflowId) {
          const currentWf: Workflow = {
              id: workflowId,
              title: workflows.find(w => w.id === workflowId)?.title || 'Untitled',
              thumbnail: nodes.find(n => n.data.image)?.data.image || '',
              nodes,
              connections,
              groups
          };
          const newWfs = workflows.map(w => w.id === workflowId ? currentWf : w);
          if (!newWfs.find(w => w.id === workflowId)) newWfs.push(currentWf);
          setWorkflows(newWfs);
          saveToStorage('workflows', newWfs);
      }
      saveToStorage('assets', assetHistory);
      saveToStorage('characters', characters);
  }, [nodes, connections, groups, isLoaded, workflowId, characters]);

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

  const deleteConnections = useCallback((connectionIds: string[]) => {
      if (connectionIds.length === 0) return;
      saveHistory();
      // connectionId format: "from-to"
      setConnections(prev => prev.filter(c => !connectionIds.includes(`${c.from}-${c.to}`)));
      // Also update node inputs to remove the dependency
      setNodes(prev => prev.map(node => {
          // If a connection to this node is deleted, remove the input id from inputs array
          const relatedConnections = connectionIds.filter(cid => cid.endsWith(`-${node.id}`));
          if (relatedConnections.length > 0) {
             const inputIdsToRemove = relatedConnections.map(cid => cid.split('-')[0]);
             return { ...node, inputs: node.inputs.filter(inId => !inputIdsToRemove.includes(inId)) };
          }
          return node;
      }));
      setSelectedConnectionIds([]);
  }, [saveHistory]);

  const deleteGroup = useCallback((id: string) => {
      saveHistory();
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
  }, [saveHistory, selectedGroupId]);

  const addNode = useCallback((type: NodeType, x?: number, y?: number, initialData?: any) => {
      if (type === NodeType.IMAGE_EDITOR) { setIsSketchEditorOpen(true); return; }
      saveHistory();
      let defaultModel = 'gemini-3-pro-preview';
      if (type === NodeType.IMAGE_GENERATOR || type === NodeType.STORYBOARD_GENERATOR) {
          defaultModel = 'gemini-3-pro-image-preview';
      } else if (type === NodeType.VIDEO_GENERATOR) {
          defaultModel = 'veo-3.1-fast-generate-preview';
      }

      const defaults: any = { 
          model: defaultModel,
          aspectRatio: '16:9',
          scriptMode: type === NodeType.SCRIPT_MASTER ? 'CREATE' : undefined,
          cinematicVersion: type === NodeType.STORYBOARD_GENERATOR ? 'V1' : undefined,
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
                  const reference = node.data.displayResult || combinedUpstream;
                  result = await createScriptFromText(reference, prompt, node.data.model);
              } else if (mode === 'REMIX') {
                  const sourceText = node.data.displayResult || combinedUpstream;
                  const sourceVideo = node.data.videoUri || inputs.find(n => n.data.videoUri)?.data.videoUri;
                  let videoAnalysis = "";
                  if (sourceVideo) {
                      let vidData = sourceVideo; if (sourceVideo.startsWith('http')) vidData = await urlToBase64(vidData);
                      videoAnalysis = await analyzeVideo(vidData, "提取该视频的动作逻辑、视觉风格和人设特征。", "gemini-3-flash-preview");
                  }
                  result = await adaptScriptProfessional(sourceText, videoAnalysis, prompt, node.data.model);
              } else {
                  result = await expandVisualDescription(prompt || combinedUpstream, node.data.model);
              }
              handleNodeUpdate(id, { remixedScript: result });
          } else if (node.type === NodeType.STORYBOARD_GENERATOR) {
               const sourceContent = node.data.prompt || combinedUpstream;
               const baseImage = node.data.image || upstreamImages[0]; // Support reference image
               const version = node.data.cinematicVersion || 'V1';
               
               if (!sourceContent && !baseImage) throw new Error("缺少 Prompt、剧本输入或参考图");
               
               const storyboardPrompts = await planStoryboard(sourceContent || "Analyze this image", version, baseImage);
               if (storyboardPrompts.length > 0) {
                  saveHistory();
                  const newNodes: AppNode[] = [];
                  const newConnections: Connection[] = [];
                  const COLS = 3, GAP_X = 460, GAP_Y = 420, START_X = node.x + 500, START_Y = node.y;
                  storyboardPrompts.forEach((pStr, idx) => {
                      const col = idx % COLS, row = Math.floor(idx / COLS), nodeId = `n-story-${Date.now()}-${idx}`;
                      newNodes.push({ id: nodeId, type: NodeType.IMAGE_GENERATOR, x: START_X + col * GAP_X, y: START_Y + row * GAP_Y, width: 420, title: `分镜 ${idx + 1}`, status: NodeStatus.IDLE, data: { prompt: pStr, model: 'gemini-3-pro-image-preview', aspectRatio: node.data.aspectRatio || '16:9', autoStart: true }, inputs: [node.id] });
                      newConnections.push({ from: node.id, to: nodeId });
                  });
                  setGroups(prev => [...prev, { id: `g-story-${Date.now()}`, title: '导演分镜组', x: START_X - 40, y: START_Y - 40, width: (COLS * GAP_X), height: (Math.ceil(storyboardPrompts.length / COLS) * GAP_Y) }]);
                  setNodes(prev => [...prev, ...newNodes]); setConnections(prev => [...prev, ...newConnections]); handleNodeUpdate(id, { status: NodeStatus.SUCCESS });
                  return;
               }
          } else if (node.type === NodeType.IMAGE_GENERATOR) {
              const refImages = [...upstreamImages];
              if (node.data.image && !refImages.includes(node.data.image)) refImages.push(node.data.image);
              const res = await generateImageFromText(prompt || combinedUpstream, node.data.model!, refImages, { aspectRatio: node.data.aspectRatio, resolution: node.data.resolution });
              handleNodeUpdate(id, { image: res[0], images: res });
          } else if (node.type === NodeType.VIDEO_GENERATOR) {
              const strategy = await getGenerationStrategy(node, inputs, prompt || combinedUpstream);
              const res = await generateVideo(strategy.finalPrompt, node.data.model!, { aspectRatio: node.data.aspectRatio, resolution: node.data.resolution, duration: node.data.duration }, strategy.inputImageForGeneration, strategy.videoInput, strategy.referenceImages, strategy.lastFrameImage);
              handleNodeUpdate(id, { videoUri: res.uri, videoMetadata: res.videoMetadata });
          } else if (node.type === NodeType.AUDIO_GENERATOR) {
              const uri = await generateAudio(prompt || combinedUpstream);
              handleNodeUpdate(id, { audioUri: uri });
          } else if (node.type === NodeType.PROMPT_INPUT) {
              const responseText = await sendChatMessage([], prompt || combinedUpstream, { isThinkingMode: true, model: node.data.model });
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

  const autoArrangeGroup = useCallback((groupId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      saveHistory();

      // Find all nodes inside the group
      const childNodes = nodes.filter(n => {
          const b = getNodeBounds(n);
          return (b.x + b.width / 2) > group.x && 
                 (b.x + b.width / 2) < group.x + group.width && 
                 (b.y + 160) > group.y && 
                 (b.y + 160) < group.y + group.height;
      });

      if (childNodes.length === 0) return;

      // Sort nodes to determine order
      // 1. Try to parse "分镜 X" titles
      // 2. Fallback to creation time (ID timestamp)
      // 3. Fallback to current Y/X position
      childNodes.sort((a, b) => {
          const titleA = a.title || '';
          const titleB = b.title || '';
          const matchA = titleA.match(/分镜\s*(\d+)/);
          const matchB = titleB.match(/分镜\s*(\d+)/);

          if (matchA && matchB) {
              return parseInt(matchA[1]) - parseInt(matchB[1]);
          }

          // Extract timestamp from ID: n-story-{timestamp}-{idx} or n-{timestamp}-{rand}
          const tsA = parseInt(a.id.split('-')[2] || '0');
          const tsB = parseInt(b.id.split('-')[2] || '0');
          if (tsA !== tsB) return tsA - tsB;

          return (a.y - b.y) || (a.x - b.x);
      });

      // Grid Layout Config
      const COLS = 3;
      const GAP_X = 460; // 420 width + 40 gap
      const GAP_Y = 420; // 380 height + 40 gap
      const START_X = group.x + 40; // Padding left
      const START_Y = group.y + 60; // Padding top (header)

      const updatedNodes = [...nodes];
      
      childNodes.forEach((node, idx) => {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          
          const targetX = START_X + col * GAP_X;
          const targetY = START_Y + row * GAP_Y;

          // Update node position in the main array
          const nodeIndex = updatedNodes.findIndex(n => n.id === node.id);
          if (nodeIndex !== -1) {
              updatedNodes[nodeIndex] = {
                  ...updatedNodes[nodeIndex],
                  x: targetX,
                  y: targetY
              };
          }
      });

      // Resize group if needed to fit all nodes
      const rows = Math.ceil(childNodes.length / COLS);
      const neededHeight = Math.max(group.height, rows * GAP_Y + 80);
      
      setNodes(updatedNodes);
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, height: neededHeight } : g));

  }, [nodes, groups, saveHistory]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (contextMenu) setContextMenu(null); setSelectedGroupId(null);
      if (e.button === 0 && !e.shiftKey) { 
        if (isSpacePressed) {
            setIsDraggingCanvas(true); 
            lastMousePosRef.current = { x: e.clientX, y: e.clientY }; 
        } else {
            // Start Selection Box
            setSelectionBox({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
            if (!e.metaKey && !e.ctrlKey) setSelectedNodeIds([]); // Clear selection if not holding modifier
        }
      }
  };

  const processedAutoStartIds = useRef<Set<string>>(new Set());

  useEffect(() => {
      // Auto-start nodes that are marked for auto-start and are IDLE
      const autoStartNodes = nodes.filter(n => n.status === NodeStatus.IDLE && n.data.autoStart && !processedAutoStartIds.current.has(n.id));
      if (autoStartNodes.length > 0) {
          autoStartNodes.forEach(n => {
              processedAutoStartIds.current.add(n.id);
              // Use setTimeout to avoid Maximum update depth exceeded
              setTimeout(() => {
                  handleNodeUpdate(n.id, { autoStart: false });
                  handleNodeAction(n.id);
              }, 0);
          });
      }
  }, [nodes, handleNodeAction, handleNodeUpdate]);
  
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (isReadOnly) return;
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (isDraggingCanvas) { const dx = e.clientX - lastMousePosRef.current.x, dy = e.clientY - lastMousePosRef.current.y; setPan(p => ({ x: p.x + dx, y: p.y + dy })); lastMousePosRef.current = { x: e.clientX, y: e.clientY }; }
          
          // Handle Selection Box Update
          setSelectionBox(prev => {
              if (prev) {
                  const newBox = { ...prev, endX: e.clientX, endY: e.clientY };
                  
                  // Real-time calculation of selected nodes
                  const x1 = Math.min(newBox.startX, newBox.endX);
                  const y1 = Math.min(newBox.startY, newBox.endY);
                  const x2 = Math.max(newBox.startX, newBox.endX);
                  const y2 = Math.max(newBox.startY, newBox.endY);

                  const selected = nodesRef.current.filter(n => {
                      const b = getNodeBounds(n);
                      const screenX = b.x * scale + pan.x;
                      const screenY = b.y * scale + pan.y;
                      const screenW = b.width * scale;
                      const screenH = b.height * scale;
                      return (screenX < x2 && screenX + screenW > x1 && screenY < y2 && screenY + screenH > y1);
                  }).map(n => n.id);

                  // Update selection immediately for visual feedback
                  if (selected.length > 0 || selectedNodeIds.length > 0) {
                      setSelectedNodeIds(selected);
                  }

                  return newBox;
              }
              return null;
          });

          if (draggingNodeId && dragNodeRef.current) {
             const { startX, startY, mouseStartX, mouseStartY, otherSelectedNodes } = dragNodeRef.current;
             const dx = (e.clientX - mouseStartX) / scale, dy = (e.clientY - mouseStartY) / scale;
             
             setNodes(prev => prev.map(n => {
                 if (n.id === draggingNodeId) return { ...n, x: startX + dx, y: startY + dy };
                 const other = otherSelectedNodes?.find((o: any) => o.id === n.id);
                 if (other) return { ...n, x: other.startX + dx, y: other.startY + dy };
                 return n;
             }));
          }
          if (dragGroupRef.current) {
              const { id, startX, startY, mouseStartX, mouseStartY, childNodes } = dragGroupRef.current;
              const dx = (e.clientX - mouseStartX) / scale, dy = (e.clientY - mouseStartY) / scale;
              setGroups(prev => prev.map(g => g.id === id ? { ...g, x: startX + dx, y: startY + dy } : g));
              if (childNodes.length > 0) setNodes(prev => prev.map(n => { const child = childNodes.find((c:any) => c.id === n.id); return child ? { ...n, x: child.startX + dx, y: child.startY + dy } : n; }));
          }
      });
  }, [isDraggingCanvas, draggingNodeId, scale]);

  const handleGlobalMouseUp = useCallback(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
      if (draggingNodeId || dragGroupRef.current) saveHistory();
      
      // Finalize Selection Box
      setSelectionBox(box => {
        if (box) {
            // Calculate selection logic
            const x1 = Math.min(box.startX, box.endX);
            const y1 = Math.min(box.startY, box.endY);
            const x2 = Math.max(box.startX, box.endX);
            const y2 = Math.max(box.startY, box.endY);
            
            // Convert screen coords to canvas coords
            // Canvas transform: translate(pan.x, pan.y) scale(scale)
            // Node x,y are in canvas coords
            // Screen X = NodeX * scale + pan.x
            // NodeX = (ScreenX - pan.x) / scale
            
            setNodes(currentNodes => {
                const selected = currentNodes.filter(n => {
                    const b = getNodeBounds(n);
                    const screenX = b.x * scale + pan.x;
                    const screenY = b.y * scale + pan.y;
                    const screenW = b.width * scale;
                    const screenH = b.height * scale;
                    
                    // Check intersection
                    return (
                        screenX < x2 && 
                        screenX + screenW > x1 && 
                        screenY < y2 && 
                        screenY + screenH > y1
                    );
                }).map(n => n.id);
                
                if (selected.length > 0) {
                    setSelectedNodeIds(prev => {
                        // If holding shift/cmd, toggle or add? For now, just union if modifier was used logic could be complex here without event access.
                        // But since we cleared selection on MouseDown if no modifier, this set is clean.
                        // However, we can't access 'e' here easily. 
                        // Let's just set the selection.
                        return selected;
                    });
                }
                return currentNodes; // No change to nodes
            });
        }
        return null;
      });

      setIsDraggingCanvas(false); setDraggingNodeId(null); dragNodeRef.current = null; dragGroupRef.current = null;
  }, [saveHistory, draggingNodeId, scale, pan]);

  useEffect(() => { window.addEventListener('mousemove', handleGlobalMouseMove); window.addEventListener('mouseup', handleGlobalMouseUp); return () => { window.removeEventListener('mousemove', handleGlobalMouseMove); window.removeEventListener('mouseup', handleGlobalMouseUp); }; }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Handle Spacebar for Panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
            setIsSpacePressed(true);
        }
        // Handle Delete/Backspace
        if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
            if (selectedNodeIds.length > 0) {
                deleteNodes(selectedNodeIds);
            }
            if (selectedGroupId) {
                deleteGroup(selectedGroupId);
            }
            if (selectedConnectionIds.length > 0) {
                deleteConnections(selectedConnectionIds);
            }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpacePressed(false);
            setIsDraggingCanvas(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeIds, selectedGroupId, selectedConnectionIds, deleteNodes, deleteGroup, deleteConnections]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a0c]">
      <div 
          className={`w-full h-full relative ${isDraggingCanvas ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : 'cursor-default'}`}
          onMouseDown={handleCanvasMouseDown} 
          onContextMenu={handleCanvasContextMenu} 
          onWheel={(e) => { 
              e.preventDefault(); 
              
              const zoomIntensity = 0.001;
              const delta = -e.deltaY * zoomIntensity;
              const newScale = Math.min(Math.max(0.2, scale + delta), 3);
              
              // Calculate mouse position relative to canvas
              // Current viewport center relative to pan is: (-pan.x + e.clientX) / scale
              // We want to keep the point under mouse at same screen position
              
              // Mouse position on screen
              const mouseX = e.clientX;
              const mouseY = e.clientY;
              
              // Mouse position in world coordinates (before zoom)
              const worldX = (mouseX - pan.x) / scale;
              const worldY = (mouseY - pan.y) / scale;
              
              // New pan position to keep worldX, worldY under mouseX, mouseY
              // mouseX = worldX * newScale + newPanX
              // newPanX = mouseX - worldX * newScale
              
              const newPanX = mouseX - worldX * newScale;
              const newPanY = mouseY - worldY * newScale;
              
              setScale(newScale); 
              setPan({ x: newPanX, y: newPanY });
          }}
      >
          <div className="absolute inset-0 noise-bg opacity-[0.03]" />

          <div className="absolute top-8 left-12 z-50 pointer-events-none opacity-20">
              <h1 className="text-4xl font-black italic tracking-tighter text-white pr-2">InkAI</h1>
          </div>

          {isReadOnly && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500">
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 backdrop-blur-3xl border border-purple-500/30 rounded-full shadow-2xl">
                      <ScanFace size={16} className="text-purple-400 animate-pulse" />
                      <span className="text-xs font-black text-purple-200 uppercase tracking-widest">只读预览模式 (Shared View)</span>
                  </div>
              </div>
          )}

          {/* Homepage / Landing UI when board is empty */}
          {nodes.length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-40 transition-all duration-1000 animate-in fade-in slide-in-from-bottom-12">
                <div className="flex flex-col items-center justify-center mb-16 select-none">
                    <h1 className="text-8xl md:text-[140px] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-8 pl-8 pr-24 italic text-center leading-tight">InkAI</h1>
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

          {selectionBox && (
            <div 
                className="absolute border border-cyan-500/50 bg-cyan-500/10 pointer-events-none z-[100]"
                style={{
                    left: Math.min(selectionBox.startX, selectionBox.endX),
                    top: Math.min(selectionBox.startY, selectionBox.endY),
                    width: Math.abs(selectionBox.endX - selectionBox.startX),
                    height: Math.abs(selectionBox.endY - selectionBox.startY)
                }}
            />
          )}

          {/* Context Menu */}
          {contextMenu?.visible && (
              <div 
                className="fixed z-[200] bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[160px] animate-in zoom-in-95 duration-100"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onMouseDown={e => e.stopPropagation()}
              >
                  {[
                      { id: NodeType.PROMPT_INPUT, label: '提示工程 (Prompt)', icon: Sparkles },
                      { id: NodeType.SCRIPT_MASTER, label: '剧本大师 (Script)', icon: ScrollText },
                      { id: NodeType.IMAGE_GENERATOR, label: '图片生成 (Image)', icon: ImageIcon },
                      { id: NodeType.STORYBOARD_GENERATOR, label: '一键分镜 (Storyboard)', icon: LayoutTemplate },
                      { id: NodeType.VIDEO_GENERATOR, label: '视频生成 (Video)', icon: Film },
                      { id: NodeType.VIDEO_ANALYZER, label: '视频分析 (Analyze)', icon: ScanFace },
                      { id: NodeType.IMAGE_EDITOR, label: '图像编辑 (Editor)', icon: Brush },
                      { id: NodeType.AUDIO_GENERATOR, label: '灵感音乐 (Audio)', icon: Music },
                  ].map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { 
                            // Convert screen coords to canvas coords for node placement
                            const x = (contextMenu.x - pan.x) / scale;
                            const y = (contextMenu.y - pan.y) / scale;
                            addNode(item.id, x, y); 
                            setContextMenu(null); 
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                      >
                          <item.icon size={14} className="text-slate-500" />
                          <span>{item.label}</span>
                      </button>
                  ))}
              </div>
          )}

          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, width: '100%', height: '100%', transformOrigin: '0 0' }}>
              {groups.map(g => (
                  <div key={g.id} className={`group/groupbox absolute rounded-[32px] border transition-all ${selectedGroupId === g.id ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10 bg-white/5'}`} style={{ left: g.x, top: g.y, width: g.width, height: g.height }} onMouseDown={e => { if (isSpacePressed) return; e.stopPropagation(); setSelectedGroupId(g.id); const childNodes = nodes.filter(n => { const b = getNodeBounds(n); return (b.x+b.width/2)>g.x && (b.x+b.width/2)<g.x+g.width && (b.y+160)>g.y && (b.y+160)<g.y+g.height; }).map(n=>({id:n.id, startX:n.x, startY:n.y})); dragGroupRef.current = { id: g.id, startX: g.x, startY: g.y, mouseStartX: e.clientX, mouseStartY: e.clientY, childNodes }; }}>
                    <div className="absolute -top-10 left-0 flex items-center gap-2">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest px-4 py-1 rounded-full bg-white/5 border border-white/5">{g.title}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); autoArrangeGroup(g.id); }}
                            className="p-1 rounded-full bg-cyan-500/20 text-cyan-400 opacity-0 group-hover/groupbox:opacity-100 transition-opacity hover:bg-cyan-500/30"
                            title="自动排列整齐"
                        >
                            <LayoutGrid size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}
                            className="p-1 rounded-full bg-red-500/20 text-red-400 opacity-0 group-hover/groupbox:opacity-100 transition-opacity hover:bg-red-500/30"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                  </div>
              ))}
              <svg className="absolute inset-0 overflow-visible pointer-events-none">
                  {connections.map((conn) => {
                      const f = nodes.find(n => n.id === conn.from), t = nodes.find(n => n.id === conn.to); if (!f || !t) return null;
                      const fH = f.height || getApproxNodeHeight(f), tH = t.height || getApproxNodeHeight(t);
                      const fx = f.x + (f.width||420) + 3, fy = f.y + fH/2, tx = t.x - 3, ty = t.y + tH/2;
                      const connId = `${conn.from}-${conn.to}`;
                      const isSelected = selectedConnectionIds.includes(connId);
                      const isHovered = hoveredConnectionId === connId;
                      return (
                        <g 
                            key={connId}
                            onMouseEnter={() => setHoveredConnectionId(connId)}
                            onMouseLeave={() => setHoveredConnectionId(null)}
                        >
                            {/* Invisible wider path for easier clicking */}
                            <path 
                                d={`M ${fx} ${fy} C ${fx + (tx-fx)*0.5} ${fy} ${tx - (tx-fx)*0.5} ${ty} ${tx} ${ty}`} 
                                stroke="transparent" 
                                strokeWidth="20" 
                                fill="none" 
                                className="pointer-events-auto cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedConnectionIds([connId]);
                                    setSelectedNodeIds([]);
                                    setSelectedGroupId(null);
                                }}
                            />
                            {/* Visible path */}
                            <path 
                                d={`M ${fx} ${fy} C ${fx + (tx-fx)*0.5} ${fy} ${tx - (tx-fx)*0.5} ${ty} ${tx} ${ty}`} 
                                stroke={isSelected ? "#22d3ee" : isHovered ? "rgba(34,211,238,0.6)" : "rgba(34,211,238,0.3)"} 
                                strokeWidth={isSelected ? "4" : isHovered ? "4" : "3"} 
                                fill="none" 
                                className="pointer-events-none transition-all duration-200"
                                style={{ filter: (isSelected || isHovered) ? 'drop-shadow(0 0 4px rgba(34,211,238,0.5))' : 'none' }}
                            />
                        </g>
                      );
                  })}
              </svg>
              {nodes.map(node => (
              <Node
                  key={node.id} node={node} onUpdate={handleNodeUpdate} onAction={handleNodeAction} onDelete={id => deleteNodes([id])} onExpand={setExpandedMedia} onCrop={(id, img) => { setCroppingNodeId(id); setImageToCrop(img); }}
                  onSelect={(id) => setSelectedNodeIds([id])}
                  onSaveCharacter={(name, desc, img) => {
                      const newChar: Character = {
                          id: `char-${Date.now()}`,
                          name,
                          description: desc,
                          image: img,
                          createdAt: Date.now()
                      };
                      setCharacters(prev => [newChar, ...prev]);
                  }}
                  onNodeMouseDown={(e, id) => { 
                      if (isSpacePressed) return; 
                      e.stopPropagation(); 
                      
                      const isAlreadySelected = selectedNodeIds.includes(id);
                      let newSelection = [id];
                      
                      if (e.metaKey || e.ctrlKey || e.shiftKey) {
                          if (isAlreadySelected) {
                              newSelection = selectedNodeIds.filter(sid => sid !== id);
                          } else {
                              newSelection = [...selectedNodeIds, id];
                          }
                      } else if (isAlreadySelected) {
                          newSelection = selectedNodeIds; // Keep existing batch
                      }
                      
                      setSelectedNodeIds(newSelection);
                      setSelectedGroupId(null); 
                      setSelectedConnectionIds([]); 
                      
                      const n = nodes.find(x => x.id === id); 
                      if (n) { 
                          const otherSelectedNodes = nodes
                            .filter(node => newSelection.includes(node.id) && node.id !== id)
                            .map(node => ({ id: node.id, startX: node.x, startY: node.y }));
                            
                          dragNodeRef.current = { 
                              id, 
                              startX: n.x, 
                              startY: n.y, 
                              mouseStartX: e.clientX, 
                              mouseStartY: e.clientY,
                              otherSelectedNodes
                          }; 
                          setDraggingNodeId(id); 
                      } 
                  }} 
                  onPortMouseDown={(e, id) => { if (isSpacePressed) return; e.stopPropagation(); setConnectionStart({ id, x: e.clientX, y: e.clientY }); }}
                  onPortMouseUp={(e, id) => { e.stopPropagation(); const start = connectionStartRef.current; if (start && start.id !== id) { setConnections(p => [...p, { from: start.id, to: id }]); setNodes(p => p.map(n => n.id === id ? { ...n, inputs: [...n.inputs, start.id] } : n)); } setConnectionStart(null); }}
                  onNodeContextMenu={(e, id) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, id }); }}
                  onResizeMouseDown={(e, id, w, h) => { if (isSpacePressed) return; e.stopPropagation(); setResizingNodeId(id); setInitialSize({ width: w, height: h }); setResizeStartPos({ x: e.clientX, y: e.clientY }); }}
                  isSelected={selectedNodeIds.includes(node.id)} 
              />
              ))}
          </div>
          <SidebarDock 
            onAddNode={addNode} onUndo={undo} 
            isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen(!isChatOpen)} 
            isMultiFrameOpen={isMultiFrameOpen} onToggleMultiFrame={() => setIsMultiFrameOpen(!isMultiFrameOpen)} 
            assetHistory={assetHistory} 
            onHistoryItemClick={item => addNode(item.type==='image' ? NodeType.IMAGE_GENERATOR : NodeType.VIDEO_GENERATOR, undefined, undefined, item.type==='image'?{image:item.src}:{videoUri:item.src})} 
            onDeleteAsset={id => setAssetHistory(prev => prev.filter(a => a.id !== id))} 
            workflows={workflows} selectedWorkflowId={selectedWorkflowId} 
            onSelectWorkflow={id => { const wf = workflows.find(w => w.id === id); if (wf) { setNodes(JSON.parse(JSON.stringify(wf.nodes))); setConnections(JSON.parse(JSON.stringify(wf.connections))); setGroups(JSON.parse(JSON.stringify(wf.groups))); setSelectedWorkflowId(id); } }} 
            onSaveWorkflow={() => { const newWf = { id: `wf-${Date.now()}`, title: `工作流 ${new Date().toLocaleDateString()}`, thumbnail: nodes.find(n => n.data.image)?.data.image || '', nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)), groups: JSON.parse(JSON.stringify(groups)) }; setWorkflows(prev => [newWf, ...prev]); }} 
            onDeleteWorkflow={id => setWorkflows(prev => prev.filter(w => w.id !== id))} 
            onRenameWorkflow={(id, title) => setWorkflows(prev => prev.map(w => w.id === id ? { ...w, title } : w))} 
            onImportWorkflow={(wf) => { setWorkflows(prev => [wf, ...prev]); setSelectedWorkflowId(wf.id); setNodes(wf.nodes); setConnections(wf.connections); setGroups(wf.groups || []); }} 
            characters={characters}
            onAddCharacter={(char) => setCharacters(prev => [char, ...prev])}
            onDeleteCharacter={(id) => setCharacters(prev => prev.filter(c => c.id !== id))}
            onApplyCharacter={(char) => {
                 if (selectedNodeIds.length === 1) {
                     handleNodeUpdate(selectedNodeIds[0], { images: [char.image], prompt: char.description });
                 } else {
                     addNode(NodeType.IMAGE_GENERATOR, undefined, undefined, { imageMode: 'I2I', images: [char.image], prompt: char.description });
                 }
             }}
             onOpenSettings={() => setIsSettingsOpen(true)} 
             onOpenAdmin={() => setIsAdminOpen(true)}
             isReadOnly={isReadOnly}
           />
           <ExpandedView media={expandedMedia} onClose={() => setExpandedMedia(null)} />
           <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
           <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
           <AssistantPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          {croppingNodeId && imageToCrop && <ImageCropper imageSrc={imageToCrop} onCancel={() => {setCroppingNodeId(null); setImageToCrop(null);}} onConfirm={(b) => {handleNodeUpdate(croppingNodeId, {croppedFrame: b}); setCroppingNodeId(null); setImageToCrop(null);}} />}
          {isSketchEditorOpen && <SketchEditor onClose={() => setIsSketchEditorOpen(false)} onGenerate={(type, result, prompt) => { addNode(type === 'image' ? NodeType.IMAGE_GENERATOR : NodeType.VIDEO_GENERATOR, undefined, undefined, type === 'image' ? { image: result, prompt } : { videoUri: result, prompt }); }} />}
          <SmartSequenceDock 
            isOpen={isMultiFrameOpen} 
            onClose={() => setIsMultiFrameOpen(false)} 
            onGenerateAudio={async (prompt) => {
                return await generateAudio(prompt);
            }}
            onGenerate={async (frames, onProgress) => { 
                // Use sequential generation strategy for strict multi-frame control
                return await generateVideoSequence(
                    frames, 
                    'veo-3.1-fast-generate-preview', 
                    { aspectRatio: '16:9' },
                    onProgress
                );
            }} 
            onGenerateSegment={async (startFrame, endFrame) => {
                const prompt = startFrame.transition.prompt || "Maintain strict visual continuity and smooth motion between frames.";
                const duration = startFrame.transition.duration || 3;
                const res = await generateVideo(
                    prompt,
                    'veo-3.1-fast-generate-preview',
                    { aspectRatio: '16:9', duration },
                    startFrame.src,
                    undefined,
                    undefined,
                    endFrame.src
                );
                if (res?.uri) return res.uri;
                if (res?.videoMetadata?.uri) return res.videoMetadata.uri;
                throw new Error("Segment generation failed");
            }}
          />
          <SonicStudio 
            isOpen={isSonicStudioOpen} 
            onClose={() => setIsSonicStudioOpen(false)} 
            history={assetHistory.filter(a => a.type === 'audio')} 
            onGenerate={(src, prompt) => handleAssetGenerated('audio', src, prompt)} 
            onSaveToAssets={(asset) => setAssetHistory(prev => [asset, ...prev])}
          />
      </div>
    </div>
  );
}
