
import { AppNode, VideoGenerationMode } from '../types';
import { extractLastFrame, urlToBase64, analyzeVideo } from './geminiService';

export interface StrategyResult {
    finalPrompt: string;
    videoInput: any;
    inputImageForGeneration: string | null;
    referenceImages: string[] | undefined;
    lastFrameImage?: string | null;
    generationMode: VideoGenerationMode;
}

const findUpstreamAsset = (inputs: AppNode[], type: 'image' | 'video') => {
    if (type === 'image') {
        return inputs.find(n => n.data.croppedFrame || n.data.image || n.data.images?.length);
    } else {
        return inputs.find(n => n.data.videoUri || n.data.videoMetadata);
    }
};

const findAllUpstreamImages = (inputs: AppNode[]) => {
    let images: string[] = [];
    inputs.forEach(n => {
        if (n.data.images && n.data.images.length > 0) {
            images = [...images, ...n.data.images];
        } else if (n.data.image) {
            images.push(n.data.image);
        } else if (n.data.croppedFrame) {
            images.push(n.data.croppedFrame);
        }
    });
    return Array.from(new Set(images));
};

export const getGenerationStrategy = async (
    node: AppNode, 
    inputs: AppNode[], 
    basePrompt: string
): Promise<StrategyResult> => {
    const vMode = node.data.videoMode || 'T2V';
    const gMode = node.data.generationMode || 'DEFAULT';
    
    const upstreamImageNode = findUpstreamAsset(inputs, 'image');
    const upstreamVideoNode = findUpstreamAsset(inputs, 'video');
    const allUpstreamImages = findAllUpstreamImages(inputs);

    const localImages = node.data.images || (node.data.image ? [node.data.image] : []);

    // 默认结果
    let result: StrategyResult = {
        finalPrompt: basePrompt,
        videoInput: node.data.videoMetadata || upstreamVideoNode?.data.videoMetadata || null,
        inputImageForGeneration: null,
        referenceImages: undefined,
        lastFrameImage: node.data.lastFrameImage || null,
        generationMode: gMode
    };

    // 文生视频模式：强制清空参考图
    if (vMode === 'T2V') {
        return result;
    }

    // 图生视频或导演模式
    const combinedImages = [...localImages, ...allUpstreamImages].slice(0, 3);
    
    if (vMode === 'I2V' || vMode === 'DIRECTOR') {
        if (combinedImages.length > 1 && gMode !== 'FIRST_LAST_FRAME') {
            // 多图参考
            result.referenceImages = combinedImages;
        } else if (combinedImages.length > 0) {
            // 单图参考
            result.inputImageForGeneration = combinedImages[0];
        }
    }

    // 导演模式下的特定逻辑
    if (vMode === 'DIRECTOR') {
        switch (gMode) {
            case 'CONTINUE':
                if (!result.videoInput && upstreamVideoNode?.data.videoUri) {
                    try {
                        let videoSrc = upstreamVideoNode.data.videoUri;
                        if (videoSrc.startsWith('http')) videoSrc = await urlToBase64(videoSrc);
                        result.inputImageForGeneration = await extractLastFrame(videoSrc);
                    } catch(e) { console.warn("Frame extraction failed", e); }
                }
                break;
            case 'FIRST_LAST_FRAME':
                if (combinedImages.length > 0) result.inputImageForGeneration = combinedImages[0];
                break;
        }
    }

    return result;
};
