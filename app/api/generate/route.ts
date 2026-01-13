import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GOLDEN_TEMPLATES, CTAS } from '@/app/lib/templates';


// Initialize Gemini
// Note: In Cloud Run, set this env var via gcloud or Console
const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Server Configuration Error: GEMINI_API_KEY is missing.' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // "gemini-pro" is text-only, suitable for this task
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log(`[GEMINI] Generating for prompt: ${prompt.substring(0, 30)}...`);

        const combinedPrompt = `
You are an expert social media content creator. Your goal is to take the user's input/topic and craft a highly engaging Threads post.

You have access to the following "Golden Templates" (Hooks):
${GOLDEN_TEMPLATES.map(t => `- [${t.category}] "${t.name}" (Best for: ${t.description})`).join('\n')}

And the following Call-To-Actions (CTAs):
${CTAS.map(c => `- ${c}`).join('\n')}

INSTRUCTIONS:
1. Analyze the user's prompt: "${prompt}"
2. Select the ONE best matching Hook Template that fits the content/topic.
3. Select ONE suitable CTA.
4. Generate the post content. It must:
   - Start with the selected Hook phrase (adapt it slightly if needed to flow naturally, but keep the core hook).
   - Be concise, engaging, and formatted for easy reading (use line breaks).
   - End with the selected CTA.
   - NOT include any intro/outro text. Just the final post content.

Output the final post text only.
`;

        const result = await model.generateContent(combinedPrompt);
        const response = await result.response;
        const text = response.text().trim();

        console.log(`[GEMINI] Success. Raw Length: ${text.length}`);

        return NextResponse.json({ output: text });

    } catch (error: any) {
        console.error('[GEMINI] Generation failed:', error);
        return NextResponse.json(
            { error: error.message || 'Gemini Generation Failed' },
            { status: 500 }
        );
    }
}
