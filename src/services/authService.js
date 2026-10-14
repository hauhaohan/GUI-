// src/services/authService.js
// Quản lý Authentication (/api/auth) theo api_documentation.md

import { apiRequest, authStorage } from './apiClient';

export const authService = {
  /**
   * 1.1 Login — POST /api/auth/login
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email và mật khẩu không được để trống.');
    }

    try {
      // Gửi request thật tới POST /api/auth/login
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        isPublic: true,
        body: { email, password },
      });

      // data: { token, userId, fullName, role }
      if (data && data.token) {
        authStorage.setToken(data.token);
        authStorage.setUser({
          userId: data.userId,
          fullName: data.fullName,
          role: data.role,
          email: email,
        });
      }
      return data;
    } catch (error) {
      // Nếu bật mock hoặc backend chưa bật, cho phép mô phỏng để trải nghiệm giao diện
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn('Backend chưa chạy, đang sử dụng mock authentication...');
        const mockData = {
          token: 'mock-jwt-token-' + Date.now(),
          userId: 1,
          fullName: email.split('@')[0].toUpperCase() || 'Admin User',
          role: 'ADMIN',
          email: email,
        };
        authStorage.setToken(mockData.token);
        authStorage.setUser(mockData);
        return mockData;
      }
      throw error;
    }
  },

  /**
   * Đăng xuất
   */
  logout() {
    authStorage.clear();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  /**
   * Lấy thông tin người dùng hiện tại
   */
  getCurrentUser() {
    return authStorage.getUser();
  },

  /**
   * Kiểm tra đã đăng nhập chưa
   */
  isAuthenticated() {
    return !!authStorage.getToken();
  },
};
