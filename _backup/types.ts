
export enum NodeType {
  PROMPT_INPUT = 'PROMPT_INPUT',
  IMAGE_GENERATOR = 'IMAGE_GENERATOR',
  VIDEO_GENERATOR = 'VIDEO_GENERATOR',
  VIDEO_ANALYZER = 'VIDEO_ANALYZER',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  AUDIO_GENERATOR = 'AUDIO_GENERATOR',
  SCRIPT_MASTER = 'SCRIPT_MASTER',
}

export enum NodeStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type VideoGenerationMode = 'DEFAULT' | 'CONTINUE' | 'CUT' | 'FIRST_LAST_FRAME' | 'CHARACTER_REF';
export type VideoGeneratorMode = 'T2V' | 'I2V' | 'DIRECTOR';
export type ScriptMasterMode = 'CREATE' | 'REMIX' | 'DESCRIBE' | 'CINEMATIC';
export type CinematicVersion = 'V1' | 'V2' | 'V3';
export type ImageGeneratorMode = 'T2I' | 'I2I' | 'STORYBOARD';

export interface AppNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width?: number; 
  height?: number; 
  title: string;
  status: NodeStatus;
  data: {
    prompt?: string;
    model?: string; 
    displayResult?: string; 
    image?: string; 
    images?: string[]; 
    lastFrameImage?: string; 
    imageCount?: number; 
    videoCount?: number; 
    videoUri?: string; 
    videoUris?: string[]; 
    videoMetadata?: any; 
    audioUri?: string; 
    analysis?: string; 
    remixedScript?: string; 
    scriptMode?: ScriptMasterMode;
    imageMode?: ImageGeneratorMode;
    videoMode?: VideoGeneratorMode; // 新增：控制视频生成节点的基础模式
    cinematicVersion?: CinematicVersion; 
    error?: string;
    progress?: string;
    aspectRatio?: string; 
    resolution?: string; 
    duration?: number; 
    
    generationMode?: VideoGenerationMode; 
    selectedFrame?: string; 
    croppedFrame?: string; 
    
    sortedInputIds?: string[]; 
  };
  inputs: string[]; 
}

export interface Group {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
}

export interface Connection {
  from: string;
  to: string;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  id?: string;
}

export interface Workflow {
  id: string;
  title: string;
  thumbnail: string;
  nodes: AppNode[];
  connections: Connection[];
  groups: Group[];
}

export interface SmartSequenceItem {
    id: string;
    src: string; 
    transition: {
        duration: number; 
        prompt: string;
    };
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
