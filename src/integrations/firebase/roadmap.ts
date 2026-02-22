import { GoogleGenAI } from "@google/genai";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoadmapNode {
    id: string;
    title: string;
    level: string;
    description: string;
    salary: string;
    skills: string[];
    duration: string;
    status: "completed" | "current" | "upcoming" | "locked";
    /** Column index (0-based) for positioning in the galaxy */
    col: number;
    /** Row index (0-based) for lane positioning */
    row: number;
    /** IDs of the nodes that feed into this one */
    prerequisites: string[];
}

export interface CareerRoadmap {
    currentRole: string;
    targetRole: string;
    totalEstimatedTime: string;
    nodes: RoadmapNode[];
    generatedAt: Date;
}

// ─── SDK setup ──────────────────────────────────────────────────────────────

function getRoadmapApiKey(): string {
    const key = import.meta.env.VITE_GEMINI_ROADMAP_API_KEY;
    if (!key) throw new Error("VITE_GEMINI_ROADMAP_API_KEY is not configured.");
    return key;
}

// ─── Generate roadmap from resume analysis data ─────────────────────────────

export async function generateRoadmap(
    resumeData: {
        skills?: { name: string; level?: string; category?: string }[];
        experienceLabel?: string;
        experienceMonths?: number;
        recommendations?: { role: string; matchScore: number }[];
        education?: { degree: string; field: string }[];
        summary?: string;
    }
): Promise<CareerRoadmap> {
    const ai = new GoogleGenAI({ apiKey: getRoadmapApiKey() });

    const skillsSummary = (resumeData.skills ?? [])
        .map((s) => `${s.name} (${s.level ?? "unknown"})`)
        .join(", ");

    const topRecommendations = (resumeData.recommendations ?? [])
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3)
        .map((r) => r.role)
        .join(", ");

    const educationSummary = (resumeData.education ?? [])
        .map((e) => `${e.degree} in ${e.field}`)
        .join(", ");

    const prompt = `You are a career strategist. Based on this candidate profile, generate a PERSONALIZED career roadmap with 5-7 career milestone nodes.

CANDIDATE PROFILE:
- Experience: ${resumeData.experienceLabel ?? "Unknown"}
- Skills: ${skillsSummary || "Not provided"}
- Education: ${educationSummary || "Not provided"}
- Top recommended roles: ${topRecommendations || "Not provided"}
- Summary: ${resumeData.summary ?? "Not provided"}

RULES:
1. The FIRST node should be the candidate's current/most-recent position based on their experience level. Mark it as "current".
2. Mark one previous role as "completed" IF the candidate has experience.
3. Subsequent nodes should represent realistic career progression, 2-3 of them "upcoming", and the final 1-2 as "locked" (aspirational long-term goals).
4. Each node gets a unique "col" (0 = leftmost, increasing rightward) and "row" (0 = top lane, 1 = bottom lane). Alternate rows to create a zig-zag layout.
5. "prerequisites" should list the "id" of the node(s) that come before it.
6. Be realistic with salary ranges for the candidate's region (primary focus: India). Use Indian Rupee (INR) and Indian formatting (e.g., ₹6L - ₹10L).
7. Skills should be 3-5 specific, actionable skills for that role.

Return ONLY valid JSON matching this structure:
{
  "currentRole": "<string>",
  "targetRole": "<string: the final aspirational role>",
  "totalEstimatedTime": "<string: e.g. '5-8 years'>",
  "nodes": [
    {
      "id": "node-1",
      "title": "<role title>",
      "level": "<e.g. Entry, Mid, Senior, Lead, Principal, Director>",
      "description": "<1-2 sentence description of the role>",
      "salary": "<e.g. '$60k - $80k' or '₹6L - ₹10L'>",
      "skills": ["<skill1>", "<skill2>", "<skill3>"],
      "duration": "<e.g. '1-2 years'>",
      "status": "completed|current|upcoming|locked",
      "col": <number>,
      "row": <number 0 or 1>,
      "prerequisites": ["<node-id>"]
    }
  ]
}

Return ONLY valid JSON. No markdown, no code blocks.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        },
    });

    const text = response.text ?? "";

    try {
        // Try direct parse first; fallback to extracting from code blocks
        const jsonMatch =
            text.match(/```json\n?([\s\S]*?)\n?```/) ||
            text.match(/```\n?([\s\S]*?)\n?```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : text;
        const parsed = JSON.parse(jsonStr.trim());

        // Ensure every node has all required fields
        const nodes: RoadmapNode[] = (parsed.nodes ?? []).map(
            (n: any, i: number) => ({
                id: n.id ?? `node-${i + 1}`,
                title: n.title ?? "Unknown Role",
                level: n.level ?? "Unknown",
                description: n.description ?? "",
                salary: n.salary ?? "N/A",
                skills: n.skills ?? [],
                duration: n.duration ?? "Unknown",
                status: n.status ?? "upcoming",
                col: n.col ?? i,
                row: n.row ?? (i % 2),
                prerequisites: n.prerequisites ?? (i > 0 ? [`node-${i}`] : []),
            })
        );

        return {
            currentRole: parsed.currentRole ?? "Current Position",
            targetRole: parsed.targetRole ?? "Dream Role",
            totalEstimatedTime: parsed.totalEstimatedTime ?? "Unknown",
            nodes,
            generatedAt: new Date(),
        };
    } catch (err) {
        console.error("Failed to parse roadmap response:", text);
        throw new Error("Failed to generate roadmap. Please try again.");
    }
}

// ─── Firestore persistence ──────────────────────────────────────────────────

export async function saveRoadmap(userId: string, roadmap: CareerRoadmap) {
    const docRef = doc(db, "users", userId, "roadmaps", "latest");
    await setDoc(docRef, {
        ...roadmap,
        generatedAt: serverTimestamp(),
    });
}

export async function getLatestRoadmap(userId: string): Promise<CareerRoadmap | null> {
    const docRef = doc(db, "users", userId, "roadmaps", "latest");
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        currentRole: data.currentRole,
        targetRole: data.targetRole,
        totalEstimatedTime: data.totalEstimatedTime,
        nodes: data.nodes,
        generatedAt: data.generatedAt?.toDate?.() ?? new Date(),
    };
}
