# Google Sheets 後端設定指南

本指南將引導您設定 Google Sheets 作為物業管理系統的資料儲存後端。

## 前置需求

- Google 帳號
- 可存取 Google Sheets 和 Google Apps Script

## 設定步驟

### 1. 建立 Google Sheets 試算表

1. 前往 [Google Sheets](https://sheets.google.com)
2. 建立一個新的空白試算表
3. 將試算表命名為「物業管理系統資料」或您喜歡的名稱
4. 記下試算表的 URL，格式如下：
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
   ```

### 2. 設定 Google Apps Script

1. 在試算表中，點擊選單 **Extensions** → **Apps Script**
2. 這將開啟 Apps Script 編輯器
3. 刪除預設的程式碼
4. 複製 `Code.gs` 檔案的全部內容，貼到編輯器中
5. 點擊儲存（Ctrl+S 或 Cmd+S）
6. 將專案命名為「物業管理 API」

### 3. 初始化工作表

1. 在 Apps Script 編輯器中，找到下拉選單（顯示「doGet」或函數名稱）
2. 選擇 `initializeSheets` 函數
3. 點擊「執行」按鈕
4. 首次執行時，會要求授權：
   - 點擊「審查權限」
   - 選擇您的 Google 帳號
   - 點擊「進階」→「前往 物業管理 API（不安全）」
   - 點擊「允許」
5. 執行完成後，返回試算表確認已建立以下工作表：
   - tenants
   - properties
   - contracts
   - repairRequests
   - individualAssets
   - potentialTenants

### 4. 部署為 Web App

1. 在 Apps Script 編輯器中，點擊「部署」→「新增部署作業」
2. 點擊齒輪圖示，選擇「網頁應用程式」
3. 設定以下選項：
   - **說明**：物業管理 API v1
   - **執行身分**：我（您的電子郵件）
   - **具有存取權的使用者**：所有人
4. 點擊「部署」
5. 複製顯示的 **Web App URL**，格式如下：
   ```
   https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   
   https://script.google.com/macros/s/AKfycby4ohl5c13AUoyiRyHqzaeSUIG5HDxP_d-KziBPo2ADJv7tRtSKpnGIJ5eYeRwG8_pk/exec
   ```

### 5. 在應用程式中設定

1. 開啟物業管理系統網頁應用程式
2. 點擊右上角的「設定」按鈕（齒輪圖示）
3. 在設定彈窗中，將 Web App URL 貼入輸入框
4. 點擊「連接 Google Sheets」
5. 系統將自動重新載入並連接到 Google Sheets

### 6. 匯入現有資料（可選）

如果您之前已在本機儲存（localStorage）中有資料：

1. 確認已成功連接 Google Sheets
2. 在設定彈窗中，點擊「匯入本機資料到雲端」
3. 確認匯入操作
4. 等待匯入完成

## 注意事項

### 安全性

- Web App 設定為「所有人」可存取，但只有知道 URL 的人才能使用
- 請勿公開分享您的 Web App URL
- 如需更高安全性，可考慮限制為「僅限我自己」並透過 API Key 驗證

### 使用限制

- Google Apps Script 有每日執行時間限制（一般帳號約 6 分鐘/天）
- 建議不要過於頻繁地操作，以免觸發限制
- 資料會即時同步，無需手動儲存

### 更新部署

當您需要更新 Apps Script 程式碼時：

1. 修改程式碼後儲存
2. 點擊「部署」→「管理部署作業」
3. 點擊編輯圖示（鉛筆）
4. 版本選擇「新版本」
5. 點擊「部署」

## 故障排除

### 連接失敗

1. 確認 URL 是否正確複製（應以 `/exec` 結尾）
2. 確認 Web App 已正確部署
3. 檢查瀏覽器主控台是否有 CORS 錯誤
4. 嘗試重新部署 Web App

### 資料未顯示

1. 確認工作表名稱正確
2. 在 Apps Script 中執行 `testGetAllData` 函數測試
3. 檢查試算表中是否有資料

### 權限錯誤

1. 確認 Google 帳號已登入
2. 重新執行 Apps Script 授權流程
3. 確認「具有存取權的使用者」設定為「所有人」

### 試算表服務錯誤 / 同步失敗

若出現「試算表服務無法正常運作」或「試算表服務錯誤」：

1. **試算表 ID**：程式預設使用「目前開啟的試算表」ID。若您是從 Apps Script 編輯器直接部署（未從試算表內開啟），需手動設定：
   - Apps Script 編輯器 → 專案設定（左側齒輪）→ 指令碼內容 → 新增屬性 `SPREADSHEET_ID`，值為試算表 URL 中的 ID（`/d/` 與 `/edit` 之間）。
2. **從試算表開啟 Apps Script**：在試算表選單 **Extensions** → **Apps Script** 開啟專案，再部署。這樣 `SpreadsheetApp.getActiveSpreadsheet().getId()` 會正確取得該試算表 ID。
3. **單筆資料過大**：試算表單一儲存格上限約 50,000 字元。若某筆合約（含年繳收款記錄、多筆 paymentRecords）JSON 過長，會無法寫入。可精簡該筆資料或改用「本機儲存」。

### 列超出邊界

若出現「那些列超出邊界」：

1. 先執行 `initializeSheets` 確保所有工作表存在。
2. 若仍失敗，在 Apps Script 中重新部署一次（部署 → 管理部署 → 新版本）。

## 支援

如有問題，請檢查：
1. Google Apps Script 執行記錄（Views → Executions）
2. 瀏覽器開發者工具的主控台
3. 網路請求的回應內容

