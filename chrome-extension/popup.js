// popup.js - Messaging Logic

document.addEventListener('DOMContentLoaded', () => {
    const newDraftInput = document.getElementById('newDraft');
    const saveBtn = document.getElementById('saveBtn');
    const listContainer = document.getElementById('listContainer');

    // Startup
    loadDrafts();

    // Save
    saveBtn.addEventListener('click', () => {
        const text = newDraftInput.value.trim();
        if (!text) return;

        getDrafts((drafts) => {
            drafts.unshift({ id: Date.now(), text: text });
            saveDrafts(drafts, () => {
                newDraftInput.value = '';
                renderList(drafts);
            });
        });
    });

    // --- Storage ---
    function getDrafts(cb) {
        chrome.storage.local.get(['drafts'], (res) => cb(res.drafts || []));
    }
    function saveDrafts(data, cb) {
        chrome.storage.local.set({ drafts: data }, cb);
    }

    // --- Render ---
    function loadDrafts() {
        getDrafts(renderList);
    }

    function renderList(drafts) {
        listContainer.innerHTML = '';
        if (drafts.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No drafts yet.</div>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'draft-list';

        drafts.forEach(draft => {
            const li = document.createElement('li');
            li.className = 'draft-item';

            const txt = document.createElement('div');
            txt.className = 'draft-text';
            txt.textContent = draft.text;

            const actions = document.createElement('div');
            actions.className = 'actions';

            const setBtn = document.createElement('button');
            setBtn.className = 'set-btn';
            setBtn.textContent = 'SET to Threads';
            setBtn.onclick = () => sendToThreads(draft.text);

            const delBtn = document.createElement('button');
            delBtn.className = 'del-btn';
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => deleteDraft(draft.id);

            actions.appendChild(setBtn);
            actions.appendChild(delBtn);

            li.appendChild(txt);
            li.appendChild(actions);
            ul.appendChild(li);
        });

        listContainer.appendChild(ul);
    }

    function deleteDraft(id) {
        getDrafts((drafts) => {
            const updated = drafts.filter(d => d.id !== id);
            saveDrafts(updated, () => renderList(updated));
        });
    }

    // --- Core Logic ---
    function sendToThreads(text) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].id) return;

            // Send message to content.js
            chrome.tabs.sendMessage(tabs[0].id, { action: "insertText", text: text }, (response) => {
                // If content script is not ready (e.g. extension just reloaded but page wasn't),
                // we might need to inject it physically via executeScript as fallback.
                if (chrome.runtime.lastError) {
                    // Fallback: Inject manually if message fails (Robustness!)
                    console.log("Message failed, trying injection fallback...");
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['content.js']
                    }, () => {
                        // Retry message after injection
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabs[0].id, { action: "insertText", text: text });
                        }, 200);
                    });
                }
            });
        });
    }
});
