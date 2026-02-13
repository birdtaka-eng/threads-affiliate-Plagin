# Posting Creation Board Layout (Definitive Edition)

To prevent project collapse and ensure data consistency, the following column mapping for the **「投稿作成ボード」 (Posting Creation Board)** must be strictly maintained.

| Column | Index | Header | Purpose | Source |
| :--- | :--- | :--- | :--- | :--- |
| **A** | 1 | 🎨 On Air | Execution Trigger / Script Target | Manual |
| **B** | 2 | No. | Sequence Number | Manual |
| **C** | 3 | Type | Content Category (単品, まとめ, etc) | Manual / API |
| **D** | **4** | **Photo 1** | **Primary Image URL** | **API (Clip)** |
| **E** | **5** | **Photo 2** | **Secondary Image URL** | **API (Clip)** |
| **F** | **6** | **Photo 3** | **Tertiary Image URL** | **API (Clip)** |
| **G** | 7 | Topic/Assets | Research Data / Input for AI | API (Clip) / Manual |
| **H** | 8 | Output | Final AI Generated Post | `generatePostsCommon` |
| **I** | 9 | Selector | Draft Selection (案1, 案2, 案3) | Manual |
| ... | ... | ... | ... | ... |
| **P** | **16** | **DNA Analysis** | **AI Analysis of Column G** | `analyzeSingleRowBoard` |
| **Q** | 17 | Draft 1 | AI Draft Candidate 1 | `generatePostsCommon` |
| **R** | 18 | Draft 2 | AI Draft Candidate 2 | `generatePostsCommon` |
| **S** | 19 | Draft 3 | AI Draft Candidate 3 | `generatePostsCommon` |
| **U** | 21 | 🎨 Create | Regeneration Trigger | Manual |

### Critical Rules
1. **Photo Layout**: Columns **D, E, F** are hardcoded for up to 3 carousel images.
2. **Analysis Target**: Column **P** must always receive the DNA summary of Column G.
3. **Trigger**: Column **U** (21) triggers the post generation for that specific row.
