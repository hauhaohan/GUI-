// src/services/reportService.js
// Dịch vụ quản lý Report (/api/admin/reports) theo ReportController.java

import { apiRequest, authStorage } from './apiClient';

// Mock data khi backend chưa bật
let mockReports = [
  {
    id: 1,
    title: 'Doanh thu tháng 08/2026',
    description: 'Báo cáo tổng hợp doanh thu theo dịch vụ và khu vực',
    rawSql: "SELECT s.name AS dich_vu, SUM(p.amount) AS doanh_thu\nFROM services s\nJOIN bookings b ON s.id = b.service_id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY s.name\nORDER BY doanh_thu DESC;",
    chartType: 'BAR_CHART',
    isArchived: false,
    createdAt: '2026-10-28T10:00:00+07:00',
    schedules: [
      {
        id: 1,
        cronExpression: '0 8 * * 1',
        isActive: true,
        lastRunAt: '2026-10-28T08:00:00+07:00',
        nextRunAt: '2026-11-04T08:00:00+07:00',
        createdAt: '2026-10-20T09:00:00+07:00',
      },
    ],
  },
  {
    id: 2,
    title: 'Hiệu suất thợ hàng tuần',
    description: 'Báo cáo xếp hạng thợ theo số đơn hoàn thành và doanh thu',
    rawSql: "SELECT t.full_name AS ten_tho, COUNT(b.id) AS don_hoan_thanh, SUM(p.amount) AS doanh_thu\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.id, t.full_name\nORDER BY doanh_thu DESC;",
    chartType: 'TABLE',
    isArchived: false,
    createdAt: '2026-10-25T14:30:00+07:00',
    schedules: [
      {
        id: 2,
        cronExpression: '0 9 * * *',
        isActive: true,
        lastRunAt: '2026-11-02T09:00:00+07:00',
        nextRunAt: '2026-11-03T09:00:00+07:00',
        createdAt: '2026-10-25T14:35:00+07:00',
      },
    ],
  },
  {
    id: 3,
    title: 'Tỷ lệ hủy đơn theo tháng',
    description: 'Theo dõi tỷ lệ hủy đơn để đánh giá chất lượng dịch vụ',
    rawSql: "SELECT DATE_TRUNC('month', b.created_at) AS thang, COUNT(*) FILTER (WHERE b.status = 'CANCELLED') AS don_huy, COUNT(*) AS tong_don, ROUND(100.0 * COUNT(*) FILTER (WHERE b.status = 'CANCELLED') / COUNT(*), 2) AS ty_le_huy\nFROM bookings b\nGROUP BY thang\nORDER BY thang DESC;",
    chartType: 'BAR_CHART',
    isArchived: false,
    createdAt: '2026-10-22T11:00:00+07:00',
    schedules: [],
  },
];

let mockSnapshotIdCounter = 100;

export const reportService = {
  /**
   * Tạo report mới — POST /api/admin/reports
   */
  async createReport({ title, description, rawSql, chartType = 'TABLE' }) {
    if (!title || !rawSql) throw new Error('Tiêu đề và câu lệnh SQL không được để trống.');

    try {
      return await apiRequest('/api/admin/reports', {
        method: 'POST',
        body: { title, description, rawSql, chartType },
      });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        const newReport = {
          id: mockReports.length > 0 ? Math.max(...mockReports.map((r) => r.id)) + 1 : 1,
          title,
          description: description || '',
          rawSql,
          chartType,
          isArchived: false,
          createdAt: new Date().toISOString(),
          schedules: [],
        };
        mockReports.unshift(newReport);
        return newReport;
      }
      throw error;
    }
  },

  /**
   * Lấy tất cả reports — GET /api/admin/reports
   */
  async getAllReports() {
    try {
      return await apiRequest('/api/admin/reports', { method: 'GET' });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        return [...mockReports];
      }
      throw error;
    }
  },

  /**
   * Lấy chi tiết 1 report — GET /api/admin/reports/{id}
   */
  async getReportById(id) {
    try {
      return await apiRequest(`/api/admin/reports/${id}`, { method: 'GET' });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        const report = mockReports.find((r) => r.id === Number(id));
        if (!report) throw new Error('Report không tồn tại.');
        return { ...report };
      }
      throw error;
    }
  },

  /**
   * Xóa report — DELETE /api/admin/reports/{id}
   */
  async deleteReport(id) {
    try {
      return await apiRequest(`/api/admin/reports/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        mockReports = mockReports.filter((r) => r.id !== Number(id));
        return { message: 'Report deleted' };
      }
      throw error;
    }
  },

  /**
   * Đặt lịch report — POST /api/admin/reports/{id}/schedules
   */
  async setReportSchedule(reportId, { cronExpression, isActive = true }) {
    if (!cronExpression) throw new Error('Cron expression không được để trống.');

    try {
      return await apiRequest(`/api/admin/reports/${reportId}/schedules`, {
        method: 'POST',
        body: { cronExpression, isActive },
      });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        const report = mockReports.find((r) => r.id === Number(reportId));
        if (!report) throw new Error('Report không tồn tại.');

        const newSchedule = {
          id: Date.now(),
          cronExpression,
          isActive,
          lastRunAt: null,
          nextRunAt: new Date(Date.now() + 3600000).toISOString(),
          createdAt: new Date().toISOString(),
        };

        // Replace or add schedule
        report.schedules = [newSchedule];
        return newSchedule;
      }
      throw error;
    }
  },

  /**
   * Bật/tắt schedule — PATCH /api/admin/reports/schedules/{scheduleId}/toggle?active=true/false
   */
  async toggleSchedule(scheduleId, active) {
    try {
      return await apiRequest(`/api/admin/reports/schedules/${scheduleId}/toggle`, {
        method: 'PATCH',
        params: { active },
      });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        for (const report of mockReports) {
          const schedule = report.schedules.find((s) => s.id === Number(scheduleId));
          if (schedule) {
            schedule.isActive = active;
            return { message: 'Toggle success' };
          }
        }
        throw new Error('Schedule không tồn tại.');
      }
      throw error;
    }
  },

  /**
   * Chạy report ngay — POST /api/admin/reports/{id}/run-now
   */
  async runReportNow(reportId) {
    try {
      return await apiRequest(`/api/admin/reports/${reportId}/run-now`, {
        method: 'POST',
      });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        const report = mockReports.find((r) => r.id === Number(reportId));
        if (!report) throw new Error('Report không tồn tại.');
        if (report.schedules.length > 0) {
          report.schedules[0].lastRunAt = new Date().toISOString();
        }
        return { message: 'Report execution triggered' };
      }
      throw error;
    }
  },

  /**
   * Lấy snapshot mới nhất — GET /api/admin/reports/{id}/latest-data
   */
  async getLatestSnapshot(reportId) {
    try {
      return await apiRequest(`/api/admin/reports/${reportId}/latest-data`, {
        method: 'GET',
      });
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        const report = mockReports.find((r) => r.id === Number(reportId));
        if (!report) throw new Error('Report không tồn tại.');
        mockSnapshotIdCounter++;

        return {
          historyId: mockSnapshotIdCounter,
          reportId: report.id,
          reportTitle: report.title,
          status: 'SUCCESS',
          resultData: [
            { dich_vu: 'Dọn dẹp vệ sinh', doanh_thu: 25400000 },
            { dich_vu: 'Sửa điện nước', doanh_thu: 18200000 },
            { dich_vu: 'Vệ sinh máy lạnh', doanh_thu: 12800000 },
          ],
          totalRecords: 3,
          executionDurationMs: 245,
          errorMessage: null,
          executedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  },

  /**
   * Lấy danh sách reports đang có schedule active (dùng cho Dashboard)
   * Step 1: GET /api/admin/reports → lọc active
   */
  async getScheduledReports() {
    const all = await this.getAllReports();
    return all.filter(
      (r) => r.schedules && r.schedules.length > 0 && r.schedules.some((s) => s.isActive)
    );
  },

  /**
   * Dashboard: lấy active reports + latest snapshot data của từng cái
   * Step 1: GET /api/admin/reports → lọc có schedule active → lấy IDs
   * Step 2: Promise.allSettled GET /api/admin/reports/{id}/latest-data cho mỗi ID
   * @returns {Array} mảng { report, snapshot } — snapshot = null nếu chưa có dữ liệu
   */
  async getScheduledReportsWithLatestData() {
    // Bước 1: lấy danh sách reports, lọc ra những cái có active schedule
    const allReports = await this.getAllReports();
    const activeReports = allReports.filter(
      (r) => r.schedules?.some((s) => s.isActive)
    );

    if (activeReports.length === 0) return [];

    // Bước 2: fetch latest snapshot song song cho tất cả
    const snapshotResults = await Promise.allSettled(
      activeReports.map((r) => this.getLatestSnapshot(r.id))
    );

    // Ghép report + snapshot
    return activeReports.map((report, idx) => {
      const result = snapshotResults[idx];
      return {
        report,
        snapshot: result.status === 'fulfilled' ? result.value : null,
        snapshotError: result.status === 'rejected' ? result.reason?.message : null,
      };
    });
  },
};
