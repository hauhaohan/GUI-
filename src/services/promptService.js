// src/services/promptService.js
// Dịch vụ quản lý Prompt AI (/api/admin/prompts) cho hệ thống DataAI Home Services

import { apiRequest, authStorage } from './apiClient';

/**
 * Cấu hình danh mục Prompt và quy tắc biến bắt buộc (Required Placeholders)
 */
export const PROMPT_DEFINITIONS = {
  TEXT_TO_SQL_SYSTEM: {
    code: 'TEXT_TO_SQL_SYSTEM',
    title: 'Text-to-SQL System Prompt',
    description: 'Thiết lập vai trò DBA PostgreSQL, quy tắc sinh SQL an toàn (chỉ SELECT), xử lý schema và các ràng buộc dữ liệu.',
    category: 'SQL Generator',
    requiredPlaceholders: ['{schema}'],
    optionalPlaceholders: [],
    defaultContent: `You are an expert PostgreSQL DBA and data assistant for the Home Services management system.
Your mission is to convert natural language questions into safe, highly optimized PostgreSQL SELECT queries.

Database Schema:
{schema}

Strict Rules:
1. Output ONLY valid PostgreSQL SELECT statements. Never execute or suggest INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or GRANT statements.
2. Use snake_case for column aliases. Cast numeric calculations properly (e.g. ROUND(..., 2)).
3. Always filter by valid operational statuses: 'COMPLETED', 'PENDING', 'CANCELLED'.
4. For date filters, use standard PostgreSQL interval and date_trunc functions (e.g. date_trunc('month', created_at)).
5. Ensure queries are performant and use proper JOIN keys (b.service_id = s.id, b.tech_id = t.id).`,
  },

  FIX_SQL_USER: {
    code: 'FIX_SQL_USER',
    title: 'Fix SQL Error Prompt',
    description: 'Nạp câu lệnh SQL bị lỗi và thông điệp lỗi từ PostgreSQL để AI phân tích cú pháp và tự động sửa chữa.',
    category: 'SQL Generator',
    requiredPlaceholders: ['{badSql}', '{errorMessage}'],
    optionalPlaceholders: [],
    defaultContent: `The previously generated SQL statement encountered an execution error in the PostgreSQL database.

Failed SQL Query:
{badSql}

PostgreSQL Error Message:
{errorMessage}

Instructions:
1. Identify the root cause of the error (e.g. unknown column, missing GROUP BY, syntax error, incorrect table alias).
2. Fix the query while maintaining the original user intention.
3. Return ONLY the corrected, executable PostgreSQL SELECT query with no markdown wrapper or conversational filler.`,
  },

  DATA_ANALYZER_SYSTEM: {
    code: 'DATA_ANALYZER_SYSTEM',
    title: 'Data Analyzer System Prompt',
    description: 'Định hình vai trò chuyên gia phân tích dữ liệu kinh doanh (BI Analyst), tóm tắt chỉ số và đưa ra nhận xét chiến lược.',
    category: 'Data Analytics',
    requiredPlaceholders: [],
    optionalPlaceholders: [],
    defaultContent: `You are a Senior Business Intelligence & Operations Analyst specializing in on-demand Home Services.
Your role is to analyze query result sets, synthesize key metrics (revenue, order volume, technician performance, cancellation rates), and provide clear, professional, and actionable business insights in Vietnamese.

Guidelines:
- Keep the summary direct, concise, and focused on business value.
- Format currency in Vietnamese Dong (VNĐ) using localized formatting.
- Highlight anomalies, top performers, and areas needing operational improvement.`,
  },

  DATA_ANALYZER_USER: {
    code: 'DATA_ANALYZER_USER',
    title: 'Data Analyzer User Prompt',
    description: 'Nạp câu hỏi gốc của người dùng cùng bảng dữ liệu thực tế để AI tổng hợp kết quả và phân tích chi tiết.',
    category: 'Data Analytics',
    requiredPlaceholders: ['{question}', '{data}'],
    optionalPlaceholders: [],
    defaultContent: `Dựa trên câu hỏi nghiệp vụ và tập kết quả truy vấn dưới đây, hãy đưa ra báo cáo phân tích súc tích:

Câu hỏi của người dùng:
{question}

Dữ liệu kết quả truy vấn (JSON):
{data}

Yêu cầu nội dung phân tích:
1. Tóm tắt trực diện kết quả trong 1-2 câu ngắn gọn.
2. Điểm tin các chỉ số nổi bật (giá trị cao nhất, thấp nhất, phân bổ tỷ trọng nếu có).
3. Gợi ý 1-2 khuyến nghị hoặc góc nhìn nghiệp vụ thực tế cho người quản trị.`,
  },
};

// Mock data lưu trữ trong session/memory khi offline
let mockPrompts = [
  {
    id: 1,
    promptCode: 'TEXT_TO_SQL_SYSTEM',
    content: PROMPT_DEFINITIONS.TEXT_TO_SQL_SYSTEM.defaultContent,
    version: 1,
    isActive: true,
    createdAt: '2026-10-20T08:30:00+07:00',
    updatedAt: '2026-10-20T08:30:00+07:00',
  },
  {
    id: 2,
    promptCode: 'FIX_SQL_USER',
    content: PROMPT_DEFINITIONS.FIX_SQL_USER.defaultContent,
    version: 1,
    isActive: true,
    createdAt: '2026-10-20T08:35:00+07:00',
    updatedAt: '2026-10-20T08:35:00+07:00',
  },
  {
    id: 3,
    promptCode: 'DATA_ANALYZER_SYSTEM',
    content: PROMPT_DEFINITIONS.DATA_ANALYZER_SYSTEM.defaultContent,
    version: 1,
    isActive: true,
    createdAt: '2026-10-20T08:40:00+07:00',
    updatedAt: '2026-10-20T08:40:00+07:00',
  },
  {
    id: 4,
    promptCode: 'DATA_ANALYZER_USER',
    content: PROMPT_DEFINITIONS.DATA_ANALYZER_USER.defaultContent,
    version: 1,
    isActive: true,
    createdAt: '2026-10-20T08:45:00+07:00',
    updatedAt: '2026-10-20T08:45:00+07:00',
  },
];

let mockIdCounter = 10;

/**
 * Kiểm tra tính hợp lệ của Prompt content theo danh mục PromptCode
 * @param {string} promptCode
 * @param {string} content
 * @returns {{ isValid: boolean, missing: string[] }}
 */
export function validatePromptPlaceholders(promptCode, content) {
  const definition = PROMPT_DEFINITIONS[promptCode];
  if (!definition || !definition.requiredPlaceholders || definition.requiredPlaceholders.length === 0) {
    return { isValid: true, missing: [] };
  }

  const text = content || '';
  const missing = definition.requiredPlaceholders.filter((ph) => !text.includes(ph));

  return {
    isValid: missing.length === 0,
    missing,
  };
}

export const promptService = {
  /**
   * 1. Lấy danh sách danh mục PromptCode (Enum)
   * GET /api/admin/prompts/promptCode
   */
  async getPromptCodes() {
    try {
      const data = await apiRequest('/api/admin/prompts/promptCode', { method: 'GET' });
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => (typeof item === 'string' ? item : item.code || item.name || String(item)));
      }
      return Object.keys(PROMPT_DEFINITIONS);
    } catch (error) {
      console.warn('Lỗi gọi GET /api/admin/prompts/promptCode, sử dụng fallback enum:', error);
      return Object.keys(PROMPT_DEFINITIONS);
    }
  },

  /**
   * 2. Lấy danh sách các Prompt đang isActive = true
   * GET /api/admin/prompts
   */
  async getActivePrompts() {
    try {
      const data = await apiRequest('/api/admin/prompts', { method: 'GET' });
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return mockPrompts.filter((p) => p.isActive);
    } catch (error) {
      if (error.isNetworkError || authStorage.isMockEnabled()) {
        return mockPrompts.filter((p) => p.isActive);
      }
      throw error;
    }
  },

  /**
   * 3. Lấy toàn bộ lịch sử các phiên bản cũ/mới của một promptCode
   * GET /api/admin/prompts/{promptCode}/history
   */
  async getPromptHistory(promptCode) {
    if (!promptCode) throw new Error('Mã promptCode không hợp lệ.');

    try {
      const data = await apiRequest(`/api/admin/prompts/${encodeURIComponent(promptCode)}/history`, {
        method: 'GET',
      });
      if (Array.isArray(data)) {
        return data;
      }
      return mockPrompts
        .filter((p) => p.promptCode === promptCode)
        .sort((a, b) => (b.version || 0) - (a.version || 0));
    } catch (error) {
      if (error.isNetworkError || authStorage.isMockEnabled()) {
        const history = mockPrompts
          .filter((p) => p.promptCode === promptCode)
          .sort((a, b) => (b.version || 0) - (a.version || 0));
        return history;
      }
      throw error;
    }
  },

  /**
   * 4. Tạo phiên bản Prompt mới
   * POST /api/admin/prompts
   * Body: { "promptCode": "...", "content": "..." }
   */
  async createPrompt({ promptCode, content }) {
    if (!promptCode || !content || !content.trim()) {
      throw new Error('Mã promptCode và nội dung prompt không được để trống.');
    }

    // Client Guard Validation trước khi gửi
    const validation = validatePromptPlaceholders(promptCode, content);
    if (!validation.isValid) {
      throw new Error(
        `Nội dung prompt còn thiếu các biến bắt buộc: ${validation.missing.join(', ')}. Vui lòng chèn biến trước khi lưu.`
      );
    }

    try {
      return await apiRequest('/api/admin/prompts', {
        method: 'POST',
        body: { promptCode, content: content.trim() },
      });
    } catch (error) {
      if (error.isNetworkError || authStorage.isMockEnabled()) {
        // Tắt active của các bản cũ cùng promptCode
        mockPrompts.forEach((p) => {
          if (p.promptCode === promptCode) {
            p.isActive = false;
          }
        });

        // Tính version mới
        const existing = mockPrompts.filter((p) => p.promptCode === promptCode);
        const maxVersion = existing.length > 0 ? Math.max(...existing.map((e) => e.version || 1)) : 0;
        const newVersion = maxVersion + 1;

        const newPrompt = {
          id: ++mockIdCounter,
          promptCode,
          content: content.trim(),
          version: newVersion,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockPrompts.unshift(newPrompt);
        return newPrompt;
      }
      throw error;
    }
  },

  /**
   * 5. Khôi phục (Rollback) lại phiên bản có ID tương ứng
   * POST /api/admin/prompts/{id}/rollback
   */
  async rollbackPrompt(id) {
    if (!id) throw new Error('ID phiên bản không hợp lệ để rollback.');

    try {
      return await apiRequest(`/api/admin/prompts/${id}/rollback`, {
        method: 'POST',
      });
    } catch (error) {
      if (error.isNetworkError || authStorage.isMockEnabled()) {
        const target = mockPrompts.find((p) => p.id === Number(id));
        if (!target) {
          throw new Error(`Không tìm thấy phiên bản prompt có ID #${id}.`);
        }

        // Đặt tất cả bản cùng promptCode thành false
        mockPrompts.forEach((p) => {
          if (p.promptCode === target.promptCode) {
            p.isActive = p.id === target.id;
          }
        });

        return { ...target, isActive: true };
      }
      throw error;
    }
  },
};

