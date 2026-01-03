import { NextRequest, NextResponse } from 'next/server';
import { chromium, BrowserContext, Page, ElementHandle } from 'playwright';
import { Storage } from '@google-cloud/storage';

// Initialize GCS
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'threads-shokunin-sessions';
const SESSION_FILE_NAME = 'threads_session.json';

// CORS Helper
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

// --- Helper Functions ---

async function findFlexible(page: Page, selectors: string[], timeoutMs: number = 5000): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        for (const selector of selectors) {
            try {
                const element = await page.waitForSelector(selector, { state: 'visible', timeout: 500 });
                if (element) return element;
            } catch (e) {
                continue;
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}

async function loadCookies(context: BrowserContext): Promise<boolean> {
    try {
        console.log(`[COOKIES] Downloading from gs://${BUCKET_NAME}/${SESSION_FILE_NAME}...`);

        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(SESSION_FILE_NAME);

        const [exists] = await file.exists();
        if (!exists) {
            console.log('[COOKIES] No session file found in GCS.');
            return false;
        }

        const [content] = await file.download();
        const data = JSON.parse(content.toString());

        if (data && data.cookies) {
            console.log('[COOKIES] Loaded session from GCS');
            await context.addCookies(data.cookies);
            return true;
        }
    } catch (e) {
        console.error(`[COOKIES] Load failed from GCS: ${e}`);
    }
    return false;
}

async function saveCookies(context: BrowserContext) {
    try {
        const storageState = await context.storageState();
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(SESSION_FILE_NAME);

        await file.save(JSON.stringify(storageState, null, 2), {
            contentType: 'application/json',
            metadata: { cacheControl: 'no-cache' }
        });

        console.log(`[COOKIES] Updated session in gs://${BUCKET_NAME}/${SESSION_FILE_NAME}`);
    } catch (e) {
        console.error(`[COOKIES] Save to GCS failed: ${e}`);
    }
}

async function loginToThreads(page: Page): Promise<boolean> {
    const username = process.env.THREADS_USERNAME;
    const password = process.env.THREADS_PASSWORD;

    if (!username || !password) {
        console.error('[LOGIN] ERROR: THREADS_USERNAME and THREADS_PASSWORD required');
        return false;
    }

    try {
        console.log(`[LOGIN] Current URL: ${page.url()}`);
        await page.waitForTimeout(3000);

        // Step 1: Username
        console.log('[LOGIN] Step 1: Username');
        const userSelectors = ['input[name="username"]', 'input[type="text"]'];
        const userInput = await findFlexible(page, userSelectors, 10000);
        if (!userInput) return false;
        await userInput.fill(username);
        await page.waitForTimeout(1000);

        // Step 2: Password
        console.log('[LOGIN] Step 2: Password');
        const passSelectors = ['input[name="password"]', 'input[type="password"]'];
        const passInput = await findFlexible(page, passSelectors, 5000);
        if (!passInput) return false;
        await passInput.fill(password);
        await page.waitForTimeout(1000);

        // Step 3: Submit
        console.log('[LOGIN] Step 3: Submit');
        const loginBtn = await findFlexible(page, ['button[type="submit"]', 'button:has-text("Log in")'], 5000);
        if (loginBtn) {
            await loginBtn.click();
        } else {
            await passInput.press('Enter');
        }
        await page.waitForTimeout(5000);

        return !page.url().includes('login');
    } catch (e) {
        console.error(`[LOGIN] Failed: ${e}`);
        return false;
    }
}


// --- Main Handler ---

export async function POST(request: NextRequest) {
    let browser = null;
    try {
        const body = await request.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400, headers: corsHeaders() }
            );
        }

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080', '--lang=ja']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'ja-JP'
        });

        const page = await context.newPage();

        console.log('[1] Going to Threads...');
        await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const loaded = await loadCookies(context);
        if (loaded) {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
        }

        console.log(`[2] Current URL: ${page.url()}`);
        let loginRequired = false;
        const loginEl = await findFlexible(page, ['//*[contains(text(), "Log in")]'], 2000);
        if (loginEl) loginRequired = true;

        if (loginRequired || page.url().includes('login')) {
            console.log('[3] Login required...');
            // Try to click login link first
            const loginLink = await findFlexible(page, ['a[href*="login"]'], 3000);
            if (loginLink) await loginLink.click();

            const success = await loginToThreads(page);
            if (!success) throw new Error('Login failed');
            await saveCookies(context);
            await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded' });
        }

        console.log('[4] Looking for compose area...');
        let composeArea = await findFlexible(page, ['div[contenteditable="true"]', 'div[role="textbox"]'], 8000);

        if (!composeArea) {
            const newPostBtn = await findFlexible(page, ['svg[aria-label="Create"]', 'div[role="button"] svg'], 5000);
            if (newPostBtn) {
                await newPostBtn.click();
                await page.waitForTimeout(2000);
                composeArea = await findFlexible(page, ['div[contenteditable="true"]'], 8000);
            }
        }

        if (!composeArea) throw new Error('Compose area not found');

        console.log('[5] Entering text...');
        await composeArea.click();
        await page.waitForTimeout(500);
        await page.evaluate(({ element, text }) => {
            element.focus();
            document.execCommand('insertText', false, text);
        }, { element: composeArea, text });
        await page.waitForTimeout(1000);

        console.log('[6] Clicking post button...');
        const postBtn = await findFlexible(page, ['div:has-text("Post")', 'button:has-text("Post")'], 5000);

        if (postBtn) {
            await postBtn.click();
        } else {
            console.warn('Post button not found, trying CTRL+Enter');
            await composeArea.press('Control+Enter');
        }

        await page.waitForTimeout(3000);
        await saveCookies(context);

        console.log('SUCCESS');
        return NextResponse.json(
            { success: true, message: 'Posted to Threads', data: { text } },
            { headers: corsHeaders() }
        );

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Unknown Error' },
            { status: 500, headers: corsHeaders() }
        );
    } finally {
        if (browser) await browser.close();
    }
}
