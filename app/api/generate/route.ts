import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log(`[GEMINI] Success. Length: ${text.length}`);

        return NextResponse.json({ output: text });

    } catch (error: any) {
        console.error('[GEMINI] Generation failed:', error);
        return NextResponse.json(
            { error: error.message || 'Gemini Generation Failed' },
            { status: 500 }
        );
    }
}
