import { getSupabaseServerClient } from "@/lib/supabase-server";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ACTIONS = ["generate", "rephrase", "shorten", "expand"] as const;
type ActionType = (typeof ACTIONS)[number];

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`;

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7 }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${err}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(request: NextRequest) {
    try {
        const { has, userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const canUseAI = has({ plan: "pro" }) || has({ plan: "premium" })
        if (!canUseAI) {
            return NextResponse.json({ error: "AI Post generation requires Pro or Premium plan" }, { status: 403 });
        }

        const { action, content = "", prompt = "", channelId } = await request.json()

        if (!ACTIONS.includes(action as ActionType)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }
        if (action === "generate" && !prompt.trim()) {
            return NextResponse.json({ error: "Prompt is required for generate action" }, { status: 400 })
        }

        let channelType: string | undefined;
        let characterLimit: number | undefined;

        if (channelId) {
            const { supabase } = await getSupabaseServerClient();
            const { data: channelData, error: channelError } = await supabase
                .from("channel_types")
                .select("type, character_limit")
                .eq("id", channelId)
                .single();

            if (channelError || !channelData) {
                return NextResponse.json({ error: "Channel not found" }, { status: 404 });
            }
            channelType = channelData.type;
            characterLimit = channelData.character_limit;
        }

        const text = await callGemini(
            buildSystemPrompt(channelType, characterLimit),
            buildUserPrompt(action as ActionType, content, prompt)
        );

        return NextResponse.json({ content: text })
    } catch (error) {
        console.error("Error generating post:", error)
        return NextResponse.json({ error: "Failed to generate post" }, { status: 500 })
    }
}

function buildSystemPrompt(channelType?: string, characterLimit?: number) {
    const parts = [
        "You are a social media writing assistant.",
        "Return only the final post text.",
        "Do not add quotes, labels, bullet points, or explanations.",
        "Do not use markdown formatting like **, *, #, or backticks.",
        "Return plain text only.",
    ]
    if (channelType) parts.push(`Write for ${channelType}. Match the platform's tone, style, and expected length. Add relevant hashtags.`);
    if (characterLimit) parts.push(`Must be less than the maximum character limit: ${characterLimit}.`);
    return parts.join("\n");
}

function buildUserPrompt(action: ActionType, content: string, prompt: string) {
    if (action === "generate") return `Write one clean social media post based on this request:\n${prompt}`
    if (!content.trim()) throw new Error("Content is required for this action")
    if (action === "rephrase") return `Rephrase this social media post while keeping the meaning:\n${content}`
    if (action === "shorten") return `Shorten this social media post while keeping the key message:\n${content}`
    return `Expand this social media post with more helpful detail while keeping the same tone:\n${content}`
}