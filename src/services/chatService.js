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

        return {
          sessionId: newSessionId,
          aiMessage,
          sqlQuery,
          tableData,
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
        return { message: 'Chat deleted' };
      }
      throw error;
    }
  },
};
