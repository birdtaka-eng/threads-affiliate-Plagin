# 🤖 Threads職人: Master Sheet Layout Reference

> [!IMPORTANT]
> **This is the ABSOLUTE source of truth for the sheet layout.**
> All code (GAS & Extension) must strictly follow these column mappings to avoid data corruption or loss.

## 投稿作成ボード (Posting Creation Board)

| Col | Letter | Header | Description | Required? |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **A** | **ON AIR** | **Checkbox**. Posting trigger. | YES |
| 2 | **B** | **No** | Row sequence number. | YES |
| 3 | **C** | **Type** | Posting type (単品, 日常, 有益, etc). | YES |
| 4 | **D** | **Photo 1** | **Extension Image 1 URL**. | **CRITICAL** |
| 5 | **E** | **Photo 2** | **Extension Image 2 URL**. | **CRITICAL** |
| 6 | **F** | **Photo 3** | **Extension Image 3 URL**. | **CRITICAL** |
| 7 | **G** | **Topic (ネタ/メモ)** | **Scraped Text/Source**. | YES |
| 8 | **H** | **Output (決定稿)** | AI generated drafts (Case 1, 2, 3). | YES |
| 9 | **I** | **Selector** | Dropdown (すべて, 案1, etc). | YES |
| 10 | **J** | **System ID** | Backend tracking ID. | YES |
| 11 | **K** | **Views** | Metrics tracking. | - |
| 12 | **L** | **Likes** | Metrics tracking. | - |
| 13 | **M** | **Replies** | Metrics tracking. | - |
| 14 | **N** | **Reposts** | Metrics tracking. | - |
| 15 | **O** | **Judge** | AI Performance Rating. | - |
| 16 | **P** | **DNA (分析)** | **Buzz Lab Logic consolidated here**. | **NEW** |
| 17 | **Q-S** | **Drafts 1-3** | Hidden storage for raw AI drafts. | - |
| 20 | **T** | **🚀 Create** | **Checkbox**. Generation trigger. | **NEW** |

---

## Technical Mapping Notes

### 1. API Receiver (APIHandler.js)
Incoming data from Extension must be mapped as follows:
- `imageUrls[0]` -> Column D
- `imageUrls[1]` -> Column E
- `imageUrls[2]` -> Column F
- `scrapedText` -> Column G

### 2. AI Generation Target (Board.js)
- Read from: Column G
- Write to: Column H (Main UI) and Q-S (Internal storage)
- Tone/DNA Reference: Read from Column P

### 3. Master DNA Source (Toranomaki.js)
- Read Samples from: Column P (DNA)
