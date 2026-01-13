// الوضع التطويري: إذا لم يكن API_KEY موجوداً، نستخدم ردود تجريبية
const isDevelopment = !import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY;

export const getAIResponse = async (prompt: string, imageBase64?: string): Promise<string> => {
    // إذا كنا في وضع التطوير، نعود برد تجريبي
    if (isDevelopment) {
        console.log('🔧 وضع التطوير: استخدام ردود تجريبية');
        return "أهلاً! أنا مساعد هوا سوا الذكي. أسعد بتقديم المساعدة. كيف يمكنني مساعدتك اليوم؟";
    }
    
    try {
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!API_KEY) {
            throw new Error('مفتاح Gemini API غير موجود');
        }
        
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
                systemInstruction: "أنت مساعد 'هوا سوا'. رد بالعربية دائماً وبأسلوب ودود. إذا طلب المستخدم صورة، ابدأ ردك بكلمة '[IMAGE_GEN]' ثم الوصف بالإنجليزية بدقة. مثال: [IMAGE_GEN] A futuristic city at night.",
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`خطأ في API: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text || "عذراً، لم أتمكن من الإجابة.";
        } else {
            console.warn('⚠️ استجابة غير متوقعة من Gemini:', data);
            return "عذراً، حدث خطأ في المعالجة.";
        }
    } catch (error) {
        console.error("❌ خطأ في Gemini:", error);
        return "عذراً، حدث خطأ في الاتصال بالخادم الذكي. جرب مرة أخرى لاحقاً.";
    }
};

export const generateImage = async (imagePrompt: string): Promise<string | null> => {
    if (isDevelopment) {
        console.log('🔧 وضع التطوير: استخدام صورة تجريبية');
        // صورة تجريبية base64 (صورة صغيرة سوداء)
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    }
    
    try {
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!API_KEY) {
            throw new Error('مفتاح Gemini API غير موجود');
        }
        
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

        if (!response.ok) {
            throw new Error(`خطأ في API: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].inlineData) {
            return `data:image/png;base64,${data.candidates[0].content.parts[0].inlineData.data}`;
        }
        
        return null;
    } catch (error) {
        console.error("❌ خطأ في إنشاء الصورة:", error);
        return null;
    }
};

// دوال الصوت (غير مستخدمة حالياً ولكن موجودة للتوافق)
export const connectLiveAI = async (callbacks: any) => {
    console.log("🎤 Live AI غير متاح حالياً في هذه النسخة");
    return Promise.resolve(null);
};

export const decodeBase64Audio = (base64: string): Uint8Array => {
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (error) {
        console.error('❌ خطأ في فك تشفير الصوت:', error);
        return new Uint8Array();
    }
};

export const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
): Promise<AudioBuffer> => {
    try {
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
    } catch (error) {
        console.error('❌ خطأ في فك تشفير بيانات الصوت:', error);
        throw error;
    }
};

export const encodeAudio = (data: Float32Array): { data: string; mimeType: string } => {
    try {
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
    } catch (error) {
        console.error('❌ خطأ في تشفير الصوت:', error);
        return { data: '', mimeType: 'audio/pcm;rate=16000' };
    }
};
