// sidepanel.js - Threads職人 ロジック (Japanese)
// Version 6.8.0: Clean Rewrite

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // UI Elements
    // ---------------------------------------------------------
    const listContainer = document.getElementById('listContainer');
    const imageGrid = document.getElementById('imageGrid');
    const countDisplay = document.getElementById('countDisplay');
    const statusDisplay = document.getElementById('statusDisplay');

    // Buttons
    const wakeUpBtn = document.getElementById('wakeUpBtn');
    const syncSettingsBtn = document.getElementById('syncSettingsBtn');
    const sendRulesBtn = document.getElementById('sendRulesBtn');
    const processProductBtn = document.getElementById('processProductBtn');
    const saveImagesBtn = document.getElementById('saveImagesBtn');
    const saveTextBtn = document.getElementById('saveTextBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Inputs
    const postContent = document.getElementById('postContent');
    const roomContent = document.getElementById('roomContent');

    // State
    let selectedUrls = [];

    // ---------------------------------------------------------
    // 初期化 (Initialization)
    // ---------------------------------------------------------
    handleScrapeImages(); // Auto-scan on load

    // ---------------------------------------------------------
    // イベントリスナー (Event Listeners)
    // ---------------------------------------------------------

    // 3 Genies System
    if (wakeUpBtn) wakeUpBtn.addEventListener('click', handleWakeUp);
    if (syncSettingsBtn) syncSettingsBtn.addEventListener('click', handleSyncSettings);
    if (sendRulesBtn) sendRulesBtn.addEventListener('click', handleSendRules);

    // まとめ用プロンプト送信ボタン
    const sendMatomeRulesBtn = document.getElementById('sendMatomeRulesBtn');
    if (sendMatomeRulesBtn) sendMatomeRulesBtn.addEventListener('click', handleSendMatomeRules);
    if (processProductBtn) processProductBtn.addEventListener('click', handleProcessProduct);

    // New: Fetch Images from Sheet
    const fetchSheetImagesBtn = document.getElementById('fetchSheetImagesBtn');
    if (fetchSheetImagesBtn) fetchSheetImagesBtn.addEventListener('click', handleFetchSheetImages);

    // New: Clear images button
    const clearImagesBtn = document.getElementById('clearImagesBtn');
    if (clearImagesBtn) clearImagesBtn.addEventListener('click', () => {
        selectedUrls = [];
        imageGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #ccc; font-size: 11px;">商品ページを開くか、シートから画像を読み込むとここに出ます</div>';
        updateUI();
        updateStatus('🗑️ 写真をクリアしました', 'blue');
    });

    // Save Actions (Split v6.8.0)
    if (saveImagesBtn) saveImagesBtn.addEventListener('click', handleSaveImages);
    if (saveTextBtn) saveTextBtn.addEventListener('click', handleSaveText);

    // Settings
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("GASのURL設定をクリアしますか？\n(次回保存時に再入力が必要になります)")) {
                chrome.storage.local.remove(['gasUrl'], () => {
                    alert("設定をリセットしました。");
                });
            }
        });
    }

    // Tab Updates (Auto-Rescrape)
    chrome.tabs.onActivated.addListener(() => {
        handleScrapeImages();
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.active) {
            handleScrapeImages();
        }
    });

    // Gemini Result Listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "result_received") {
            console.log("Gemini finished:", request.persona);
            updateStatus(`✅ ${request.persona} の執筆が完了しました！`, "green");

            if (request.html) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = request.html;
                let generatedText = tempDiv.innerText.trim();

                if (postContent) {
                    if (postContent.value.length === 0) {
                        postContent.value = generatedText;
                    } else {
                        postContent.value += "\n\n" + generatedText;
                    }
                }
            }
        }
    });

    // ---------------------------------------------------------
    // scraping Logic
    // ---------------------------------------------------------
    function handleScrapeImages() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;

            // ★ Smart Scrape: Ignore Threads to preserve Rakuten Data
            if (tab.url.includes("threads.net")) {
                console.log("Threads detected: Keeping previous product data.");
                return;
            }

            // Reset Selection on new scrape (if not Threads)
            selectedUrls = [];
            updateUI();

            let action = "general_extract";
            if (tab.url.includes("instagram.com")) action = "extract_instagram";
            else if (tab.url.includes("rakuten.co.jp") || tab.url.includes("rakuten.ne.jp")) action = "extract_rakuten";

            chrome.tabs.sendMessage(tab.id, { action: action }, (response) => {
                if (chrome.runtime.lastError) {
                    // console.log("Scrape Msg Error:", chrome.runtime.lastError);
                    if (imageGrid) imageGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #999; font-size:11px;">画像の取得に失敗しました<br>ページを更新してください</div>';
                    return;
                }
                const images = response ? (response.imageUrls || response.images || []) : [];
                renderScrapedData(images);
            });
        });
    }

    function renderScrapedData(images) {
        if (!imageGrid) return;

        if (images.length === 0) {
            imageGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align: center; color: #999; font-size:11px;">画像が見つかりませんでした</div>';
            return;
        }

        imageGrid.innerHTML = ""; // Clear

        images.forEach((url) => {
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

    function handleSelection(url, isChecked, element) {
        if (isChecked) {
            if (selectedUrls.length >= 6) {
                alert("画像は最大6枚までです。");
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
        if (countDisplay) countDisplay.innerText = `${selectedUrls.length} / 6`;
    }

    function updateStatus(msg, color) {
        if (statusDisplay) {
            statusDisplay.textContent = msg;
            statusDisplay.style.color = color || "#666";
        }
    }

    // ---------------------------------------------------------
    // 3 Genies Handlers
    // ---------------------------------------------------------

    async function handleFetchSheetImages() {
        updateStatus('📊 シートから画像URLを取得中...', 'blue');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) {
                updateStatus('❌ アクティブなタブが見つかりません', 'red');
                return;
            }

            if (!tab.url || !tab.url.includes('docs.google.com/spreadsheets')) {
                updateStatus('⚠️ Googleスプレッドシートを開いてから押してください', 'red');
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: 'extract_sheets_images' }, (response) => {
                if (chrome.runtime.lastError) {
                    updateStatus('❌ 通信エラー: ' + chrome.runtime.lastError.message, 'red');
                    return;
                }

                const urls = response ? (response.imageUrls || []) : [];

                if (urls.length === 0) {
                    updateStatus('⚠️ セルをクリックしてからボタンを押してください', 'red');
                    return;
                }

                // 追記モード: 既存のselectedUrlsに追加（重複・6枚超禁止）
                let added = 0;
                urls.forEach(url => {
                    if (!selectedUrls.includes(url) && selectedUrls.length < 6) {
                        selectedUrls.push(url);
                        added++;
                    }
                });

                if (added === 0) {
                    if (selectedUrls.length >= 6) {
                        updateStatus('⚠️ 6枚上限に達しています。🗑️でクリアしてください', 'red');
                    } else {
                        updateStatus('⚠️ 同じ画像はすでに追加済みです', 'red');
                    }
                    return;
                }

                renderScrapedData(selectedUrls);

                const checkboxes = imageGrid.querySelectorAll('input[type="checkbox"]');
                const items = imageGrid.querySelectorAll('.img-item');
                checkboxes.forEach((cb) => cb.checked = true);
                items.forEach((item) => item.classList.add('selected'));

                updateUI();
                updateStatus(`📸 ${selectedUrls.length}/6枚 (+${added}枚追加)`, 'green');
            });
        });
    }

    function handleSyncSettings() {
        updateStatus("🔄 スプレッドシートから設定を同期中...", "blue");
        chrome.storage.local.get(['gasUrl'], (res) => {
            let url = res.gasUrl;
            if (!url) {
                alert("未設定: まず画像を保存等をしてGASのURLを設定してください");
                updateStatus("❌ 同期失敗: URL未設定", "red");
                return;
            }

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "getSettings" })
            })
                .then(response => response.json())
                .then(json => {
                    if (json.status === "success" && json.geminiSetupPrompt) {
                        chrome.storage.local.set({ unifiedPrompt: json.geminiSetupPrompt }, () => {
                            updateStatus("✨ プロンプトの同期が完了しました！", "green");
                        });
                    } else {
                        updateStatus("❌ 同期失敗: データが見つかりません", "red");
                    }
                })
                .catch(err => {
                    console.error("Settings Sync Error:", err);
                    updateStatus("❌ 通信エラー: " + err.message, "red");
                });
        });
    }
    function handleWakeUp() {
        updateStatus("💤 3姉妹を呼びに行っています...", "blue");
        chrome.runtime.sendMessage({ action: "wake_up_gems" }, (res) => {
            if (chrome.runtime.lastError) {
                updateStatus("❌ 通信エラー: " + chrome.runtime.lastError.message, "red");
                return;
            }
            if (res && res.success) {
                updateStatus("🌞 3姉妹が起きました！準備ができたら②を押してください。", "green");
            } else {
                updateStatus("❌ 起動失敗: " + (res ? res.error : "Unknown"), "red");
            }
        });
    }

    function handleSendRules() {
        updateStatus('🦄 プロンプトを送信中...', 'blue');
        chrome.runtime.sendMessage({ action: 'broadcast_rules' }, (res) => {
            if (chrome.runtime.lastError) {
                updateStatus('❌ 通信エラー: ' + chrome.runtime.lastError.message, 'red');
                return;
            }
            if (res && res.success) {
                updateStatus('✨ 準備完了の指令を出しました！タブを確認してください。', 'green');
            } else {
                updateStatus('❌ 送信失敗: ' + (res ? res.error : 'Unknown'), 'red');
            }
        });
    }

    function handleSendMatomeRules() {
        updateStatus('📋 まとめ用プロンプトを送信中...', 'blue');
        chrome.runtime.sendMessage({ action: 'broadcast_matome_rules' }, (res) => {
            if (chrome.runtime.lastError) {
                updateStatus('❌ 通信エラー: ' + chrome.runtime.lastError.message, 'red');
                return;
            }
            if (res && res.success) {
                updateStatus('✨ まとめ用の準備完了！次は写真を読み込んでⅠ…②へ。', 'green');
            } else {
                updateStatus('❌ 送信失敗: ' + (res ? res.error : 'Unknown'), 'red');
            }
        });
    }

    function handleProcessProduct() {
        updateStatus("🔍 商品情報を取得中...", "blue");

        // 1. Get Product Info from Active Tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];

            // If we have selected images from the sheet, skip the Rakuten check
            if (selectedUrls.length > 0 && (!tab || !tab.url.includes("rakuten.co.jp"))) {
                // Use sheet images directly without scraping the current page
                const data = {
                    url: tab ? tab.url : "sheet",
                    title: "シートから選択した画像",
                    imageUrls: selectedUrls
                };
                chrome.runtime.sendMessage({ action: "distribute_product", payload: data }, (res) => {
                    if (chrome.runtime.lastError) {
                        updateStatus("❌ 通信エラー: " + chrome.runtime.lastError.message, "red");
                        return;
                    }
                    if (res && res.success) {
                        updateStatus("✅ Geminiに送りました！", "green");
                    } else {
                        updateStatus("❌ 送信失敗: " + (res ? res.error : "Unknown"), "red");
                    }
                });
                return;
            }

            if (!tab || !tab.url.includes("rakuten.co.jp")) {
                alert("楽天の商品ページを開くか、シートから画像を選択してから押してください。");
                updateStatus("❌ 楽天ページまたはシート画像が必要です", "red");
                return;
            }

            // Execute script to get title/images (fallback)
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: getProductData
            }, (results) => {
                if (!results || !results[0] || !results[0].result) {
                    updateStatus("❌ 商品情報の取得に失敗", "red");
                    return;
                }

                const data = results[0].result;
                data.url = tab.url;

                // ★ Use Selected Images if available
                if (selectedUrls.length > 0) {
                    data.imageUrls = selectedUrls;
                }

                updateStatus("🎁 3姉妹に商品を渡し、ボードに保存中...", "blue");

                // 2. Send to Background (Gemini)
                chrome.runtime.sendMessage({
                    action: "distribute_product",
                    payload: data
                }, (res) => {
                    if (chrome.runtime.lastError) {
                        updateStatus("❌ 通信エラー: " + chrome.runtime.lastError.message, "red");
                        return;
                    }

                    if (res && res.success) {
                        updateStatus("✨ 執筆開始！ (ボード保存も進行中...)", "green");
                    } else {
                        updateStatus("❌ 送信失敗: " + (res ? res.error : "Unknown"), "red");
                    }
                });
            });
        });
    }

    function getProductData() {
        // Simple scraper for Rakuten
        const title = document.title;
        // Images (Priority: Main Image -> Swiper -> og:image)
        let images = [];
        // Rakuten specific selectors
        const mainImg = document.querySelector('.main-image img, #rakutenLimitedId_cart_main_image img');
        if (mainImg) images.push(mainImg.src);

        return {
            title: title,
            imageUrls: images
        };
    }

    // ---------------------------------------------------------
    // Save Handlers (GAS)
    // ---------------------------------------------------------
    function sendToGAS(data, cb) {
        chrome.storage.local.get(['gasUrl'], (res) => {
            let url = res.gasUrl;
            if (!url) {
                // If no URL, prompt User
                url = prompt("GASのウェブアプリURLを入力してください：\n(デプロイIDが変わった場合はここに入力)");
                if (url) {
                    // Start with cleanup if user pastes full HTML or weird text? 
                    // No, assume they paste URL.
                    chrome.storage.local.set({ gasUrl: url });
                } else {
                    cb({ status: "error", message: "URL未設定" });
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

    function handleSaveImages() {
        if (!selectedUrls || selectedUrls.length === 0) {
            alert("画像が選択されていません。保存したい画像をタップして選択してください。");
            return;
        }

        if (saveImagesBtn) { saveImagesBtn.disabled = true; saveImagesBtn.innerText = "⏳ 保存中..."; }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const data = {
                action: 'save_images',
                imageUrls: selectedUrls,
                url: tab ? tab.url : ""
            };

            sendToGAS(data, (res) => {
                if (res && res.status === "success") {
                    alert("画像を保存しました！");
                    selectedUrls = []; // Clear selection
                    updateUI();
                } else {
                    alert("保存失敗: " + (res ? res.message : "接続エラー"));
                }
                if (saveImagesBtn) { saveImagesBtn.disabled = false; saveImagesBtn.innerHTML = "<span>📸</span> 画像を保存 (新規行)"; }
            });
        });
    }

    function handleSaveText() {
        const tText = postContent ? postContent.value : "";
        const rText = roomContent ? roomContent.value : "";

        if (!tText && !rText) {
            alert("保存する文章がありません。Threads用またはROOM用にテキストを入力してください。");
            return;
        }

        if (saveTextBtn) { saveTextBtn.disabled = true; saveTextBtn.innerText = "⏳ 保存中..."; }

        const data = {
            action: 'save_text',
            threadsText: tText,
            roomText: rText
        };

        sendToGAS(data, (res) => {
            if (res && res.status === "success") {
                alert("文章を保存しました！");
                if (postContent) postContent.value = "";
                if (roomContent) roomContent.value = "";
            } else {
                alert("保存失敗: " + (res ? res.message : "接続エラー"));
            }
            if (saveTextBtn) { saveTextBtn.disabled = false; saveTextBtn.innerHTML = "<span>📝</span> 文章を保存 (新規行)"; }
        });
    }

});
