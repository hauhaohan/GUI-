# 📋 API Documentation — Home Services

> **Base URL:** `http://localhost:8080`  
> **Kiến trúc:** Spring Boot + JWT Authentication + PostgreSQL + OpenAI GPT-4o-mini  
> **JWT Expiration:** 18,000,000ms (~5 giờ)

---

## 🔐 Authentication

| Endpoint | Auth Required |
|---|---|
| `POST /api/auth/**` | ❌ Public |
| Tất cả `/api/admin/**` | ✅ Bearer JWT |

**Header cho các endpoint bảo mật:**
```
Authorization: Bearer <token>
```

---

## 📦 Response Wrapper chung

Mọi API đều trả về cấu trúc `ApiResponse<T>`:

```json
{
  "status": "success" | "error",
  "message": "string",
  "data": "<T> | null"
}
```

---

## 1. Auth APIs — `/api/auth`

### 1.1 Login
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "string (required, not blank)",
  "password": "string (required, not blank)"
}
```

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Login success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "userId": 1,
    "fullName": "Nguyen Van A",
    "role": "ADMIN"
  }
}
```

**Response `400 Bad Request` (validation failed):**
```json
{
  "status": "error",
  "message": "must not be blank",
  "data": null
}
```

---

## 2. Assistant APIs — `/api/admin` *(Yêu cầu JWT)*

### 2.1 Hỏi AI / Chat với Database
```
POST /api/admin/chat/ask
```

**Request Body:**
```json
{
  "sessionId": 123,
  "question": "string (required, 5–500 ký tự)"
}
```

> 📝 `sessionId` là **optional** — nếu không truyền, hệ thống sẽ tạo session mới.

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Query success",
  "data": {
    "sessionId": 123,
    "messageId": 456,
    "aiMessage": "Tổng doanh thu tháng 8 là 125,000,000 VNĐ.",
    "sqlQuery": "SELECT SUM(total_amount) FROM bookings WHERE ...",
    "chartType": "BAR_CHART",
    "tableData": [
      { "month": "2026-08", "revenue": 125000000 }
    ],
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 50
  }
}
```

`chartType` có thể là:
- `BAR_CHART` — Biểu đồ cột
- `PIE_CHART` — Biểu đồ tròn
- `METRIC` — Chỉ số đơn lẻ
- `TABLE` — Bảng dữ liệu thuần

---

### 2.2 Lấy danh sách Chat Sessions (Phân trang)
```
GET /api/admin/chat?page=1&size=10
```

**Query Parameters:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `page` | `int` | `1` | Trang hiện tại (1-based) |
| `size` | `int` | `10` | Số sessions mỗi trang |

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Sessions retrieved successfully",
  "data": {
    "items": [
      {
        "id": 123,
        "title": "Doanh thu tháng 8/2026",
        "lastMessage": "Tổng doanh thu tháng 8 là...",
        "totalMessage": 4,
        "isPinned": false,
        "lastMessageAt": "2026-10-14T22:00:00"
      }
    ],
    "currentPage": 1,
    "pageSize": 10,
    "totalElements": 25,
    "totalPages": 3,
    "hasNext": true
  }
}
```

---

### 2.3 Cập nhật Session (Đổi tiêu đề / Ghim)
```
PATCH /api/admin/chat/{id}
```

**Request Body:**
```json
{
  "title": "Tiêu đề mới (optional)",
  "isPinned": true
}
```

> 📝 Cả 2 trường đều là **optional** — chỉ cập nhật trường được truyền lên.

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Session updated successfully",
  "data": {
    "id": 123,
    "title": "Tiêu đề mới",
    "lastMessage": "...",
    "totalMessage": 4,
    "isPinned": true,
    "lastMessageAt": "2026-10-14T22:00:00"
  }
}
```

---

### 2.4 Xóa mềm Session
```
DELETE /api/admin/chat/{id}
```

> ⚠️ Thao tác xóa mềm (`is_deleted = true`). Session sẽ không còn xuất hiện trong danh sách.

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Session deleted successfully",
  "data": null
}
```

---

### 2.5 Lấy danh sách tin nhắn trong phiên chat (Chat Messages)
```
GET /api/admin/chat/{sessionId}/messages?page=1&size=50
```

**Path Parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `sessionId` | `Long` | ID của chat session |

**Query Parameters:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `page` | `int` | `1` | Trang hiện tại |
| `size` | `int` | `10` | Số tin nhắn mỗi trang (mặc định 10, có thể truyền 50 để lấy trọn vẹn) |

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Chat messages retrieved successfully",
  "data": {
    "items": [
      {
        "id": 10,
        "chatSessionId": 1,
        "role": "AI",
        "content": "Có 5 đơn đặt hàng trong tháng này...",
        "sqlGenerated": "SELECT * FROM orders WHERE ...",
        "chartType": "TABLE",
        "createdAt": "2026-10-14T22:00:00"
      },
      {
        "id": 9,
        "chatSessionId": 1,
        "role": "USER",
        "content": "Top thợ doanh thu tháng 08/2026?",
        "sqlGenerated": null,
        "chartType": null,
        "createdAt": "2026-10-14T21:55:00"
      }
    ],
    "currentPage": 1,
    "pageSize": 50,
    "totalElements": 6,
    "totalPages": 1,
    "hasNext": false
  }
}
```

> 📝 **Lưu ý:** Backend trả về danh sách sắp xếp theo `createdAt DESC` (tin nhắn mới nhất đứng đầu). Phía client đảo ngược mảng để hiển thị theo dòng thời gian hội thoại (cũ ở trên, mới ở dưới) và tự động cuộn xuống tin nhắn mới nhất.

---

### 2.6 Lấy dữ liệu chi tiết của 1 tin nhắn cũ
```
GET /api/admin/chat/message/{messageId}
```

**Path Parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `messageId` | `Long` | ID của chat message cần lấy dữ liệu (phải là ID của tin nhắn AI) |

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "message data get",
  "data": {
    "messageId": 12,
    "tableData": [
      { "id": 1, "name": "Dịch vụ vệ sinh", "price": 150000 },
      { "id": 2, "name": "Sửa điện nước", "price": 250000 }
    ],
    "chartType": "TABLE",
    "currentPage": 0,
    "totalPages": 3,
    "totalRecords": 25
  }
}
```

> 📝 **Lưu ý quan trọng về `messageId` & Liên kết Q&A trên GUI:**
> - Trong CSDL backend (`AssistantController.getData`), câu lệnh SQL (`sqlGenerated`) và dữ liệu thực tế gắn liền với **tin nhắn của AI** (role `AI`/`assistant`), không nằm ở câu hỏi của USER.
> - Do đó khi gọi API này, hệ thống **luôn sử dụng `messageId` của câu trả lời AI phía dưới**.
> - Trên giao diện GUI:
>   - Khi hover vào câu hỏi của User hoặc câu trả lời của AI, hệ thống hiển thị một **đường nối trực quan (connecting line)** kèm nhãn `↳ Câu trả lời của AI cho câu hỏi phía trên`.
>   - Cả tin nhắn User và tin nhắn AI đều có nút **"Xem dữ liệu"**, khi click sẽ gọi API với ID của tin nhắn AI và nạp bảng dữ liệu / biểu đồ vào panel bên phải.

---

## 3. Reports APIs — `/api/admin/reports` *(Yêu cầu JWT)*

### 3.1 Lấy danh sách tất cả reports
```
GET /api/admin/reports
```

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Reports retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Doanh thu tháng 08/2026",
      "description": "Báo cáo tổng hợp doanh thu theo dịch vụ",
      "rawSql": "SELECT s.name, SUM(p.amount) ...",
      "chartType": "BAR_CHART",
      "isArchived": false,
      "createdAt": "2026-10-28T10:00:00+07:00",
      "schedules": [
        {
          "id": 1,
          "cronExpression": "0 8 * * 1",
          "isActive": true,
          "lastRunAt": "2026-10-28T08:00:00+07:00",
          "nextRunAt": "2026-11-04T08:00:00+07:00"
        }
      ]
    }
  ]
}
```

---

### 3.2 Lấy kết quả snapshot mới nhất của 1 report
```
GET /api/admin/reports/{id}/latest-data
```

**Path Parameters:**
- `id`: Long (Report ID)

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Latest snapshot retrieved successfully",
  "data": {
    "historyId": 101,
    "reportId": 1,
    "reportTitle": "Doanh thu tháng 08/2026",
    "status": "SUCCESS",
    "resultData": [
      { "dich_vu": "Dọn dẹp vệ sinh", "doanh_thu": 25400000 },
      { "dich_vu": "Sửa điện nước", "doanh_thu": 18200000 },
      { "dich_vu": "Vệ sinh máy lạnh", "doanh_thu": 12800000 }
    ],
    "totalRecords": 3,
    "executionDurationMs": 245,
    "errorMessage": null,
    "executedAt": "2026-11-04T08:00:00+07:00"
  }
}
```

> 📊 **Trực quan hóa trên GUI:**
> - Khi người dùng ấn **"Kết quả gần nhất"** hoặc sau khi ấn **"Chạy ngay"**, giao diện tự động hiển thị kết quả snapshot kèm **biểu đồ trực quan** (`DataChart` tương ứng với `chartType`: `BAR_CHART`, `PIE_CHART`, `METRIC`, `TABLE`).
> - Modal hỗ trợ 3 chế độ xem: `[Cả hai]` (hiển thị cả biểu đồ và bảng), `[Biểu đồ]`, `[Bảng]`.
> - Trên **Dashboard**: Hỗ trợ chuyển đổi toggle xem `[Biểu đồ]` hoặc `[Bảng]` cho toàn Dashboard cũng như trên từng card báo cáo tự động / widget đã ghim.

---

### 3.3 Kích hoạt chạy ngay report
```
POST /api/admin/reports/{id}/run-now
```

**Path Parameters:**
- `id`: Long (Report ID)

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Report execution triggered",
  "data": null
}
```

---

## ❌ Error Responses

| HTTP Status | Khi nào xảy ra |
|---|---|
| `400 Bad Request` | Validation thất bại (`@NotBlank`, `@Size`, ...) hoặc `IllegalArgumentException` |
| `401 Unauthorized` | Token JWT không hợp lệ hoặc thiếu |
| `500 Internal Server Error` | Lỗi hệ thống bất kỳ |

**Cấu trúc lỗi:**
```json
{
  "status": "error",
  "message": "Mô tả lỗi cụ thể",
  "data": null
}
```

---

## 🗂️ Tóm tắt tất cả APIs

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Đăng nhập, nhận JWT token |
| `POST` | `/api/admin/chat/ask` | ✅ | Gửi câu hỏi cho AI, truy vấn DB |
| `GET` | `/api/admin/chat` | ✅ | Lấy danh sách sessions (có phân trang) |
| `PATCH` | `/api/admin/chat/{id}` | ✅ | Cập nhật tiêu đề / ghim session |
| `DELETE` | `/api/admin/chat/{id}` | ✅ | Xóa mềm session |
| `GET` | `/api/admin/chat/{sessionId}/messages` | ✅ | Lấy danh sách tin nhắn trong phiên (order by mới nhất) |
| `GET` | `/api/admin/chat/message/{messageId}` | ✅ | Lấy dữ liệu kết quả & bảng của tin nhắn cũ (`getData`) |
| `GET` | `/api/admin/reports` | ✅ | Lấy danh sách tất cả reports và lịch chạy |
| `POST` | `/api/admin/reports` | ✅ | Tạo report mới từ câu lệnh SQL |
| `POST` | `/api/admin/reports/{id}/run-now` | ✅ | Kích hoạt chạy report ngay lập tức |
| `GET` | `/api/admin/reports/{id}/latest-data` | ✅ | Lấy snapshot kết quả dữ liệu mới nhất của report |
| `POST` | `/api/admin/reports/schedules` | ✅ | Đặt lịch chạy tự động cho report (cron expression) |
| `PATCH` | `/api/admin/reports/schedules/{id}/toggle` | ✅ | Kích hoạt hoặc tạm dừng lịch chạy report |
