declare const process: {
    env: {
        API_KEY: string;
        GEMINI_API_KEY: string;
    };
};

const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

export const getAIResponse = async (prompt: string, imageBase64?: string): Promise<string> => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: imageBase64 
                        ? [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }]
                        : [{ text: prompt }]
                }],
                systemInstruction: "أنت مساعد 'هوا سوا'. رد بالعربية دائماً وبأسلوب ودود. إذا طلب المستخدم صورة، ابدأ ردك بكلمة '[IMAGE_GEN]' ثم الوصف بالإنجليزية بدقة.",
                generationConfig: {
                    temperature: 0.8
                }
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من الإجابة.";
    } catch (error) {
        console.error("Gemini error:", error);
        return "حدث خطأ في الاتصال بالخادم الذكي.";
    }
};

export const generateImage = async (imagePrompt: string): Promise<string | null> => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: imagePrompt }]
                }]
            })
        });

        const data = await response.json();
        const imageData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return imageData ? `data:image/png;base64,${imageData}` : null;
    } catch (error) {
        console.error("Image Gen Error:", error);
        return null;
    }
};

export const connectLiveAI = async (callbacks: any) => {
    console.log("Live AI غير متاح حالياً في نسخة CDN");
    return Promise.resolve(null);
};

export const decodeBase64Audio = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

export const encodeAudio = (data: Float32Array): { data: string; mimeType: string } => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
        int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return {
        data: btoa(binary),
        mimeType: 'audio/pcm;rate=16000',
    };
};