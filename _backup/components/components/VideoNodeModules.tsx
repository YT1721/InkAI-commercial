
import React from 'react';
import { Film, Link, Scissors, ScanFace } from 'lucide-react';
import { VideoGenerationMode } from '../types';

// --- Module 1: UI for Mode Selection ---
interface VideoModeSelectorProps {
    currentMode: VideoGenerationMode;
    onSelect: (mode: VideoGenerationMode) => void;
}

export const VideoModeSelector: React.FC<VideoModeSelectorProps> = ({ currentMode, onSelect }) => {
    const modes = [
        { id: 'CONTINUE', icon: Film, label: '剧情延展' },
        { id: 'FIRST_LAST_FRAME', icon: Link, label: '首尾插帧' },
        { id: 'CUT', icon: Scissors, label: '局部分镜' },
        { id: 'CHARACTER_REF', icon: ScanFace, label: '角色迁移' }
    ];

    const handleSelect = (mode: string) => {
        // Toggle logic: If clicking the active mode, turn it off (return to DEFAULT)
        if (currentMode === mode) {
            onSelect('DEFAULT');
        } else {
            onSelect(mode as VideoGenerationMode);
        }
    };

    return (
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner w-full mb-3">
            {modes.map(m => (
                <button 
                  key={m.id} 
                  onClick={(e) => { e.stopPropagation(); handleSelect(m.id); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all duration-300 ${currentMode === m.id ? 'bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <m.icon size={11} className={currentMode === m.id ? 'text-cyan-400' : ''} />
                  {m.label}
                </button>
            ))}
        </div>
    );
};

// --- Module 2: UI for Scene Director Overlay ---
interface SceneDirectorOverlayProps {
    visible: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onCrop: () => void;
    onTimeHover: (time: number) => void;
}

export const SceneDirectorOverlay: React.FC<SceneDirectorOverlayProps> = ({ visible, videoRef, onCrop, onTimeHover }) => {
    const timelineRef = React.useRef<HTMLDivElement>(null);
    const [hoverTime, setHoverTime] = React.useState<number | null>(null);
    const [duration, setDuration] = React.useState(0);

    React.useEffect(() => {
        const vid = videoRef.current;
        if (vid) {
            setDuration(vid.duration || 0);
            const updateDur = () => setDuration(vid.duration);
            vid.addEventListener('loadedmetadata', updateDur);
            return () => vid.removeEventListener('loadedmetadata', updateDur);
        }
    }, [videoRef]);

    if (!visible) return null;

    return (
        <div 
            ref={timelineRef}
            className="absolute bottom-0 left-0 w-full h-9 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 flex items-center cursor-crosshair z-30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300"
            onMouseMove={(e) => {
                if (!timelineRef.current || !videoRef.current) return;
                const rect = timelineRef.current.getBoundingClientRect();
                const per = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
                const vid = videoRef.current;
                if (vid && Number.isFinite(vid.duration)) {
                    vid.currentTime = vid.duration * per;
                    setHoverTime(vid.duration * per);
                    onTimeHover(vid.duration * per);
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                onCrop();
            }}
        >
            {hoverTime !== null && duration > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{ left: `${(hoverTime / duration) * 100}%` }} />}
            <div className="w-full text-center text-[9px] text-slate-500 font-bold tracking-widest pointer-events-none">Scene Director Timeline</div>
        </div>
    );
};
