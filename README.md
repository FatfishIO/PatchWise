# PatchWise AI - Smart Git Patch & Risk Analysis Platform

**PatchWise AI** là nền tảng phân tích mã nguồn và bản vá Git (Git Diff / Patch) tự động bằng trí tuệ nhân tạo (Google Gemini AI). Ứng dụng giúp các kỹ sư phần mềm, Tech Lead và chuyên gia bảo mật phân tích sâu tác động, tìm ra nguyên nhân gốc rễ (Root Cause), phát hiện rủi ro bảo mật (Security Risks), lỗi hồi quy (Regressions) và đề xuất kịch bản kiểm thử (Test Cases) chỉ trong vài giây.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🤖 Phân Tích Bản Vá Thông Minh với Google Gemini AI
- **Tóm tắt thay đổi (Summary & Intent)**: Giải thích ngắn gọn, súc tích mục đích của bản vá.
- **Phân tích nguyên nhân gốc rễ (Root Cause Analysis)**: Xác định lý do thay đổi mã (sửa lỗi, tái cấu trúc, tối ưu hiệu năng, vá bảo mật).
- **Đánh giá rủi ro đa chiều (Risk Assessment)**:
  - Phân loại mức độ rủi ro: **Thấp (Low)**, **Trung bình (Medium)**, **Cao (High)**, **Nghiêm trọng (Critical)**.
  - Phân tích rủi ro bảo mật (SQL Injection, XSS, Race Condition, v.v.).
  - Cảnh báo phá vỡ tính tương thích (Breaking Changes) và hiệu năng (Performance Impact).
- **Gợi ý kịch bản kiểm thử (Test Recommendations)**: Tự động sinh danh sách test cases và edge cases cần kiểm tra trước khi merge.
- **Hỏi đáp tương tác (Diff AI Chat Assistant)**: Cho phép đặt câu hỏi chuyên sâu trực tiếp trên ngữ cảnh của bản vá vừa phân tích.

### 2. 🔍 Trực Quan Hóa Git Diff (Visual Diff Viewer)
- Hỗ trợ xem dạng **Split View (2 cột)** và **Unified View (1 cột)**.
- Đánh dấu cú pháp (Syntax Highlighting), tô màu thêm/xóa rõ ràng.
- Hiển thị thống kê chi tiết: số file thay đổi, số dòng thêm (+), số dòng xóa (-).
- Bộ lọc theo từng file và tìm kiếm nội dung diff nhanh chóng.

### 3. 🐙 Tích Hợp GitHub API Tự Động
- Lấy diff trực tiếp qua **Đường dẫn GitHub (URL)**:
  - Pull Request URL (ví dụ: `https://github.com/facebook/react/pull/26000`)
  - Commit URL (ví dụ: `https://github.com/nodejs/node/commit/abcdef...`)
  - Branch Compare URL (ví dụ: `https://github.com/facebook/react/compare/main...canary`)
- Nhập nhanh theo thông số Repo / Branch / PR number / Commit SHA.
- Hỗ trợ cấu hình **GitHub Personal Access Token (PAT)** để nâng hạn ngạch gọi API và truy cập Private Repositories.

### 4. 🔐 Xác Thực Google Sign-In & Phân Quyền RBAC
- **Google Identity Services (GIS)**: Xác thực đăng nhập an toàn bằng tài khoản Google.
- **Mô hình phân quyền 3 cấp độ (Role-Based Access Control)**:
  - **`ADMIN`**: Toàn quyền phân tích, mở Admin Dashboard, quản lý danh sách người dùng, thay đổi vai trò và kiểm toán hệ thống.
  - **`USER` (Mặc định)**: Dán/tải diff, chạy phân tích AI, tương tác với AI Assistant, quản lý lịch sử.
  - **`VIEWER` (Chỉ đọc)**: Chỉ xem giao diện diff và kết quả báo cáo; bị chặn quyền khởi chạy phân tích AI mới.
- **Admin Dashboard**:
  - Quản lý danh sách thành viên và đổi vai trò tức thì.
  - Cấp quyền trước cho email mới.
  - Xem bảng ma trận phân quyền (RBAC Matrix).
  - Ghi vết lịch sử thay đổi quyền (Audit Logs).

### 5. 📂 Quản Lý Lịch Sử & Xuất Báo Cáo
- Tự động lưu lịch sử các lần phân tích vào bộ nhớ trình duyệt (LocalStorage).
- Tìm kiếm, lọc lịch sử theo mức độ rủi ro (Low / Medium / High).
- Xuất báo cáo đánh giá bản vá sang định dạng **Markdown (`.md`)** chuyên nghiệp.
- Hỗ trợ song ngữ hoàn chỉnh: **Tiếng Việt (VI)** và **Tiếng Anh (EN)**.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React Icons.
- **AI Engine**: Google GenAI TypeScript SDK (`@google/genai`), mô hình `gemini-2.5-flash` / `gemini-2.5-pro`.
- **Backend & Middleware**: Express.js, Vite HMR Middleware, TypeScript execution qua `tsx` / `esbuild`.
- **Authentication**: Google Identity Services (GIS) OAuth 2.0 Client SDK.
- **State & Storage**: React Hooks, Client-side Storage, Resilient Fallback Engine.

---

## 📁 Cấu Trúc Thư Mục

```text
├── index.html                   # Entry point HTML & Google Identity Services Script
├── metadata.json                # Cấu hình Metadata & Capabilities của ứng dụng
├── package.json                 # Khai báo dependencies & build scripts
├── server.ts                    # Backend Express API (Gemini proxy & GitHub API handler)
├── src/
│   ├── main.tsx                 # React app entry point
│   ├── App.tsx                  # Root component, quản lý trạng thái chính
│   ├── index.css                # Global Tailwind CSS styling
│   ├── types.ts                 # Toàn bộ Interface, Types, RBAC permissions
│   ├── components/
│   │   ├── Navbar.tsx           # Thanh điều hướng, thông tin tài khoản, role badge
│   │   ├── LoginScreen.tsx      # Màn hình đăng nhập Google GIS & Demo Accounts
│   │   ├── AdminDashboard.tsx   # Bảng quản trị người dùng & phân quyền RBAC
│   │   ├── DiffInput.tsx        # Trình nhập liệu Diff (Paste, File Upload, GitHub API)
│   │   ├── DiffViewer.tsx       # Trình trực quan hóa Git Diff (Split / Unified)
│   │   ├── AnalysisResults.tsx  # Hiển thị kết quả đánh giá rủi ro và khuyến nghị AI
│   │   ├── DiffChat.tsx         # Trợ lý AI tương tác hỏi đáp về bản vá
│   │   └── HistoryDrawer.tsx    # Drawer quản lý và xuất lịch sử phân tích
│   ├── data/
│   │   └── samplePatches.ts     # Các mẫu Git Diff thử nghiệm sẵn (SQLi, Race Condition,...)
│   └── utils/
│       ├── authUtils.ts         # Logic phân quyền RBAC, mã hóa session & audit logs
│       ├── diffParser.ts        # Thuật toán phân tích cú pháp Git Diff & AST stats
│       └── githubUtils.ts       # Xử lý URL và tương tác GitHub API
└── README.md                    # Tài liệu hướng dẫn sử dụng dự án
```

---

## 🚀 Cài Đặt & Chạy Ứng Dụng

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 18.x hoặc cao hơn.
- **NPM** hoặc **Yarn**.
- **Gemini API Key**: Đăng ký miễn phí tại [Google AI Studio](https://aistudio.google.com/).

### Các bước khởi chạy:

1. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường**:
   Tạo file `.env` hoặc thiết lập biến môi trường:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # Tùy chọn: GitHub Personal Access Token để tăng rate limit
   GITHUB_TOKEN=ghp_your_optional_github_token
   ```

3. **Chạy ứng dụng ở chế độ Development**:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000`

4. **Biên dịch Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 🔒 Hướng Dẫn Cấu Hình Google OAuth 2.0 (Tùy chọn)

Nếu bạn muốn cấu hình Google Sign-In chính thức cho tên miền của mình:
1. Mở [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Tạo **OAuth 2.0 Client ID** (loại **Web application**).
3. Thêm domain của bạn vào phần **Authorized JavaScript origins**.
4. Mở ứng dụng PatchWise, chọn **"Cấu hình OAuth Client"** ở góc trên và dán Client ID vào để áp dụng.

---

## 📄 Bản Quyền & Giấy Phép
Dự án được phân phối dưới giấy phép **Apache-2.0 License**.
