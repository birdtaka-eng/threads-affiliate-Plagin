// sidepanel.js - Threads職人 ロジック (Japanese)
// Version 2.8: Robust Communication

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
            // 1. マークダウンコードブロックの除去
            let cleaned = inputVal.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/```$/g, '');
            cleaned = cleaned.trim();

            // 2. JSONパースの試行
            if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
                const parsed = JSON.parse(cleaned);

                let rawList = Array.isArray(parsed) ? parsed : [parsed];

                newItems = rawList.map(item => ({
                    id: Date.now() + Math.random(),
                    text: item.text || item.body || item.content || "",
                    scheduledTime: item.scheduledTime || null, // 保持はするが送信ロジックでは無視
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
    // メッセージ送信ロジック (v2.8 Improved)
    // ---------------------------------------------------------
    function sendToThreads(draft) {
        // 1. 確実に Threads のタブを特定する
        // active:true だけでなく、URLも条件に加えて検索する
        chrome.tabs.query({ currentWindow: true, url: "*://www.threads.net/*" }, (tabs) => {
            // Threadsタブ群の中で、activeなものがあればそれを優先。
            // ユーザーがThreadsを見ながらサイドパネル操作している場合、該当するはず。
            // もしActiveがなければ（例えばユーザーが別タブ見ながらの場合）、最初のThreadsタブを使う。
            let targetTab = tabs.find(t => t.active) || tabs[0];

            if (!targetTab) {
                alert("このウィンドウに Threads (threads.net) のタブが見つかりません。");
                return;
            }

            console.log("[SidePanel] Target Tab found:", targetTab.id, targetTab.title);

            const payload = {
                action: "insertText",
                text: draft.text
                // scheduledTime は送信しない（自動化廃止）
            };

            // 2. メッセージ送信 (再試行ロジック付き)
            chrome.tabs.sendMessage(targetTab.id, payload, (response) => {
                const lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.log("Injecting content script due to error:", lastError.message);

                    // スクリプト注入
                    chrome.scripting.executeScript({
                        target: { tabId: targetTab.id },
                        files: ['content.js']
                    }, () => {
                        // 注入後に即再送信
                        setTimeout(() => {
                            chrome.tabs.sendMessage(targetTab.id, payload);
                        }, 200);
                    });
                } else {
                    console.log("[SidePanel] Message sent successfully!", response);
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
            // 日時表示はあくまで「メモ」として残す
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
