import React, { useState } from 'react';
import {
  LayoutDashboard, MessageSquare, Database, Settings, Search, Plus,
  Pin, Clock, Sparkles, ChevronRight, ChevronDown, CheckCircle2,
  XCircle, Download, Table, BarChart2, ArrowLeft, Filter, Bell,
  HelpCircle, Send, Code, FileSpreadsheet, FileText, X
} from 'lucide-react';

// ==========================================
// MOCK DATA KHỚP DỮ LIỆU THIẾT KẾ FIGMA
// ==========================================
const INITIAL_DICTIONARY = [
  { id: 1, term: 'Khách VIP', rule: 'total_fee > 10.000.000', desc: 'Khách hàng có tổng chi tiêu trên 10 triệu' },
  { id: 2, term: 'Thợ nổi bật', rule: 'completed_orders >= 30', desc: 'Thợ hoàn thành ≥ 30 đơn/tháng' },
  { id: 3, term: 'Đơn cấp tốc', rule: "service_type = 'urgent'", desc: 'Đơn đặt dịch vụ khẩn cấp' },
  { id: 4, term: 'Tỷ lệ hủy cao', rule: 'cancel_rate > 0.15', desc: 'Tỷ lệ hủy đơn vượt 15%' },
];

export default function App() {
  // Navigation & Screen States
  const [activeNav, setActiveNav] = useState('studio'); // 'dashboard' | 'studio' | 'sources' | 'settings'
  const [studioView, setStudioView] = useState('list'); // 'list' | 'detail'
  const [settingsTab, setSettingsTab] = useState('dictionary'); // 'dictionary' | 'sources' | 'connect'
  const [dataViewMode, setDataViewMode] = useState('table'); // 'table' | 'chart'
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // ----------------------------------------------------
  // SIDEBAR NAV ITEM COMPONENT
  // ----------------------------------------------------
  const renderNavItem = (id, icon, label, badge) => {
    const isActive = activeNav === id;
    return (
      <button
        onClick={() => {
          setActiveNav(id);
          if (id === 'studio') setStudioView('list');
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-[#5B42F3] text-white shadow-lg shadow-indigo-900/30 font-semibold'
            : 'text-slate-400 hover:bg-[#161B2E] hover:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
        </div>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            isActive ? 'bg-white/20 text-white' : 'bg-[#1E253B] text-indigo-400'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      
      {/* ========================================================= */}
      {/* 1. SIDEBAR (FIGMA DARK NAVBAR: #0D111D)                   */}
      {/* ========================================================= */}
      <aside className="w-64 bg-[#0D111D] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#1E253B]">
        <div className="p-4 space-y-5">
          
          {/* Logo & Console Title */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-9 h-9 rounded-xl bg-[#5B42F3] flex items-center justify-center text-white shadow-md">
              <Database size={20} />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-wide">DataAI</h1>
              <p className="text-[11px] text-slate-400 font-medium">Admin Console</p>
            </div>
          </div>

          {/* Connected DB Selector Pill */}
          <div className="bg-[#151929] border border-[#23293F] p-3 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Cơ sở dữ liệu
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5 truncate">
              homeservice_prod
            </div>
          </div>

          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-2 mb-2 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              ĐIỀU HƯỚNG
            </div>
            {renderNavItem('dashboard', <LayoutDashboard size={18} />, 'Dashboard', '3')}
            {renderNavItem('studio', <MessageSquare size={18} />, 'Query Studio')}
            {renderNavItem('sources', <Database size={18} />, 'Data Sources')}
            {renderNavItem('settings', <Settings size={18} />, 'Dictionary & Settings')}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#1E253B] flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-full bg-[#5B42F3] flex items-center justify-center text-white font-bold text-xs">
              AD
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">Admin User</div>
              <div className="text-[10px] text-slate-400 truncate">admin@homeser...</div>
            </div>
          </div>
          <ChevronDown size={14} className="text-slate-500" />
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT AREA                                      */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        
        {/* Top Header & Breadcrumb */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Home Service Booking</span>
            <ChevronRight size={14} />
            <span className="text-slate-800 font-semibold">
              {activeNav === 'studio' && (studioView === 'detail' ? 'Query Studio > Top thợ doanh thu tháng 08/2026' : 'Query Studio')}
              {activeNav === 'dashboard' && 'Dashboard'}
              {activeNav === 'sources' && 'Data Sources'}
              {activeNav === 'settings' && 'Dictionary & Settings'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button className="hover:text-slate-600"><Bell size={18} /></button>
            <button className="hover:text-slate-600"><HelpCircle size={18} /></button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* SCREEN A: QUERY STUDIO (MÀN HÌNH CHÍNH & MÀN HÌNH CHI TIẾT) */}
        {/* ========================================================= */}
        {activeNav === 'studio' && (
          studioView === 'list' ? (
            /* --- QUERY STUDIO LIST VIEW (ẢNH 1) --- */
            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
              
              {/* Header Title + Button New Session */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Query Studio</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Chọn một phiên hội thoại để tiếp tục, hoặc tạo mới để bắt đầu truy vấn.
                  </p>
                </div>
                <button
                  onClick={() => setStudioView('detail')}
                  className="px-5 py-2.5 bg-[#5B42F3] hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition"
                >
                  <Plus size={18} /> Phiên mới
                </button>
              </div>

              {/* Search Box & Category Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[280px]">
                  <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm phiên hội thoại..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button className="px-3.5 py-1.5 bg-[#5B42F3] text-white rounded-lg text-xs font-semibold">Tất cả</button>
                  <button className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium">Doanh thu</button>
                  <button className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium">Đơn hàng</button>
                  <button className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium">Nhân sự</button>
                </div>
              </div>

              {/* Top 3 Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 text-[#5B42F3] flex items-center justify-center font-bold">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">6</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Tổng phiên</div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
                    <Pin size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">1</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Đã ghim</div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">34</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Tin nhắn</div>
                  </div>
                </div>
              </div>

              {/* Section 1: ĐÃ GHIM */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Pin size={14} className="text-[#5B42F3]" /> ĐÃ GHIM
                </div>
                <div
                  onClick={() => setStudioView('detail')}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition flex items-start justify-between"
                >
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5B42F3] flex items-center justify-center shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Pin size={14} className="text-[#5B42F3] fill-[#5B42F3]" />
                        Top thợ doanh thu tháng 08/2026
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Lọc thêm những người có doanh thu trên 10 triệu từ danh sách trên.</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-[#5B42F3]">Doanh thu</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><MessageSquare size={12} /> 6 tin nhắn</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Database size={12} /> homeservice_prod</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">08:47</span>
                </div>
              </div>

              {/* Section 2: GẦN ĐÂY */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" /> GẦN ĐÂY
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5B42F3] flex items-center justify-center shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Phân tích đơn hủy tháng 7</h3>
                      <p className="text-xs text-slate-500 mt-1">Tỷ lệ hủy cao nhất ở dịch vụ nào? Nguyên nhân chính là gì?</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Hôm qua</span>
                </div>
              </div>
            </div>
          ) : (
            /* --- QUERY STUDIO ACTIVE SESSION CHAT & TABLE VIEW (ẢNH 7) --- */
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT PANEL: CHAT CONVERSATION */}
              <div className="w-[380px] bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
                
                {/* Header Chat */}
                <div className="p-4 border-b border-slate-200 space-y-2">
                  <button
                    onClick={() => setStudioView('list')}
                    className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold"
                  >
                    <ArrowLeft size={14} /> Danh sách phiên
                  </button>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm truncate">Top thợ doanh thu tháng 08/2026</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> live
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">Multi-turn · homeservice_prod</div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="text-center text-[10px] text-slate-400 font-mono">08:47</div>
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                      AI
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-700 space-y-2">
                      <p>Đã cập nhật danh sách với điều kiện doanh thu &gt; 10.000.000đ — còn lại 3 thợ thỏa điều kiện.</p>
                      <button
                        onClick={() => setShowSqlCode(!showSqlCode)}
                        className="text-[#5B42F3] font-semibold text-xs flex items-center gap-1 hover:underline"
                      >
                        &gt; {showSqlCode ? 'Ẩn SQL' : 'Xem SQL'}
                      </button>
                    </div>
                  </div>

                  {showSqlCode && (
                    <div className="p-3 bg-slate-900 text-indigo-200 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
                      SELECT t.full_name, SUM(p.amount) <br/>
                      FROM technicians t <br/>
                      JOIN bookings b ON t.id = b.tech_id <br/>
                      WHERE b.created_at &gt;= '2026-08-01' <br/>
                      HAVING SUM(p.amount) &gt; 10000000;
                    </div>
                  )}

                  {/* Suggested Follow-up Questions */}
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">GỢI Ý TIẾP THEO</div>
                    <div className="space-y-1.5">
                      <button className="w-full text-left p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 transition">
                        So sánh với tháng 7?
                      </button>
                      <button className="w-full text-left p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 transition">
                        Phân loại theo dịch vụ?
                      </button>
                    </div>
                  </div>
                </div>

                {/* Input Chat Box */}
                <div className="p-3 border-t border-slate-200 bg-white">
                  <div className="relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Hỏi về dữ liệu..."
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button className="absolute right-2 top-2 p-1.5 bg-[#5B42F3] text-white rounded-lg hover:bg-indigo-700">
                      <Send size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 text-center mt-1.5">Enter gửi · Shift+Enter xuống dòng</div>
                </div>
              </div>

              {/* RIGHT PANEL: DATA GRID & ACTION BAR */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC]">
                
                {/* Top Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Top thợ · DT &gt; 10tr · Tháng 08/2026</h2>
                    <p className="text-xs text-slate-400 mt-0.5">3 kết quả · Cập nhật 08:47</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveNav('dashboard');
                        alert('Đã ghim biểu đồ này vào Dashboard thành công!');
                      }}
                      className="px-4 py-2 bg-[#5B42F3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
                    >
                      <Pin size={14} /> Ghim vào Dashboard
                    </button>
                    <button className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <Clock size={14} /> Lên lịch
                    </button>
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/50">
                      <button
                        onClick={() => setDataViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                          dataViewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        <Table size={13} /> Bảng
                      </button>
                      <button
                        onClick={() => setDataViewMode('chart')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                          dataViewMode === 'chart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        <BarChart2 size={13} /> Biểu đồ
                      </button>
                    </div>
                    <button className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-1 hover:bg-emerald-50">
                      <Download size={13} /> CSV
                    </button>
                    <button className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-indigo-700 flex items-center gap-1 hover:bg-indigo-50">
                      <FileSpreadsheet size={13} /> Excel
                    </button>
                  </div>
                </div>

                {/* Filter Yellow Warning Banner */}
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">🏆</span>
                    <span className="font-semibold">Đang lọc: doanh thu &gt; 10.000.000đ</span>
                    <span className="text-amber-600">— từ kết quả truy vấn trước (Top 5 thợ tháng 08/2026)</span>
                  </div>
                  <button className="text-amber-700 hover:underline font-semibold text-[11px]">Xóa lọc</button>
                </div>

                {/* Top 3 Summary Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/70 backdrop-blur border border-slate-200/80 p-4 rounded-2xl">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG DOANH THU</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">37.500.000 đ</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">3 thợ</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur border border-slate-200/80 p-4 rounded-2xl">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG ĐƠN HT</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">100 đơn</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">tháng 08/2026</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur border border-slate-200/80 p-4 rounded-2xl">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TB DT / THỢ</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">12.5MM đ</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">trung bình</div>
                  </div>
                </div>

                {/* Data Table View OR Chart View */}
                {dataViewMode === 'table' ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">TÊN THỢ</th>
                          <th className="py-3 px-4">DỊCH VỤ</th>
                          <th className="py-3 px-4">ĐƠN HOÀN THÀNH</th>
                          <th className="py-3 px-4">DOANH THU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4"><span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-[11px] flex items-center justify-center">1</span></td>
                          <td className="py-3 px-4 font-bold text-slate-900">Nguyễn Văn A</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold">Dọn dẹp</span></td>
                          <td className="py-3 px-4">45 đơn</td>
                          <td className="py-3 px-4 font-bold text-slate-900">15.500.000 đ</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4"><span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center">2</span></td>
                          <td className="py-3 px-4 font-bold text-slate-900">Trần Thị B</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold">Điện nước</span></td>
                          <td className="py-3 px-4">30 đơn</td>
                          <td className="py-3 px-4 font-bold text-slate-900">12.000.000 đ</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4"><span className="w-5 h-5 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] flex items-center justify-center">3</span></td>
                          <td className="py-3 px-4 font-bold text-slate-900">Lê Văn C</td>
                          <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold">Sửa chữa</span></td>
                          <td className="py-3 px-4">25 đơn</td>
                          <td className="py-3 px-4 font-bold text-slate-900">10.000.000 đ</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Pagination Footer */}
                    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>1–3 / 3 kết quả</span>
                      <button className="w-6 h-6 rounded bg-[#5B42F3] text-white font-bold flex items-center justify-center">1</button>
                    </div>
                  </div>
                ) : (
                  /* Biểu đồ giả lập */
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="text-xs font-bold text-slate-500 uppercase">Doanh thu theo thợ (Đơn vị: VNĐ)</div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Nguyễn Văn A</span><span>15.500.000 đ</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className="bg-[#5B42F3] h-full w-[100%] rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Trần Thị B</span><span>12.000.000 đ</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className="bg-[#5B42F3]/80 h-full w-[77%] rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Lê Văn C</span><span>10.000.000 đ</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className="bg-[#5B42F3]/60 h-full w-[64%] rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ========================================================= */}
        {/* SCREEN B: DASHBOARD (ẢNH 2)                               */}
        {/* ========================================================= */}
        {activeNav === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                <p className="text-sm text-slate-500 mt-1">Biểu đồ đã được ghim từ Query Studio · Tháng 08/2026</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">3 widget đang hiển thị</span>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  + Thêm widget
                </button>
              </div>
            </div>

            {/* Grid Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Widget 1: TỔNG DOANH THU */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                  <span>💰</span> TỔNG DOANH THU
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-slate-900">63,45M</div>
                  <div className="text-xs text-slate-400 mt-1">đ · Tháng 08/2026</div>
                </div>
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  ↗ +12,4% so với tháng 7
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">TỔNG ĐƠN</div>
                    <div className="text-base font-bold text-slate-900">140</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">SỐ THỢ</div>
                    <div className="text-base font-bold text-slate-900">5</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-right flex items-center justify-end gap-1">
                  <Pin size={10} /> Ghim 08:50
                </div>
              </div>

              {/* Widget 2: Top 5 thợ · Doanh thu cao nhất */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Top 5 thợ · Doanh thu cao nhất</h3>
                    <p className="text-[11px] text-slate-400">Tháng 08/2026 · Đơn vị: triệu đ</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1"><Pin size={10} /> Ghim 08:51</span>
                </div>
                <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-[#5B42F3] rounded-t-lg h-[85%]"></div>
                    <span className="text-[10px] text-slate-500 font-bold">A V.</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-indigo-500 rounded-t-lg h-[65%]"></div>
                    <span className="text-[10px] text-slate-500 font-bold">B T.</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-indigo-400 rounded-t-lg h-[50%]"></div>
                    <span className="text-[10px] text-slate-500 font-bold">C V.</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-indigo-300 rounded-t-lg h-[40%]"></div>
                    <span className="text-[10px] text-slate-500 font-bold">D T.</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-indigo-200 rounded-t-lg h-[30%]"></div>
                    <span className="text-[10px] text-slate-500 font-bold">E V.</span>
                  </div>
                </div>
              </div>

              {/* Widget 3: Tỷ lệ đơn Hoàn thành vs Hủy */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Tỷ lệ đơn Hoàn thành vs Hủy</h3>
                <p className="text-[11px] text-slate-400">Tháng 07/2026 · 1.284 đơn</p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-24 h-24 rounded-full border-8 border-[#5B42F3] border-t-rose-400 flex items-center justify-center font-bold text-xs">
                    86%
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#5B42F3]"></span> Hoàn thành (86%)</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Hủy đơn (14%)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN C: DATA SOURCES (ẢNH 3)                            */}
        {/* ========================================================= */}
        {activeNav === 'sources' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nguồn dữ liệu</h2>
              <p className="text-sm text-slate-500 mt-1">Quản lý các kết nối tới Database đang hoạt động</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Source 1 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">🐘</div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">homeservice_prod</h3>
                      <p className="text-xs text-slate-400">PostgreSQL 15</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">● Kết nối</span>
                </div>
                <div className="text-xs text-slate-500">☰ 42 bảng</div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button className="py-2 bg-indigo-50 text-[#5B42F3] rounded-xl text-xs font-semibold hover:bg-indigo-100">Xem schema</button>
                  <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100">Cài đặt</button>
                </div>
              </div>

              {/* Source 2 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">📊</div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">analytics_dw</h3>
                      <p className="text-xs text-slate-400">BigQuery</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">● Kết nối</span>
                </div>
                <div className="text-xs text-slate-500">☰ 18 bảng</div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button className="py-2 bg-indigo-50 text-[#5B42F3] rounded-xl text-xs font-semibold hover:bg-indigo-100">Xem schema</button>
                  <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100">Cài đặt</button>
                </div>
              </div>

              {/* Source 3 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">🐬</div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">legacy_mysql</h3>
                      <p className="text-xs text-slate-400">MySQL 8.0</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">● Ngắt kết nối</span>
                </div>
                <div className="text-xs text-slate-500">☰ 31 bảng</div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button className="py-2 bg-indigo-50 text-[#5B42F3] rounded-xl text-xs font-semibold hover:bg-indigo-100">Xem schema</button>
                  <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100">Cài đặt</button>
                </div>
              </div>

              {/* Add Source Box */}
              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 hover:border-indigo-300 cursor-pointer transition">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Plus size={20} />
                </div>
                <span className="font-semibold text-xs text-slate-700">Thêm nguồn dữ liệu</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN D: DICTIONARY & SETTINGS (ẢNH 4, 5, 6)            */}
        {/* ========================================================= */}
        {activeNav === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Cài đặt & Từ điển</h2>
              <p className="text-sm text-slate-500 mt-1">Định nghĩa thuật ngữ nghiệp vụ giúp AI hiểu ngữ cảnh chính xác hơn</p>
            </div>

            {/* Sub Tabs Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit">
              <button
                onClick={() => setSettingsTab('dictionary')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  settingsTab === 'dictionary' ? 'bg-[#5B42F3] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Từ điển dữ liệu
              </button>
              <button
                onClick={() => setSettingsTab('sources')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  settingsTab === 'sources' ? 'bg-[#5B42F3] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Nguồn dữ liệu
              </button>
              <button
                onClick={() => setSettingsTab('connect')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  settingsTab === 'connect' ? 'bg-[#5B42F3] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kết nối DB
              </button>
            </div>

            {/* TAB 1: TỪ ĐIỂN NGHỆP VỤ (ẢNH 4) */}
            {settingsTab === 'dictionary' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Từ điển nghiệp vụ</h3>
                    <p className="text-xs text-slate-400 mt-0.5">4 thuật ngữ đã định nghĩa</p>
                  </div>
                  <button className="px-4 py-2.5 bg-[#5B42F3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-100">
                    <Plus size={16} /> Thêm thuật ngữ
                  </button>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="py-3 px-4">THUẬT NGỮ</th>
                      <th className="py-3 px-4">LOGIC / QUY TẮC SQL</th>
                      <th className="py-3 px-4">MÔ TẢ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {INITIAL_DICTIONARY.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#5B42F3]"></span> {d.term}
                        </td>
                        <td className="py-3 px-4 font-mono text-indigo-600 bg-indigo-50/50 rounded-lg">{d.rule}</td>
                        <td className="py-3 px-4 text-slate-500">{d.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: NGUỒN DỮ LIỆU ĐÃ KẾT NỐI (ẢNH 5) */}
            {settingsTab === 'sources' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Nguồn dữ liệu đã kết nối</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">🛢️</div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">homeservice_prod</div>
                        <div className="text-[11px] text-slate-400">PostgreSQL · db.homeservice.vn:5432</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">● Đã kết nối</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">📊</div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">analytics_dw</div>
                        <div className="text-[11px] text-slate-400">BigQuery · project.region.bigquery</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">● Đã kết nối</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FORM THÊM KẾT NỐI MỚI (ẢNH 6) */}
            {settingsTab === 'connect' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-xl space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Thêm kết nối mới</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên kết nối</label>
                    <input type="text" placeholder="homeservice_staging" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Host / URL</label>
                    <input type="text" placeholder="db.staging.vn:5432" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Database</label>
                    <input type="text" placeholder="homeservice_db" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Username</label>
                    <input type="text" placeholder="admin" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}