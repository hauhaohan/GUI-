// src/services/chatService.js
// Dịch vụ trợ lý AI & Chat Sessions (/api/admin) theo api_documentation.md

import { apiRequest, authStorage } from './apiClient';

// Bộ dữ liệu mẫu dùng khi backend chưa bật hoặc bật chế độ demo
let mockSessions = [
  {
    id: 1,
    title: 'Top thợ doanh thu tháng 08/2026',
    lastMessage: 'Đã cập nhật danh sách với điều kiện doanh thu > 10.000.000đ — còn lại 3 thợ thỏa điều kiện.',
    totalMessage: 6,
    isPinned: true,
    category: 'Doanh thu',
    dataSource: 'homeservice_prod',
    lastMessageAt: '2026-10-14T22:00:00',
  },
  {
    id: 2,
    title: 'Phân tích đơn hủy tháng 7/2026',
    lastMessage: 'Tỷ lệ hủy cao nhất ở dịch vụ Sửa điện nước với 18% tổng số đơn hủy.',
    totalMessage: 4,
    isPinned: false,
    category: 'Đơn hàng',
    dataSource: 'homeservice_prod',
    lastMessageAt: '2026-10-13T14:30:00',
  },
  {
    id: 3,
    title: 'Thống kê dịch vụ phổ biến quý 3',
    lastMessage: 'Dịch vụ Dọn dẹp vệ sinh chiếm 52% tổng doanh thu trong quý.',
    totalMessage: 8,
    isPinned: false,
    category: 'Doanh thu',
    dataSource: 'analytics_dw',
    lastMessageAt: '2026-10-12T09:15:00',
  },
  {
    id: 4,
    title: 'Hiệu suất thợ mới gia nhập tháng 9',
    lastMessage: 'Có 12 thợ mới đạt tỷ lệ hoàn thành trên 90%.',
    totalMessage: 2,
    isPinned: false,
    category: 'Nhân sự',
    dataSource: 'homeservice_prod',
    lastMessageAt: '2026-10-11T16:45:00',
  },
];

// Mock tin nhắn theo từng session (ChatMessageDto)
let mockMessagesMap = {
  1: [
    {
      id: 101,
      chatSessionId: 1,
      role: 'USER',
      content: 'Liệt kê danh sách top thợ có doanh thu cao nhất trong tháng 08/2026 kèm số lượng đơn hoàn thành?',
      sqlGenerated: null,
      chartType: null,
      createdAt: '2026-10-14T21:55:00',
    },
    {
      id: 102,
      chatSessionId: 1,
      role: 'AI',
      content: `### 📊 Kết quả phân tích thợ tháng 08/2026\nĐã cập nhật danh sách với điều kiện **doanh thu > 10.000.000đ** — còn lại **3 thợ** thỏa điều kiện:\n\n- 🥇 **Nguyễn Văn A**: 15.500.000 đ *(45 đơn dọn dẹp)*\n- 🥈 **Trần Thị B**: 12.000.000 đ *(30 đơn điện nước)*\n- 🥉 **Lê Văn C**: 10.000.000 đ *(25 đơn sửa chữa)*\n\n> 💡 *Dữ liệu đã được tính toán dựa trên các đơn COMPLETED.*`,
      sqlGenerated: `SELECT t.full_name AS ten_tho, s.name AS dich_vu, COUNT(b.id) AS don_hoan_thanh, SUM(p.amount) AS doanh_thu\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN services s ON b.service_id = s.id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.id, t.full_name, s.name\nHAVING SUM(p.amount) > 10000000\nORDER BY doanh_thu DESC;`,
      chartType: 'TABLE',
      createdAt: '2026-10-14T22:00:00',
    },
  ],
  2: [
    {
      id: 201,
      chatSessionId: 2,
      role: 'USER',
      content: 'Phân tích tỷ lệ đơn hủy trong tháng 7/2026 theo từng loại dịch vụ?',
      sqlGenerated: null,
      chartType: null,
      createdAt: '2026-10-13T14:25:00',
    },
    {
      id: 202,
      chatSessionId: 2,
      role: 'AI',
      content: `### ⚠️ Thống kê đơn hủy tháng 7/2026\nTỷ lệ hủy cao nhất ở dịch vụ **Sửa điện nước** với 18% tổng số đơn hủy.\n\n- **Sửa điện nước**: 24 đơn hủy (18.2%)\n- **Sửa máy giặt**: 15 đơn hủy (11.5%)\n- **Vệ sinh nhà**: 8 đơn hủy (4.1%)`,
      sqlGenerated: `SELECT s.name AS dich_vu, COUNT(b.id) AS don_huy, ROUND(100.0 * COUNT(b.id) / SUM(COUNT(b.id)) OVER(), 2) AS ty_le_huy\nFROM bookings b\nJOIN services s ON b.service_id = s.id\nWHERE b.status = 'CANCELLED'\nGROUP BY s.name\nORDER BY don_huy DESC;`,
      chartType: 'BAR_CHART',
      createdAt: '2026-10-13T14:30:00',
    },
  ],
  3: [
    {
      id: 301,
      chatSessionId: 3,
      role: 'USER',
      content: 'Thống kê dịch vụ phổ biến và tỷ trọng doanh thu trong quý 3?',
      sqlGenerated: null,
      chartType: null,
      createdAt: '2026-10-12T09:10:00',
    },
    {
      id: 302,
      chatSessionId: 3,
      role: 'AI',
      content: `### 📈 Dịch vụ phổ biến Quý 3\nDịch vụ **Dọn dẹp vệ sinh** chiếm **52%** tổng doanh thu trong quý, tiếp theo là **Sửa điện nước** (28%) và **Sơn sửa nhà** (20%).`,
      sqlGenerated: `SELECT s.name AS dich_vu, SUM(p.amount) AS doanh_thu\nFROM services s\nJOIN bookings b ON s.id = b.service_id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY s.name\nORDER BY doanh_thu DESC;`,
      chartType: 'PIE_CHART',
      createdAt: '2026-10-12T09:15:00',
    },
  ],
  4: [
    {
      id: 401,
      chatSessionId: 4,
      role: 'USER',
      content: 'Đánh giá hiệu suất các thợ mới gia nhập vào tháng 9?',
      sqlGenerated: null,
      chartType: null,
      createdAt: '2026-10-11T16:40:00',
    },
    {
      id: 402,
      chatSessionId: 4,
      role: 'AI',
      content: `### 👨‍🔧 Hiệu suất thợ mới tháng 9\nCó 12 thợ mới đạt tỷ lệ hoàn thành trên 90% với điểm đánh giá trung bình **4.8/5.0 sao**.`,
      sqlGenerated: `SELECT t.full_name AS ten_tho, COUNT(b.id) AS don_nhan, SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) AS don_xong\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nWHERE t.created_at >= '2026-09-01'\nGROUP BY t.id, t.full_name;`,
      chartType: 'TABLE',
      createdAt: '2026-10-11T16:45:00',
    },
  ],
};

export const chatService = {
  /**
   * 2.1 Hỏi AI / Chat với Database — POST /api/admin/chat/ask
   * @param {string} question - Câu hỏi (5-500 ký tự)
   * @param {number|null} sessionId - Session ID (optional)
   */
  async askQuestion(question, sessionId = null) {
    if (!question || question.trim().length < 5) {
      throw new Error('Câu hỏi phải chứa từ 5 đến 500 ký tự.');
    }
    if (question.trim().length > 500) {
      throw new Error('Câu hỏi không được vượt quá 500 ký tự.');
    }

    const payload = {
      question: question.trim(),
    };
    if (sessionId) {
      payload.sessionId = Number(sessionId);
    }

    try {
      const data = await apiRequest('/api/admin/chat/ask', {
        method: 'POST',
        body: payload,
      });
      return data;
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn('Backend chưa chạy, đang giả lập phản hồi AI...');
        await new Promise((r) => setTimeout(r, 800)); // mô phỏng độ trễ AI

        const newSessionId = sessionId || (mockSessions.length > 0 ? Math.max(...mockSessions.map((s) => s.id)) + 1 : 1);
        
        let aiMessage = `### 📊 Kết quả phân tích dữ liệu AI\nĐã phân tích câu hỏi: **"${question}"**\n\nHệ thống đã truy vấn cơ sở dữ liệu **PostgreSQL (homeservice_prod)** và trích xuất dữ liệu thành công:\n- **Tổng số thợ nổi bật**: 5 thợ có doanh thu cao nhất.\n- **Tổng doanh thu ước tính**: **53.200.000 đ**\n- **Dịch vụ phổ biến**: *Dọn dẹp vệ sinh* và *Sửa điện nước*.\n\n> 💡 **Khuyến nghị nghiệp vụ**: Nên áp dụng chính sách thưởng tháng cho các thợ có trên 30 đơn hoàn thành và doanh thu > 10 triệu đồng.`;
        let sqlQuery = `SELECT t.full_name AS ten_tho, s.name AS dich_vu, COUNT(b.id) AS don_hoan_thanh, SUM(p.amount) AS doanh_thu\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN services s ON b.service_id = s.id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.id, t.full_name, s.name\nORDER BY doanh_thu DESC\nLIMIT 5;`;
        
        let tableData = [
          { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp vệ sinh', don_hoan_thanh: 45, doanh_thu: 15500000 },
          { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Sửa điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
          { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa điện lạnh', don_hoan_thanh: 25, doanh_thu: 10000000 },
          { id: 4, ten_tho: 'Phạm Minh D', dich_vu: 'Dọn dẹp văn phòng', don_hoan_thanh: 22, doanh_thu: 8500000 },
          { id: 5, ten_tho: 'Hoàng Anh E', dich_vu: 'Vệ sinh máy lạnh', don_hoan_thanh: 18, doanh_thu: 7200000 },
        ];

        // Cập nhật hoặc thêm session mock
        const existingSession = mockSessions.find((s) => s.id === newSessionId);
        if (existingSession) {
          existingSession.lastMessage = aiMessage;
          existingSession.totalMessage = (existingSession.totalMessage || 0) + 2;
          existingSession.lastMessageAt = new Date().toISOString();
        } else {
          mockSessions.unshift({
            id: newSessionId,
            title: question.length > 35 ? question.slice(0, 35) + '...' : question,
            lastMessage: aiMessage,
            totalMessage: 2,
            isPinned: false,
            category: 'Doanh thu',
            dataSource: 'homeservice_prod',
            lastMessageAt: new Date().toISOString(),
          });
        }

        // Lưu tin nhắn mock
        if (!mockMessagesMap[newSessionId]) {
          mockMessagesMap[newSessionId] = [];
        }
        mockMessagesMap[newSessionId].push({
          id: Date.now() - 500,
          chatSessionId: newSessionId,
          role: 'USER',
          content: question.trim(),
          sqlGenerated: null,
          chartType: null,
          createdAt: new Date().toISOString(),
        });
        mockMessagesMap[newSessionId].push({
          id: Date.now(),
          chatSessionId: newSessionId,
          role: 'AI',
          content: aiMessage,
          sqlGenerated,
          chartType: 'TABLE',
          createdAt: new Date().toISOString(),
        });

        return {
          sessionId: newSessionId,
          messageId: Date.now(),
          aiMessage,
          sqlQuery,
          tableData,
          chartType: 'TABLE',
          currentPage: 1,
          totalPages: 1,
          totalRecords: tableData.length,
        };
      }
      throw error;
    }
  },

  /**
   * 2.1b Hỏi AI qua SSE Streaming — GET /api/admin/ask/stream
   * 
   * Backend (Spring SseEmitter) gửi events theo format:
   *   event:STATUS
   *   data:"Initializing session & message history..."
   *   
   *   event:RESULT
   *   data:{"sessionId":1,"messageId":2,"aiMessage":"...","sqlQuery":"...","tableData":[...],"chartType":"TABLE","currentPage":1,"totalPages":3,"totalRecords":25}
   *   
   *   event:ERROR
   *   data:"Error message here"
   *
   * Lưu ý: sendEvent() của backend dùng objectMapper.writeValueAsString(data),
   * nên String sẽ bị wrap thêm dấu ngoặc kép ("\"...\"""), 
   * còn Object (AiQueryResponseData) sẽ là JSON object string.
   *
   * @param {string} question
   * @param {number|null} sessionId
   * @param {Object} callbacks - { onStatus, onResult, onError, onComplete }
   * @returns {{ close: Function }} - Trả về object có close() để hủy kết nối
   */
  askQuestionStream(question, sessionId = null, callbacks = {}) {
    const { onStatus, onResult, onError, onComplete } = callbacks;

    if (!question || question.trim().length < 5) {
      onError?.('Câu hỏi phải chứa từ 5 đến 500 ký tự.');
      return null;
    }

    const baseUrl = authStorage.getBaseUrl() || '';
    const params = new URLSearchParams({ question: question.trim() });
    if (sessionId) params.append('sessionId', sessionId);

    const token = authStorage.getToken();
    const url = `${baseUrl}/api/admin/ask/stream?${params.toString()}`;

    // Dùng fetch-based SSE để gửi được Authorization header
    const controller = new AbortController();

    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401) {
            authStorage.clear();
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
          throw new Error(`SSE connection failed (HTTP ${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // SSE events được phân cách bởi double newline (\n\n)
          const eventBlocks = buffer.split('\n\n');
          // Phần cuối chưa hoàn chỉnh giữ lại trong buffer
          buffer = eventBlocks.pop() || '';

          for (const block of eventBlocks) {
            if (!block.trim()) continue;

            let eventName = '';
            const dataLines = [];

            const lines = block.split('\n');
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5));
              }
            }

            if (!eventName || dataLines.length === 0) continue;

            // Ghép tất cả data lines lại (Spring có thể split data dài ra nhiều dòng)
            let rawData = dataLines.join('\n').trim();

            // Backend sendEvent() dùng objectMapper.writeValueAsString():
            // - String input -> output: "\"chuỗi gốc\"" (JSON-encoded string = chuỗi có ngoặc kép bao ngoài)
            // - Object input -> output: "{...}" (JSON object string)
            // Cần xử lý cả 2 trường hợp

            if (eventName === 'STATUS') {
              // rawData có thể là: "Initializing session..." (plain)
              // hoặc: "\"Initializing session...\"" (double-encoded bởi objectMapper)
              let statusText = rawData;
              // Thử parse nếu là JSON string (bỏ lớp ngoặc kép ngoài)
              if (rawData.startsWith('"') && rawData.endsWith('"')) {
                try {
                  statusText = JSON.parse(rawData);
                } catch {
                  statusText = rawData.slice(1, -1);
                }
              }
              onStatus?.(statusText);

            } else if (eventName === 'RESULT') {
              // rawData là JSON string của AiQueryResponseData
              // Có thể bị double-encode: "\"{ ... }\"" hoặc đúng chuẩn: "{ ... }"
              try {
                let parsed = JSON.parse(rawData);
                // Nếu parsed vẫn là string (double-encoded), parse lần nữa
                if (typeof parsed === 'string') {
                  parsed = JSON.parse(parsed);
                }
                onResult?.(parsed);
              } catch (parseErr) {
                console.error('[SSE] Failed to parse RESULT data:', parseErr, rawData);
                onError?.('Không thể đọc dữ liệu phản hồi từ AI.');
              }

            } else if (eventName === 'ERROR') {
              let errorText = rawData;
              if (rawData.startsWith('"') && rawData.endsWith('"')) {
                try {
                  errorText = JSON.parse(rawData);
                } catch {
                  errorText = rawData.slice(1, -1);
                }
              }
              onError?.(errorText);
            }
          }
        }

        onComplete?.();
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;

        // Fallback to mock nếu network error và mock đang bật
        if (authStorage.isMockEnabled()) {
          _mockStreamFallback(question, sessionId, callbacks);
          return;
        }
        onError?.(err.message || 'Lỗi kết nối SSE');
      });

    return {
      close: () => controller.abort(),
    };
  },

  /**
   * 2.1c Phân trang dữ liệu — POST /api/admin/chat/message/{messageId}?page=1&limit=10
   * @param {number} messageId
   * @param {number} page
   * @param {number} limit
   */
  async getNextPage(messageId, page = 1, limit = 10) {
    try {
      return await apiRequest(`/api/admin/chat/message/${messageId}`, {
        method: 'POST',
        params: { page, limit },
      });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn('Backend chưa chạy, giả lập phân trang...');
        // Mock pagination data
        const mockAllData = [
          { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp vệ sinh', don_hoan_thanh: 45, doanh_thu: 15500000 },
          { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Sửa điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
          { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa điện lạnh', don_hoan_thanh: 25, doanh_thu: 10000000 },
          { id: 4, ten_tho: 'Phạm Minh D', dich_vu: 'Dọn dẹp văn phòng', don_hoan_thanh: 22, doanh_thu: 8500000 },
          { id: 5, ten_tho: 'Hoàng Anh E', dich_vu: 'Vệ sinh máy lạnh', don_hoan_thanh: 18, doanh_thu: 7200000 },
          { id: 6, ten_tho: 'Trương Văn F', dich_vu: 'Sửa điện nước', don_hoan_thanh: 16, doanh_thu: 6800000 },
          { id: 7, ten_tho: 'Đỗ Thị G', dich_vu: 'Dọn dẹp vệ sinh', don_hoan_thanh: 14, doanh_thu: 5500000 },
          { id: 8, ten_tho: 'Vũ Minh H', dich_vu: 'Bảo trì điện lạnh', don_hoan_thanh: 12, doanh_thu: 5200000 },
          { id: 9, ten_tho: 'Ngô Văn I', dich_vu: 'Sửa ống nước', don_hoan_thanh: 10, doanh_thu: 4800000 },
          { id: 10, ten_tho: 'Bùi Thị K', dich_vu: 'Vệ sinh công nghiệp', don_hoan_thanh: 8, doanh_thu: 4200000 },
          { id: 11, ten_tho: 'Lý Văn L', dich_vu: 'Lắp đặt điện', don_hoan_thanh: 7, doanh_thu: 3900000 },
          { id: 12, ten_tho: 'Hồ Minh M', dich_vu: 'Sơn nhà', don_hoan_thanh: 5, doanh_thu: 3100000 },
        ];

        const totalRecords = mockAllData.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const offset = (page - 1) * limit;
        const tableData = mockAllData.slice(offset, offset + limit);

        return {
          messageId,
          tableData,
          currentPage: page,
          totalPages,
          totalRecords,
        };
      }
      throw error;
    }
  },

  /**
   * 2.2 Lấy danh sách Chat Sessions — GET /api/admin/chat?page=1&size=10&keyword=
   * @param {Object} options
   * @param {number} [options.page=1]
   * @param {number} [options.size=10]
   * @param {string} [options.keyword='']
   */
  async getChatSessions({ page = 1, size = 10, keyword = '' } = {}) {
    try {
      const params = {
        page,
        size,
      };
      if (keyword && keyword.trim()) {
        params.keyword = keyword.trim();
      }

      const data = await apiRequest('/api/admin/chat', {
        method: 'GET',
        params,
      });
      return data;
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn('Backend chưa chạy, đang trả về mock sessions...');
        let filtered = [...mockSessions];
        if (keyword && keyword.trim()) {
          const kw = keyword.toLowerCase().trim();
          filtered = filtered.filter(
            (s) =>
              s.title.toLowerCase().includes(kw) ||
              (s.lastMessage && s.lastMessage.toLowerCase().includes(kw)) ||
              (s.category && s.category.toLowerCase().includes(kw))
          );
        }

        const totalElements = filtered.length;
        const totalPages = Math.ceil(totalElements / size) || 1;
        const startIndex = (page - 1) * size;
        const items = filtered.slice(startIndex, startIndex + size);

        return {
          items,
          currentPage: page,
          pageSize: size,
          totalElements,
          totalPages,
          hasNext: page < totalPages,
        };
      }
      throw error;
    }
  },

  /**
   * 2.3 Cập nhật Chat Session — PATCH /api/admin/chat/{id}
   * @param {number} id - ID của chat session
   * @param {Object} changes
   * @param {string} [changes.newTitle]
   * @param {boolean} [changes.isPinned]
   */
  async updateChatSession(id, changes = {}) {
    const body = {};
    if (changes.newTitle !== undefined) body.newTitle = changes.newTitle;
    if (changes.isPinned !== undefined) body.isPinned = changes.isPinned;

    try {
      const data = await apiRequest(`/api/admin/chat/${id}`, {
        method: 'PATCH',
        body,
      });
      return data;
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        const session = mockSessions.find((s) => s.id === Number(id));
        if (session) {
          if (changes.newTitle !== undefined) session.title = changes.newTitle;
          if (changes.isPinned !== undefined) session.isPinned = changes.isPinned;
          return { ...session };
        }
        throw new Error('Không tìm thấy phiên trò chuyện.');
      }
      throw error;
    }
  },

  /**
   * 2.4 Xóa mềm Chat Session — DELETE /api/admin/chat/{id}
   * @param {number} id - ID của chat session cần xóa
   */
  async deleteChatSession(id) {
    try {
      const data = await apiRequest(`/api/admin/chat/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        mockSessions = mockSessions.filter((s) => s.id !== Number(id));
        delete mockMessagesMap[Number(id)];
        return { message: 'Chat deleted' };
      }
      throw error;
    }
  },

  /**
   * 2.5 Lấy danh sách tin nhắn của 1 phiên — GET /api/admin/chat/{sessionId}/messages?page=1&size=50
   * @param {number} sessionId - ID của phiên hội thoại
   * @param {number} [page=1] - Trang hiện tại
   * @param {number} [size=50] - Số lượng tin nhắn cần lấy
   */
  async getSessionMessages(sessionId, page = 1, size = 50) {
    if (!sessionId) {
      throw new Error('ID phiên hội thoại không hợp lệ.');
    }

    try {
      const data = await apiRequest(`/api/admin/chat/${sessionId}/messages`, {
        method: 'GET',
        params: { page, size },
      });
      return data;
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn(`Backend chưa chạy, đang trả về mock messages cho session #${sessionId}...`);
        return _getMockSessionMessages(sessionId, page, size);
      }
      throw error;
    }
  },

  /**
   * 2.6 Lấy dữ liệu chi tiết của 1 tin nhắn cũ — GET /api/admin/chat/message/{messageId}
   * @param {number} messageId - ID của tin nhắn AI cần lấy dữ liệu
   */
  async getMessageData(messageId) {
    if (!messageId) {
      throw new Error('ID tin nhắn không hợp lệ.');
    }

    try {
      const data = await apiRequest(`/api/admin/chat/message/${messageId}`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn(`Backend chưa chạy, đang trả về mock message data cho message #${messageId}...`);
        return _getMockMessageData(messageId);
      }
      throw error;
    }
  },
};

/**
 * Lấy dữ liệu bảng mock cho 1 tin nhắn cũ (GET /api/admin/chat/message/{messageId})
 */
function _getMockMessageData(messageId) {
  const mid = Number(messageId);

  if (mid === 102 || mid === 1) {
    const tableData = [
      { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp', don_hoan_thanh: 45, doanh_thu: 15500000 },
      { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
      { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa', don_hoan_thanh: 25, doanh_thu: 10000000 },
    ];
    return {
      messageId: mid,
      tableData,
      chartType: 'TABLE',
      currentPage: 1,
      totalPages: 1,
      totalRecords: tableData.length,
    };
  }

  if (mid === 202 || mid === 2) {
    const tableData = [
      { id: 1, dich_vu: 'Sửa điện nước', don_huy: 24, ty_le_huy: 18.2 },
      { id: 2, dich_vu: 'Sửa máy giặt', don_huy: 15, ty_le_huy: 11.5 },
      { id: 3, dich_vu: 'Vệ sinh nhà', don_huy: 8, ty_le_huy: 4.1 },
      { id: 4, dich_vu: 'Bảo dưỡng điều hòa', don_huy: 5, ty_le_huy: 3.2 },
    ];
    return {
      messageId: mid,
      tableData,
      chartType: 'BAR_CHART',
      currentPage: 1,
      totalPages: 1,
      totalRecords: tableData.length,
    };
  }

  if (mid === 302 || mid === 3) {
    const tableData = [
      { id: 1, dich_vu: 'Dọn dẹp vệ sinh', doanh_thu: 150000000, ty_trong: 52 },
      { id: 2, dich_vu: 'Sửa điện nước', doanh_thu: 80000000, ty_trong: 28 },
      { id: 3, dich_vu: 'Sơn sửa nhà', doanh_thu: 50000000, ty_trong: 20 },
    ];
    return {
      messageId: mid,
      tableData,
      chartType: 'PIE_CHART',
      currentPage: 1,
      totalPages: 1,
      totalRecords: tableData.length,
    };
  }

  if (mid === 402 || mid === 4) {
    const tableData = [
      { id: 1, ten_tho: 'Phạm Văn Mới 1', don_nhan: 35, don_xong: 33, ty_le_hoan_thanh: '94.2%' },
      { id: 2, ten_tho: 'Trần Văn Mới 2', don_nhan: 28, don_xong: 26, ty_le_hoan_thanh: '92.8%' },
      { id: 3, ten_tho: 'Lê Thị Mới 3', don_nhan: 20, don_xong: 19, ty_le_hoan_thanh: '95.0%' },
    ];
    return {
      messageId: mid,
      tableData,
      chartType: 'TABLE',
      currentPage: 1,
      totalPages: 1,
      totalRecords: tableData.length,
    };
  }

  const defaultTable = [
    { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp vệ sinh', don_hoan_thanh: 45, doanh_thu: 15500000 },
    { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Sửa điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
    { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa điện lạnh', don_hoan_thanh: 25, doanh_thu: 10000000 },
    { id: 4, ten_tho: 'Phạm Minh D', dich_vu: 'Dọn dẹp văn phòng', don_hoan_thanh: 22, doanh_thu: 8500000 },
    { id: 5, ten_tho: 'Hoàng Anh E', dich_vu: 'Vệ sinh máy lạnh', don_hoan_thanh: 18, doanh_thu: 7200000 },
  ];

  return {
    messageId: mid,
    tableData: defaultTable,
    chartType: 'TABLE',
    currentPage: 1,
    totalPages: 1,
    totalRecords: defaultTable.length,
  };
}

/**
 * Lấy danh sách tin nhắn mock theo sessionId
 */
function _getMockSessionMessages(sessionId, page = 1, size = 50) {
  const sid = Number(sessionId);
  let list = mockMessagesMap[sid];

  if (!list) {
    const s = mockSessions.find((x) => x.id === sid);
    list = [
      {
        id: Date.now() - 1000,
        chatSessionId: sid,
        role: 'USER',
        content: s?.title || 'Câu hỏi phân tích dữ liệu',
        sqlGenerated: null,
        chartType: null,
        createdAt: s?.lastMessageAt || new Date().toISOString(),
      },
      {
        id: Date.now(),
        chatSessionId: sid,
        role: 'AI',
        content: s?.lastMessage || 'Kết quả phân tích từ trợ lý AI.',
        sqlGenerated: `SELECT t.full_name AS ten_tho, s.name AS dich_vu, COUNT(b.id) AS don_hoan_thanh, SUM(p.amount) AS doanh_thu\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN services s ON b.service_id = s.id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.id, t.full_name, s.name\nORDER BY doanh_thu DESC LIMIT 5;`,
        chartType: 'TABLE',
        createdAt: s?.lastMessageAt || new Date().toISOString(),
      },
    ];
    mockMessagesMap[sid] = list;
  }

  // Backend sắp xếp: OrderByCreatedAtDesc (tin nhắn mới nhất ở đầu)
  const sortedDesc = [...list].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  const startIndex = (page - 1) * size;
  const items = sortedDesc.slice(startIndex, startIndex + size);

  return {
    items,
    currentPage: page,
    pageSize: size,
    totalElements: list.length,
    totalPages: Math.ceil(list.length / size) || 1,
    hasNext: page * size < list.length,
  };
}

/**
 * Mock SSE stream fallback khi backend chưa chạy
 */
async function _mockStreamFallback(question, sessionId, callbacks) {
  const { onStatus, onResult, onError, onComplete } = callbacks;

  const statuses = [
    'Initializing session & message history...',
    'Translating natural language to SQL...',
    'Executing query & paginating data...',
    'Analyzing results & determining chart type...',
  ];

  for (const status of statuses) {
    await new Promise((r) => setTimeout(r, 600));
    onStatus?.(status);
  }

  await new Promise((r) => setTimeout(r, 400));

  const newSessionId = sessionId || Date.now();
  const result = {
    sessionId: newSessionId,
    messageId: Date.now(),
    aiMessage: `### 📊 Kết quả phân tích (SSE Stream)\nĐã phân tích câu hỏi: **"${question}"**\n\nHệ thống đã truy vấn cơ sở dữ liệu **PostgreSQL (homeservice_prod)** qua SSE streaming và trích xuất dữ liệu thành công.`,
    sqlQuery: `SELECT t.full_name, COUNT(b.id) AS orders, SUM(p.amount) AS revenue\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.full_name\nORDER BY revenue DESC\nLIMIT 10;`,
    tableData: [
      { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp', don_hoan_thanh: 45, doanh_thu: 15500000 },
      { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
      { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa', don_hoan_thanh: 25, doanh_thu: 10000000 },
    ],
    chartType: 'TABLE',
    currentPage: 1,
    totalPages: 2,
    totalRecords: 12,
  };

  // Lưu tin nhắn mock
  if (!mockMessagesMap[newSessionId]) {
    mockMessagesMap[newSessionId] = [];
  }
  mockMessagesMap[newSessionId].push({
    id: Date.now() - 500,
    chatSessionId: newSessionId,
    role: 'USER',
    content: question.trim(),
    sqlGenerated: null,
    chartType: null,
    createdAt: new Date().toISOString(),
  });
  mockMessagesMap[newSessionId].push({
    id: result.messageId,
    chatSessionId: newSessionId,
    role: 'AI',
    content: result.aiMessage,
    sqlGenerated: result.sqlQuery,
    chartType: result.chartType,
    createdAt: new Date().toISOString(),
  });

  onResult?.(result);
  onComplete?.();
}

