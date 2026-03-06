# 建築法規 AI 檢討系統 — 部署到 iPhone 指南

## 🚀 最快方式：Vercel（免費、5分鐘搞定）

### Step 1：建立 GitHub 帳號（如果還沒有）
1. 前往 https://github.com 註冊
2. 記住你的帳號密碼

### Step 2：上傳程式碼到 GitHub
1. 登入 GitHub 後，點右上角 **＋** → **New repository**
2. Repository name 輸入：`building-code-review`
3. 選 **Public** → 點 **Create repository**
4. 在新頁面點 **uploading an existing file**
5. 把這個資料夾裡的所有檔案拖進去（保持資料夾結構）
6. 點 **Commit changes**

### Step 3：用 Vercel 部署
1. 前往 https://vercel.com → 用 GitHub 帳號登入
2. 點 **Add New → Project**
3. 找到 `building-code-review` → 點 **Import**
4. Framework 自動偵測為 Vite → 直接點 **Deploy**
5. 等 1~2 分鐘，會得到一個網址，例如：
   `https://building-code-review.vercel.app`

### Step 4：加到 iPhone 主畫面 📱
1. 用 iPhone 的 **Safari** 打開上面的網址
2. 點底部的 **分享按鈕**（正方形+向上箭頭 ⬆）
3. 滑到下面找 **「加入主畫面」**
4. 點 **新增**
5. 完成！主畫面會出現 App 圖示，點開就像原生 App

---

## 📁 專案檔案結構

```
building-code-app/
├── index.html          ← 主頁面（含 PWA 設定）
├── package.json        ← 套件清單
├── vite.config.js      ← Vite 設定
├── public/
│   ├── manifest.json   ← PWA 設定檔
│   ├── icon-192.png    ← App 圖示（小）
│   └── icon-512.png    ← App 圖示（大）
└── src/
    ├── main.jsx        ← React 入口
    └── App.jsx         ← 主程式（法規檢討系統）
```

---

## ⚠ 注意事項

### AI 功能
AI 法規清單功能需要 Anthropic API key。
目前程式碼直接呼叫 API（僅在 Claude Artifacts 環境有效）。
部署後如需 AI 功能，需另外設定後端 proxy。
**其餘功能（法規查詢、容積計算、儲存等）完全離線可用。**

### 資料儲存
所有資料存在 iPhone 的 localStorage 中：
- 專案資料
- 自訂法規
- 已標記條文
**清除 Safari 瀏覽資料會刪除這些資料。**

---

## 🔧 本機開發（選用）

如果你想在電腦上先測試：

```bash
# 安裝 Node.js (https://nodejs.org)
cd building-code-app
npm install
npm run dev
# 打開 http://localhost:5173
```
