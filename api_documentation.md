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
    "aiMessage": "Có 5 đơn đặt hàng trong tháng này...",
    "sqlQuery": "SELECT * FROM orders WHERE ...",
    "tableData": [
      { "id": 1, "name": "Dịch vụ vệ sinh", "price": 150000 },
      { "id": 2, "name": "Sửa điện nước", "price": 250000 }
    ]
  }
}
```

**Response `400 Bad Request` (validation failed):**
```json
{
  "status": "error",
  "message": "Question can not blank",
  "data": null
}
```

---

### 2.2 Lấy danh sách Chat Sessions
```
GET /api/admin/chat?page=1&size=10&keyword=
```

**Query Parameters:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `page` | `int` | `1` | Trang hiện tại |
| `size` | `int` | `10` | Số item mỗi trang |
| `keyword` | `string` | *(tùy chọn)* | Tìm kiếm theo từ khóa |

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Chat list get",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Thống kê đơn hàng tháng 10",
        "lastMessage": "Tổng có 42 đơn hàng...",
        "totalMessage": 6,
        "isPinned": true,
        "category": "analytics",
        "dataSource": "orders",
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

### 2.3 Cập nhật Chat Session
```
PATCH /api/admin/chat/{id}
```

**Path Parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `Long` | ID của chat session |

**Request Body:**
```json
{
  "newTitle": "Tên mới cho session",
  "isPinned": true
}
```

> 📝 Tất cả fields đều **optional** — chỉ truyền field cần thay đổi.

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Chat updated",
  "data": {
    "id": 1,
    "title": "Tên mới cho session",
    "lastMessage": "...",
    "totalMessage": 6,
    "isPinned": true,
    "category": "analytics",
    "dataSource": "orders",
    "lastMessageAt": "2026-10-14T22:00:00"
  }
}
```

---

### 2.4 Xóa mềm Chat Session
```
DELETE /api/admin/chat/{id}
```

**Path Parameters:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `Long` | ID của chat session cần xóa |

**Response `200 OK`:**
```json
{
  "status": "success",
  "message": "Chat deleted",
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
