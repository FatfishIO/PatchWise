# PatchWise AI - Smart Git Diff & Pull Request Security Intelligence

<div align="center">
  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=PatchWise" alt="PatchWise AI Logo" width="96" height="96" />
  <h3>Bảo mật & Phân tích Git Diff thông minh với Google Gemini AI</h3>
  <p>Tự động hóa phân tích Pull Request, kiểm tra lỗ hổng bảo mật, giải thích nguyên nhân gốc rễ, đề xuất mã sửa lỗi tự động và tích hợp CI/CD Webhook cho GitHub & GitLab.</p>
</div>

---

## 🌟 Tổng quan dự án

**PatchWise AI** là nền tảng toàn diện hỗ trợ các kỹ sư phần mềm, Tech Lead, SecOps và QA trong việc đánh giá rủi ro của các bản vá mã nguồn (**Git Diff / Patch / Pull Request**). Sử dụng mô hình **Google Gemini 2.5 Flash**, PatchWise AI phân tích sâu từng hunk mã nguồn, phát hiện các lỗ hổng bảo mật (SQL Injection, XSS, Race Condition, v.v.), đánh giá nguy cơ phá vỡ tính tương thích (Breaking Change), tự động tạo mã khắc phục (Auto-Fix) và đồng bộ trực tiếp lên Pull Request thông qua Webhook.

---

## 🚀 Các tính năng chính

### 1. 🔍 Phân tích Git Diff chuyên sâu với Gemini AI
- **Tóm tắt thay đổi (Summary)**: Bóc tách logic cấp cao của PR, số lượng file, dòng thêm/xóa.
- **Nguyên nhân gốc rễ (Root Cause Analysis)**: Xác định mục tiêu tác giả và bài toán lập trình viên đang giải quyết.
- **Đánh giá rủi ro (Risk Scoring & Classification)**: Chấm điểm rủi ro từ **1 đến 10** và phân loại nguy cơ (**LOW / MEDIUM / HIGH**) cho:
  - 🛡️ **Bảo mật (Security)**: SQL Injection, Hardcoded Secrets, Insecure Deserialization, XSS, CSRF, v.v.
  - ⚡ **Hiệu năng (Performance)**: N+1 query, Memory leak, CPU bottleneck, vòng lặp vô tận.
  - 💥 **Tính tương thích (Breaking Changes)**: Thay đổi API contract, database schema, types.
- **Checklist kiểm thử cho Reviewer**: Hướng dẫn các ca kiểm thử biên (Edge cases) cần thực hiện trước khi merge.
- **Giải thích từng khối mã (Hunk Explanations)**: Đi sâu vào logic cụ thể của từng đoạn code thay đổi.

### 2. ⚡ AI Auto-Fix (Đề xuất giải pháp sửa lỗi & Unit Test)
- Tại mỗi cảnh báo rủi ro, người dùng có thể nhấn **"💡 Đề xuất Fix"**.
- Gemini AI tự động tạo đoạn mã đã khắc phục theo chuẩn Clean Code & Security Best Practices.
- Cung cấp sẵn mã kiểm thử đơn vị (**Unit Test**) để phòng ngừa hồi quy (Regression Test).
- Hỗ trợ xem Diff trực quan (**Before vs. After**) và sao chép mã 1-click.

### 3. 🤖 Tích hợp Webhook GitHub / GitLab (CI/CD Automation)
- **Tự động nhận diện Pull Request**: Lắng nghe các sự kiện `pull_request.opened`, `pull_request.synchronize`, `pull_request.reopened` từ GitHub hoặc `Merge Request Hook` từ GitLab.
- **Bảo mật Webhook Secret**: Tự động xác thực chữ ký HMAC-SHA256 (`x-hub-signature-256` / `X-Gitlab-Token`).
- **Tự động comment lên PR**: Tự động gọi GitHub/GitLab REST API để gửi nhận xét đánh giá rủi ro và checklist trực tiếp lên PR.
- **Nhật ký Webhook (Audit Logs)**: Lưu trữ lịch sử tất cả payload, trạng thái phân tích, mã HTTP và thời gian xử lý.
- **Công cụ Test Webhook (Simulator)**: Cho phép mô phỏng sự kiện Webhook ngay trên giao diện để kiểm thử mà không cần trigger git push thật.

### 4. 📊 Bảng điều khiển quản trị & Thống kê sử dụng (Admin Usage Analytics)
- **Chỉ số KPI thời gian thực**: Tổng số lượt phân tích, tổng tokens tiêu thụ, thời gian phản hồi trung bình (ms), tỷ lệ thành công (%).
- **Phân bổ rủi ro (Risk Distribution)**: Biểu đồ trực quan tỷ lệ rủi ro Thấp, Trung bình, Cao.
- **Xu hướng theo ngày (Daily Trends)**: Biểu đồ Area/Bar chart theo dõi lượng truy vấn và token theo thời gian.
- **Top danh mục rủi ro phổ biến**: Thống kê các lỗi thường gặp nhất trong mã nguồn đội ngũ.
- **Xuất dữ liệu**: Hỗ trợ xuất dữ liệu phân tích ra định dạng JSON/CSV.

### 5. 🛡️ Phân quyền người dùng (Role-Based Access Control - RBAC)
- **3 vai trò chuẩn**:
  - **ADMIN**: Toàn quyền quản trị hệ thống, quản lý tài khoản, cấu hình Webhook, xem Dashboard Analytics và phân tích diff.
  - **USER**: Thực hiện phân tích Git Diff, tra cứu lịch sử, tương tác với AI Assistant, cấu hình Webhook dự án.
  - **VIEWER**: Chế độ chỉ đọc, xem kết quả phân tích và lịch sử kiểm toán, không tiêu tốn token của tổ chức.
- **Bảo vệ dữ liệu nhạy cảm**: Tự động ẩn danh địa chỉ email, bảo vệ dữ liệu PII và lưu trữ an toàn.

### 6. 📄 Xuất báo cáo kiểm toán chuyên nghiệp (Print & Export PDF)
- Xuất toàn bộ báo cáo phân tích rủi ro dưới dạng bản in chuẩn hóa (**Print-ready A4 PDF layout**).
- Tích hợp xuất định dạng **Markdown** chuẩn để dán vào Jira, GitHub Issue hoặc Confluence.

### 7. ⚖️ So sánh chéo 2 bản PR / Patches (Cross-PR Comparison)
- Cho phép đặt 2 bản vá cạnh nhau để đối chiếu độ phức tạp, điểm rủi ro, số dòng thay đổi và các phát hiện bảo mật giữa các phiên bản.

---

## 🛠️ Kiến trúc công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion |
| **Backend** | Node.js, Express, `crypto` (HMAC-SHA256), Server-Sent Events (SSE) |
| **AI Engine** | Google Gemini API (`@google/genai` - `gemini-2.5-flash`) |
| **Authentication** | Google OAuth 2.0 Identity Services + Demo Session Fallback |
| **Parsing** | Git Unified Diff AST Parser & Tokenizer |

---

## ⚙️ Cài đặt & Khởi chạy dự án

### 1. Yêu cầu hệ thống
- **Node.js**: >= 18.0.0
- **npm** hoặc **yarn**
- **Google Gemini API Key**: Lấy tại [Google AI Studio](https://aistudio.google.com/)

### 2. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc của dự án:

```env
# Gemini API Key (Bắt buộc cho server)
GEMINI_API_KEY=your_gemini_api_key_here

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

### 1. Phân tích Git Diff
- **Endpoint**: `POST /api/analyze-diff`
- **Body**:
  ```json
  {
    "diffContent": "diff --git a/server.js b/server.js...",
    "language": "vi",
    "focusArea": "all"
  }
  ```

### 2. Tự động đề xuất sửa lỗi (Auto-Fix)
- **Endpoint**: `POST /api/suggest-fix`
- **Body**:
  ```json
  {
    "risk": {
      "category": "SQL Injection",
      "severity": "HIGH",
      "description": "User input directly concatenated into query"
    },
    "diffContent": "...",
    "language": "vi"
  }
  ```

### 3. Webhook GitHub CI/CD
- **Endpoint**: `POST /api/webhook/github`
- **Headers**:
  - `x-hub-signature-256`: `sha256=...` (Chữ ký HMAC)
  - `x-github-event`: `pull_request`

### 4. Thống kê sử dụng (Admin Analytics)
- **Endpoint**: `GET /api/admin/analytics?timeRange=30d`

---

## 🔒 Bảo mật & Quyền riêng tư
- Toàn bộ lệnh gọi tới Gemini AI được thực hiện độc quyền ở phía máy chủ (**Server-Side Only**), ngăn ngừa rò rỉ API Key ra trình duyệt.
- Dữ liệu định danh cá nhân (PII) như email người dùng được tự động ẩn danh hóa trên giao diện quản trị theo yêu cầu bảo mật.
- Xác thực chữ ký mã hóa Webhook bảo vệ hệ thống khỏi các cuộc tấn công giả mạo (Replay / Spoofing Attacks).

---

## 📄 Bản quyền & Giấy phép
Phát triển với ❤️ bởi **PatchWise AI Team**. Phát hành theo giấy phép **Apache-2.0 License**.
