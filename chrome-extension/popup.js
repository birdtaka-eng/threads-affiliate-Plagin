// popup.js - Threads職人 Pro (Zero-based reconstruction)
// Version 5.3: Manual Image Selection & GAS Integration

document.addEventListener('DOMContentLoaded', () => {
    const platformDisplay = document.getElementById('platformDisplay');
    const imageGrid = document.getElementById('imageGrid');
    const countDisplay = document.getElementById('countDisplay');
    const saveBtn = document.getElementById('saveBtn');

    let selectedUrls = [];

    // 1. アクティブタブの情報を取得して解析を開始
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;

        let action = "";
        let platformName = "不明なページ";

        if (tab.url.includes("instagram.com")) {
            action = "extract_instagram";
            platformName = "Instagram";
        } else if (tab.url.includes("threads.net")) {
            action = "scrapePost";
            platformName = "Threads";
        } else if (tab.url.includes("rakuten.co.jp") || tab.url.includes("rakuten.ne.jp")) {
            action = "extract_rakuten";
            platformName = "楽天";
        } else {
            action = "general_extract";
            platformName = "その他サイト";
        }

        platformDisplay.innerText = platformName;

        // 解析依頼
        chrome.tabs.sendMessage(tab.id, { action: action }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Scraping Error:", chrome.runtime.lastError);
                imageGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #f44;">接続エラー：ページを更新してください。</div>';
                return;
            }

            const images = response ? (response.imageUrls || response.images || []) : [];
            renderScrapedData(images);
        });
    });

    // 2. 画像一覧の描画
    function renderScrapedData(images) {
        if (images.length === 0) {
            imageGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #999;">画像が見つかりませんでした。</div>';
            return;
        }

        imageGrid.innerHTML = ""; // クリア

        images.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'img-item';

            const img = document.createElement('img');
            img.src = url;

            img.onerror = () => { item.style.display = 'none'; };

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';

            item.appendChild(img);
            item.appendChild(checkbox);
            imageGrid.appendChild(item);

            item.onclick = (e) => {
                if (e.target.tagName !== 'INPUT') {
                    checkbox.checked = !checkbox.checked;
                }
                handleSelection(url, checkbox.checked, item);
            };
        });
    }

    // 3. 選択管理 (最大3枚)
    function handleSelection(url, isChecked, element) {
        if (isChecked) {
            if (selectedUrls.length >= 3) {
                alert("画像は最大3枚までです。");
                element.querySelector('input').checked = false;
                return;
            }
            if (!selectedUrls.includes(url)) {
                selectedUrls.push(url);
                element.classList.add('selected');
            }
        } else {
            selectedUrls = selectedUrls.filter(u => u !== url);
            element.classList.remove('selected');
        }

        updateUI();
    }

    function updateUI() {
        countDisplay.innerText = `${selectedUrls.length} / 3`;
        saveBtn.disabled = (selectedUrls.length === 0);
        if (selectedUrls.length > 0) {
            saveBtn.innerText = `🚀 ${selectedUrls.length}枚をボードへ保存`;
        } else {
            saveBtn.innerText = `🚀 ボードへ保存`;
        }
    }

    // 4. 保存実行 (GAS連携)
    saveBtn.onclick = () => {
        saveBtn.disabled = true;
        saveBtn.innerText = "⏳ 保存中...";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const data = {
                url: tab.url,
                imageUrls: selectedUrls,
                text: "" // 本文抽出は行わない（指示に基づき空にする）
            };

            sendToGAS(data, (res) => {
                if (res && res.status === "success") {
                    alert("ボードに保存しました！");
                    window.close(); // 保存成功したら閉じる
                } else {
                    alert("保存失敗: " + (res ? res.message : "接続エラー"));
                    saveBtn.disabled = false;
                    updateUI();
                }
            });
        });
    };

    // 5. 設定リセット
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
        resetBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm("GASのURL設定を削除して、再入力できるようにしますか？")) {
                chrome.storage.local.remove('gasUrl', () => {
                    alert("設定をリセットしました。\nもう一度「ボードへ保存」ボタンを押すと、URLの入力が求められます。");
                    location.reload();
                });
            }
        };
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
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify({ action: 'clip_instagram', data: data })
            })
                .then(response => {
                    return response.text().then(text => {
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            console.error('Raw GAS Response:', text);
                            let errorHint = text.substring(0, 100);
                            if (text.includes('<title>')) {
                                const titleMatch = text.match(/<title>(.*?)<\/title>/);
                                if (titleMatch) errorHint = "GASエラー: " + titleMatch[1];
                            }
                            throw new Error("JSONパース失敗 (" + errorHint + ")");
                        }
                    });
                })
                .then(json => cb(json))
                .catch(err => {
                    console.error("GAS Error:", err);
                    cb({ status: "error", message: err.message });
                });
        });
    }
});
