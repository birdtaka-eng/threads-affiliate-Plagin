// sidepanel.js - Threads職人 ロジック (Japanese)

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
            // 1. マークダウンコードブロックの除去 (誤ってコピペした場合の対策)
            let cleaned = inputVal.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/```$/g, '');
            cleaned = cleaned.trim();

            // 2. JSONパースの試行
            if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
                const parsed = JSON.parse(cleaned);

                let rawList = Array.isArray(parsed) ? parsed : [parsed];

                // データの正規化
                newItems = rawList.map(item => ({
                    id: Date.now() + Math.random(),
                    text: item.text || item.body || item.content || "", // 揺らぎ吸収
                    scheduledTime: item.scheduledTime || item.scheduled_at || item.start || null,
                    category: item.category || ""
                })).filter(i => i.text); // テキストが無いものは除外

            } else {
                throw new Error("Not JSON");
            }
        } catch (e) {
            console.warn("JSON Parse Failed, treating as raw text:", e);
            // JSONでない場合はそのまま1つの投稿として扱う
            newItems.push({
                id: Date.now(),
                text: inputVal,
                scheduledTime: null,
                category: ""
            });
        }

        if (newItems.length > 0) {
            getDrafts((currentDrafts) => {
                // 新しいものを上に追加 (Queue)
                const updated = [...newItems, ...currentDrafts];
                saveDrafts(updated, () => {
                    newDraftInput.value = ''; // 入力欄クリア
                    renderList(updated);
                });
            });
        }
    }

    function sendToThreads(draft) {
        // 現在のアクティブなタブ(Threads)を探す
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.url.includes("threads.net")) {
                alert("Threadsのタブを開いてから実行してください。");
                return;
            }

            const payload = {
                action: "insertText",
                text: draft.text,
                scheduledTime: draft.scheduledTime
            };

            // メッセージ送信
            chrome.tabs.sendMessage(tab.id, payload, (response) => {
                if (chrome.runtime.lastError) {
                    // Content Scriptがロードされていない場合(リロード直後や初回)
                    // Scripting APIで注入してから再試行
                    console.log("Injecting content script...");
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, () => {
                        // 少し待ってから再送信
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, payload);
                        }, 200);
                    });
                } else {
                    console.log("Message sent:", response);
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

            // 一番上のアイテムを目立たせる
            if (index === 0) {
                item.style.borderColor = '#0095f6';
                item.style.background = '#f0f9ff';
            }

            // メタ情報 (日時・カテゴリ)
            let metaHtml = '';
            // 日時フォーマット (簡易)
            let timeDisp = '';
            if (draft.scheduledTime) {
                const d = new Date(draft.scheduledTime);
                timeDisp = isNaN(d) ? draft.scheduledTime :
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

            // 本文
            const txt = document.createElement('div');
            txt.className = 'draft-text';
            txt.textContent = draft.text;
            item.appendChild(txt);

            // アクションボタン
            const actions = document.createElement('div');
            actions.className = 'actions';

            const setBtn = document.createElement('button');
            setBtn.className = 'set-btn';
            setBtn.innerHTML = 'セット <span style="opacity:0.6;font-size:10px;">▶</span>';
            setBtn.onclick = () => sendToThreads(draft);

            const delBtn = document.createElement('button');
            delBtn.className = 'del-btn';
            delBtn.textContent = '✕';
            delBtn.title = "削除";
            delBtn.onclick = () => deleteDraft(draft.id);

            actions.appendChild(setBtn);
            actions.appendChild(delBtn);

            item.appendChild(actions);
            ul.appendChild(item);
        });

        listContainer.appendChild(ul);
    }
});
