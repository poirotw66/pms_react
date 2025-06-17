
# 綜合物業管理系統

一個全面的物業管理應用程式，旨在協助您高效管理名下或代管的各類物業、處理與承租人相關的事務、追蹤合約狀態、管理維修請求以及記錄物業內的資產。系統的目標是簡化日常管理工作流程、提高資訊透明度、並確保各項事務能被妥善記錄與追蹤。

## 主要功能

本系統包含以下主要管理模組：

*   **首頁 (Home):** 提供一個儀表板視圖，顯示重要資訊摘要，例如即將到期的合約。
*   **承租人管理 (Tenant Management):** 管理所有承租人的詳細資訊。
*   **物件管理 (Property Management):** 詳細記錄和管理每一處物業的具體資訊，包括資產明細和維修記錄。
*   **合約管理 (Contract Management):** 管理所有租賃合約的生命週期，包括租金收款記錄和提醒。
*   **承租人報修管理 (Tenant Repair Request Management):** 處理承租人提出的修繕請求。
*   **物件資產管理 (Property Asset Management):** 追蹤和管理構成「物件資產明細」中那些具有一定價值或需要獨立管理的資產。
*   **潛在客戶管理 (Potential Tenant Management):** 記錄和追蹤有意向承租的潛在客戶資訊。

## 技術棧

*   **前端框架:** React 19
*   **語言:** TypeScript
*   **樣式:** Tailwind CSS (via CDN)
*   **開發與建置工具 (建議):** Vite
*   **模組系統:** ES Modules
*   **資料儲存:** 瀏覽器 LocalStorage

## 系統需求

*   [Node.js](https://nodejs.org/) (建議 LTS 版本) - 用於執行開發伺服器 (如 Vite) 和套件管理 (npm)。
*   現代網頁瀏覽器 (如 Chrome, Firefox, Edge, Safari)。

## 安裝與執行

以下是建議的設定步驟：

1.  **下載或複製專案檔案:**
    確保所有專案檔案 (`index.html`, `index.tsx`, `App.tsx`, `types.ts`, `constants.tsx`, `metadata.json`, 以及 `components` 和 `hooks` 資料夾) 都放在您電腦的同一個專案資料夾內。

2.  **開啟終端機:**
    導航到您的專案資料夾。

3.  **初始化專案並安裝依賴套件:**
    *   **重要：** 在執行 `npm init` 相關指令前，請確保您的專案**資料夾名稱**是英文或不含特殊字元 (例如，使用 `property-management-system` 而不是 `綜合物業管理系統`)。這可以避免 `package.json` 名稱錯誤。
    *   如果您的專案資料夾中還沒有 `package.json` 檔案，請執行以下命令之一：
        *   **選項 A (推薦，如果資料夾名稱已符合要求):** 
            ```bash
            npm init -y
            ```
            這將會根據您的資料夾名稱（假設是英文且符合 npm 命名規則）自動產生一個 `package.json`。
        *   **選項 B (互動式設定):** 
            ```bash
            npm init
            ```
            然後按照提示輸入資訊。当被问到 `package name:` 時，請務必輸入一個有效的英文名稱 (例如 `property-management-system` 或 `my-property-app`)，且不含空格或特殊字元。
    *   接下來，安裝 Vite 和其他必要的運行時依賴：
        ```bash
        npm install vite --save-dev
        npm install react react-dom react-router-dom
        ```
    *   同時，建議安裝 TypeScript 型別定義以獲得更好的開發體驗：
        ```bash
        npm install @types/react @types/react-dom @types/react-router-dom --save-dev
        ```
    Vite 是一個現代化的前端工具，可以提供極速的開發伺服器並處理 TypeScript/JSX 的即時編譯。

4.  **啟動開發伺服器:**
    ```bash
    npx vite
    ```
    Vite 會啟動一個本地開發伺服器 (通常在 `http://localhost:5173` 或類似的埠號)。

5.  **在瀏覽器中開啟:**
    將終端機中顯示的本地網址複製到您的瀏覽器中開啟。您應該能看到應用程式介面並開始使用。

## 資料儲存

本應用程式目前使用瀏覽器的 **LocalStorage** 來儲存所有輸入的資料。這意味著：
*   資料僅儲存在您目前使用的電腦和瀏覽器中。
*   清除瀏覽器快取或網站資料可能會導致已儲存的資料遺失。
*   資料不會在不同裝置或瀏覽器之間同步。

## 檔案結構概覽

```
.
├── components/                 # React UI 元件
│   ├── common/                 # 通用元件 (表單控制項, 模態框)
│   ├── ContractManagement.tsx
│   ├── HomePage.tsx
│   ├── PotentialTenantManagement.tsx
│   ├── PropertyAssetManagement.tsx
│   ├── PropertyManagement.tsx
│   ├── RepairRequestManagement.tsx
│   └── TenantManagement.tsx
├── hooks/                      # 自定義 React Hooks
│   └── useLocalStorage.ts      # LocalStorage 持久化 Hook
├── App.tsx                     # 主要應用程式元件，處理頁面導航和佈局
├── constants.tsx               # 應用程式常數 (頁面定義, 導航項目, SVG 圖示, 預設資料物件)
├── index.html                  # HTML 入口檔案，引入 Tailwind CSS 和 React
├── index.tsx                   # React 應用程式的進入點
├── metadata.json               # 應用程式元數據 (名稱, 描述)
├── types.ts                    # TypeScript 型別定義
└── README.md                   # 本說明檔案
```

## Tailwind CSS 設定

Tailwind CSS 的基本主題顏色等設定直接在 `index.html` 中的 `<script>` 標籤內定義：
```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#0ea5e9', // Sky-500
          'primary-dark': '#0284c7', // Sky-600
          secondary: '#10b981', // Emerald-500
          'secondary-dark': '#059669', // Emerald-600
          danger: '#ef4444', // Red-500
          'danger-dark': '#dc2626', // Red-600
          background: '#f1f5f9', // Slate-100 - Main app background
          surface: '#ffffff',    // Card, Modal backgrounds
          sidebar: '#1e293b',    // Slate-800 - Sidebar background
          'sidebar-accent': '#334155', // Slate-700 - Sidebar hover/focus
          textPrimary: '#111827', // Gray-900 - Main text color
          textSecondary: '#6b7280', // Gray-500 - Muted text color
          borderLight: '#e5e7eb', // Gray-200
          borderDefault: '#d1d5db', // Gray-300
        }
      }
    }
  }
</script>
```
您可以直接修改此處的設定來調整應用程式的視覺主題。

## 部署到 GitHub Pages

本專案已配置為可以輕鬆部署到 GitHub Pages。以下是部署步驟：

### 自動部署（推薦）

1. **將專案推送到 GitHub：**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **啟用 GitHub Pages：**
   - 前往您的 GitHub 儲存庫設定
   - 找到 "Pages" 部分
   - 在 "Source" 下選擇 "GitHub Actions"
   - GitHub Actions 工作流程會自動建置和部署您的應用程式

3. **訪問您的應用程式：**
   - 部署完成後，您的應用程式將可在 `https://yourusername.github.io/pms_gemini` 訪問
   - 請將 `yourusername` 替換為您的 GitHub 使用者名稱

### 手動部署

如果您偏好手動部署：

```bash
# 建置專案
npm run build

# 部署到 GitHub Pages
npm run deploy
```

**注意：** 在使用手動部署前，請確保：
1. 更新 `package.json` 中的 `homepage` 欄位為您的實際 GitHub Pages URL
2. 您已經安裝了 `gh-pages` 套件（已包含在 devDependencies 中）

### 重要配置說明

- **路由處理：** 專案已配置為處理 React Router 的客戶端路由，包括直接訪問子路由的情況
- **基礎路徑：** Vite 配置會在生產環境中自動設定正確的基礎路徑
- **靜態資源：** 所有資源都會正確地相對於基礎路徑載入

## 未來可能的改進

*   在首頁儀表板上擴展更多摘要資訊（例如，待處理維修請求、最近活動等）。
*   將資料儲存遷移到後端資料庫，以實現資料持久化和跨裝置同步。
*   使用者身份驗證與授權。
*   更完善的表單驗證和錯誤處理。
*   單元測試和端對端測試。
*   將 Tailwind CSS 設定移至獨立的 `tailwind.config.js` 檔案，並使用 PostCSS 進行建置。
*   PWA (Progressive Web App) 功能以支援離線使用和安裝。
