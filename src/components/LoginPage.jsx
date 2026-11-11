// src/components/LoginPage.jsx
// Màn hình đăng nhập quản trị viên

import React, { useState } from 'react';
import {
  Database, Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw,
  MessageSquare, BarChart2, Calendar, Layers, ArrowRight
} from 'lucide-react';
import { authService } from '../services/authService';

const PLATFORM_FEATURES = [
  {
    icon: MessageSquare,
    title: 'Tra cứu dữ liệu bằng ngôn ngữ tự nhiên',
    desc: 'Đặt câu hỏi trực tiếp bằng tiếng Việt để xem thông tin doanh thu, đơn hàng và thợ kỹ thuật.',
  },
  {
    icon: BarChart2,
    title: 'Bảng số liệu & biểu đồ trực quan',
    desc: 'Tổng hợp kết quả dạng bảng phân trang và biểu đồ so sánh phục vụ theo dõi nhanh.',
  },
  {
    icon: Calendar,
    title: 'Đặt lịch báo cáo tự động',
    desc: 'Thiết lập báo cáo chạy định kỳ, lưu lại lịch sử kết quả và đối chiếu theo thời gian.',
  },
  {
    icon: Layers,
    title: 'Quản lý cấu hình & nguồn dữ liệu',
    desc: 'Quản lý phiên làm việc, mẫu câu lệnh và danh mục dữ liệu tập trung tại một nơi.',
  },
];

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_admin_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const userData = await authService.login(email.trim(), password);

      if (rememberMe) {
        localStorage.setItem('remembered_admin_email', email.trim());
      } else {
        localStorage.removeItem('remembered_admin_email');
      }

      if (userData && onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      const status = err?.status;
      const msg = (err?.message || '').toLowerCase();

      if (
        status === 401 ||
        status === 403 ||
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('bad credentials') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        msg.includes('mật khẩu') ||
        msg.includes('tài khoản')
      ) {
        setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      } else if (
        err?.isNetworkError ||
        msg.includes('failed to fetch') ||
        msg.includes('network') ||
        msg.includes('không thể kết nối') ||
        msg.includes('connection refused') ||
        status === 502 ||
        status === 503 ||
        status === 504
      ) {
        setErrorMessage('Không thể kết nối đến máy chủ hoặc máy chủ không phản hồi.');
      } else if (status === 500 || msg.includes('500')) {
        setErrorMessage('Máy chủ đang gặp sự cố xử lý (HTTP 500). Vui lòng thử lại sau.');
      } else {
        setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F1F5F9] flex flex-col justify-center items-center px-4 py-8 sm:py-12 text-slate-900 font-sans">
      <div className="w-full max-w-[980px] bg-white border border-slate-200/90 rounded-2xl shadow-lg shadow-slate-200/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Cột trái: Giới thiệu nền tảng & chức năng */}
        <div className="order-2 lg:order-1 lg:col-span-7 bg-[#0D111D] text-slate-100 p-7 sm:p-10 flex flex-col justify-between gap-8 border-t lg:border-t-0 lg:border-r border-[#1E253B]">
          <div className="space-y-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5B42F3] flex items-center justify-center text-white shrink-0">
                <Database size={18} />
              </div>
              <div>
                <div className="text-base font-bold text-white leading-tight">DataAI</div>
                <div className="text-xs text-slate-400">Home Services Management</div>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2 pt-1">
              <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
                Hệ thống phân tích &amp; báo cáo dữ liệu vận hành
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Hỗ trợ đội ngũ quản trị tra cứu số liệu kinh doanh, theo dõi biểu đồ và lập lịch báo cáo định kỳ trên cùng một nền tảng.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-3.5 pt-2">
              {PLATFORM_FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3.5 p-3 rounded-xl bg-[#141A2C] border border-[#1E2640]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1D243E] border border-[#2B3457] text-[#8B78FF] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <h2 className="text-xs sm:text-[13px] font-semibold text-white">
                        {item.title}
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E253B] text-xs text-slate-500 flex items-center justify-between">
            <span>Cổng quản trị nội bộ · Home Services</span>
            <span>© 2026</span>
          </div>
        </div>

        {/* Cột phải: Form đăng nhập */}
        <div className="order-1 lg:order-2 lg:col-span-5 bg-white p-7 sm:p-10 flex flex-col justify-center">
          {/* Brand rút gọn trên mobile */}
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#5B42F3] flex items-center justify-center text-white">
              <Database size={16} />
            </div>
            <span className="text-sm font-bold text-slate-900">DataAI · Home Services</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Nhập tài khoản quản trị viên để tiếp tục.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@homeservice.vn"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#5B42F3] focus:ring-2 focus:ring-[#5B42F3]/15 transition disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#5B42F3] focus:ring-2 focus:ring-[#5B42F3]/15 transition disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Ghi nhớ đăng nhập */}
            <div className="flex items-center pt-0.5">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#5B42F3] focus:ring-[#5B42F3]"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {/* Nút đăng nhập */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#5B42F3] hover:bg-[#4c35d9] active:bg-[#422ec4] text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
