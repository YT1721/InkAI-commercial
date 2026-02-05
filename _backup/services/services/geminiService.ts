
import { GoogleGenAI, GenerateContentResponse, Type, Modality, Part, FunctionDeclaration } from "@google/genai";
import { SmartSequenceItem, VideoGenerationMode, CinematicVersion } from "../types";

const getClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("Google Gemini API Key is missing. Please select a key in Settings.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const safeBase64 = (base64Str: string): string => {
    if (!base64Str) return "";
    const parts = base64Str.split(',');
    return parts.length > 1 ? parts[1] : parts[0];
};

export const compileMultiFramePrompt = (frames: SmartSequenceItem[]): string => {
    return frames.map((f, i) => {
        const desc = f.transition.prompt ? `Action: ${f.transition.prompt}` : "Maintained continuity";
        const dur = i < frames.length - 1 ? ` (Transition for ${f.transition.duration}s)` : "";
        return `Scene ${i + 1}: ${desc}${dur}`;
    }).join(". ");
};

export const planStoryboard = async (
    content: string, 
    version: CinematicVersion = 'V1', 
    baseImage?: string
): Promise<string[]> => {
    const ai = getClient();
    let mainPrompt = "";
    
    if (version === 'V1') {
        mainPrompt = `
        <instruction> Analyze the entire composition of the input image. Identify ALL key subjects present. Generate a 3x3 cinematic grid (ELS to ECU). Ensure strict consistency. </instruction>
        OUTPUT REQUIREMENT: Return exactly a JSON array containing 9 strings.
        `;
    } else if (version === 'V2') {
        mainPrompt = `
        <role> Award-winning trailer director. expand ONE reference image into a sequence. </role>
        <step 4 - keyframes for AI video> Output a Keyframe List: exactly 9 frames. </step 4 - keyframes for AI video>
        OUTPUT REQUIREMENT: Return exactly a JSON array containing 9 strings.
        `;
    } else {
        mainPrompt = `
        STORY-TO-STORYBOARD META-PROMPT. Create a full 3×3 cinematic storyboard grid with 9 distinct shots.
        OUTPUT REQUIREMENT: Return exactly a JSON array containing 9 strings.
        `;
    }

    const parts: Part[] = [];
    if (baseImage) parts.push({ inlineData: { data: safeBase64(baseImage), mimeType: 'image/png' } });
    parts.push({ text: `REFERENCE MATERIAL: """${content}"""\n\nSYSTEM INSTRUCTION:\n${mainPrompt}` });

    try {
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: { parts }, 
            config: { responseMimeType: 'application/json' } 
        });
        const cleanJson = (response.text || "").replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);
        return Array.isArray(result) ? result.slice(0, 9) : [content];
    } catch (e) { return []; }
};

export const generateVideo = async (
  prompt: string, 
  model: string, 
  options: any = {}, 
  inputImage?: string | null, 
  videoInput?: any, 
  referenceImages?: string[],
  lastFrame?: string | null
): Promise<any> => {
    const ai = getClient();
    let targetModel = model || 'veo-3.1-fast-generate-preview';
    const config: any = { 
        numberOfVideos: 1, 
        aspectRatio: options.aspectRatio || '16:9', 
        resolution: options.resolution || '720p',
        // Pass duration if specified (e.g., for extendable models)
        duration: options.duration 
    };
    let finalPrompt = prompt || "Cinematic video with professional lighting.";
    let contents: any = { prompt: finalPrompt };
    
    if (referenceImages && referenceImages.length > 0 && !lastFrame) {
        config.referenceImages = referenceImages.slice(0, 3).map(img => ({ image: { imageBytes: safeBase64(img), mimeType: 'image/png' }, referenceType: 'ASSET' }));
    } else if (inputImage) {
        contents.image = { imageBytes: safeBase64(inputImage), mimeType: 'image/png' };
    }
    if (lastFrame) config.lastFrame = { imageBytes: safeBase64(lastFrame), mimeType: 'image/png' };
    if (videoInput) contents.video = videoInput;

    try {
        let op = await ai.models.generateVideos({ model: targetModel, ...contents, config });
        while (!op.done) { await wait(5000); op = await ai.operations.getVideosOperation({ operation: op }); }
        if (op.error) throw new Error(op.error.message);
        const vid = op.response?.generatedVideos?.[0]?.video;
        return { uri: `${vid.uri}&key=${process.env.API_KEY}`, videoMetadata: vid };
    } catch (e: any) { throw e; }
};

export const generateImageFromText = async (prompt: string, model: string, inputImages: string[] = [], options: any = {}): Promise<string[]> => {
    const ai = getClient();
    const targetModel = model || 'gemini-3-pro-image-preview';
    const parts: Part[] = inputImages.map(img => ({ inlineData: { data: safeBase64(img), mimeType: 'image/png' } }));
    parts.push({ text: prompt });
    const response = await ai.models.generateContent({ 
        model: targetModel, 
        contents: { parts }, 
        config: { 
            imageConfig: { 
                aspectRatio: (options.aspectRatio || '1:1') as any, 
                imageSize: (options.resolution || '1K') as any
            } 
        } 
    });
    const images: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) { if (part.inlineData?.data) images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`); }
    }
    return images;
};

export const analyzeVideo = async (videoBase64OrUrl: string, prompt: string, model: string): Promise<string> => {
    const ai = getClient();
    const mime = videoBase64OrUrl.match(/^data:(video\/\w+);base64,/)?.[1] || 'video/mp4';
    const response = await ai.models.generateContent({ model: model || 'gemini-3-flash-preview', contents: { parts: [ { inlineData: { mimeType: mime, data: safeBase64(videoBase64OrUrl) } }, { text: prompt } ] } });
    return response.text || "分析失败";
};

export const createScriptFromText = async (originalContent: string, requirements: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `你是一名顶级编剧。素材："""${originalContent}"""。需求：${requirements}。`, config: { thinkingConfig: { thinkingBudget: 16000 } } });
    return response.text || "生成失败";
};

export const adaptScriptProfessional = async (sourceText: string, videoAnalysis: string, instructions: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `改编剧本。文本：${sourceText}。视频分析：${videoAnalysis}。要求：${instructions}。`, config: { thinkingConfig: { thinkingBudget: 32000 } } });
    return response.text || "改编失败";
};

export const expandVisualDescription = async (idea: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `将创意转化为视觉描述："""${idea}"""` });
    return response.text || "视觉渲染失败";
};

export const sendChatMessage = async (history: any[], newMessage: string, options?: any) => {
    const ai = getClient();
    const chat = ai.chats.create({
        model: options?.isThinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        config: { systemInstruction: "You are InkAI, a helpful multimedia expert.", ...(options?.isThinkingMode ? { thinkingConfig: { thinkingBudget: 16000 } } : {}) },
        history
    });
    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "";
};

export const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) { return ""; }
};

export const extractLastFrame = (videoSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous"; video.src = videoSrc; video.muted = true;
        video.onloadedmetadata = () => { video.currentTime = Math.max(0, video.duration - 0.1); };
        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/png')); }
                else reject(new Error("Canvas failed"));
            } catch (e) { reject(e); } finally { video.remove(); }
        };
        video.onerror = () => { reject(new Error("Video load failed")); video.remove(); };
    });
};

export const generateAudio = async (prompt: string, referenceAudio?: string, options: any = {}): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } },
    });
    return `data:audio/pcm;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ { inlineData: { data: safeBase64(audioBase64), mimeType: audioBase64.match(/^data:([^;]+);base64,/)?.[1] || 'audio/mp3' } }, { text: "Transcribe the audio." } ] }
    });
    return response.text || "";
};

export const connectLiveSession = async (onAudio: (base64: string) => void, onDisconnect: () => void) => {
    const ai = getClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: () => console.debug('Live session started'),
            onmessage: async (message) => {
                const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audio) onAudio(audio);
            },
            onclose: (e) => onDisconnect(),
            onerror: (err) => { console.error('Live session error:', err); onDisconnect(); }
        },
        config: { responseModalities: [Modality.AUDIO] }
    });
};
