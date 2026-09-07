# PatchWise AI - Smart Git Diff & Pull Request Security Intelligence

<div align="center">
  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=PatchWise" alt="PatchWise AI Logo" width="96" height="96" />
  <h3>Bảo mật & Phân tích Git Diff thông minh với Google Gemini AI</h3>
  <p>Tự động hóa phân tích Pull Request, kiểm tra lỗ hổng bảo mật, giải thích nguyên nhân gốc rễ, đề xuất mã sửa lỗi tự động, tương tác Chat AI và tích hợp CI/CD Webhook cho GitHub.</p>
</div>

---

## 🌟 Tổng quan dự án

**PatchWise AI** là nền tảng toàn diện hỗ trợ các kỹ sư phần mềm, Tech Lead, SecOps và QA trong việc đánh giá rủi ro của các bản vá mã nguồn (**Git Diff / Patch / Pull Request**). Sử dụng mô hình **Google Gemini (Gemini 3.1 Flash-Lite / 2.5 Flash)** thông qua `@google/genai` SDK, PatchWise AI phân tích sâu từng hunk mã nguồn, phát hiện các lỗ hổng bảo mật (SQL Injection, XSS, Race Condition, v.v.), đánh giá nguy cơ phá vỡ tính tương thích (Breaking Changes), tự động tạo mã khắc phục (Auto-Fix) kèm Unit Test và đồng bộ trực tiếp lên Pull Request thông qua GitHub Webhook.

---

## 🚀 Các tính năng chính

### 1. 📥 Đa dạng phương thức nạp Git Diff (Multi-Modal Ingestion)
- **Dán nội dung thô (Raw Diff/Patch)**: Hỗ trợ cú pháp Git Unified Diff tiêu chuẩn.
- **Tải lên tệp (File Upload & Drag-and-Drop)**: Kéo thả trực tiếp các file `.diff` hoặc `.patch` từ máy tính.
- **Tải trực tiếp từ GitHub Pull Request URL**:
  - Nhập URL dạng `https://github.com/owner/repo/pull/123`.
  - Tự động bóc tách siêu dữ liệu: Tác giả, tiêu đề, số commit, danh sách file thay đổi.
  - Hỗ trợ nhập **GitHub Personal Access Token (PAT)** lưu trữ an toàn cục bộ để truy cập các kho lưu trữ riêng tư (Private Repositories).
- **Bộ Patch mẫu sẵn có (Sample Patches)**: Tích hợp sẵn 4 bản patch mẫu tiêu biểu để trải nghiệm nhanh:
  - 💉 *SQL Injection Vulnerability*
  - ⏳ *Memory Leak & Async Timeout*
  - 💥 *REST API Breaking Contract Change*
  - 🔄 *Database Race Condition*
- **Bộ lọc trọng tâm phân tích (Focus Area)**: Tùy chỉnh phạm vi phân tích theo mục tiêu: *Tất cả (All)*, *Chỉ Bảo mật (Security Only)*, *Chỉ Hiệu năng (Performance Only)*, *Chỉ Phá vỡ tương thích (Breaking Changes Only)*.
- **Hỗ trợ song ngữ (Bilingual UI & Output)**: Chuyển đổi linh hoạt giữa **Tiếng Việt** và **English**.

---

### 2. 🔍 Phân tích Git Diff chuyên sâu với Gemini AI
- **Tóm tắt thay đổi (Summary)**: Bóc tách logic cấp cao của PR, số lượng file, số dòng thêm/xóa.
- **Phân tích Nguyên nhân & Ý đồ (Root Cause & Intent Analysis)**:
  - Mục tiêu cốt lõi của lập trình viên khi tạo patch.
  - Vấn đề/khiếm khuyết cụ thể được xử lý trong mã nguồn.
  - Cơ chế kỹ thuật và cách tiếp cận giải pháp.
- **Đánh giá rủi ro trực quan (Risk Scoring & Classification)**:
  - Chấm điểm rủi ro từ **1 đến 10** kèm thước đo an toàn trực quan.
  - Phân loại 3 mức độ cảnh báo: **LOW / MEDIUM / HIGH / CRITICAL**.
  - Đánh giá trên 3 khía cạnh:
    - 🛡️ **Bảo mật (Security)**: SQLi, Hardcoded Secrets, SSRF, Deserialization, XSS, CSRF, v.v.
    - ⚡ **Hiệu năng (Performance)**: N+1 query, Memory leak, CPU bottleneck, vòng lặp vô hạn.
    - 💥 **Tính tương thích (Breaking Changes)**: Thay đổi API contract, database schema, types.
- **Checklist kiểm thử cho Reviewer**: Hướng dẫn các ca kiểm thử biên (Edge cases) cần xác minh trước khi merge.
- **Trích dẫn mã nguồn trước & sau khi vá (Hunk Insights & Snippets)**:
  - Trích dẫn trực quan đoạn mã chứa khiếm khuyết (*Vulnerable Code - Before Patch*).
  - Đối chiếu đoạn mã đã khắc phục an toàn (*Patched Code - After Patch*).

---

### 3. 🖥️ Trình hiển thị Diff tương tác (Visual Interactive Diff Viewer)
- **2 Chế độ xem linh hoạt**:
  - **Unified View (Gộp dòng)**: Xem liền mạch theo phong cách Git diff dòng thêm/xóa truyền thống.
  - **Split View (Song song 2 cột)**: Đặt mã nguồn gốc và mã mới cạnh nhau để đối chiếu dễ dàng.
- **Cây điều hướng file thay đổi (File Tree Navigator)**: Thống kê số dòng thêm (+) và bớt (-) trên từng file, hỗ trợ tìm kiếm và thu gọn/mở rộng từng file riêng biệt.
- **Tô màu cú pháp chuẩn Git**: Nhận diện rõ ràng các dòng mã thêm mới (xanh lá) và dòng bị xóa (đỏ).

---

### 4. ⚡ AI Auto-Fix (Đề xuất giải pháp sửa lỗi & Unit Test tự động)
- Tại mỗi cảnh báo rủi ro, người dùng nhấn **"💡 Đề xuất Fix"**.
- Gemini AI phân tích ngữ cảnh và tự động tạo đoạn mã đã khắc phục theo chuẩn Clean Code & Security Best Practices.
- **Tự động sinh Unit Test**: Tạo sẵn đoạn mã kiểm thử đơn vị để lập trình viên bổ sung vào bộ kiểm thử phòng ngừa hồi quy (Regression Test).
- **So sánh trực quan Before vs. After** và sao chép mã an toàn chỉ với 1 cú nhấp chuột.

---

### 5. 💬 Trợ lý Chat AI chuyên sâu (Interactive Diff Chat Assistant)
- Tương tác hỏi đáp thời gian thực với AI về bản Git Diff hiện tại.
- Hỗ trợ giải thích logic hàm phức tạp, hỏi về các rủi ro phát sinh hoặc yêu cầu viết thêm test case theo ngôn ngữ lập trình mong muốn.
- Tích hợp các gợi ý câu hỏi nhanh (Quick Prompts) giúp lập trình viên tra cứu tức thì mà không cần tự gõ prompt.

---

### 6. 🤖 Tích hợp Webhook GitHub CI/CD (Tự động hóa quy trình Review)
- **Tự động nhận diện Pull Request**: Lắng nghe các sự kiện `pull_request.opened`, `pull_request.synchronize`, `pull_request.reopened`, `pull_request.edited` từ GitHub.
- **Bảo mật chữ ký HMAC-SHA256**: Xác thực chữ ký mã hóa `x-hub-signature-256` bằng khóa bí mật (Secret).
- **Tự động nhận xét lên PR (Auto-Comment)**: Gọi GitHub REST API để gửi báo cáo tóm tắt, điểm số rủi ro và checklist trực tiếp vào phần bình luận của Pull Request.
- **Nhật ký Webhook (Audit Logs)**: Ghi lại lịch sử chi tiết từng sự kiện, mã trạng thái HTTP, cấp độ rủi ro và liên kết bình luận.
- **Công cụ Test Webhook (Simulator)**: Kích hoạt mô phỏng sự kiện PR ngay trên giao diện (nút *"Trigger Test PR"*) để kiểm tra đường truyền mà không cần tạo commit thật trên GitHub.

---

### 7. 🔗 Chia sẻ Báo cáo trực tuyến & Chế độ Khách xem (Viewer Share Links)
- **Tạo liên kết chia sẻ nhanh**: Sinh đường dẫn độc nhất dạng `?share_id=...` thông qua endpoint `/api/share/create`.
- **Chế độ Guest Viewer**: Người nhận liên kết có thể xem chi tiết toàn bộ báo cáo, kiểm tra code diff và tải PDF mà **không cần đăng ký tài khoản** và **hoàn toàn không tiêu tốn token** API của tổ chức.
- **Theo dõi lượt xem**: Tự động đếm số lần báo cáo được truy cập (`viewsCount`).

---

### 8. 📄 Xuất báo cáo kiểm toán chuyên nghiệp (Print PDF & Markdown)
- **Bản in A4 chuẩn hóa (Print-ready PDF)**: Xem trước và xuất toàn bộ nội dung đánh giá rủi ro dưới dạng tệp PDF phục vụ lưu trữ hoặc nghiệm thu kỹ thuật.
- **Xuất định dạng Markdown (Export MD)**: Sao chép nhanh toàn bộ báo cáo chuẩn Markdown để dán vào Jira, Confluence, GitHub Issue hoặc Slack.

---

### 9. ⚖️ So sánh chéo 2 bản PR / Patches (Cross-PR Comparison)
- Đặt 2 bản vá từ lịch sử phân tích lên bàn cân đối đầu.
- AI phân tích so sánh độ phức tạp, thời gian khắc phục ước tính, mức độ rủi ro giữa 2 phương án (PR-A vs PR-B) và khuyến nghị phiên bản an toàn hơn để merge.

---

### 10. 📊 Bảng điều khiển quản trị & Thống kê sử dụng (Admin Usage Analytics)
- **Chỉ số KPI thời gian thực**: Tổng số người dùng, tổng lượt phân tích, tổng tokens Gemini tiêu thụ, chi phí ước tính ($), thời gian phản hồi trung bình (ms), tỷ lệ code an toàn (%).
- **Biểu đồ xu hướng theo ngày (Daily Trends)**: Area Chart trực quan hóa số lượt phân tích và lượng token tiêu thụ theo các mốc 7 ngày, 30 ngày và 90 ngày.
- **Biểu đồ phân bổ rủi ro (Risk Distribution)**: Donut/Pie Chart thể hiện tỷ lệ rủi ro Thấp, Trung bình, Cao và Nghiêm trọng.
- **Bảng xếp hạng (Leaderboards)**:
  - Top thành viên sử dụng nhiều nhất (số lần phân tích, tokens đã dùng).
  - Top kho lưu trữ (Repositories) được phân tích thường xuyên nhất.
- **Xuất dữ liệu**: Hỗ trợ xuất dữ liệu thống kê ra định dạng **CSV** phục vụ báo cáo.

---

### 11. 🛡️ Phân quyền người dùng (Role-Based Access Control - RBAC)
- **3 vai trò phân quyền rõ ràng**:
  - 👑 **ADMIN**: Toàn quyền quản trị hệ thống, thêm/sửa vai trò người dùng, cấu hình Webhook, xem Dashboard Analytics và phân tích diff.
  - 💻 **USER**: Thực hiện phân tích Git Diff, tra cứu lịch sử, tương tác với AI Assistant, sinh mã Auto-Fix.
  - 👁️ **VIEWER**: Chế độ chỉ đọc qua liên kết chia sẻ, tra cứu báo cáo và tải PDF mà không tiêu tốn hạn ngạch token của tổ chức.
- **Bảo vệ dữ liệu cá nhân (PII Masking)**: Tự động ẩn danh địa chỉ email (ví dụ: `u***r@domain.com`) trên giao diện công khai theo quy chuẩn bảo mật.

---

## 🛠️ Kiến trúc công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion |
| **Backend** | Node.js, Express, `crypto` (HMAC-SHA256), Server-Sent Events (SSE) |
| **AI Engine** | Google Gemini API (`@google/genai` - `gemini-3.1-flash-lite` / `gemini-2.5-flash`) |
| **Authentication** | Google OAuth 2.0 / Local Session RBAC (Admin, User, Viewer) |
| **Parsing** | Git Unified Diff AST Parser & Tokenizer |
| **Platform** | Google Cloud Run Container Architecture |

---

## ⚙️ Cài đặt & Khởi chạy dự án

### 1. Yêu cầu hệ thống
- **Node.js**: >= 18.0.0
- **npm** hoặc **yarn**
- **Google Gemini API Key**: Lấy khóa API tại [Google AI Studio](https://aistudio.google.com/)

### 2. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc của dự án (tham khảo mẫu `.env.example`):

```env
# Gemini API Key (Bắt buộc cho backend server)
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub Token (Tùy chọn: Dùng để gọi GitHub API khi phân tích PR riêng tư hoặc post comment tự động)
GITHUB_TOKEN=your_github_personal_access_token_here

# Cổng dịch vụ (Mặc định 3000)
PORT=3000
```

### 3. Cài đặt thư viện & Khởi chạy

```bash
# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy môi trường phát triển (Dev Server)
npm run dev

# Biên dịch sản phẩm (Production Build)
npm run build

# Chạy server sản phẩm
npm run start
```

Sau khi khởi chạy, truy cập ứng dụng tại `http://localhost:3000`.

---

## 📡 Tài liệu API Backend

### 1. Phân tích Git Diff (Sync & SSE Stream)
- **Endpoint**: `POST /api/analyze-diff` hoặc `POST /api/analyze/stream`
- **Body**:
  ```json
  {
    "diffContent": "diff --git a/server.js b/server.js...",
    "language": "vi",
    "focusArea": "all"
  }
  ```

### 2. Tự động đề xuất sửa lỗi (Auto-Fix Code Suggestion)
- **Endpoint**: `POST /api/suggest-fix` hoặc `POST /api/analyze/fix-suggestion`
- **Body**:
  ```json
  {
    "diffContent": "...",
    "risk": {
      "category": "Bảo mật",
      "severity": "HIGH",
      "description": "SQL Injection tiềm ẩn do nối chuỗi trực tiếp"
    },
    "language": "vi"
  }
  ```

### 3. Trợ lý Chat AI về Git Diff
- **Endpoint**: `POST /api/diff-chat`
- **Body**:
  ```json
  {
    "message": "Viết giúp tôi kịch bản kiểm thử đơn vị cho đoạn code này",
    "diffContext": "...",
    "history": [],
    "language": "vi"
  }
  ```

### 4. So sánh đối chiếu 2 Pull Request (PR Comparison)
- **Endpoint**: `POST /api/compare/pr-analysis`
- **Body**:
  ```json
  {
    "prA": { "title": "PR #1", "riskLevel": "HIGH", "riskScore": 8, "analysis": { ... } },
    "prB": { "title": "PR #2", "riskLevel": "LOW", "riskScore": 2, "analysis": { ... } },
    "language": "vi"
  }
  ```

### 5. Chia sẻ Báo cáo trực tuyến (Viewer Share Links)
- **Tạo link chia sẻ**: `POST /api/share/create`
- **Xem báo cáo**: `GET /api/share/:shareId`

### 6. Webhook GitHub CI/CD
- **Endpoint**: `POST /api/webhook/github`
- **Headers**:
  - `x-hub-signature-256`: `sha256=...` (Chữ ký mã hóa HMAC-SHA256)
  - `x-github-event`: `pull_request`

### 7. Thống kê sử dụng & Quản trị (Admin Analytics)
- **Endpoint**: `GET /api/admin/analytics` hoặc `GET /api/admin/analytics/overview`
- **Chi tiết xu hướng**: `GET /api/admin/analytics/trends?period=30d`

---

## 🔒 Bảo mật & Quyền riêng tư

- **Server-Side AI Proxy**: Toàn bộ lệnh gọi tới Google Gemini API được thực hiện độc quyền ở phía máy chủ (**Server-Side Only**), ngăn ngừa tuyệt đối nguy cơ rò rỉ API Key ra trình duyệt.
- **Xác thực mã hóa Webhook HMAC-SHA256**: Kiểm tra toàn vẹn payload gửi đến, bảo vệ hệ thống khỏi các cuộc tấn công giả mạo (Spoofing / Replay Attacks).
- **Bộ tự động sửa lỗi chuỗi JSON (Safe JSON Auto-Repair Engine)**: Hệ thống tích hợp thuật toán khôi phục dữ liệu JSON bị ngắt giữa chừng do dung lượng phản hồi lớn, ngăn chặn triệt để lỗi sập ứng dụng khi phân tích các PR lớn.
- **Bảo vệ hạn ngạch Token (Quota Protection)**: Chế độ liên kết Viewer cho phép người xem tra cứu báo cáo hoàn toàn miễn phí mà không kích hoạt thêm lượt gọi API tốn chi phí.

---

## 📄 Bản quyền & Giấy phép

Phát triển bởi **PatchWise AI Team**. Phát hành theo giấy phép **Apache-2.0 License**.
