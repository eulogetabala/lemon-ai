import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`;

export async function POST(request: NextRequest) {
    try {
        const { has, userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const canUseAI = has({ plan: "pro" }) || has({ plan: "premium" })
        if (!canUseAI) {
            return NextResponse.json({ error: "AI Idea generation requires Pro or Premium plan" }, { status: 403 });
        }

        const { businessType, targetAudience } = await request.json()
        if (!businessType || !targetAudience) {
            return NextResponse.json({ error: "Missing businessType or targetAudience" }, { status: 400 });
        }

        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }

        const systemPrompt = `You are a social media content ideation assistant.
Return only valid JSON.
The response must be an object with an "ideas" array.
Each item must have: "title" and "description".
Generate 3 ideas.
Keep titles catchy.
Keep descriptions practical and specific.
Do not use markdown formatting like **, *, #, or backticks.
Return plain text only inside the JSON strings.`;

        const userPrompt = `Business type: ${businessType}. Target audience: ${targetAudience}.`;

        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.8, responseMimeType: "application/json" }
            })
        });

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        const parsed = JSON.parse(text) as { ideas?: { title: string; description: string }[] }
        const ideas = Array.isArray(parsed.ideas) ? parsed.ideas.slice(0, 3) : []

        return NextResponse.json({ ideas })

    } catch (error) {
        console.error("Error generating ideas:", error)
        return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 })
    }
}
