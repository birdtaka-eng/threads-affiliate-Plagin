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
| 7 | **G** | **ROOM Content (ROOM投稿用)** | **Scraped Text/Source/ROOM Link**. | YES |
| 8 | **H** | **Threads Post (フック)** | AI Hook text (Post 1). | YES |
| 9 | **I** | **Reply Post (リプライ用)** | AI Reply text (Post 2). | YES |
| 10 | **J** | **System ID** | Backend Media tracking ID. | YES |
| 11 | **K** | **Views** | Metrics tracking. | - |
| 12 | **L** | **Likes** | Metrics tracking. | - |
| 13 | **M** | **Replies** | Metrics tracking. | - |
| 14 | **N** | **Reposts** | Metrics tracking. | - |
| 15 | **O** | **Rate** | Engagement Rate. | - |
| 16 | **P** | **Judge** | AI Performance Rating. | - |
| 17 | **Q** | **DNA (分析)** | **Buzz Lab Logic consolidated here**. | **NEW** |
| 18 | **R** | **Last Broadcast** | Date/time of the last post. | - |

---

## Technical Mapping Notes

### 1. API Receiver (APIHandler.js)

Incoming data from Extension must be mapped as follows:

- `imageUrls[0]` -> Column D
- `imageUrls[1]` -> Column E
- `imageUrls[2]` -> Column F
- `roomText` -> Column G (ROOM Content)
- `threadsText` -> Column H (Threads Post / Hook)
- `replyText` -> Column I (Reply Post)

### 2. AI Generation Target (Board.js)

- Read from: Column G
- Write to: Column H (Main Hook) and Column I (Reply Text)
- Tone/DNA Reference: Read from Column Q
