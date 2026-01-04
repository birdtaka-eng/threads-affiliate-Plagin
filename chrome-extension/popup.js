// popup.js - Threads職人 ロジック (Japanese)
// Version 4.2: Clean Direct Injection (No Alerts)

document.addEventListener('DOMContentLoaded', () => {
    const newDraftInput = document.getElementById('newDraft');
    const saveBtn = document.getElementById('saveBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const listContainer = document.getElementById('listContainer');

    // 初期ロード
    loadDrafts();

    // ---------------------------------------------------------
    // イベントリスナー
    // ---------------------------------------------------------
    saveBtn.addEventListener('click', handleImport);

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('投稿キューを全て削除しますか？')) {
                saveDrafts([], renderList);
            }
        });
    }

    // ---------------------------------------------------------
    // ロジック
    // ---------------------------------------------------------
    function handleImport() {
        const inputVal = newDraftInput.value.trim();
        if (!inputVal) return;

        let newItems = [];

        try {
            let cleaned = inputVal.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/```$/g, '');
            cleaned = cleaned.trim();

            if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
                const parsed = JSON.parse(cleaned);
                let rawList = Array.isArray(parsed) ? parsed : [parsed];

                newItems = rawList.map(item => ({
                    id: Date.now() + Math.random(),
                    text: item.text || item.body || item.content || "",
                    scheduledTime: item.scheduledTime || null,
                    category: item.category || ""
                })).filter(i => i.text);

            } else {
                throw new Error("Not JSON");
            }
        } catch (e) {
            console.warn("JSON Parse Failed, treating as raw text:", e);
            newItems.push({
                id: Date.now(),
                text: inputVal,
                category: ""
            });
        }

        if (newItems.length > 0) {
            getDrafts((currentDrafts) => {
                const updated = [...newItems, ...currentDrafts];
                saveDrafts(updated, () => {
                    newDraftInput.value = '';
                    renderList(updated);
                });
            });
        }
    }

    // ---------------------------------------------------------
    // メッセージ送信ロジック (v4.2 Clean)
    // ---------------------------------------------------------
    function sendToThreads(draft) {
        // v4.2: ガード除去
        // ユーザーが「Threadsを見ている」ことを信頼し、無条件で送信する。
        // これで誤判定によるアラートは出ない。

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];

            if (!currentTab) {
                // ここだけは技術的に送れないのでアラート
                alert("アクティブなタブが見つかりません。");
                return;
            }

            console.log("[Popup] Sending to Tab ID:", currentTab.id);

            const payload = {
                action: "insertText",
                text: draft.text
            };

            chrome.tabs.sendMessage(currentTab.id, payload, (response) => {
                const lastError = chrome.runtime.lastError;

                if (lastError) {
                    console.log("Content script error (injecting...):", lastError.message);

                    // スクリプト注入の試行 (許可されている範囲で)
                    chrome.scripting.executeScript({
                        target: { tabId: currentTab.id },
                        files: ['content.js']
                    }, () => {
                        setTimeout(() => {
                            chrome.tabs.sendMessage(currentTab.id, payload);
                        }, 200);
                    });
                } else {
                    console.log("[Popup] Success!", response);
                }
            });
        });
    }

    // ---------------------------------------------------------
    // ストレージ & レンダリング
    // ---------------------------------------------------------
    function getDrafts(cb) {
        chrome.storage.local.get(['drafts'], (res) => cb(res.drafts || []));
    }

    function saveDrafts(data, cb) {
        chrome.storage.local.set({ drafts: data }, () => {
            if (cb) cb(data);
        });
    }

    function loadDrafts() {
        getDrafts(renderList);
    }

    function deleteDraft(id) {
        getDrafts((drafts) => {
            const updated = drafts.filter(d => d.id !== id);
            saveDrafts(updated, renderList);
        });
    }

    function renderList(drafts) {
        listContainer.innerHTML = '';

        if (!drafts || drafts.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    予約リストは空です。<br>
                    上にJSONを貼り付けてインポートしてください。
                </div>`;
            return;
        }

        const ul = document.createElement('div');

        drafts.forEach((draft, index) => {
            const item = document.createElement('div');
            item.className = 'draft-item';

            if (index === 0) {
                item.style.borderColor = '#0095f6';
                item.style.background = '#f0f9ff';
            }

            let metaHtml = '';
            if (draft.scheduledTime) {
                const d = new Date(draft.scheduledTime);
                const timeDisp = isNaN(d) ? draft.scheduledTime :
                    d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                metaHtml += `<div class="time-tag">📅 ${timeDisp}</div>`;
            }
            if (draft.category) {
                metaHtml += `<div class="cat-tag">${draft.category}</div>`;
            }

            if (metaHtml) {
                const metaRow = document.createElement('div');
                metaRow.className = 'meta-row';
                metaRow.innerHTML = metaHtml;
                item.appendChild(metaRow);
            }

            const txt = document.createElement('div');
            txt.className = 'draft-text';
            txt.textContent = draft.text;
            item.appendChild(txt);

            const actions = document.createElement('div');
            actions.className = 'actions';

            const setBtn = document.createElement('button');
            setBtn.className = 'set-btn';
            setBtn.innerHTML = 'セット <span style="opacity:0.6;font-size:10px;">▶</span>';
            setBtn.onclick = () => sendToThreads(draft);

            const delBtn = document.createElement('button');
            delBtn.className = 'del-btn';
            delBtn.textContent = '✕';
            delBtn.onclick = () => deleteDraft(draft.id);

            actions.appendChild(setBtn);
            actions.appendChild(delBtn);

            item.appendChild(actions);
            ul.appendChild(item);
        });

        listContainer.appendChild(ul);
    }
});
