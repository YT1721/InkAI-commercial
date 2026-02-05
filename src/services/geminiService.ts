
import { GoogleGenAI, GenerateContentResponse, Type, Modality, Part, FunctionDeclaration } from "@google/genai";
import { SmartSequenceItem, VideoGenerationMode, CinematicVersion } from "../types";
import { 
    planStoryboardAction, 
    generateVideoAction, 
    generateImageFromTextAction, 
    createScriptFromTextAction, 
    adaptScriptProfessionalAction, 
    expandVisualDescriptionAction, 
    generateAudioAction, 
    transcribeAudioAction 
} from "@/app/actions/gemini";

// Helper to check if we have a client-side key
const getClientKey = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('inkai_api_key');
    }
    return null;
};

const getClient = () => {
  const apiKey = getClientKey() || process.env.GEMINI_API_KEY; 
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const safeBase64 = (base64Str: string): string => {
    if (!base64Str) return "";
    const parts = base64Str.split(',');
    return parts.length > 1 ? parts[1] : parts[0];
};

const getMimeType = (base64Str: string): string => {
    const match = base64Str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    return match ? match[1] : 'image/png';
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
    
    // Fallback to Server Action if no client key
    if (!ai) {
        return await planStoryboardAction(content, version, baseImage);
    }

    let mainPrompt = "";
    
    if (version === 'V1') {
        mainPrompt = `
        <instruction> Analyze the entire composition of the input image. Identify ALL key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship/interaction.
        Generate a cohesive 3x3 grid "Cinematic Contact Sheet" featuring 9 distinct camera shots of exactly these subjects in the same environment.
        You must adapt the standard cinematic shot types to fit the content (e.g., if a group, keep the group together; if an object, frame the whole object):
        Row 1 (Establishing Context):
        1.Extreme Long Shot (ELS): The subject(s) are seen small within the vast environment.
        2.Long Shot (LS): The complete subject(s) or group is visible from top to bottom (head to toe / wheels to roof).
        3.Medium Long Shot (American/3-4): Framed from knees up (for people) or a 3/4 view (for objects).
        Row 2 (The Core Coverage): 4. Medium Shot (MS): Framed from the waist up (or the central core of the object). Focus on interaction/action. 5. Medium Close-Up (MCU): Framed from chest up. Intimate framing of the main subject(s). 6. Close-Up (CU): Tight framing on the face(s) or the "front" of the object.
        Row 3 (Details & Angles): 7. Extreme Close-Up (ECU): Macro detail focusing intensely on a key feature (eyes, hands, logo, texture). 8. Low Angle Shot (Worm's Eye): Looking up at the subject(s) from the ground (imposing/heroic). 9. High Angle Shot (Bird's Eye): Looking down on the subject(s) from above.
        Ensure strict consistency: The same people/objects, same clothes, and same lighting across all 9 panels. The depth of field should shift realistically (bokeh in close-ups). </instruction>
        A professional 3x3 cinematic storyboard grid containing 9 panels.
        The grid showcases the specific subject/scene from the input image in a comprehensive range of focal lengths.
        Top Row: Wide environmental shot, Full view, 3/4 cut.
        Middle Row: Waist-up view, Chest-up view, Face/Front close-up.
        Bottom Row: Macro detail, Low Angle, High Angle.
        All frames feature photorealistic textures, consistent cinematic color grading, and correct framing for the specific number of subjects or objects analyzed.
        
        OUTPUT REQUIREMENT: Return exactly a JSON array containing 9 strings, where each string describes one of the 9 panels defined above.
        `;
    } else if (version === 'V2') {
        mainPrompt = `
        <role> You are an award-winning trailer director + cinematographer + storyboard artist. Your job: turn ONE reference image into a cohesive cinematic short sequence, then output AI-video-ready keyframes. </role>
        <input> User provides: one reference image (image). </input>
        <non-negotiable rules - continuity & truthfulness>
        1.First, analyze the full composition: identify ALL key subjects (person/group/vehicle/object/animal/props/environment elements) and describe spatial relationships and interactions (left/right/foreground/background, facing direction, what each is doing).
        2.Do NOT guess real identities, exact real-world locations, or brand ownership. Stick to visible facts. Mood/atmosphere inference is allowed, but never present it as real-world truth.
        3.Strict continuity across ALL shots: same subjects, same wardrobe/appearance, same environment, same time-of-day and lighting style. Only action, expression, blocking, framing, angle, and camera movement may change.
        4.Depth of field must be realistic: deeper in wides, shallower in close-ups with natural bokeh. Keep ONE consistent cinematic color grade across the entire sequence.
        5.Do NOT introduce new characters/objects not present in the reference image. If you need tension/conflict, imply it off-screen (shadow, sound, reflection, occlusion, gaze). </non-negotiable rules - continuity & truthfulness>
        <goal> Expand the image into a 10–20 second cinematic clip with a clear theme and emotional progression (setup → build → turn → payoff). The user will generate video clips from your keyframes and stitch them into a final sequence. </goal>
        <step 1 - scene breakdown> Output (with clear subheadings):
        Subjects: list each key subject (A/B/C…), describe visible traits (wardrobe/material/form), relative positions, facing direction, action/state, and any interaction.
        Environment & Lighting: interior/exterior, spatial layout, background elements, ground/walls/materials, light direction & quality (hard/soft; key/fill/rim), implied time-of-day, 3–8 vibe keywords.
        Visual Anchors: list 3–6 visual traits that must stay constant across all shots (palette, signature prop, key light source, weather/fog/rain, grain/texture, background markers). </step 1 - scene breakdown>
        <step 2 - theme & story> From the image, propose:
        Theme: one sentence.
        Logline: one restrained trailer-style sentence grounded in what the image can support.
        Emotional Arc: 4 beats (setup/build/turn/payoff), one line each. </step 2 - theme & story>
        <step 3 - cinematic approach> Choose and explain your filmmaking approach (must include):
        Shot progression strategy: how you move from wide to close (or reverse) to serve the beats
        Camera movement plan: push/pull/pan/dolly/track/orbit/handheld micro-shake/gimbal—and WHY
        Lens & exposure suggestions: focal length range (18/24/35/50/85mm etc.), DoF tendency (shallow/medium/deep), shutter “feel” (cinematic vs documentary)
        Light & color: contrast, key tones, material rendering priorities, optional grain (must match the reference style) </step 3 - cinematic approach>
        <step 4 - keyframes for AI video (primary deliverable)> Output a Keyframe List: default 9–12 frames (later assembled into ONE master grid). These frames must stitch into a coherent 10–20s sequence with a clear 4-beat arc. Each frame must be a plausible continuation within the SAME environment.
        Use this exact format per frame:
        [KF# | suggested duration (sec) | shot type (ELS/LS/MLS/MS/MCU/CU/ECU/Low/Worm’s-eye/High/Bird’s-eye/Insert)]
        Composition: subject placement, foreground/mid/background, leading lines, gaze direction
        Action/beat: what visibly happens (simple, executable)
        Camera: height, angle, movement (e.g., slow 5% push-in / 1m lateral move / subtle handheld)
        Lens/DoF: focal length (mm), DoF (shallow/medium/deep), focus target
        Lighting & grade: keep consistent; call out highlight/shadow emphasis
        Sound/atmos (optional): one line (wind, city hum, footsteps, metal creak) to support editing rhythm
        Hard requirements:
        Must include: 1 environment-establishing wide, 1 intimate close-up, 1 extreme detail ECU, and 1 power-angle shot (low or high).
        Ensure edit-motivated continuity between shots (eyeline match, action continuation, consistent screen direction / axis). </step 4 - keyframes for AI video>
        
        OUTPUT REQUIREMENT: Based on the Keyframe List generated in Step 4, return exactly a JSON array containing 9 strings. Each string should be a full, detailed image prompt for one keyframe, incorporating all the visual anchors and continuity details to ensure character consistency.
        `;
    } else if (version === 'V3') {
        mainPrompt = `
        STORY-TO-STORYBOARD META-PROMPT
        IMPORTANT: Do not create the image, create the detailed prompt for the image.
        The image prompt must make reference to the story and reference image provided by user, the prompt must follow exactly the details of the image prompt
        When the user provides a short story synopsis, follow these steps:
        Analyze the synopsis and identify:
        The main subject(s) (person, pair, group, creature, vehicle, object)
        Their appearance and defining traits
        The environment and tone
        The emotional or narrative beat
        Lighting/mood implied by the story
        Create a full 3×3 cinematic storyboard grid with 9 distinct shots of the same subject(s) in the same environment, using consistent wardrobe, lighting, and atmosphere.
        
        OUTPUT FORMAT
        Cinematic 3×3 Storyboard Prompt
        Story Synopsis (interpreted):
        <one-sentence interpretation of the user’s synopsis>
        Create a professional 3×3 cinematic storyboard grid featuring the same subject(s) from the synopsis in the same environment.
        Maintain total consistency in appearance, clothing, lighting, mood, and environmental details.
        Each panel represents a distinct camera shot following cinematic conventions.
        Row 1 — Establishing Context
        Extreme Long Shot (ELS):
        Full environment revealed, subject(s) small in frame. Match the story’s setting, lighting, and mood.
        Long Shot (LS):
        Entire subject(s) visible head-to-toe (or full object/vehicle), standing naturally within the environment.
        Medium Long Shot (MLS / 3-4 / American Shot):
        Subject(s) framed from knees up (or 3/4 angle for objects), showing stance, posture, and core emotion.
        Row 2 — Core Coverage
        Medium Shot (MS):
        Waist-up framing. Capture the key action, attitude, or emotional beat implied by the story.
        Medium Close-Up (MCU):
        Chest-up. Focus on emotion, expression, micro-interaction, or narrative tension.
        Close-Up (CU):
        Tight shot of the face (or front detail of an object). Cinematic depth of field, emotional clarity.
        Row 3 — Details & Angles
        Extreme Close-Up (ECU):
        Macro detail: eyes, hands, symbolic object, texture, or a key story element.
        Low Angle Shot (Worm’s Eye):
        Camera looking up at the subject(s) from below. Dramatic, heroic, or imposing based on the story’s tone.
        High Angle Shot (Bird’s Eye):
        Camera looking down from above. Spatial clarity, vulnerability, or overview of action.
        Global Requirements
        Same subject from image prompt(s) in all 9 frames
        Same clothing, hairstyle, props, weapons, or accessories
        Same lighting conditions and color grading
        Consistent environment and weather
        Correct realism and cinematic depth of field per shot
        Photorealistic textures
        Cinematic camera behavior and focal-length accuracy

        Example of How This Works with a Synopsis
        User input:
        “A lone desert scout tracks a signal across a ruined canyon at sunset.”
        Output (shortened example):
        Story Synopsis: A lone desert scout navigates a canyon wasteland at sunset while tracking a mysterious signal.
        ELS: small figure against vast ruined canyon
        LS: scout silhouetted in sunset light
        MLS: knees-up shot with gear visible
        MS: waist-up, scanning horizon
        MCU: chest-up, focused expression
        CU: dust-covered face, tracking device glow
        ECU: close-up of the device display
        Low Angle: heroic stance on canyon ridge
        High Angle: scout from above, canyon below

        OUTPUT REQUIREMENT: Return exactly a JSON array containing 9 strings. Each string must be the detailed visual description for one of the 9 frames (ELS, LS, MLS, MS, MCU, CU, ECU, Low Angle, High Angle), fully incorporating the character and environment details from the input story and reference image.
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
    
    // Fallback to Server Action (No Client Key)
    if (!ai) {
        const result = await generateVideoAction(prompt, model, options, inputImage, videoInput, referenceImages, lastFrame);
        // Transform the raw Google URI into a local proxy URL to avoid exposing Server Key and handle CORS
        if (result && result.uri) {
            return {
                ...result,
                uri: `/api/proxy-file?uri=${encodeURIComponent(result.uri)}`
            };
        }
        return result;
    }

    let targetModel = model || 'veo-3.1-fast-generate-preview';
    const config: any = { 
        numberOfVideos: 1, 
        aspectRatio: options.aspectRatio || '16:9', 
        resolution: options.resolution || '720p',
        // Pass duration if specified (e.g., for extendable models)
        duration: options.duration ? `${options.duration}s` : undefined
    };
    let finalPrompt = prompt || "Cinematic video with professional lighting.";
    let contents: any = { prompt: finalPrompt };
    
    if (inputImage) {
        contents.image = { imageBytes: safeBase64(inputImage), mimeType: getMimeType(inputImage) };
    }
    
    // Temporarily disable referenceImages when inputImage is present to avoid INVALID_ARGUMENT error
    // Veo model may not support both inputImage (as first frame) and referenceImages simultaneously in this way.
    // if (referenceImages && referenceImages.length > 0) {
    //     config.referenceImages = referenceImages.slice(0, 5).map(img => ({ image: { imageBytes: safeBase64(img), mimeType: getMimeType(img) }, referenceType: 'ASSET' }));
    // }
    
    if (lastFrame) config.lastFrame = { imageBytes: safeBase64(lastFrame), mimeType: getMimeType(lastFrame) };
    if (videoInput) contents.video = videoInput;

    try {
        let op = await ai.models.generateVideos({ model: targetModel, ...contents, config });
        while (!op.done) { await wait(5000); op = await ai.operations.getVideosOperation({ operation: op }); }
        if ((op as any).error) throw new Error((op as any).error.message);
        const vid = op.response?.generatedVideos?.[0]?.video;
        if (!vid || !vid.uri) throw new Error("Video generation failed: No video returned");
        
        // Always use proxy to avoid CORS issues with Google's storage
        const uri = vid.uri || (vid as any).videoUri; // Handle potential different response structures
        if (!uri) throw new Error("No video URI in response");

        // For client-side key, we can append the key directly.
        // Note: We need 'alt=media' for download usually, but 'uri' might handle it.
        // Let's ensure we use the client key.
        const clientKey = getClientKey();
        let finalUri = uri;
        if (clientKey) {
             const separator = finalUri.includes('?') ? '&' : '?';
             finalUri += `${separator}key=${clientKey}`;
        }
        
        return { 
            uri: `/api/proxy-file?uri=${encodeURIComponent(finalUri)}`,
            videoMetadata: vid 
        };
    } catch (e: any) { throw e; }
};

export const generateVideoSequence = async (
    frames: SmartSequenceItem[], 
    model: string, 
    options: any = {},
    onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
    if (frames.length < 2) throw new Error("At least 2 frames required for sequence generation");
    
    const results: string[] = [];
    
    // Generate segments sequentially: 0->1, 1->2, 2->3...
    // This ensures continuity and avoids API rate limits/conflicts
    const totalSegments = frames.length - 1;
    
    for (let i = 0; i < totalSegments; i++) {
        const startFrame = frames[i];
        const endFrame = frames[i+1];
        
        // Notify progress
        if (onProgress) {
            onProgress(i + 1, totalSegments);
        }

        // Use transition prompt if available, otherwise default continuity
        const prompt = startFrame.transition.prompt || "Maintain strict visual continuity and smooth motion between frames.";
        const duration = startFrame.transition.duration || 3;

        console.log(`Generating segment ${i+1}/${totalSegments}: ${prompt} (${duration}s)`);

        try {
            const res = await generateVideo(
                prompt,
                model,
                { ...options, duration },
                startFrame.src, // Input Image (Start)
                undefined, // No video input for now
                undefined, // No intermediate reference images
                endFrame.src // Last Frame (End)
            );
            
            if (res && res.uri) {
                results.push(res.uri);
            } else {
                console.error(`Segment ${i+1} generation failed: No URI returned`, res);
                // Try fallback: if we got a result but no uri (weird), or if res is null.
                // If it's a backend failure, generateVideo should have thrown.
                // If we are here, it means generateVideo returned something but it lacks uri.
                // Let's check if videoMetadata has uri?
                if (res?.videoMetadata?.uri) {
                     results.push(res.videoMetadata.uri);
                } else {
                     throw new Error(`Segment ${i+1} failed to generate: No video returned`);
                }
            }
        } catch (e) {
            console.error(`Error generating segment ${i+1}:`, e);
            throw e;
        }
    }
    
    return results;
};

export const generateImageFromText = async (prompt: string, model: string, inputImages: string[] = [], options: any = {}): Promise<string[]> => {
    const ai = getClient();
    
    if (!ai) {
        return await generateImageFromTextAction(prompt, model, inputImages, options);
    }

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
    
    // TODO: Implement analyzeVideoAction if needed. For now, require client key or fail.
    if (!ai) {
        throw new Error("Video Analysis requires a configured API Key in Settings.");
    }

    const mime = videoBase64OrUrl.match(/^data:(video\/\w+);base64,/)?.[1] || 'video/mp4';
    const response = await ai.models.generateContent({ model: model || 'gemini-3-flash-preview', contents: { parts: [ { inlineData: { mimeType: mime, data: safeBase64(videoBase64OrUrl) } }, { text: prompt } ] } });
    return response.text || "分析失败";
};

export const createScriptFromText = async (originalContent: string, requirements: string, model?: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return await createScriptFromTextAction(originalContent, requirements);

    const prompt = `
    Role: Professional Screenwriter & World Builder.
    Task: Create a comprehensive script package based on the user's story idea/theme.
    
    Input Story/Theme: """${originalContent}"""
    User Requirements: """${requirements}"""
    
    Output Format (Strictly follow this structure):
    1. **World View & Setting**: Describe the rules, atmosphere, time period, and location.
    2. **Core Values & Themes**: The central message or philosophical conflict.
    3. **Character Profiles**:
       - Name, Age, Role
       - Personality & Backstory
       - Visual Features (for casting/generation)
    4. **Scene Breakdown**:
       - Write key scenes in standard screenplay format (Slugline, Action, Dialogue).
       - Ensure scenes are descriptive enough to be split into individual storyboard shots later.
    
    Tone: Professional, cinematic, and ready for production.
    `;

    const targetModel = model || 'gemini-3-pro-preview';
    const isThinking = targetModel.includes('pro');
    const response = await ai.models.generateContent({ 
        model: targetModel, 
        contents: prompt, 
        config: isThinking ? { thinkingConfig: { thinkingBudget: 16000 } } : undefined
    });
    return response.text || "生成失败";
};

export const adaptScriptProfessional = async (sourceText: string, videoAnalysis: string, instructions: string, model?: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return await adaptScriptProfessionalAction(sourceText, videoAnalysis, instructions);

    const prompt = `
    Role: Expert Script Doctor & Adaptation Specialist.
    Task: Analyze the input text (novel/script) and rewrite/adapt it based on instructions.
    
    Input Text: """${sourceText}"""
    ${videoAnalysis ? `Reference Video Analysis: """${videoAnalysis}"""` : ''}
    User Instructions: """${instructions}"""
    
    Process:
    1. **Analyze**: Understand the narrative arc, pacing, character motivations, and subtext of the input.
    2. **Adapt/Rewrite**: Rewrite the content into a polished Shooting Script format.
    3. **Visual Optimization**: Enhance visual descriptions in the Action lines to aid future visual generation.
    
    Output:
    - Provide the adapted script in standard format.
    - If requested, include notes on why specific changes were made (e.g., "Compressed dialogue for better pacing").
    `;

    const targetModel = model || 'gemini-3-pro-preview';
    const isThinking = targetModel.includes('pro');
    const response = await ai.models.generateContent({ 
        model: targetModel, 
        contents: prompt, 
        config: isThinking ? { thinkingConfig: { thinkingBudget: 32000 } } : undefined
    });
    return response.text || "改编失败";
};

export const expandVisualDescription = async (idea: string, model?: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return await expandVisualDescriptionAction(idea);

    const prompt = `
    Role: Visionary Visual Director & Cinematographer.
    Task: Translate the script/scene description into a precise, high-fidelity visual prompt optimized for AI image generation.
    
    Input Script/Scene: """${idea}"""
    
    Output Format:
    Please provide a cohesive, descriptive paragraph that integrates the following elements naturally:
    
    1. **Subject & Action**: What is happening, who is there.
    2. **Camera Language**: Shot type (Wide, Close-up), Angle (Low, High), Movement.
    3. **Lighting & Atmosphere**: Time of day, light source, mood (Cinematic, Ethereal, Gritty).
    4. **Art Direction**: Style (Photorealistic, Cyberpunk, Oil Painting), Color Palette.
    
    IMPORTANT: 
    - Output ONLY the final prompt text. 
    - Do not use markdown headers or bullet points. 
    - Write it as a single, rich, descriptive block of text that I can directly paste into an image generator.
    `;

    const response = await ai.models.generateContent({ 
        model: model || 'gemini-3-pro-preview', 
        contents: prompt 
    });
    return response.text || "视觉渲染失败";
};

export const sendChatMessage = async (history: any[], newMessage: string, options?: any) => {
    const ai = getClient();
    
    // Chat usually needs state. If we use server action, we need to pass full history.
    // For now, if no client key, we fail or we can implement a chat action.
    if (!ai) {
        throw new Error("Chat requires a configured API Key in Settings.");
    }

    const targetModel = options?.model || (options?.isThinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview');
    const isThinking = targetModel.includes('pro');

    const chat = ai.chats.create({
        model: targetModel,
        config: { systemInstruction: "You are InkAI, a helpful multimedia expert.", ...(isThinking && options?.isThinkingMode ? { thinkingConfig: { thinkingBudget: 16000 } } : {}) },
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
        if (typeof window === 'undefined') {
            resolve(""); // Cannot extract frame on server easily without ffmpeg
            return;
        }
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
    if (!ai) return await generateAudioAction(prompt, referenceAudio, options);

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } },
    });
    return `data:audio/pcm;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return await transcribeAudioAction(audioBase64);

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ { inlineData: { data: safeBase64(audioBase64), mimeType: audioBase64.match(/^data:([^;]+);base64,/)?.[1] || 'audio/mp3' } }, { text: "Transcribe the audio." } ] }
    });
    return response.text || "";
};

export const connectLiveSession = async (onAudio: (base64: string) => void, onDisconnect: () => void) => {
    const ai = getClient();
    if (!ai) {
        // Cannot do live session without client key currently
        throw new Error("Live Session requires a configured API Key in Settings.");
    }

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: () => console.debug('Live session started'),
            onmessage: async (message) => {
                const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) onAudio(audio);
            },
            onclose: (e) => onDisconnect(),
            onerror: (err) => { console.error('Live session error:', err); onDisconnect(); }
        },
        config: { responseModalities: [Modality.AUDIO] }
    });
};
