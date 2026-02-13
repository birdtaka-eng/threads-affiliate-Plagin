// gemini.js - Simple Auto Paste
// Restored to single-image functionality

(async function () {
    if (!window.location.hash.includes('auto_paste')) return;

    console.log("[Threads職人] Auto-Paste Mode");

    // Try to find the editor
    const editor = await waitForEditor();

    if (editor) {
        console.log("[Threads職人] Editor found. Pasting...");
        await new Promise(r => setTimeout(r, 800)); // Short wait for focus
        editor.focus();

        // Simple paste command
        const success = document.execCommand('paste');

        if (!success) {
            console.warn("[Threads職人] Auto-paste failed. Showing button.");
            showFallbackButton(editor);
        }
    } else {
        console.warn("[Threads職人] Editor not found.");
        showFallbackButton(null);
    }
})();

function showFallbackButton(editor) {
    if (document.getElementById('threads-paste-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'threads-paste-btn'; // Added ID for consistency
    btn.innerText = "📋 未完了 (ここをクリック)";
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        zIndex: '9999',
        padding: '10px 20px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold'
    });

    btn.onclick = () => {
        if (editor) editor.focus();
        document.execCommand('paste');
        btn.remove();
    };

    document.body.appendChild(btn);
}

async function waitForEditor(retryCount = 20) {
    const selectors = [
        'div[contenteditable="true"]',
        'div[role="textbox"]',
        'textarea'
    ];

    for (let i = 0; i < retryCount; i++) {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}
