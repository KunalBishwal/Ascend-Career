const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function getResumeApiKey(): string {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error("VITE_GEMINI_API_KEY is not configured. Please add it to your .env file.");
    return key;
}

function getMentorApiKey(): string {
    const key = import.meta.env.VITE_GEMINI_MENTOR_API_KEY;
    if (!key) throw new Error("VITE_GEMINI_MENTOR_API_KEY is not configured. Please add it to your .env file.");
    return key;
}

// Retry helper with exponential backoff
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.status === 429) {
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                console.warn(`Rate limited. Retrying in ${waitTime / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }

            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError || new Error("Max retries reached");
}

// Analyze resume with Gemini — comprehensive extraction
export async function analyzeResume(fileContent: string, fileName: string) {
    const apiKey = getResumeApiKey();

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) resume analyst. You must parse the resume with EXTREME PRECISION.

CRITICAL RULES FOR EXPERIENCE CALCULATION:
- Calculate experience ONLY from explicitly stated work experience dates
- If someone worked "Jan 2024 – Mar 2024", that is 3 MONTHS, NOT years
- If someone has only internships of a few months, they are a FRESHER with < 1 year experience
- DO NOT inflate or round up experience. "3 months" stays "0.25 years" or "3 months"
- If no professional work experience section exists, experienceMonths = 0 (fresher)
- Internships count as experience but calculate the EXACT duration from dates
- Add all work durations to get total — do NOT estimate or guess

Return a JSON object with this EXACT structure:

{
  "atsScore": <number 0-100>,
  "atsBreakdown": {
    "formatting": <number 0-25>,
    "keywords": <number 0-25>,
    "actionVerbs": <number 0-25>,
    "quantification": <number 0-25>
  },
  "atsSuggestions": ["<string improvement suggestions, max 6>"],
  "about": "<string: the candidate's objective/summary/about section, or generate a 2-3 sentence professional summary if none exists>",
  "experienceMonths": <number: EXACT total months of professional experience, 0 for freshers>,
  "experienceLabel": "<string: e.g. 'Fresher', '3 months', '1 year 6 months', '3 years'>",
  "education": [
    {
      "degree": "<string>",
      "field": "<string: field of study>",
      "institution": "<string>",
      "graduationDate": "<string: e.g. 'May 2024' or 'Expected 2025'>",
      "gpa": "<string or null>"
    }
  ],
  "projects": [
    {
      "name": "<string>",
      "description": "<string: 1-2 sentences>",
      "technologies": ["<string>"],
      "highlights": ["<string: key achievements/features, max 3>"]
    }
  ],
  "certifications": [
    {
      "name": "<string>",
      "issuer": "<string>",
      "date": "<string or null>"
    }
  ],
  "skills": [
    {
      "name": "<string>",
      "level": "Beginner" | "Intermediate" | "Advanced" | "Expert",
      "category": "<string: e.g. Programming, Cloud, Tools, Soft Skills, Design, Database, Framework>"
    }
  ],
  "topStrengths": ["<string: 3-5 key strengths>"],
  "recommendations": [
    {
      "role": "<string: job title>",
      "matchScore": <number 0-100>,
      "description": "<string>",
      "requiredSkills": ["<string>"],
      "salaryRange": "<string: e.g. '₹6L - ₹10L' annually>"
    }
  ],
  "summary": "<string: 2-3 sentence professional summary>"
}

ATS SCORE RUBRIC:
- Formatting (0-25): Clean layout, proper sections, consistent formatting, readable by ATS
- Keywords (0-25): Relevant industry keywords, skill mentions, technology names
- Action Verbs (0-25): Strong action verbs (built, designed, implemented, managed), not passive voice
- Quantification (0-25): Numbers and metrics (e.g., "increased by 30%", "managed team of 5")

Return ONLY valid JSON. No markdown, no code blocks, just the JSON object.`;

    const userPrompt = `Analyze this resume file (${fileName}) with extreme precision. Pay special attention to:
1. Calculate experience from EXACT dates — do NOT round up or estimate
2. Extract ALL education entries
3. Extract ALL projects with their tech stacks
4. Extract ALL certifications
5. Calculate an accurate ATS score

Return ONLY valid JSON.`;

    // Send PDF as inline_data for better binary parsing
    const response = await fetchWithRetry(
        `${GEMINI_API_URL}/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{
                    parts: [
                        { text: userPrompt },
                        {
                            inlineData: {
                                mimeType: "application/pdf",
                                data: fileContent,
                            },
                        },
                    ],
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        if (response.status === 429) {
            throw new Error("Rate limit exceeded after retries. Please wait a few minutes and try again.");
        }
        if (response.status === 400) {
            throw new Error("Invalid request. The resume may be too large or in an unsupported format.");
        }
        if (response.status === 403) {
            throw new Error("API key does not have access. Please enable the Generative Language API in Google Cloud Console.");
        }
        throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        throw new Error("No content in Gemini response");
    }

    try {
        const jsonMatch =
            content.match(/```json\n?([\s\S]*?)\n?```/) ||
            content.match(/```\n?([\s\S]*?)\n?```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        return JSON.parse(jsonStr.trim());
    } catch {
        console.error("Failed to parse Gemini response:", content);
        throw new Error("Failed to parse resume analysis. Please try again.");
    }
}

// Streaming career mentor chat with Gemini (with retry on 429)
export async function streamCareerMentorChat(
    messages: { role: string; content: string }[],
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: Error) => void
) {
    const apiKey = getMentorApiKey();

    const systemPrompt = `You are an expert AI Career Mentor with deep knowledge of the tech industry, career development, and professional growth. Your role is to:

1. Provide personalized career advice based on the user's background and goals
2. Help with interview preparation and practice
3. Suggest learning paths and skill development strategies
4. Offer insights on salary negotiation and job searching
5. Guide users on building their personal brand and network

Be encouraging, specific, and actionable in your advice. Use markdown formatting for better readability when listing items or providing structured information.`;

    const geminiContents = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
    }));

    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(
                `${GEMINI_API_URL}/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: geminiContents,
                    }),
                }
            );

            if (response.status === 429) {
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                console.warn(`Rate limited. Retrying in ${waitTime / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Gemini API error:", response.status, errorText);
                if (response.status === 400) {
                    throw new Error("Invalid request. Please check your API key.");
                }
                if (response.status === 403) {
                    throw new Error("API key does not have access. Please enable the Generative Language API in Google Cloud Console.");
                }
                throw new Error(`API error (${response.status}): ${errorText.slice(0, 200)}`);
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let newlineIndex: number;
                while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                    let line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 1);

                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) continue;

                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            onChunk(text);
                        }
                    } catch {
                        // Incomplete JSON chunk
                    }
                }
            }

            // Flush remaining buffer
            if (buffer.trim()) {
                for (const line of buffer.split("\n")) {
                    if (!line.startsWith("data: ")) continue;
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === "[DONE]") continue;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) onChunk(text);
                    } catch {
                        // Ignore
                    }
                }
            }

            onDone();
            return; // Success — exit the retry loop
        } catch (error) {
            if (attempt === maxRetries - 1) {
                onError(error instanceof Error ? error : new Error("Unknown error"));
            } else {
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                console.warn(`Error, retrying in ${waitTime / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }
}
