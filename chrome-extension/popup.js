// popup.js - Messaging Logic

document.addEventListener('DOMContentLoaded', () => {
    const newDraftInput = document.getElementById('newDraft');
    const saveBtn = document.getElementById('saveBtn');
    const listContainer = document.getElementById('listContainer');

    // Startup
    loadDrafts();

    // Save
    saveBtn.addEventListener('click', () => {
        const inputVal = newDraftInput.value.trim();
        if (!inputVal) return;

        let text = inputVal;
        let scheduledTime = null;

        // JSON Parsing Logic
        try {
            if (inputVal.startsWith('{') && inputVal.includes('threads-shokunin-data')) {
                const data = JSON.parse(inputVal);
                text = data.text;
                scheduledTime = data.scheduledTime;
            }
        } catch (e) {
            // console.log("Not JSON, treating as plain text");
        }

        getDrafts((drafts) => {
            drafts.unshift({
                id: Date.now(),
                text: text,
                scheduledTime: scheduledTime
            });
            saveDrafts(drafts, () => {
                newDraftInput.value = '';
                renderList(drafts);
            });
        });
    });

    // ... (Storage logic remains same)

    function renderList(drafts) {
        listContainer.innerHTML = '';
        if (drafts.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No drafts. Paste JSON from Dashboard.</div>';
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

            // Show Time Tag if exists
            if (draft.scheduledTime) {
                const timeTag = document.createElement('div');
                timeTag.style.fontSize = '11px';
                timeTag.style.color = '#d00';
                timeTag.style.fontWeight = 'bold';
                timeTag.textContent = `📅 ${draft.scheduledTime}`;
                li.appendChild(timeTag);
            }

            const actions = document.createElement('div');
            actions.className = 'actions';

            const setBtn = document.createElement('button');
            setBtn.className = 'set-btn';
            setBtn.textContent = 'SET to Threads';
            setBtn.onclick = () => sendToThreads(draft); // Send object

            const delBtn = document.createElement('button');
            // ... (delBtn logic same)
            delBtn.className = 'del-btn';
            delBtn.textContent = 'Del';
            delBtn.onclick = () => deleteDraft(draft.id);

            actions.appendChild(setBtn);
            // ...
            actions.appendChild(delBtn);

            li.appendChild(txt);
            li.appendChild(actions);
            ul.appendChild(li);
        });

        listContainer.appendChild(ul);
    }

    // ... deleteDraft ...

    // --- Core Logic ---
    function sendToThreads(draft) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].id) return;

            // Send FULL draft object
            const payload = {
                action: "insertText",
                text: draft.text,
                scheduledTime: draft.scheduledTime
            };

            chrome.tabs.sendMessage(tabs[0].id, payload, (response) => {
                // ... (Fallback logic same)
                if (chrome.runtime.lastError) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['content.js']
                    }, () => {
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabs[0].id, payload);
                        }, 200);
                    });
                }
            });
        });
    }
    // --- Storage Helpers ---
    function getDrafts(cb) {
        chrome.storage.local.get(['drafts'], (res) => cb(res.drafts || []));
    }
    function saveDrafts(data, cb) {
        chrome.storage.local.set({ drafts: data }, cb);
    }
    function loadDrafts() {
        getDrafts(renderList);
    }
    function deleteDraft(id) {
        getDrafts((drafts) => {
            const updated = drafts.filter(d => d.id !== id);
            saveDrafts(updated, () => renderList(updated));
        });
    }

});
