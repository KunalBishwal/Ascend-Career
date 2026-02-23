const SARVAM_API_BASE = "https://api.sarvam.ai";

function getSarvamApiKey(): string {
    const key = import.meta.env.VITE_SARVAM_API_KEY;
    if (!key) throw new Error("VITE_SARVAM_API_KEY is not configured.");
    return key;
}

export interface TTSOptions {
    text: string;
    languageCode?: string;
    speaker?: "anushka" | "abhilash" | "manisha" | "vidya" | "arya" | "karun" | "hitesh" | "aditya" | "ritu" | "priya" | "neha" | "rahul" | "pooja" | "rohan" | "simran" | "kavya" | "amit" | "dev" | "ishita" | "shreya" | "ratan" | "varun" | "manan" | "sumit" | "roopa" | "kabir" | "aayan" | "shubh" | "ashutosh" | "advait" | "amelia" | "sophia" | "anand" | "tanya" | "tarun" | "sunny" | "mani" | "gokul" | "vijay" | "shruti" | "suhani" | "mohit" | "kavitha" | "rehan" | "soham" | "rupali";
    model?: "bulbul:v3" | "bulbul:v2";
    pace?: number;
}

/**
 * Chunks text by sentences or punctuation to fit within character limits.
 */
function chunkText(text: string, maxLength: number = 450): string[] {
    const chunks: string[] = [];
    let currentChunk = "";

    // Split by sentences and newlines
    const parts = text.split(/(?<=[.!?])\s+|[\n\r]+/);

    for (const part of parts) {
        if ((currentChunk + part).length <= maxLength) {
            currentChunk += (currentChunk ? " " : "") + part;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());

            // If a single part is too long, split it by characters
            let remainingPart = part;
            while (remainingPart.length > maxLength) {
                chunks.push(remainingPart.substring(0, maxLength).trim());
                remainingPart = remainingPart.substring(maxLength);
            }
            currentChunk = remainingPart;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

/**
 * Generates speech from text using Sarvam AI's Bulbul model.
 * Automatically chunks text if it exceeds Sarvam's limits.
 * Returns an array of base64 encoded audio strings.
 */
export async function generateSpeech({
    text,
    languageCode = "hi-IN",
    speaker = "ritu",
    model = "bulbul:v3",
    pace = 1.0,
}: TTSOptions): Promise<string[]> {
    const apiKey = getSarvamApiKey();
    const chunks = chunkText(text);

    const response = await fetch(`${SARVAM_API_BASE}/text-to-speech`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-subscription-key": apiKey,
        },
        body: JSON.stringify({
            inputs: chunks,
            target_language_code: languageCode,
            speaker: speaker,
            model: model,
            speech_sample_rate: 24000,
            enable_preprocessing: true,
            pace: pace,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Sarvam TTS Error: ${error}`);
    }

    const data = await response.json();
    return data.audios; // Returns array of base64 strings
}

/**
 * Transcribes audio using Sarvam AI's Saaras model.
 */
export async function transcribeAudio(
    audioBlob: Blob,
    languageCode: string = "hi-IN"
): Promise<string> {
    const apiKey = getSarvamApiKey();

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "saaras:v3");
    formData.append("language_code", languageCode);

    const response = await fetch(`${SARVAM_API_BASE}/speech-to-text`, {
        method: "POST",
        headers: {
            "api-subscription-key": apiKey,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Sarvam STT Error: ${error}`);
    }

    const data = await response.json();
    return data.transcript || "";
}
