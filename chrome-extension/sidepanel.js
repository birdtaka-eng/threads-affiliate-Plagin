// sidepanel.js - Threads職人 ロジック (Japanese)
// Version 3.2: Explicit Tab ID Relay

document.addEventListener('DOMContentLoaded', () => {
    const newDraftInput = document.getElementById('newDraft');
    const saveBtn = document.getElementById('saveBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const listContainer = document.getElementById('listContainer');
    const clipBtn = document.getElementById('clipBtn');

    // 初期ロード
    loadDrafts();

    // ---------------------------------------------------------
    // イベントリスナー
    // ---------------------------------------------------------
    saveBtn.addEventListener('click', handleImport);
    if (clipBtn) clipBtn.addEventListener('click', handleClip);

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

    function handleClip() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;

            let action = "";
            if (tab.url.includes("instagram.com")) {
                action = "extract_instagram";
            } else if (tab.url.includes("threads.net")) {
                action = "scrapePost";
            } else {
                alert("Instagram または Threads の投稿ページを開いてください。");
                return;
            }

            clipBtn.disabled = true;
            clipBtn.innerText = "⏳ 保存中...";

            chrome.tabs.sendMessage(tab.id, { action: action }, (response) => {
                if (chrome.runtime.lastError || !response) {
                    console.error("Clip Error:", chrome.runtime.lastError);
                    alert("スクレイピングに失敗しました。ページを更新して再試行してください。");
                    resetClipBtn();
                    return;
                }

                // Send to GAS
                sendToGAS(response, (res) => {
                    if (res && res.status === "success") {
                        alert("ボードに保存しました！");
                    } else {
                        alert("保存失敗: " + (res ? res.message : "接続エラー"));
                    }
                    resetClipBtn();
                });
            });
        });
    }

    function resetClipBtn() {
        clipBtn.disabled = false;
        clipBtn.innerHTML = "<span>📸</span> クリップ (ボードへ保存)";
    }

    function sendToGAS(data, cb) {
        chrome.storage.local.get(['gasUrl'], (res) => {
            let url = res.gasUrl;
            if (!url) {
                url = prompt("GASのウェブアプリURLを入力してください：");
                if (url) {
                    chrome.storage.local.set({ gasUrl: url });
                } else {
                    cb(null);
                    return;
                }
            }

            fetch(url, {
                method: 'POST',
                body: JSON.stringify({ action: 'clip_instagram', data: data })
            })
                .then(r => r.json())
                .then(json => cb(json))
                .catch(err => {
                    console.error("GAS Error:", err);
                    cb({ status: "error", message: err.message });
                });
        });
    }

    // ---------------------------------------------------------
    // メッセージ送信ロジック (v3.2 Explicit Targeting)
    // ---------------------------------------------------------
    function sendToThreads(draft) {
        // v3.2: 確実に狙い撃つ
        // SidePanel側で「今アクティブなタブ」のIDを確定させてから、
        // Backgroundに「このIDのタブに送ってくれ」と依頼する。
        // これで「どのウィンドウか分からない」問題を回避する。

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];

            if (!currentTab) {
                alert("アクティブなタブが見つかりません。");
                return;
            }

            // URLチェック (ガード)
            if (currentTab.url && !currentTab.url.includes("threads.net")) {
                if (!confirm("現在開いているタブは Threads (threads.net) ではありません。\n構わずこのタブに送信しますか？")) {
                    return;
                }
            }

            console.log("[SidePanel] Targeting Tab ID:", currentTab.id);

            // バックグラウンドに「ID指定」で依頼
            chrome.runtime.sendMessage({
                action: "relayInsertText",
                text: draft.text,
                targetTabId: currentTab.id // <--- ここでIDを指定してあげる
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("[SidePanel] Relay failed:", chrome.runtime.lastError.message);
                    alert("送信エラー: " + chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    console.log("[SidePanel] Relay success!");
                } else {
                    console.warn("[SidePanel] Relay returned error:", response ? response.error : "Unknown");
                    alert("送信できませんでした: " + (response ? response.error : "Unknown Error"));
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
