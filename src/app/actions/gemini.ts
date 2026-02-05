'use server';

import { GoogleGenAI, Modality, Part } from "@google/genai";
import { CinematicVersion, SmartSequenceItem } from "@/types";

/**
 * 获取 Server Side 的 Gemini Client (使用环境变量)
 * 如果没有环境变量，抛出错误，提示客户端使用自己的 Key
 */
const getServerClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Server API Key not configured");
    }
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



/**
 * 规划分镜 (Server Action)
 */
export async function planStoryboardAction(
    content: string, 
    version: CinematicVersion = 'V1', 
    baseImage?: string
): Promise<string[]> {
    try {
        const ai = getServerClient();
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

        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: { parts }, 
            config: { responseMimeType: 'application/json' } 
        });
        const cleanJson = (response.text || "").replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);
        return Array.isArray(result) ? result.slice(0, 9) : [content];
    } catch (e) {
        console.error("planStoryboardAction failed:", e);
        // Throw error to let client handle fallback
        throw e;
    }
}

/**
 * 生成视频 (Server Action)
 */
export async function generateVideoAction(
    prompt: string, 
    model: string, 
    options: any = {}, 
    inputImage?: string | null, 
    videoInput?: any, 
    referenceImages?: string[],
    lastFrame?: string | null
): Promise<any> {
    try {
        const ai = getServerClient();
        let targetModel = model || 'veo-3.1-fast-generate-preview';
        const config: any = { 
            numberOfVideos: 1, 
            aspectRatio: options.aspectRatio || '16:9', 
            resolution: options.resolution || '720p',
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

        let op = await ai.models.generateVideos({ model: targetModel, ...contents, config });
        
        // Polling loop
        while (!op.done) { 
            await wait(5000); 
            op = await ai.operations.getVideosOperation({ operation: op }); 
        }
        
        if ((op as any).error) throw new Error((op as any).error.message);
        const vid = op.response?.generatedVideos?.[0]?.video;
        if (!vid) throw new Error("Video generation failed: No video returned");
        
        // Note: We return the URI. The client might need to proxy this if the URI requires auth that the client doesn't have.
        // However, usually Google GenAI URIs are accessible or time-limited.
        // For 'veo', the URI might need the API Key appended? The original code did that.
        // If using server key, we should NOT append the server key to the URI sent to client.
        // Instead, we might need to proxy the video download. 
        // For MVP, we assume the URI is usable or we append a "proxy" param.
        
        // Original code: return { uri: `${vid.uri}&key=${process.env.API_KEY}`, videoMetadata: vid };
        // If we return server key here, we leak it. 
        // We will just return the URI and metadata. If it fails, we know we need a proxy.
        return { uri: vid.uri, videoMetadata: vid }; 
    } catch (e) {
        console.error("generateVideoAction failed:", e);
        throw e;
    }
}

/**
 * 文生图 (Server Action)
 */
export async function generateImageFromTextAction(
    prompt: string, 
    model: string, 
    inputImages: string[] = [], 
    options: any = {}
): Promise<string[]> {
    try {
        const ai = getServerClient();
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
            for (const part of response.candidates[0].content.parts) { 
                if (part.inlineData?.data) {
                    images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
                }
            }
        }
        return images;
    } catch (e) {
        console.error("generateImageFromTextAction failed:", e);
        throw e;
    }
}

/**
 * 剧本生成 (Server Action)
 */
export async function createScriptFromTextAction(originalContent: string, requirements: string): Promise<string> {
    try {
        const ai = getServerClient();
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: `你是一名顶级编剧。素材："""${originalContent}"""。需求：${requirements}。`, 
            config: { thinkingConfig: { thinkingBudget: 16000 } } 
        });
        return response.text || "生成失败";
    } catch (e) {
        console.error("createScriptFromTextAction failed:", e);
        throw e;
    }
}

/**
 * 剧本改编 (Server Action)
 */
export async function adaptScriptProfessionalAction(sourceText: string, videoAnalysis: string, instructions: string): Promise<string> {
    try {
        const ai = getServerClient();
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: `改编剧本。文本：${sourceText}。视频分析：${videoAnalysis}。要求：${instructions}。`, 
            config: { thinkingConfig: { thinkingBudget: 32000 } } 
        });
        return response.text || "改编失败";
    } catch (e) {
        console.error("adaptScriptProfessionalAction failed:", e);
        throw e;
    }
}

/**
 * 视觉描述扩展 (Server Action)
 */
export async function expandVisualDescriptionAction(idea: string): Promise<string> {
    try {
        const ai = getServerClient();
        const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `将创意转化为视觉描述："""${idea}"""` });
        return response.text || "视觉渲染失败";
    } catch (e) {
        console.error("expandVisualDescriptionAction failed:", e);
        throw e;
    }
}

/**
 * 音频生成 (Server Action)
 */
export async function generateAudioAction(prompt: string, referenceAudio?: string, options: any = {}): Promise<string> {
    try {
        const ai = getServerClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } },
        });
        return `data:audio/pcm;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
    } catch (e) {
        console.error("generateAudioAction failed:", e);
        throw e;
    }
}

/**
 * 音频转录 (Server Action)
 */
export async function transcribeAudioAction(audioBase64: string): Promise<string> {
    try {
        const ai = getServerClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [ { inlineData: { data: safeBase64(audioBase64), mimeType: audioBase64.match(/^data:([^;]+);base64,/)?.[1] || 'audio/mp3' } }, { text: "Transcribe the audio." } ] }
        });
        return response.text || "";
    } catch (e) {
        console.error("transcribeAudioAction failed:", e);
        throw e;
    }
}
