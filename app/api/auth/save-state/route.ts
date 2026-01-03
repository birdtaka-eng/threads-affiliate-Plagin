import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Initialize GCS
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'threads-shokunin-sessions';
const FILE_NAME = 'threads_session.json';

// CORS Headers helper
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cookies } = body;

        if (!cookies || !Array.isArray(cookies)) {
            return NextResponse.json(
                { error: 'Invalid data: cookies array required' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Format for Playwright storageState
        const storageState = {
            cookies: cookies.map((c: any) => ({
                name: c.name,
                value: c.value,
                domain: c.domain || '.threads.net',
                path: c.path || '/',
                expires: typeof c.expires === 'number' ? c.expires : (c.expirationDate || -1),
                httpOnly: c.httpOnly || false,
                secure: c.secure || true,
                sameSite: c.sameSite || 'None'
            })),
            origins: [] // We can add localStorage here later if needed
        };

        // Save to GCS
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(FILE_NAME);

        await file.save(JSON.stringify(storageState, null, 2), {
            contentType: 'application/json',
            metadata: {
                cacheControl: 'no-cache',
            },
        });

        console.log(`[AUTH] Session saved to gs://${BUCKET_NAME}/${FILE_NAME}`);

        return NextResponse.json(
            { success: true, message: 'Session saved' },
            { headers: corsHeaders() }
        );

    } catch (error: any) {
        console.error('[AUTH] Save failed:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
