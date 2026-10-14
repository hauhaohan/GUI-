import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, MessageSquare, Database, Settings, Search, Plus,
  Pin, Clock, Sparkles, ChevronRight, ChevronDown, CheckCircle2,
  XCircle, Download, Table, BarChart2, ArrowLeft, Filter, Bell,
  HelpCircle, Send, Code, FileSpreadsheet, FileText, X, Trash2,
  Edit2, Check, RefreshCw, LogIn, LogOut, Shield, Wifi, WifiOff,
  Copy, Layers, User
} from 'lucide-react';
import { authService } from './services/authService';
import { chatService } from './services/chatService';
import { authStorage, API_BASE_URL } from './services/apiClient';
import LoginPage from './components/LoginPage';
import LoginModal from './components/LoginModal';
import Toast from './components/Toast';
import AiMarkdownMessage from './components/AiMarkdownMessage';
import { exportToCsv, exportToExcel } from './utils/exportUtils';

const INITIAL_DICTIONARY = [
  { id: 1, term: 'Khách VIP', rule: 'total_fee > 10.000.000', desc: 'Khách hàng có tổng chi tiêu trên 10 triệu' },
  { id: 2, term: 'Thợ nổi bật', rule: 'completed_orders >= 30', desc: 'Thợ hoàn thành ≥ 30 đơn/tháng' },
  { id: 3, term: 'Đơn cấp tốc', rule: "service_type = 'urgent'", desc: 'Đơn đặt dịch vụ khẩn cấp' },
  { id: 4, term: 'Tỷ lệ hủy cao', rule: 'cancel_rate > 0.15', desc: 'Tỷ lệ hủy đơn vượt 15%' },
];

export default function App() {
  // Authentication State (POST /api/auth/login)
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Navigation & Screen States
  const [activeNav, setActiveNav] = useState('studio'); // 'dashboard' | 'studio' | 'sources' | 'settings'
  const [studioView, setStudioView] = useState('list'); // 'list' | 'detail'
  const [settingsTab, setSettingsTab] = useState('dictionary'); // 'dictionary' | 'sources' | 'connect'
  const [dataViewMode, setDataViewMode] = useState('table'); // 'table' | 'chart'
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (type, message, title = '') => {
    setToast({ type, message, title });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Sessions List State (GET /api/admin/chat)
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Active Session State (POST /api/admin/chat/ask, PATCH, DELETE)
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentTableData, setCurrentTableData] = useState([]);
  const [currentSqlQuery, setCurrentSqlQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  // Dashboard Pinned Queries State
  const [dashboardWidgets, setDashboardWidgets] = useState([
    {
      id: 1,
      title: 'Tổng doanh thu',
      subtitle: 'Tháng 08/2026',
      metric: '63,45M đ',
      note: '↗ +12,4% so với tháng 7',
      totalOrders: 140,
      totalTechs: 5,
      pinnedAt: '08:50',
    },
  ]);

  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  // Handle unauthorized event (401)
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      showToast('error', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', '401 Unauthorized');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Fetch Chat Sessions (GET /api/admin/chat?page=1&size=10&keyword=)
  const fetchSessions = useCallback(async (page = 1, keyword = '') => {
    if (!authService.isAuthenticated() && !authStorage.isMockEnabled()) return;

    setIsLoadingSessions(true);
    try {
      const data = await chatService.getChatSessions({
        page,
        size: 10,
        keyword: keyword.trim(),
      });

      if (data) {
        setSessions(data.items || []);
        setPagination({
          currentPage: data.currentPage || page,
          pageSize: data.pageSize || 10,
          totalElements: data.totalElements || (data.items ? data.items.length : 0),
          totalPages: data.totalPages || 1,
          hasNext: !!data.hasNext,
        });
      }
    } catch (err) {
      console.error('Lỗi tải danh sách session:', err);
      showToast('error', err.message || 'Không thể tải danh sách phiên trò chuyện.', 'Lỗi API');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Initial load when logged in
  useEffect(() => {
    if (currentUser) {
      fetchSessions(1, searchKeyword);
    }
  }, [currentUser, fetchSessions]);

  // Debounced Search keyword change
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      fetchSessions(1, searchKeyword);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword, currentUser, fetchSessions]);

  // Login handler
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    showToast(
      'success',
      `Chào mừng ${userData.fullName || 'Admin'} đã đăng nhập thành công vào hệ thống!`,
      'Đăng nhập thành công'
    );
    fetchSessions(1, searchKeyword);
  };

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveSession(null);
    showToast('info', 'Bạn đã đăng xuất khỏi hệ thống.', 'Đã đăng xuất');
  };

  // Nếu người dùng chưa đăng nhập, hiển thị Màn hình Đăng nhập chuyên nghiệp
  if (!currentUser) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // =========================================================
  // LOGGED-IN APPLICATION CONSOLE
  // =========================================================

  // Tạo phiên mới (New Session)
  const handleCreateNewSession = () => {
    setActiveSession(null);
    setMessages([
      {
        role: 'assistant',
        content: `### 👋 Xin chào Quản trị viên!
Tôi là **Trợ lý AI Cơ sở Dữ liệu Home Services** (OpenAI GPT-4o-mini).

Tôi có thể hỗ trợ bạn:
- 📊 **Phân tích kinh doanh**: Doanh thu theo tháng/quý, đơn giá dịch vụ.
- 👨‍🔧 **Hiệu suất thợ**: Danh sách thợ nổi bật, xếp hạng theo doanh thu & đơn hoàn thành.
- ⚡ **Sinh mã SQL**: Tự động tạo và thực thi câu lệnh SQL trực tiếp trên cơ sở dữ liệu PostgreSQL.

> *Hãy đặt câu hỏi trong ô chat bên dưới hoặc chọn các gợi ý mẫu để bắt đầu!*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setCurrentTableData([]);
    setCurrentSqlQuery('');
    setShowSqlCode(false);
    setStudioView('detail');
  };

  // Mở session có sẵn
  const handleOpenSession = (session) => {
    setActiveSession(session);
    setEditTitleValue(session.title);

    setMessages([
      {
        role: 'user',
        content: session.title,
        timestamp: '08:45',
      },
      {
        role: 'assistant',
        content: session.lastMessage || `### 📊 Kết quả phân tích thợ tháng 08/2026
Đã lọc danh sách với điều kiện **doanh thu > 10.000.000đ** — còn lại **3 thợ** thỏa điều kiện:

- 🥇 **Nguyễn Văn A**: 15.500.000 đ *(45 đơn dọn dẹp)*
- 🥈 **Trần Thị B**: 12.000.000 đ *(30 đơn điện nước)*
- 🥉 **Lê Văn C**: 10.000.000 đ *(25 đơn sửa chữa)*

> Bạn có thể bấm **Xem SQL sinh bởi AI** bên dưới để xem chi tiết cú pháp truy vấn.`,
        sqlQuery: `SELECT t.full_name AS ten_tho, s.name AS dich_vu, COUNT(b.id) AS don_hoan_thanh, SUM(p.amount) AS doanh_thu\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN services s ON b.service_id = s.id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.id, t.full_name, s.name\nHAVING SUM(p.amount) > 10000000\nORDER BY doanh_thu DESC;`,
        tableData: [
          { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp', don_hoan_thanh: 45, doanh_thu: 15500000 },
          { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
          { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa', don_hoan_thanh: 25, doanh_thu: 10000000 },
        ],
        timestamp: '08:47',
      },
    ]);

    setCurrentTableData([
      { id: 1, ten_tho: 'Nguyễn Văn A', dich_vu: 'Dọn dẹp', don_hoan_thanh: 45, doanh_thu: 15500000 },
      { id: 2, ten_tho: 'Trần Thị B', dich_vu: 'Điện nước', don_hoan_thanh: 30, doanh_thu: 12000000 },
      { id: 3, ten_tho: 'Lê Văn C', dich_vu: 'Sửa chữa', don_hoan_thanh: 25, doanh_thu: 10000000 },
    ]);

    setCurrentSqlQuery(`SELECT t.full_name AS ten_tho, s.name AS dich_vu, COUNT(b.id) AS don_hoan_thanh, SUM(p.amount) AS doanh_thu\nFROM technicians t\nJOIN bookings b ON t.id = b.tech_id\nJOIN services s ON b.service_id = s.id\nJOIN payments p ON b.id = p.booking_id\nWHERE b.status = 'COMPLETED'\nGROUP BY t.id, t.full_name, s.name\nHAVING SUM(p.amount) > 10000000\nORDER BY doanh_thu DESC;`);

    setStudioView('detail');
  };

  // 2.1 Hỏi AI (POST /api/admin/chat/ask)
  const handleAskQuestion = async (customQuestion = null) => {
    const questionText = customQuestion || chatInput;
    if (!questionText || questionText.trim().length < 5) {
      showToast('error', 'Câu hỏi cần có ít nhất 5 ký tự.', 'Xác thực câu hỏi');
      return;
    }
    if (questionText.trim().length > 500) {
      showToast('error', 'Câu hỏi không được vượt quá 500 ký tự.', 'Xác thực câu hỏi');
      return;
    }

    const userMessage = {
      role: 'user',
      content: questionText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsAsking(true);

    try {
      const sessionId = activeSession?.id || null;
      const responseData = await chatService.askQuestion(questionText.trim(), sessionId);

      if (responseData) {
        const assistantMsg = {
          role: 'assistant',
          content: responseData.aiMessage,
          sqlQuery: responseData.sqlQuery,
          tableData: responseData.tableData,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (responseData.tableData && responseData.tableData.length > 0) {
          setCurrentTableData(responseData.tableData);
        }
        if (responseData.sqlQuery) {
          setCurrentSqlQuery(responseData.sqlQuery);
        }

        if (!activeSession && responseData.sessionId) {
          const newSessionObj = {
            id: responseData.sessionId,
            title: questionText.trim().length > 35 ? questionText.trim().slice(0, 35) + '...' : questionText.trim(),
            lastMessage: responseData.aiMessage,
            totalMessage: 2,
            isPinned: false,
            category: 'Doanh thu',
            dataSource: 'homeservice_prod',
            lastMessageAt: new Date().toISOString(),
          };
          setActiveSession(newSessionObj);
          setEditTitleValue(newSessionObj.title);
        }

        fetchSessions(pagination.currentPage, searchKeyword);
      }
    } catch (err) {
      console.error('Lỗi khi hỏi AI:', err);
      showToast('error', err.message || 'Lỗi xử lý câu hỏi từ máy chủ AI.', 'Lỗi truy vấn');
    } finally {
      setIsAsking(false);
    }
  };

  // 2.3 Cập nhật Chat Session (PATCH /api/admin/chat/{id}) - Ghim / Bỏ ghim
  const handleTogglePinSession = async (session, e = null) => {
    if (e) e.stopPropagation();
    try {
      await chatService.updateChatSession(session.id, {
        isPinned: !session.isPinned,
      });

      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, isPinned: !session.isPinned } : s))
      );

      if (activeSession && activeSession.id === session.id) {
        setActiveSession((prev) => ({ ...prev, isPinned: !session.isPinned }));
      }

      showToast(
        'success',
        session.isPinned ? 'Đã bỏ ghim phiên hội thoại.' : 'Đã ghim phiên hội thoại lên đầu trang.',
        'Cập nhật phiên'
      );
    } catch (err) {
      showToast('error', err.message || 'Không thể cập nhật trạng thái ghim.', 'Lỗi PATCH');
    }
  };

  // 2.3 Cập nhật tên phiên (PATCH /api/admin/chat/{id})
  const handleSaveTitle = async () => {
    if (!activeSession?.id) return;
    if (!editTitleValue.trim()) {
      showToast('error', 'Tiêu đề phiên không được để trống.');
      return;
    }

    try {
      await chatService.updateChatSession(activeSession.id, {
        newTitle: editTitleValue.trim(),
      });

      setActiveSession((prev) => ({ ...prev, title: editTitleValue.trim() }));
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, title: editTitleValue.trim() } : s))
      );
      setIsEditingTitle(false);
      showToast('success', 'Đã đổi tên phiên hội thoại thành công!', 'Cập nhật tiêu đề');
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cập nhật tiêu đề.', 'Lỗi PATCH');
    }
  };

  // 2.4 Xóa mềm Chat Session (DELETE /api/admin/chat/{id})
  const handleDeleteSession = async (sessionId, e = null) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiên hội thoại này?')) {
      return;
    }

    try {
      await chatService.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (activeSession && activeSession.id === sessionId) {
        setStudioView('list');
        setActiveSession(null);
      }

      showToast('success', 'Đã xóa phiên hội thoại thành công!', 'Xóa phiên');
      fetchSessions(pagination.currentPage, searchKeyword);
    } catch (err) {
      showToast('error', err.message || 'Không thể xóa phiên hội thoại.', 'Lỗi DELETE');
    }
  };

  // Ghim kết quả hiện tại vào Dashboard
  const handlePinToDashboard = () => {
    const newWidget = {
      id: Date.now(),
      title: activeSession?.title || 'Bảng dữ liệu AI',
      subtitle: `Truy vấn lúc ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      metric: `${currentTableData.length} bản ghi`,
      note: 'Dữ liệu được trích xuất từ cơ sở dữ liệu',
      tableDataPreview: currentTableData.slice(0, 3),
      pinnedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDashboardWidgets((prev) => [newWidget, ...prev]);
    showToast('success', 'Đã ghim biểu đồ / bảng này vào Dashboard!', 'Ghim Dashboard');
  };

  // Sao chép mã SQL
  const handleCopySql = () => {
    if (!currentSqlQuery) return;
    navigator.clipboard.writeText(currentSqlQuery);
    showToast('info', 'Đã sao chép câu lệnh SQL vào bộ nhớ đệm!');
  };

  // Dynamic columns for current table data
  const tableHeaders = currentTableData && currentTableData.length > 0 ? Object.keys(currentTableData[0]) : [];

  const formatHeader = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toUpperCase();
  };

  const formatCellValue = (val, key = '') => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      if (key.toLowerCase().includes('doanh_thu') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('price')) {
        return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
      }
      return val.toLocaleString('vi-VN');
    }
    return String(val);
  };

  const filteredSessions = sessions.filter((s) => {
    if (selectedCategory === 'Tất cả') return true;
    return s.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned);
  const recentSessions = filteredSessions.filter((s) => !s.isPinned);

  const totalMessageCount = sessions.reduce((acc, curr) => acc + (curr.totalMessage || 0), 0);

  const calculateTableStats = () => {
    if (!currentTableData || currentTableData.length === 0) {
      return { totalRevenue: '37.500.000 đ', totalRows: '0 kết quả', avgRevenue: '12.5M đ' };
    }
    const count = currentTableData.length;
    let sumRevenue = 0;
    let hasRevenue = false;

    currentTableData.forEach((row) => {
      Object.entries(row).forEach(([k, v]) => {
        if ((k.includes('doanh_thu') || k.includes('amount') || k.includes('price')) && typeof v === 'number') {
          sumRevenue += v;
          hasRevenue = true;
        }
      });
    });

    return {
      totalRows: `${count} kết quả`,
      totalRevenue: hasRevenue ? new Intl.NumberFormat('vi-VN').format(sumRevenue) + ' đ' : `${count} bản ghi`,
      avgRevenue: hasRevenue && count > 0 ? new Intl.NumberFormat('vi-VN').format(Math.round(sumRevenue / count)) + ' đ' : '-',
    };
  };

  const tableStats = calculateTableStats();

  const renderNavItem = (id, icon, label, badge) => {
    const isActive = activeNav === id;
    return (
      <button
        onClick={() => {
          setActiveNav(id);
          if (id === 'studio' && studioView === 'detail' && !activeSession) {
            setStudioView('list');
          }
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
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              isActive ? 'bg-white/20 text-white' : 'bg-[#1E253B] text-indigo-400'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Login Modal for re-auth */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* ========================================================= */}
      {/* 1. SIDEBAR (FIGMA DARK NAVBAR: #0D111D)                   */}
      {/* ========================================================= */}
      <aside className="w-64 bg-[#0D111D] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#1E253B]">
        <div className="p-4 space-y-5">
          {/* Logo & Console Title */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-9 h-9 rounded-xl bg-[#5B42F3] flex items-center justify-center text-white shadow-md shadow-indigo-900/50">
              <Database size={20} />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-wide">DataAI</h1>
              <p className="text-[11px] text-slate-400 font-medium">Home Services Assistant</p>
            </div>
          </div>

          {/* Connected DB Selector Pill */}
          <div className="bg-[#151929] border border-[#23293F] p-3 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Cơ sở dữ liệu
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">Port 8080</span>
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono truncate">
              homeservice_prod
            </div>
          </div>

          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-2 mb-2 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              ĐIỀU HƯỚNG
            </div>
            {renderNavItem('dashboard', <LayoutDashboard size={18} />, 'Dashboard', dashboardWidgets.length.toString())}
            {renderNavItem('studio', <MessageSquare size={18} />, 'Query Studio', sessions.length > 0 ? sessions.length.toString() : null)}
            {renderNavItem('sources', <Database size={18} />, 'Data Sources')}
            {renderNavItem('settings', <Settings size={18} />, 'Dictionary & Settings')}
          </div>
        </div>

        {/* User Profile Footer & Auth Status (POST /api/auth/login) */}
        <div className="p-4 border-t border-[#1E253B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 rounded-full bg-[#5B42F3] flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                {currentUser?.fullName ? currentUser.fullName.slice(0, 2) : 'AD'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  {currentUser?.fullName || 'Admin User'}
                  <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded font-mono font-bold">
                    {currentUser?.role || 'ADMIN'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.email || 'admin@homeservice.vn'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#1E253B] transition"
            >
              <LogOut size={16} />
            </button>
          </div>
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
              {activeNav === 'studio' && (
                studioView === 'detail'
                  ? `Query Studio > ${activeSession?.title || 'Phiên mới'}`
                  : 'Query Studio'
              )}
              {activeNav === 'dashboard' && 'Dashboard'}
              {activeNav === 'sources' && 'Data Sources'}
              {activeNav === 'settings' && 'Dictionary & Settings'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* API Mode Indicator */}
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border ${
                authStorage.isMockEnabled()
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {authStorage.isMockEnabled() ? (
                <>
                  <WifiOff size={12} className="text-amber-600" />
                  <span>Demo Mode (Mock API)</span>
                </>
              ) : (
                <>
                  <Wifi size={12} className="text-emerald-600" />
                  <span>Live API (http://localhost:8080)</span>
                </>
              )}
            </div>

            <button
              onClick={() => {
                const next = !authStorage.isMockEnabled();
                authStorage.setMockEnabled(next);
                showToast(
                  'info',
                  next
                    ? 'Đã bật chế độ mô phỏng khi chưa khởi động backend.'
                    : 'Đã chuyển sang kết nối trực tiếp http://localhost:8080.',
                  'Chuyển chế độ kết nối'
                );
                fetchSessions(1, searchKeyword);
              }}
              title="Chuyển đổi chế độ Mock / Live API"
              className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Đổi nguồn
            </button>

            <button
              onClick={() => fetchSessions(pagination.currentPage, searchKeyword)}
              title="Làm mới danh sách"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <RefreshCw size={16} className={isLoadingSessions ? 'animate-spin text-[#5B42F3]' : ''} />
            </button>
            <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* SCREEN A: QUERY STUDIO (DANH SÁCH & CHI TIẾT)             */}
        {/* ========================================================= */}
        {activeNav === 'studio' && (
          studioView === 'list' ? (
            /* --- QUERY STUDIO LIST VIEW (GET /api/admin/chat) --- */
            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
              {/* Header Title + Button New Session */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Query Studio</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Chọn một phiên hội thoại để tiếp tục, hoặc tạo mới để bắt đầu truy vấn với OpenAI GPT-4o-mini.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewSession}
                  className="px-5 py-2.5 bg-[#5B42F3] hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition cursor-pointer"
                >
                  <Plus size={18} /> Phiên mới
                </button>
              </div>

              {/* Search Box & Category Filters (GET /api/admin/chat?keyword=...) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[280px]">
                  <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm kiếm phiên hội thoại (tiêu đề, nội dung)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition"
                  />
                  {searchKeyword && (
                    <button
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  {['Tất cả', 'Doanh thu', 'Đơn hàng', 'Nhân sự'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedCategory === cat
                          ? 'bg-[#5B42F3] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top 3 Stat Cards from API Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 text-[#5B42F3] flex items-center justify-center font-bold">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {pagination.totalElements || sessions.length}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Tổng phiên trò chuyện</div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
                    <Pin size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{pinnedSessions.length}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Phiên đã ghim</div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{totalMessageCount || 34}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Tin nhắn đã trao đổi</div>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingSessions && (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
                  <div className="w-8 h-8 border-3 border-[#5B42F3] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-500">Đang tải danh sách phiên từ máy chủ...</p>
                </div>
              )}

              {/* Section 1: ĐÃ GHIM (isPinned === true) */}
              {!isLoadingSessions && pinnedSessions.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                    <Pin size={14} className="text-[#5B42F3] fill-[#5B42F3]" /> ĐÃ GHIM ({pinnedSessions.length})
                  </div>
                  <div className="space-y-2.5">
                    {pinnedSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleOpenSession(session)}
                        className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer transition flex items-start justify-between"
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5B42F3] flex items-center justify-center shrink-0">
                            <MessageSquare size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <Pin size={14} className="text-[#5B42F3] fill-[#5B42F3]" />
                              {session.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {session.lastMessage || 'Chưa có nội dung phản hồi gần đây.'}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-[#5B42F3]">
                                {session.category || 'Doanh thu'}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <MessageSquare size={12} /> {session.totalMessage || 0} tin nhắn
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Database size={12} /> {session.dataSource || 'homeservice_prod'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleTogglePinSession(session, e)}
                            title="Bỏ ghim"
                            className="opacity-0 group-hover:opacity-100 p-2 text-[#5B42F3] hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Pin size={15} className="fill-[#5B42F3]" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            title="Xóa phiên (DELETE /api/admin/chat/{id})"
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                          <span className="text-xs text-slate-400 font-medium pl-2">
                            {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:47'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: GẦN ĐÂY (!isPinned) */}
              {!isLoadingSessions && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                    <Clock size={14} className="text-slate-400" /> GẦN ĐÂY ({recentSessions.length})
                  </div>
                  {recentSessions.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                      Không có phiên hội thoại nào phù hợp. Bấm "+ Phiên mới" để bắt đầu câu hỏi đầu tiên!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recentSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => handleOpenSession(session)}
                          className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer transition flex items-start justify-between"
                        >
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-[#5B42F3] flex items-center justify-center shrink-0 transition">
                              <MessageSquare size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{session.title}</h3>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {session.lastMessage || 'Chưa có nội dung phản hồi gần đây.'}
                              </p>
                              <div className="flex items-center gap-3 mt-3">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                  {session.category || 'Chung'}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <MessageSquare size={12} /> {session.totalMessage || 0} tin nhắn
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Database size={12} /> {session.dataSource || 'homeservice_prod'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleTogglePinSession(session, e)}
                              title="Ghim phiên này (PATCH /api/admin/chat/{id})"
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-[#5B42F3] hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Pin size={15} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              title="Xóa phiên (DELETE /api/admin/chat/{id})"
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 size={15} />
                            </button>
                            <span className="text-xs text-slate-400 font-medium pl-2">
                              {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleDateString('vi-VN') : 'Hôm qua'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
                  <div>
                    Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalElements} phiên)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={pagination.currentPage <= 1}
                      onClick={() => fetchSessions(pagination.currentPage - 1, searchKeyword)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      Trước
                    </button>
                    <button
                      disabled={!pagination.hasNext}
                      onClick={() => fetchSessions(pagination.currentPage + 1, searchKeyword)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* --- QUERY STUDIO ACTIVE SESSION CHAT & TABLE VIEW (POST /api/admin/chat/ask) --- */
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT PANEL: CHAT CONVERSATION */}
              <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
                {/* Header Chat */}
                <div className="p-4 border-b border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setStudioView('list')}
                      className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold transition"
                    >
                      <ArrowLeft size={14} /> Danh sách phiên
                    </button>
                    {activeSession && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePinSession(activeSession)}
                          title={activeSession.isPinned ? 'Bỏ ghim' : 'Ghim phiên này'}
                          className={`p-1.5 rounded-lg transition ${
                            activeSession.isPinned
                              ? 'text-[#5B42F3] bg-indigo-50'
                              : 'text-slate-400 hover:text-[#5B42F3]'
                          }`}
                        >
                          <Pin size={14} className={activeSession.isPinned ? 'fill-[#5B42F3]' : ''} />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(activeSession.id)}
                          title="Xóa phiên hội thoại này"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title with edit capability */}
                  <div className="flex items-center justify-between gap-2">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs font-bold border border-indigo-400 rounded-lg focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        />
                        <button onClick={handleSaveTitle} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setIsEditingTitle(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 truncate">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {activeSession?.title || 'Phiên truy vấn mới'}
                        </h3>
                        {activeSession && (
                          <button
                            onClick={() => setIsEditingTitle(true)}
                            title="Đổi tên phiên"
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> live
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>GPT-4o-mini · homeservice_prod</span>
                    {activeSession?.id && <span>ID: #{activeSession.id}</span>}
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="text-center text-[10px] text-slate-400 font-mono">
                        {msg.timestamp || 'Bây giờ'}
                      </div>

                      {msg.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-[#5B42F3] text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-sm">
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 items-start">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 text-[#5B42F3] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            AI
                          </div>
                          <div className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-700 space-y-2">
                            <AiMarkdownMessage content={msg.content} />

                            {msg.sqlQuery && (
                              <button
                                onClick={() => setShowSqlCode(!showSqlCode)}
                                className="text-[#5B42F3] font-semibold text-xs flex items-center gap-1 hover:underline pt-1"
                              >
                                &gt; {showSqlCode ? 'Ẩn SQL' : 'Xem SQL sinh bởi AI'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* SQL Code Box */}
                  {showSqlCode && currentSqlQuery && (
                    <div className="p-3 bg-slate-900 text-indigo-200 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 shadow-inner relative group">
                      <button
                        onClick={handleCopySql}
                        title="Sao chép SQL"
                        className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                      >
                        <Copy size={12} />
                      </button>
                      <pre className="whitespace-pre-wrap">{currentSqlQuery}</pre>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isAsking && (
                    <div className="flex gap-3 items-start animate-fadeIn">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 text-[#5B42F3] flex items-center justify-center font-bold text-xs shrink-0">
                        AI
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-[#5B42F3] border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang truy vấn cơ sở dữ liệu PostgreSQL...</span>
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-up Questions */}
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      GỢI Ý TRUY VẤN TIẾP THEO
                    </div>
                    <div className="space-y-1.5">
                      {[
                        'Top thợ doanh thu cao nhất tháng 08/2026?',
                        'Tỷ lệ hủy đơn dịch vụ sửa điện nước?',
                        'Dịch vụ có doanh thu lớn nhất quý 3?',
                      ].map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAskQuestion(q)}
                          disabled={isAsking}
                          className="w-full text-left p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 transition disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Chat Box (POST /api/admin/chat/ask) */}
                <div className="p-3 border-t border-slate-200 bg-white">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskQuestion();
                    }}
                    className="relative"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Hỏi về doanh thu, đơn hàng, dữ liệu thợ... (5–500 ký tự)"
                      disabled={isAsking}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                    />
                    <button
                      type="submit"
                      disabled={isAsking || !chatInput.trim()}
                      className="absolute right-2 top-2 p-1.5 bg-[#5B42F3] hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition"
                    >
                      <Send size={12} />
                    </button>
                  </form>
                  <div className="text-[10px] text-slate-400 text-center mt-1.5">
                    POST /api/admin/chat/ask · Enter để gửi
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: DATA GRID & ACTION BAR */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC]">
                {/* Top Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeSession?.title || 'Dữ liệu kết quả truy vấn'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentTableData.length} kết quả · Cập nhật vừa xong
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePinToDashboard}
                      className="px-4 py-2 bg-[#5B42F3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
                    >
                      <Pin size={14} /> Ghim vào Dashboard
                    </button>

                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/50">
                      <button
                        onClick={() => setDataViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                          dataViewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        <Table size={13} /> Bảng
                      </button>
                      <button
                        onClick={() => setDataViewMode('chart')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                          dataViewMode === 'chart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        <BarChart2 size={13} /> Biểu đồ
                      </button>
                    </div>

                    <button
                      onClick={() => exportToCsv('home_services_data', currentTableData)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-1 hover:bg-emerald-50 transition"
                    >
                      <Download size={13} /> CSV
                    </button>
                    <button
                      onClick={() => exportToExcel('home_services_data', currentTableData)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-indigo-700 flex items-center gap-1 hover:bg-indigo-50 transition"
                    >
                      <FileSpreadsheet size={13} /> Excel
                    </button>
                  </div>
                </div>

                {/* Filter Notice Banner */}
                <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600">🏆</span>
                    <span className="font-semibold">Dữ liệu từ truy vấn AI</span>
                    <span className="text-amber-600">
                      — Kết quả trả về từ bảng dữ liệu thực tế (`tableData` của `/api/admin/chat/ask`)
                    </span>
                  </div>
                  {currentSqlQuery && (
                    <button
                      onClick={() => setShowSqlCode(!showSqlCode)}
                      className="text-amber-700 hover:underline font-semibold text-[11px]"
                    >
                      {showSqlCode ? 'Ẩn câu SQL' : 'Xem câu SQL'}
                    </button>
                  )}
                </div>

                {/* Top 3 Summary Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/70 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG GIÁ TRỊ / DT</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">{tableStats.totalRevenue}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{tableStats.totalRows}</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SỐ LƯỢNG BẢN GHI</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">{currentTableData.length} dòng</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">PostgreSQL Table</div>
                  </div>
                  <div className="bg-white/70 backdrop-blur border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TRUNG BÌNH CỘT</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">{tableStats.avgRevenue}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">giá trị trung bình</div>
                  </div>
                </div>

                {/* Data Table View OR Dynamic Chart View */}
                {dataViewMode === 'table' ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {currentTableData.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs">
                        Chưa có dữ liệu bảng. Đặt câu hỏi trong khung chat để AI truy vấn dữ liệu từ cơ sở dữ liệu!
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              {tableHeaders
                                .filter((h) => h !== 'id')
                                .map((header) => (
                                  <th key={header} className="py-3 px-4">
                                    {formatHeader(header)}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {currentTableData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                </td>
                                {tableHeaders
                                  .filter((h) => h !== 'id')
                                  .map((header) => {
                                    const val = row[header];
                                    const isHighlight =
                                      header.includes('name') ||
                                      header.includes('tho') ||
                                      header.includes('dich_vu');
                                    const isNumeric = typeof val === 'number';

                                    return (
                                      <td
                                        key={header}
                                        className={`py-3 px-4 ${
                                          isHighlight ? 'font-bold text-slate-900' : ''
                                        } ${isNumeric ? 'font-semibold text-slate-800' : ''}`}
                                      >
                                        {formatCellValue(val, header)}
                                      </td>
                                    );
                                  })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>1–{currentTableData.length} / {currentTableData.length} kết quả</span>
                      <button className="w-6 h-6 rounded bg-[#5B42F3] text-white font-bold flex items-center justify-center text-xs">
                        1
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dynamic Chart View based on tableData */
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      Biểu đồ trực quan hóa dữ liệu AI
                    </div>

                    {currentTableData.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Không có dữ liệu để vẽ biểu đồ.
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2">
                        {(() => {
                          const sample = currentTableData[0];
                          const numField =
                            Object.keys(sample).find(
                              (k) =>
                                (k.includes('doanh_thu') || k.includes('amount') || k.includes('don') || k.includes('price')) &&
                                typeof sample[k] === 'number'
                            ) || Object.keys(sample).find((k) => typeof sample[k] === 'number' && k !== 'id');

                          const labelField =
                            Object.keys(sample).find(
                              (k) =>
                                (k.includes('name') || k.includes('tho') || k.includes('dich_vu') || k.includes('title')) &&
                                typeof sample[k] === 'string'
                            ) || Object.keys(sample)[0];

                          const maxVal = Math.max(
                            ...currentTableData.map((r) => (numField ? Number(r[numField]) || 1 : 1)),
                            1
                          );

                          return currentTableData.map((row, idx) => {
                            const val = numField ? Number(row[numField]) || 0 : 0;
                            const pct = Math.max(12, Math.round((val / maxVal) * 100));
                            const label = row[labelField] || `Mục ${idx + 1}`;

                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-slate-700">
                                  <span>{label}</span>
                                  <span className="text-[#5B42F3]">{formatCellValue(val, numField || '')}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                  <div
                                    className="bg-[#5B42F3] h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, opacity: 1 - idx * 0.12 }}
                                  ></div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ========================================================= */}
        {/* SCREEN B: DASHBOARD                                       */}
        {/* ========================================================= */}
        {activeNav === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Biểu đồ và bảng dữ liệu đã được ghim từ Query Studio
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{dashboardWidgets.length} widget đang hiển thị</span>
                <button
                  onClick={() => {
                    setActiveNav('studio');
                    setStudioView('list');
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  + Thêm từ Query Studio
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dashboardWidgets.map((w) => (
                <div
                  key={w.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                      <span>💰</span> {w.title}
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Pin size={10} /> Ghim {w.pinnedAt}
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl font-extrabold text-slate-900">{w.metric}</div>
                    <div className="text-xs text-slate-400 mt-1">{w.subtitle}</div>
                  </div>

                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    {w.note}
                  </div>

                  {w.totalOrders && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">TỔNG ĐƠN</div>
                        <div className="text-base font-bold text-slate-900">{w.totalOrders}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">SỐ THỢ</div>
                        <div className="text-base font-bold text-slate-900">{w.totalTechs}</div>
                      </div>
                    </div>
                  )}

                  {w.tableDataPreview && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Xem trước dữ liệu</div>
                      <div className="space-y-1.5 text-xs">
                        {w.tableDataPreview.map((item, i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                            <span>{item.ten_tho || item.name || `Hàng ${i + 1}`}</span>
                            <span className="font-semibold text-slate-900">
                              {item.doanh_thu ? item.doanh_thu.toLocaleString('vi-VN') + ' đ' : item.dich_vu || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Top 5 thợ · Doanh thu cao nhất</h3>
                    <p className="text-[11px] text-slate-400">Tháng 08/2026 · Đơn vị: triệu đ</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Pin size={10} /> Ghim 08:51
                  </span>
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

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Tỷ lệ đơn Hoàn thành vs Hủy</h3>
                <p className="text-[11px] text-slate-400">Tháng 07/2026 · 1.284 đơn</p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-24 h-24 rounded-full border-8 border-[#5B42F3] border-t-rose-400 flex items-center justify-center font-bold text-xs">
                    86%
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5B42F3]"></span> Hoàn thành (86%)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Hủy đơn (14%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN C: DATA SOURCES                                    */}
        {/* ========================================================= */}
        {activeNav === 'sources' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nguồn dữ liệu</h2>
              <p className="text-sm text-slate-500 mt-1">Quản lý các kết nối tới Database đang hoạt động</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">🐘</div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">homeservice_prod</h3>
                      <p className="text-xs text-slate-400">PostgreSQL 15 (Spring Boot + JPA)</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">● Kết nối</span>
                </div>
                <div className="text-xs text-slate-500">☰ 42 bảng (orders, technicians, services, payments...)</div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button className="py-2 bg-indigo-50 text-[#5B42F3] rounded-xl text-xs font-semibold hover:bg-indigo-100 transition">Xem schema</button>
                  <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition">Cài đặt</button>
                </div>
              </div>

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
                  <button className="py-2 bg-indigo-50 text-[#5B42F3] rounded-xl text-xs font-semibold hover:bg-indigo-100 transition">Xem schema</button>
                  <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition">Cài đặt</button>
                </div>
              </div>

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
                  <button className="py-2 bg-indigo-50 text-[#5B42F3] rounded-xl text-xs font-semibold hover:bg-indigo-100 transition">Xem schema</button>
                  <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition">Cài đặt</button>
                </div>
              </div>

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
        {/* SCREEN D: DICTIONARY & SETTINGS                           */}
        {/* ========================================================= */}
        {activeNav === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Cài đặt & Từ điển</h2>
              <p className="text-sm text-slate-500 mt-1">Định nghĩa thuật ngữ nghiệp vụ giúp AI hiểu ngữ cảnh chính xác hơn</p>
            </div>

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
                    {INITIAL_DICTIONARY.map((d) => (
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

            {settingsTab === 'sources' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Nguồn dữ liệu đã kết nối</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">🛢️</div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">homeservice_prod</div>
                        <div className="text-[11px] text-slate-400">PostgreSQL · localhost:5432 / localhost:8080</div>
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
                    <input type="text" placeholder="localhost:8080" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Database</label>
                    <input type="text" placeholder="homeservice_db" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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