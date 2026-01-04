// sidepanel.js - Threads職人 ロジック (Japanese)
// Version 2.9: "Popup Style" Just-in-Time Active Tab Query

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
    // メッセージ送信ロジック (v2.9 Popup Style)
    // ---------------------------------------------------------
    function sendToThreads(draft) {
        // 【v2.9の変更点】
        // 「セット」ボタンが押された瞬間の「今、目の前にあるアクティブなタブ」を特定する。
        // これが最もポップアップの挙動に近い。
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];

            if (!tab) {
                alert("アクティブなタブが見つかりません。");
                return;
            }

            // 念のため、明らかにThreadsじゃない場合は警告（誤爆防止）
            // ポップアップ体験を重視するなら警告なしでも良いが、親切設計として残す
            if (tab.url && !tab.url.includes("threads.net")) {
                console.warn("[SidePanel] Active tab is not Threads:", tab.url);
                // ただし、ブロックはせず「とにかく送る」方針ならここをコメントアウトだが、
                // ユーザーは「目の前のタブを特定」と言っているので、違うサイトならユーザーのミス。
                // 軽くアラートだけ出す。
                if (!confirm("現在開いているタブはthreads.netではないようです。\n構わず送信しますか？")) {
                    return;
                }
            }

            console.log("[SidePanel] Sending to Active Tab:", tab.id, tab.title);

            const payload = {
                action: "insertText",
                text: draft.text
            };

            // メッセージ送信
            chrome.tabs.sendMessage(tab.id, payload, (response) => {
                const lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.log("Content Script not ready. Injecting...", lastError.message);

                    // スクリプト注入 (Content Scriptが死んでいる場合用)
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, () => {
                        // 注入後に再送信
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, payload);
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
