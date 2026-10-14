// src/services/apiClient.js
// Client giao tiếp API dùng chung theo tài liệu api_documentation.md

const TOKEN_KEY = 'home_services_token';
const USER_KEY = 'home_services_user';
const USE_MOCK_IF_OFFLINE_KEY = 'use_mock_if_offline';
const CUSTOM_BASE_URL_KEY = 'custom_api_base_url';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  getUser: () => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(USER_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isMockEnabled: () => {
    return localStorage.getItem(USE_MOCK_IF_OFFLINE_KEY) === 'true';
  },
  setMockEnabled: (enabled) => {
    localStorage.setItem(USE_MOCK_IF_OFFLINE_KEY, enabled ? 'true' : 'false');
  },
  getBaseUrl: () => {
    return localStorage.getItem(CUSTOM_BASE_URL_KEY) || '';
  },
  setBaseUrl: (url) => {
    if (!url) {
      localStorage.removeItem(CUSTOM_BASE_URL_KEY);
    } else {
      localStorage.setItem(CUSTOM_BASE_URL_KEY, url);
    }
  }
};

/**
 * Lấy Base URL:
 * - Nếu người dùng cấu hình URL tùy chỉnh: dùng URL đó.
 * - Nếu có biến môi trường VITE_API_URL: dùng biến đó.
 * - Mặc định trong dev: dùng relative '' để đi qua Vite dev proxy tới http://localhost:8080 (tránh hoàn toàn lỗi CORS).
 */
export const getApiBaseUrl = () => {
  const custom = authStorage.getBaseUrl();
  if (custom) return custom.replace(/\/$/, '');
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  return ''; // Dùng relative path để Vite proxy chuyển tiếp đến http://localhost:8080
};

export const API_BASE_URL = getApiBaseUrl() || 'http://localhost:8080';

/**
 * Gửi HTTP request đến backend theo format ApiResponse<T>
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    params = null,
    isPublic = false,
  } = options;

  const baseUrl = getApiBaseUrl();
  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, v);
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const token = authStorage.getToken();
  if (!isPublic && token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, fetchOptions);

    // Xử lý 401 Unauthorized
    if (res.status === 401) {
      authStorage.clear();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ (401). Vui lòng đăng nhập lại.');
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Phản hồi không hợp lệ từ máy chủ (HTTP ${res.status})`);
    }

    // ApiResponse<T>: { status: "success" | "error", message: string, data: T }
    if (!res.ok || json.status === 'error') {
      const errorMsg = json.message || `Lỗi máy chủ (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return json.data;
  } catch (error) {
    // Nếu gặp lỗi kết nối mạng (backend chưa mở cổng 8080 hoặc CORS)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      error.isNetworkError = true;
      error.message = 'Không thể kết nối đến máy chủ backend (http://localhost:8080). Vui lòng kiểm tra dịch vụ Spring Boot đã chạy chưa.';
    }
    throw error;
  }
}
