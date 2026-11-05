// src/components/LoginPage.jsx
// Màn hình đăng nhập quản trị viên tích hợp API POST /api/auth/login

import React, { useState } from 'react';
import {
  Database, Lock, Mail, Eye, EyeOff, Shield, ArrowRight,
  Sparkles, CheckCircle2, AlertCircle, Terminal,
  Cpu, KeyRound, RefreshCw, Layers, Calendar
} from 'lucide-react';
import { authService } from '../services/authService';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_admin_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Xử lý gửi form đăng nhập
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Kiểm tra validation frontend trước khi gọi API
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      // Gọi API POST /api/auth/login
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
    <div className="min-h-screen w-full flex bg-[#0A0D18] text-slate-100 font-sans relative overflow-hidden select-none">
      {/* Background Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#5B42F3]/25 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      ></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center p-6 md:p-12 gap-12 lg:gap-16">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: BRAND HERO & SYSTEM ARCHITECTURE             */}
        {/* ========================================================= */}
        <div className="flex-1 space-y-8 max-w-xl text-center lg:text-left">
          
          {/* Logo Badge */}
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-indigo-500/30 backdrop-blur-md shadow-lg shadow-indigo-950/50">
            <div className="w-6 h-6 rounded-lg bg-[#5B42F3] flex items-center justify-center text-white shadow-md">
              <Database size={14} />
            </div>
            <span className="text-xs font-semibold tracking-wide text-indigo-300">
              Home Services · AI Data Platform
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Trợ lý AI Phân tích <br />
              <span className="bg-gradient-to-r from-indigo-400 via-[#8B78FF] to-purple-400 bg-clip-text text-transparent">
                Cơ sở Dữ liệu
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed font-normal">
              Đăng nhập cổng Quản trị viên để truy vấn dữ liệu kinh doanh, đơn hàng và thợ kỹ thuật bằng ngôn ngữ tự nhiên được hỗ trợ bởi GPT-4o-mini & PostgreSQL.
            </p>
          </div>

          {/* Tech Spec Badges */}
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Spring Boot 3
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5 shadow-sm">
              <KeyRound size={12} className="text-[#5B42F3]" />
              JWT Auth (~5 giờ)
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-purple-300 flex items-center gap-1.5 shadow-sm">
              <Cpu size={12} className="text-purple-400" />
              OpenAI GPT-4o-mini
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center gap-1.5 shadow-sm">
              <Database size={12} className="text-amber-400" />
              PostgreSQL 15
            </span>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-[#5B42F3]" />
                Truy vấn tự nhiên
              </div>
              <p className="text-[11px] text-slate-400">
                Hỏi đáp dữ liệu doanh thu, đơn hàng bằng tiếng Việt chuẩn xác.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" />
                Tự động sinh SQL
              </div>
              <p className="text-[11px] text-slate-400">
                AI tự động sinh câu truy vấn SQL an toàn và thực thi ngay lập tức.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Layers size={14} className="text-purple-400" />
                Trực quan hóa bảng & biểu đồ
              </div>
              <p className="text-[11px] text-slate-400">
                Tự động hiển thị dạng bảng tương tác và biểu đồ so sánh trực quan.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Calendar size={14} className="text-amber-400" />
                Đặt lịch Báo cáo Tự động
              </div>
              <p className="text-[11px] text-slate-400">
                Tự động chạy truy vấn báo cáo theo chu kỳ (Cron), lưu snapshot kết quả và xem biểu đồ.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: LOGIN FORM CARD                             */}
        {/* ========================================================= */}
        <div className="w-full max-w-md">
          <div className="bg-[#111628]/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6">
            
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5B42F3] via-purple-500 to-indigo-400"></div>

            {/* Header Form */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <KeyRound size={20} className="text-[#5B42F3]" />
                  Đăng nhập Quản trị
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
                  POST /api/auth/login
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Nhập email và mật khẩu của bạn để nhận token xác thực.
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Field 1: Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email Quản trị <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@homeservice.vn"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Mật khẩu <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center text-xs text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-[#5B42F3] focus:ring-indigo-500"
                  />
                  <span>Ghi nhớ phiên đăng nhập</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#5B42F3] to-indigo-600 hover:from-indigo-600 hover:to-[#5B42F3] text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-white" />
                    <span>Đang xác thực thông tin...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
