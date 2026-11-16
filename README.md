# 交接有據｜數位展務工作台

協助課程專題與數位作品展的籌備者與接手者，從任務找到操作、文件、展示入口與完成判準。

我以數位展務的交接需求為題，與 AI 協作完成內容、工具、版型與開發文件。活動情境為設計練習，實際程式測試記於 `docs/validation.md`。

公開網站：[https://handover-digital-expo-7ad055.creamybrink32.chatgpt.site/](https://handover-digital-expo-7ad055.creamybrink32.chatgpt.site/)

[繳交說明](docs/submission.md) · [擴充演練](docs/extension-log.md) · [驗證紀錄](docs/validation.md)

GitHub Repository：[https://github.com/4a-bot/handover-digital-expo](https://github.com/4a-bot/handover-digital-expo)

## 目前可使用

- 工作台：六個階段、十三項任務、本機進度、待處理狀態。
- 流程：依階段、職務、狀態篩選；任務連到展品、文件與問題處理。
- 展品：清單整理器、展品說明牌產生器；附固定範例、操作與限制。
- 文件：五份範本、十份 Markdown 下載檔，可在網頁填寫後下載。
- 交接：本機紀錄新增、保存、Markdown 匯出；沒有多人同步。
- 視覺比較：正式預設為深色展場；保留三個可操作的閱讀主題。

## 開發與接手

先讀 `AGENTS.md`、`docs/project-brief.md` 與 `docs/decisions.md`。

直接提供 `dist/` 為靜態網站即可。一般本機環境可使用：

```sh
python3 -m http.server 8000 --directory dist
```

瀏覽 `http://localhost:8000/`。工作台使用 JSON 資料，不能直接以 `file:` 雙擊首頁；獨立工具下載檔不需讀取 JSON。

修改資料或工具後執行：

```sh
python3 scripts/prepare_templates.py
python3 scripts/build_site.py
python3 scripts/check_content.py
python3 scripts/check_site.py
node --test tests/tool-logic.test.mjs
```

## 檔案分工

| 檔案 | 用途 |
|---|---|
| AGENTS.md | AI 必須遵守的專案規則 |
| dist/data/*.json | 正式內容與關聯 |
| dist/assets/js/app.js | 共用頁面、搜尋、篩選、本機紀錄 |
| dist/assets/js/tool-logic.mjs | 兩件工具的純邏輯 |
| dist/assets/js/tool-ui.js | 兩件工具的操作介面 |
| dist/assets/css/ | 共用風格與工具樣式 |
| scripts/build_site.py | 產生頁面外殼與單檔工具 |
| scripts/prepare_templates.py | 從資料產生範本下載檔 |
| docs/history/ | 附編輯說明的先前規則整理稿、原樣保留的內容快照 |
| docs/validation.md | 已做的檢查與限制 |

## 如何新增內容

新增任務時，在 `tasks.json` 放入固定 ID、所屬階段、職務、前置資料、步驟、產出、完成判準、範本／展品／問題關聯與下一項任務；在 `phases.json` 的相應階段登記任務 ID。頁面由共用資料呈現，不需另外複製一張 HTML。

新增工具需要核心邏輯、介面與可重現範例。不要只改展品 JSON 就宣稱新增了可運作的工具。完成相關瀏覽器驗證再改展示狀態。

## 專案狀態

網站已公開，現行開發規則為 AGENTS.md 1.1。規則涵蓋頁面架構、共用資料、視覺、內容與頁面擴充、工具行為及部署維護。

系統列印與離線 `file:` 開啟受目前雲端瀏覽器環境限制，未宣稱實機通過。詳見驗證紀錄。

## 如何驗收本次擴充

1. 打開流程與任務，在「現場執行」找到「執行換班交接與接手試跑」。
2. 查看 F05「問題與交接紀錄表」，確認有「交付材料與接手確認」欄位及新任務連結。
3. 搜尋換班、更新任務狀態，再匯出工作紀錄，確認新任務存在。
4. 對照 docs/history 的修改前快照與 dist/data 的正式資料；完整結果在 docs/extension-log.md。

## 部署

網站沒有伺服器端或套件安裝需求；把 dist 資料夾提供為靜態網站即可。本網站使用公開靜態託管，GitHub 用於保存可接手的完整程式。若改用 GitHub Pages，需把 dist 作為網站產物發布，不能把專案根目錄誤當網站目錄。工作台必須透過 HTTP(S) 開啟，兩個下載的獨立工具另有內嵌程式。
