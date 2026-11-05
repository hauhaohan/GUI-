// src/components/ReportPage.jsx
// Trang quản lý Report & Scheduled Reports — /api/admin/reports

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Plus, Clock, Play, Trash2, ChevronDown, ChevronRight,
  Calendar, ToggleLeft, ToggleRight, RefreshCw, Eye, X, Check,
  AlertCircle, Timer, Code, Copy, Search, Sun, Moon, Repeat,
  BarChart2, Table, LayoutList, Layers
} from 'lucide-react';
import { reportService } from '../services/reportService';
import DataChart from './DataChart';

// ─────────────────────────────────────────────
// Visual schedule picker → cron expression
// ─────────────────────────────────────────────

const FREQ_OPTIONS = [
  { value: 'hourly',  label: 'Mỗi giờ',        icon: '⏰' },
  { value: 'daily',   label: 'Hàng ngày',       icon: '☀️' },
  { value: 'weekly',  label: 'Hàng tuần',       icon: '📅' },
  { value: 'monthly', label: 'Hàng tháng',      icon: '🗓️' },
];

const DAYS_OF_WEEK = [
  { value: '1', label: 'T2' },
  { value: '2', label: 'T3' },
  { value: '3', label: 'T4' },
  { value: '4', label: 'T5' },
  { value: '5', label: 'T6' },
  { value: '6', label: 'T7' },
  { value: '0', label: 'CN' },
];

// Spring Boot cron: giây phút giờ ngày tháng thứ  (6 trường)
function buildCron({ freq, hour, minute, dayOfWeek, dayOfMonth }) {
  const h = hour.toString();
  const m = minute.toString();
  switch (freq) {
    case 'hourly':  return `0 ${m} * * * *`;          // mỗi giờ vào phút m
    case 'daily':   return `0 ${m} ${h} * * *`;       // hàng ngày lúc h:m
    case 'weekly':  return `0 ${m} ${h} * * ${dayOfWeek}`; // hàng tuần
    case 'monthly': return `0 ${m} ${h} ${dayOfMonth} * *`; // hàng tháng
    default:        return `0 ${m} ${h} * * *`;
  }
}

function describeCron(cron) {
  if (!cron) return '—';
  const parts = cron.split(' ');
  // Hỗ trợ cả Spring 6-field và Unix 5-field
  if (parts.length === 6) {
    // Spring: sec min hour dom mon dow
    const [, min, hour, dom, , dow] = parts;
    if (dom === '*') {
      if (dow === '*') {
        if (hour === '*') return `Mỗi giờ vào phút ${min}`;
        return `Hàng ngày lúc ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
      }
      const dayMap = { '0':'Chủ Nhật','SUN':'Chủ Nhật','1':'Thứ Hai','MON':'Thứ Hai','2':'Thứ Ba','TUE':'Thứ Ba','3':'Thứ Tư','WED':'Thứ Tư','4':'Thứ Năm','THU':'Thứ Năm','5':'Thứ Sáu','FRI':'Thứ Sáu','6':'Thứ Bảy','SAT':'Thứ Bảy' };
      return `Hàng tuần, ${dayMap[dow] || dow} lúc ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
    }
    return `Hàng tháng ngày ${dom}, lúc ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  }
  if (parts.length !== 5) return cron;
  // Unix 5-field fallback
  const [min, hour, dom, , dow] = parts;

  if (dom === '*') {
    if (dow === '*') {
      if (hour === '*') return `Mỗi giờ vào phút ${min}`;
      const h = hour.padStart(2, '0');
      const m = min.padStart(2, '0');
      return `Hàng ngày lúc ${h}:${m}`;
    }
    const dayMap = { '0': 'Chủ Nhật', '1': 'Thứ Hai', '2': 'Thứ Ba', '3': 'Thứ Tư', '4': 'Thứ Năm', '5': 'Thứ Sáu', '6': 'Thứ Bảy' };
    const dayName = dayMap[dow] || `thứ ${dow}`;
    return `Hàng tuần, ${dayName} lúc ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  }
  return `Hàng tháng ngày ${dom}, lúc ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
}

function SchedulePicker({ value, onChange }) {
  const [freq, setFreq] = useState('daily');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  // rebuild cron when any field changes
  useEffect(() => {
    onChange(buildCron({ freq, hour, minute, dayOfWeek, dayOfMonth }));
  }, [freq, hour, minute, dayOfWeek, dayOfMonth]); // eslint-disable-line

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 30, 45];
  const daysOfMonth = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Frequency */}
      <div>
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Tần suất</label>
        <div className="grid grid-cols-4 gap-2">
          {FREQ_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFreq(opt.value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition ${
                freq === opt.value
                  ? 'border-[#5B42F3] bg-indigo-50 text-[#5B42F3]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time picker */}
      {freq !== 'hourly' && (
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Thời gian chạy
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-slate-400 mb-1 block">Giờ</label>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-slate-400 mb-1 block">Phút</label>
              <select
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    :{String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            {/* Preview */}
            <div className="text-2xl font-extrabold text-[#5B42F3] bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 tracking-tight">
              {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </div>
          </div>
        </div>
      )}

      {/* Hourly minute */}
      {freq === 'hourly' && (
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Vào phút thứ</label>
          <div className="flex flex-wrap gap-2">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinute(m)}
                className={`w-14 py-2 rounded-xl text-sm font-bold border-2 transition ${
                  minute === m
                    ? 'border-[#5B42F3] bg-indigo-50 text-[#5B42F3]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                :{String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day of week */}
      {freq === 'weekly' && (
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Ngày trong tuần</label>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDayOfWeek(d.value)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition ${
                  dayOfWeek === d.value
                    ? 'border-[#5B42F3] bg-indigo-50 text-[#5B42F3]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day of month */}
      {freq === 'monthly' && (
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Ngày trong tháng</label>
          <div className="flex flex-wrap gap-1.5">
            {daysOfMonth.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDayOfMonth(d)}
                className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition ${
                  dayOfMonth === d
                    ? 'border-[#5B42F3] bg-indigo-50 text-[#5B42F3]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 p-3 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#5B42F3] text-white flex items-center justify-center shrink-0">
          <Repeat size={15} />
        </div>
        <div>
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Lịch chạy</div>
          <div className="text-sm font-bold text-[#5B42F3]">{describeCron(value)}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function ReportPage({ showToast, prefillSql = null, prefillTitle = null, prefillChartType = null }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [snapshotData, setSnapshotData] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotViewMode, setSnapshotViewMode] = useState('both'); // 'both' | 'chart' | 'table'
  const [modalChartType, setModalChartType] = useState(null);
  const [runningReportId, setRunningReportId] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Ref cho showToast để tránh re-trigger useCallback/useEffect không cần thiết
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: prefillTitle || '',
    description: '',
    rawSql: prefillSql || '',
    chartType: prefillChartType || 'TABLE',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Schedule modal
  const [scheduleModal, setScheduleModal] = useState(null);
  const [cronValue, setCronValue] = useState('0 8 * * 1');
  const [isScheduling, setIsScheduling] = useState(false);

  // Auto-open create modal if prefill provided
  useEffect(() => {
    if (prefillSql) {
      setShowCreateModal(true);
      setCreateForm({ title: prefillTitle || '', description: '', rawSql: prefillSql, chartType: prefillChartType || 'TABLE' });
    }
  }, [prefillSql, prefillTitle, prefillChartType]);

  // Tải danh sách reports mà KHÔNG unmount danh sách đang hiển thị (chống giật/nháy)
  const fetchReports = useCallback(async (isSilent = false) => {
    // Chỉ bật spinner toàn trang khi chưa có bản ghi nào
    if (!isSilent) {
      setIsLoading((prev) => (reports.length === 0 ? true : prev));
      setIsRefreshing(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await reportService.getAllReports();
      setReports(data || []);
    } catch (err) {
      showToastRef.current?.('error', err.message || 'Không thể tải danh sách reports.', 'Lỗi Reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [reports.length]);

  // Chỉ fetch lần đầu khi mount (không đưa showToast vào dependency để tránh loop)
  useEffect(() => {
    fetchReports(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateReport = async () => {
    if (!createForm.title.trim()) {
      showToastRef.current?.('error', 'Tiêu đề không được để trống.', 'Lỗi'); return;
    }
    if (!createForm.rawSql.trim()) {
      showToastRef.current?.('error', 'Câu SQL không được để trống.', 'Lỗi'); return;
    }
    setIsSaving(true);
    try {
      const newReport = await reportService.createReport(createForm);
      showToastRef.current?.('success', `Đã lưu report "${createForm.title}"!`, 'Lưu Report');
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', rawSql: '', chartType: 'TABLE' });
      if (newReport && newReport.id) {
        setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
      }
      fetchReports(true);
    } catch (err) {
      showToastRef.current?.('error', err.message, 'Lỗi tạo Report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa report này?')) return;
    // Optimistic delete
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (expandedReport === id) setExpandedReport(null);
    try {
      await reportService.deleteReport(id);
      showToastRef.current?.('success', 'Đã xóa report!', 'Xóa');
      fetchReports(true);
    } catch (err) {
      showToastRef.current?.('error', err.message, 'Lỗi xóa');
      fetchReports(true);
    }
  };

  const handleSetSchedule = async () => {
    if (!cronValue || !scheduleModal) return;
    setIsScheduling(true);
    try {
      await reportService.setReportSchedule(scheduleModal, { cronExpression: cronValue, isActive: true });
      showToastRef.current?.('success', 'Đã đặt lịch thành công!', 'Lịch Report');
      setScheduleModal(null);
      // Đồng bộ ngầm không giật màn hình
      fetchReports(true);
    } catch (err) {
      showToastRef.current?.('error', err.message, 'Lỗi đặt lịch');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleToggleSchedule = async (scheduleId, currentActive) => {
    // 1. Optimistic Update: cập nhật ngay giao diện switch toggle không delay/nháy
    setReports((prevReports) =>
      prevReports.map((r) => ({
        ...r,
        schedules: (r.schedules || []).map((s) =>
          s.id === scheduleId ? { ...s, isActive: !currentActive } : s
        ),
      }))
    );

    try {
      await reportService.toggleSchedule(scheduleId, !currentActive);
      showToastRef.current?.('success', !currentActive ? 'Đã kích hoạt lịch.' : 'Đã tạm dừng lịch.');
      // Đồng bộ ngầm
      fetchReports(true);
    } catch (err) {
      // Revert lại nếu có lỗi
      setReports((prevReports) =>
        prevReports.map((r) => ({
          ...r,
          schedules: (r.schedules || []).map((s) =>
            s.id === scheduleId ? { ...s, isActive: currentActive } : s
          ),
        }))
      );
      showToastRef.current?.('error', err.message || 'Không thể thay đổi trạng thái lịch.', 'Lỗi');
    }
  };

  const handleRunNow = async (reportId) => {
    setRunningReportId(reportId);
    try {
      await reportService.runReportNow(reportId);
      showToastRef.current?.('success', 'Đã kích hoạt chạy ngay và làm mới kết quả!', 'Chạy Report');
      // Tự động tải và hiển thị ngay kết quả mới nhất kèm biểu đồ
      await handleViewSnapshot(reportId);
    } catch (err) {
      showToastRef.current?.('error', err.message, 'Lỗi chạy report');
    } finally {
      setRunningReportId(null);
    }
  };

  const handleViewSnapshot = async (reportId) => {
    setSnapshotLoading(true);
    try {
      const data = await reportService.getLatestSnapshot(reportId);
      const report = reports.find((r) => r.id === reportId);
      const resolvedChartType = report?.chartType || 'BAR_CHART';
      setSnapshotData({
        ...data,
        chartType: resolvedChartType,
      });
      setModalChartType(resolvedChartType);
      setSnapshotViewMode('both');
    } catch (err) {
      showToast?.('error', err.message, 'Lỗi snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return r.title?.toLowerCase().includes(kw) || r.description?.toLowerCase().includes(kw);
  });

  const scheduledCount = reports.filter((r) => r.schedules?.some((s) => s.isActive)).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý báo cáo, đặt lịch tự động, và xem kết quả</p>
        </div>
        <button
          onClick={() => { setCreateForm({ title: '', description: '', rawSql: '', chartType: 'TABLE' }); setShowCreateModal(true); }}
          className="px-5 py-2.5 bg-[#5B42F3] hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition"
        >
          <Plus size={18} /> Tạo Report
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm kiếm report..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {searchKeyword && (
            <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => fetchReports(false)}
          disabled={isLoading || isRefreshing}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          title="Làm mới danh sách reports"
        >
          <RefreshCw size={16} className={isLoading || isRefreshing ? 'animate-spin text-[#5B42F3]' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <FileText size={20} />, val: reports.length, label: 'Tổng report', color: 'violet' },
          { icon: <Timer size={20} />, val: scheduledCount, label: 'Đang tự động', color: 'emerald' },
          { icon: <Calendar size={20} />, val: reports.length - scheduledCount, label: 'Chưa đặt lịch', color: 'amber' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${s.color}-50 text-${s.color}-600`}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900">{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Skeleton chỉ hiển thị lần đầu khi chưa có dữ liệu */}
      {isLoading && reports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-[#5B42F3] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Đang tải danh sách reports...</p>
        </div>
      )}

      {/* Empty State khi chưa có bất kỳ report nào */}
      {!isLoading && reports.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Chưa có report nào</p>
          <p className="text-xs text-slate-400 mt-1">Tạo report mới hoặc lưu trực tiếp từ Query Studio</p>
        </div>
      )}

      {/* Không tìm thấy kết quả tìm kiếm */}
      {reports.length > 0 && filteredReports.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          Không tìm thấy report nào phù hợp với từ khóa "{searchKeyword}".
        </div>
      )}

      {/* Report list: Luôn hiển thị ổn định, không bị unmount khi cập nhật/đồng bộ ngầm */}
      {filteredReports.length > 0 && (
        <div className="space-y-3">
          {filteredReports.map((report) => {
          const isExpanded = expandedReport === report.id;
          const activeSchedule = report.schedules?.find((s) => s.isActive);
          const hasSchedule = report.schedules?.length > 0;

          return (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
              {/* Row header */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedReport(isExpanded ? null : report.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeSchedule ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                      {report.title}
                      {activeSchedule && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {describeCron(activeSchedule.cronExpression)}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {report.description || 'Không có mô tả'}
                      {' · '}
                      <span className="font-mono text-[10px] text-indigo-500">{report.chartType}</span>
                    </p>
                    {activeSchedule?.nextRunAt && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar size={11} />
                        Lần tới: {formatDateTime(activeSchedule.nextRunAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-[11px] text-slate-400">{formatDateTime(report.createdAt)}</span>
                  {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/40">
                  {/* Actions */}
                  <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-slate-100">
                    <button
                      onClick={() => { setScheduleModal(report.id); setCronValue('0 8 * * 1'); }}
                      className="px-3.5 py-2 bg-[#5B42F3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-700 transition"
                    >
                      <Calendar size={13} /> {hasSchedule ? 'Cập nhật lịch' : 'Đặt lịch'}
                    </button>
                    <button
                      onClick={() => handleRunNow(report.id)}
                      disabled={runningReportId === report.id || snapshotLoading}
                      className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition disabled:opacity-50"
                    >
                      {runningReportId === report.id ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Đang chạy & lấy kết quả...
                        </>
                      ) : (
                        <>
                          <Play size={13} /> Chạy ngay
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleViewSnapshot(report.id)}
                      disabled={snapshotLoading}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                      <Eye size={13} /> {snapshotLoading ? 'Đang tải...' : 'Kết quả gần nhất'}
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(report.rawSql); showToast?.('info', 'Đã sao chép SQL.'); }}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-100 transition"
                    >
                      <Copy size={13} /> Copy SQL
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-1.5 hover:bg-rose-100 transition"
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  </div>

                  {/* SQL */}
                  <div className="px-5 py-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Câu lệnh SQL</div>
                    <div className="p-3 bg-[#0D111D] text-indigo-200 font-mono text-[11px] rounded-xl overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{report.rawSql}</pre>
                    </div>
                  </div>

                  {/* Schedules */}
                  {report.schedules?.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Timer size={12} /> LỊCH ĐANG CHẠY
                      </div>
                      <div className="space-y-2">
                        {report.schedules.map((sched) => (
                          <div
                            key={sched.id}
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              sched.isActive ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-800">
                                {describeCron(sched.cronExpression)}
                              </div>
                              <div className="flex gap-4 text-[11px] text-slate-400">
                                {sched.lastRunAt && <span>Lần cuối: {formatDateTime(sched.lastRunAt)}</span>}
                                {sched.nextRunAt && <span>Lần tới: {formatDateTime(sched.nextRunAt)}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleSchedule(sched.id, sched.isActive)}
                              title={sched.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                              className={`p-1.5 rounded-lg transition ${sched.isActive ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-200'}`}
                            >
                              {sched.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText size={18} className="text-[#5B42F3]" /> Lưu Report
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tiêu đề *</label>
                <input
                  autoFocus
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="VD: Báo cáo doanh thu tuần"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả</label>
                <input
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Mô tả ngắn gọn..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Câu lệnh SQL *</label>
                <textarea
                  value={createForm.rawSql}
                  onChange={(e) => setCreateForm((p) => ({ ...p, rawSql: e.target.value }))}
                  rows={5}
                  placeholder="SELECT ... FROM ... WHERE ..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Loại biểu đồ</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { v: 'TABLE', label: 'Bảng', icon: '📋' },
                    { v: 'BAR_CHART', label: 'Cột', icon: '📊' },
                    { v: 'PIE_CHART', label: 'Tròn', icon: '🥧' },
                    { v: 'METRIC', label: 'Số liệu', icon: '🔢' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setCreateForm((p) => ({ ...p, chartType: opt.v }))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
                        createForm.chartType === opt.v
                          ? 'border-[#5B42F3] bg-indigo-50 text-[#5B42F3]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">
                Hủy
              </button>
              <button
                onClick={handleCreateReport}
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#5B42F3] text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</> : <><Check size={15} /> Lưu Report</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Modal ── */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar size={18} className="text-[#5B42F3]" /> Đặt lịch chạy tự động
              </h3>
              <button onClick={() => setScheduleModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <SchedulePicker value={cronValue} onChange={setCronValue} />
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setScheduleModal(null)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">
                Hủy
              </button>
              <button
                onClick={handleSetSchedule}
                disabled={isScheduling}
                className="px-5 py-2.5 bg-[#5B42F3] text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-60 flex items-center gap-2"
              >
                {isScheduling ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang đặt...</> : <><Check size={15} /> Xác nhận</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Snapshot Modal ── */}
      {snapshotData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[88vh] flex flex-col animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{snapshotData.reportTitle}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#5B42F3] border border-indigo-100">
                    {modalChartType || snapshotData.chartType || 'BAR_CHART'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    snapshotData.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {snapshotData.status === 'SUCCESS' ? '✓ SUCCESS' : '✗ FAILED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Thời gian chạy: <strong>{snapshotData.executionDurationMs ?? 0}ms</strong></span>
                  <span>·</span>
                  <span>Tổng số: <strong>{snapshotData.totalRecords ?? 0} bản ghi</strong></span>
                  <span>·</span>
                  <span>Lúc: {formatDateTime(snapshotData.executedAt)}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle: Cả hai / Biểu đồ / Bảng */}
                <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSnapshotViewMode('both')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      snapshotViewMode === 'both'
                        ? 'bg-white text-[#5B42F3] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Repeat size={13} />
                    <span>Cả hai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotViewMode('chart')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      snapshotViewMode === 'chart'
                        ? 'bg-white text-[#5B42F3] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart2 size={13} />
                    <span>Biểu đồ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      snapshotViewMode === 'table'
                        ? 'bg-white text-[#5B42F3] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table size={13} />
                    <span>Bảng</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSnapshotData(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/50 transition cursor-pointer"
                  title="Đóng modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {snapshotData.errorMessage ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} /> {snapshotData.errorMessage}
                </div>
              ) : snapshotData.resultData && Array.isArray(snapshotData.resultData) && snapshotData.resultData.length > 0 ? (
                <>
                  {/* Biểu đồ trực quan */}
                  {(snapshotViewMode === 'both' || snapshotViewMode === 'chart') && (
                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <BarChart2 size={15} className="text-[#5B42F3]" />
                          <span>Biểu đồ trực quan kết quả snapshot</span>
                        </div>
                        {/* Bộ chọn kiểu biểu đồ nhanh */}
                        <div className="flex items-center gap-1 text-[11px] font-medium bg-white p-1 rounded-xl border border-slate-200">
                          <span className="text-slate-400 px-1 text-[10px] font-bold uppercase">Kiểu:</span>
                          {[
                            { type: 'BAR_CHART', label: 'Cột', icon: '📊' },
                            { type: 'PIE_CHART', label: 'Tròn', icon: '🥧' },
                            { type: 'METRIC', label: 'Metric', icon: '🔢' },
                          ].map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => setModalChartType(item.type)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                (modalChartType || snapshotData.chartType) === item.type
                                  ? 'bg-[#5B42F3] text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <DataChart
                        chartType={modalChartType || snapshotData.chartType || 'BAR_CHART'}
                        tableData={snapshotData.resultData}
                        compact={false}
                        showHeader={false}
                        className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs"
                      />
                    </div>
                  )}

                  {/* Bảng dữ liệu chi tiết */}
                  {(snapshotViewMode === 'both' || snapshotViewMode === 'table') && (
                    <div className="space-y-2.5">
                      {snapshotViewMode === 'both' && (
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-2 pt-2">
                          <Table size={15} className="text-[#5B42F3]" />
                          <span>Chi tiết bảng dữ liệu ({snapshotData.resultData.length} bản ghi)</span>
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4 w-12 text-center">#</th>
                              {Object.keys(snapshotData.resultData[0]).map((key) => (
                                <th key={key} className="py-3 px-4">
                                  {key.replace(/_/g, ' ').toUpperCase()}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {snapshotData.resultData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50/30 transition">
                                <td className="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                                {Object.values(row).map((val, i) => (
                                  <td key={i} className="py-3 px-4">
                                    {typeof val === 'number'
                                      ? new Intl.NumberFormat('vi-VN').format(val)
                                      : val === null ? '—' : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Không có dữ liệu snapshot nào được ghi lại.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-400">
                Hiển thị kết quả snapshot mới nhất của báo cáo
              </span>
              <button
                type="button"
                onClick={() => setSnapshotData(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
