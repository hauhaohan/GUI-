import React, { useState } from 'react';
import {
  Database, MessageSquare, LayoutDashboard, BookOpen,
  Send, Code, Table, BarChart2, Download, Pin,
  ThumbsUp, ThumbsDown, Plus, CheckCircle2, Sparkles, Filter
} from 'lucide-react';

// ==========================================
// 1. DỮ LIỆU GIẢ LẬP (MOCK DATA) ĐỂ DEMO UI
// ==========================================
const INITIAL_THREADS = [
  { id: 1, title: 'Doanh thu dọn dẹp Cầu Giấy' },
  { id: 2, title: 'Top 5 thợ doanh thu cao nhất' },
  { id: 3, title: 'Danh sách khách hàng hủy lịch' },
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'user',
    text: 'Tháng trước có bao nhiêu khách hàng đặt dịch vụ dọn dẹp nhà cửa tại quận Cầu Giấy và tổng doanh thu là bao nhiêu?'
  },
  {
    id: 2,
    sender: 'bot',
    text: 'Trong tháng trước, dịch vụ dọn dẹp tại Cầu Giấy có 45 lượt đặt, mang về tổng doanh thu 15.500.000 VNĐ.',
    sql: "SELECT COUNT(b.id) AS total_bookings, SUM(p.amount) AS total_revenue \nFROM bookings b \nJOIN services s ON b.service_id = s.id \nJOIN payments p ON b.id = p.booking_id \nWHERE s.name = 'Dọn dẹp nhà cửa' AND b.district = 'Cầu Giấy' \nAND b.created_at >= '2026-08-01' AND b.created_at < '2026-09-01' \nLIMIT 100;",
    sqlExplanation: 'Kết nối 3 bảng bookings (lịch hẹn), services (dịch vụ) và payments (thanh toán). Lọc theo tên dịch vụ là Dọn dẹp nhà cửa tại quận Cầu Giấy trong tháng 8, sau đó đếm tổng số đơn và cộng tổng số tiền.',
    metrics: [
      { label: 'Tổng lượt đặt (total_bookings)', value: '45 đơn' },
      { label: 'Tổng doanh thu (total_revenue)', value: '15.500.000 đ' }
    ],
    data: [
      { khu_vuc: 'P. Dịch Vọng', so_luong_don: 18, doanh_thu: 6200000 },
      { khu_vuc: 'P. Mai Dịch', so_luong_don: 15, doanh_thu: 5300000 },
      { khu_vuc: 'P. Trung Hòa', so_luong_don: 12, doanh_thu: 4000000 },
    ]
  },
  {
    id: 3,
    sender: 'user',
    text: 'Cho tôi xem danh sách các thợ thực hiện từ danh sách trên, lọc những người có doanh thu trên 10 triệu.'
  },
  {
    id: 4,
    sender: 'bot',
    text: 'Dưới đây là danh sách các thợ thực hiện dịch vụ tại khu vực Cầu Giấy có tổng doanh thu vượt mức 10.000.000 VNĐ:',
    contextFilter: 'Đang lọc nối tiếp (Multi-turn): doanh_thu > 10.000.000đ',
    sql: "SELECT t.full_name AS ten_tho, t.phone AS so_dien_thoai, COUNT(b.id) AS so_don_hoan_thanh, SUM(p.amount) AS tong_doanh_thu \nFROM technicians t \nJOIN bookings b ON t.id = b.technician_id \nJOIN payments p ON b.id = p.booking_id \nWHERE b.district = 'Cầu Giấy' \nGROUP BY t.id \nHAVING SUM(p.amount) > 10000000 \nLIMIT 100;",
    sqlExplanation: 'Kế thừa điều kiện lọc quận Cầu Giấy từ câu hỏi trước, nhóm theo từng thợ (GROUP BY) và dùng mệnh đề HAVING để lọc ra những người có tổng doanh thu trên 10.000.000đ.',
    data: [
      { ten_tho: 'Nguyễn Văn A', so_dien_thoai: '0987654321', so_don_hoan_thanh: 28, tong_doanh_thu: 14500000 },
      { ten_tho: 'Trần Thị B', so_dien_thoai: '0912345678', so_don_hoan_thanh: 22, tong_doanh_thu: 11200000 },
      { ten_tho: 'Lê Hoàng C', so_dien_thoai: '0933445566', so_don_hoan_thanh: 19, tong_doanh_thu: 10400000 }
    ]
  }
];

// ==========================================
// 2. COMPONENT TRÁI TIM: BẢNG DỮ LIỆU ĐỘNG (DYNAMIC TABLE)
// Tự động đọc keys từ JSON bất kỳ để vẽ cột và hàng
// ==========================================
const DynamicDataTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-400 italic p-3">Không có dữ liệu hiển thị.</div>;
  }

  // Lấy toàn bộ "keys" của phần tử đầu tiên làm Tiêu đề cột (Headers)
  const columns = Object.keys(data[0]);

  // Hàm format số tiền/số lượng cho đẹp mắt
  const formatCellValue = (val) => {
    if (typeof val === 'number' && val > 1000) {
      return val.toLocaleString('vi-VN');
    }
    return String(val ?? '');
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm my-3">
      <table className="w-full text-left border-collapse bg-white text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs font-semibold">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="py-3 px-4 tracking-wider">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-indigo-50/40 transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="py-2.5 px-4 text-slate-700 font-medium">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// 3. COMPONENT BIỂU ĐỒ 1 CHẠM (ONE-CLICK CHART)
// Tự động tìm cột chữ làm nhãn và cột số lớn nhất để vẽ biểu đồ
// ==========================================
const DynamicSimpleChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);
  const labelKey = keys[0]; // Lấy cột đầu tiên làm tên trục
  // Tìm cột cuối cùng có kiểu dữ liệu là số (number) để vẽ thanh giá trị
  const valueKey = [...keys].reverse().find(k => typeof data[0][k] === 'number') || keys[1];

  const maxValue = Math.max(...data.map(item => Number(item[valueKey]) || 0), 1);

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 my-3 space-y-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
        <span>Phân tích theo: {labelKey.replace(/_/g, ' ')}</span>
        <span>Giá trị: {valueKey.replace(/_/g, ' ')}</span>
      </div>
      <div className="space-y-2.5">
        {data.map((row, idx) => {
          const val = Number(row[valueKey]) || 0;
          const percent = Math.max(Math.round((val / maxValue) * 100), 5);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>{row[labelKey]}</span>
                <span className="text-indigo-600 font-bold">{val.toLocaleString('vi-VN')}</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 4. COMPONENT BONG BÓNG CHAT CỦA AI
// Tích hợp Xem SQL, Đổi Bảng/Biểu đồ, Export CSV, Pin Dashboard, Feedback
// ==========================================
const BotMessageCard = ({ msg, onPinWidget }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'
  const [showSql, setShowSql] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down'

  // Hàm xuất dữ liệu JSON ra file CSV thật
  const handleExportCSV = () => {
    if (!msg.data || msg.data.length === 0) return;
    const headers = Object.keys(msg.data[0]).join(',');
    const rows = msg.data.map(row => Object.values(row).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,\uFEFF${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `export_query_${msg.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-start gap-3 max-w-4xl">
      <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
        <Sparkles size={18} />
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl rounded-tl-none p-5 shadow-sm">
        {/* Thẻ báo hiệu Multi-turn Context (Nếu có) */}
        {msg.contextFilter && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Filter size={12} />
            {msg.contextFilter}
          </div>
        )}

        {/* Câu trả lời ngôn ngữ tự nhiên của AI */}
        <p className="text-slate-800 text-sm leading-relaxed mb-3">{msg.text}</p>

        {/* Các thẻ tổng số liệu (Metric Cards) */}
        {msg.metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            {msg.metrics.map((m, idx) => (
              <div key={idx} className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">{m.label}</div>
                <div className="text-lg font-bold text-indigo-700 mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Thanh công cụ điều khiển (Xem Bảng, Biểu đồ, Xem SQL, Export, Ghim) */}
        {msg.data && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Table size={14} /> Bảng dữ liệu
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  viewMode === 'chart'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BarChart2 size={14} /> Vẽ biểu đồ
              </button>
              <button
                onClick={() => setShowSql(!showSql)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  showSql
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Code size={14} /> {showSql ? 'Ẩn SQL' : 'Xem SQL'}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                title="Xuất file CSV"
              >
                <Download size={14} /> Xuất CSV
              </button>
              <button
                onClick={() => onPinWidget(msg)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
                title="Ghim vào Dashboard"
              >
                <Pin size={14} /> Ghim
              </button>
            </div>
          </div>
        )}

        {/* Khu vực hiển thị SQL & Lời giải thích ("Explain my SQL") */}
        {showSql && msg.sql && (
          <div className="my-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 text-xs">
            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
              <span className="font-mono text-emerald-400 font-semibold">PostgreSQL (Read-Only Guardrail)</span>
              <span className="text-[11px] text-slate-400">Auto-appended LIMIT 100</span>
            </div>
            <pre className="p-4 font-mono overflow-x-auto leading-relaxed text-indigo-200">
              {msg.sql}
            </pre>
            {msg.sqlExplanation && (
              <div className="bg-slate-800/80 px-4 py-2.5 border-t border-slate-700 text-slate-300">
                <strong className="text-amber-400">💡 Giải thích câu lệnh: </strong>
                {msg.sqlExplanation}
              </div>
            )}
          </div>
        )}

        {/* Khu vực hiển thị Bảng động hoặc Biểu đồ */}
        {viewMode === 'table' ? (
          <DynamicDataTable data={msg.data} />
        ) : (
          <DynamicSimpleChart data={msg.data} />
        )}

        {/* Đánh giá & Huấn luyện AI (Feedback Loop) */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-xs text-slate-400">
          <span>Kết quả trích xuất thông qua JdbcTemplate</span>
          <div className="flex items-center gap-2">
            <span>Đánh giá SQL:</span>
            <button
              onClick={() => setFeedback('up')}
              className={`p-1 rounded hover:bg-slate-100 ${feedback === 'up' ? 'text-emerald-600 font-bold' : ''}`}
            >
              <ThumbsUp size={14} />
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={`p-1 rounded hover:bg-slate-100 ${feedback === 'down' ? 'text-rose-600 font-bold' : ''}`}
            >
              <ThumbsDown size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. COMPONENT CHÍNH (MAIN APPLICATION LAYOUT)
// ==========================================
export default function App() {
  const [activeNav, setActiveNav] = useState('chat'); // 'chat' | 'dashboard' | 'dictionary'
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedWidgets, setPinnedWidgets] = useState([]);
  const [dictionaries, setDictionaries] = useState([
    { id: 1, term: 'Khách VIP', rule: 'Khách hàng có tổng chi tiêu (SUM(payments.amount)) > 10.000.000 VNĐ' },
    { id: 2, term: 'Đơn thành công', rule: "Trạng thái đơn hàng bookings.status = 'COMPLETED'" }
  ]);

  // HÀM GỬI CÂU HỎI XUỐNG SPRING BOOT BACKEND
  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: inputQuestion };
    setMessages(prev => [...prev, userMsg]);
    const currentQuestion = inputQuestion;
    setInputQuestion('');
    setIsLoading(true);

    try {
      // -------------------------------------------------------------
      // KẾT NỐI VỚI SPRING BOOT API THẬT CỦA BẠN TẠI ĐÂY:
      // -------------------------------------------------------------
      /*
      const response = await fetch('http://localhost:8080/api/v1/query/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion })
      });
      const result = await response.json();
      */

      // GIẢ LẬP ĐỘ TRỄ MẠNG 1.2 GIÂY KHI CHƯA BẬT SPRING BOOT:
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockBotReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Đã phân tích câu hỏi: "${currentQuestion}". Dưới đây là dữ liệu truy xuất trực tiếp từ cơ sở dữ liệu Home Service Booking:`,
        sql: "SELECT s.name AS ten_dich_vu, COUNT(b.id) AS tong_so_don, SUM(p.amount) AS doanh_thu \nFROM services s \nJOIN bookings b ON s.id = b.service_id \nJOIN payments p ON b.id = p.booking_id \nGROUP BY s.name \nORDER BY doanh_thu DESC \nLIMIT 100;",
        sqlExplanation: 'Truy vấn thống kê số lượng đơn và tổng doanh thu theo từng loại dịch vụ, sắp xếp giảm dần.',
        data: [
          { ten_dich_vu: 'Dọn dẹp nhà cửa', tong_so_don: 120, doanh_thu: 42000000 },
          { ten_dich_vu: 'Vệ sinh máy lạnh', tong_so_don: 85, doanh_thu: 25500000 },
          { ten_dich_vu: 'Sửa chữa điện nước', tong_so_don: 64, doanh_thu: 19200000 },
          { ten_dich_vu: 'Giặt sofa / rèm cửa', tong_so_don: 40, doanh_thu: 16000000 },
        ]
      };

      setMessages(prev => [...prev, mockBotReply]);
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinWidget = (msg) => {
    if (!pinnedWidgets.find(w => w.id === msg.id)) {
      setPinnedWidgets([...pinnedWidgets, msg]);
      alert('Đã ghim biểu đồ vào Bảng điều khiển (Dashboard)!');
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* ================= SIDEBAR BÊN TRÁI ================= */}
      <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-6">
          {/* Logo & Tên hệ thống */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
              <Database size={20} />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm tracking-wide">AI Data Assistant</h1>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={11} /> Read-Only Mode Active
              </span>
            </div>
          </div>

          {/* Menu điều hướng các Module SaaS */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveNav('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeNav === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare size={17} /> Trợ lý Truy vấn (Chat)
            </button>
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeNav === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3"><LayoutDashboard size={17} /> Bảng điều khiển</span>
              <span className="bg-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded-full">{pinnedWidgets.length}</span>
            </button>
            <button
              onClick={() => setActiveNav('dictionary')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeNav === 'dictionary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BookOpen size={17} /> Từ điển Dữ liệu (Rules)
            </button>
          </nav>

          {/* Danh sách phiên chat (Threads) */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between px-2 mb-2 text-xs font-semibold text-slate-400 uppercase">
              <span>Lịch sử truy vấn</span>
              <button className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                <Plus size={14} /> Mới
              </button>
            </div>
            <div className="space-y-1">
              {INITIAL_THREADS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveNav('chat')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 truncate transition"
                >
                  • {t.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trạng thái Kết nối Database (Data Source) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400 mb-1">Cơ sở dữ liệu đang kết nối:</div>
          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div className="truncate">
              <div className="text-xs font-semibold text-white">Home_Service_Booking</div>
              <div className="text-[11px] text-slate-400">PostgreSQL • 6 Bảng</div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* ================= KHU VỰC NỘI DUNG CHÍNH ================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-800">
              {activeNav === 'chat' && 'Trợ lý Truy vấn Ngôn ngữ Tự nhiên (Text-to-SQL)'}
              {activeNav === 'dashboard' && 'Bảng điều khiển Thống kê (Pinned Widgets)'}
              {activeNav === 'dictionary' && 'Từ điển Dữ liệu Nghiệp vụ (Data Dictionary)'}
            </h2>
            <p className="text-xs text-slate-500">
              Hỏi bất kỳ số liệu nào bằng tiếng Việt — Hệ thống tự động sinh SQL và vẽ bảng động.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium border border-slate-200">
              Model: <strong>GPT-4o / Claude 3.5</strong>
            </span>
          </div>
        </header>

        {/* MÀN HÌNH 1: CHAT INTERFACE */}
        {activeNav === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map(msg =>
                msg.sender === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-xl text-sm shadow-sm">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <BotMessageCard key={msg.id} msg={msg} onPinWidget={handlePinWidget} />
                )
              )}

              {isLoading && (
                <div className="flex items-center gap-3 text-sm text-slate-500 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Sparkles size={16} />
                  </div>
                  Đang đóng gói Schema, sinh truy vấn SQL và kiểm tra bảo mật Read-Only...
                </div>
              )}
            </div>

            {/* Khung nhập câu hỏi tiếng Việt ở dưới cùng */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendQuestion} className="max-w-4xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi tiếng Việt (VD: Tháng này dịch vụ nào có doanh thu cao nhất?)..."
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition shadow-sm"
                >
                  <Send size={16} /> Truy vấn
                </button>
              </form>
            </div>
          </>
        )}

        {/* MÀN HÌNH 2: DASHBOARD ĐÃ GHIM */}
        {activeNav === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            {pinnedWidgets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                Chưa có biểu đồ nào được ghim. Hãy bấm nút <strong>"Ghim"</strong> ở các câu trả lời trong phần Chat!
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pinnedWidgets.map(w => (
                  <div key={w.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-sm text-slate-800 mb-2">{w.text}</h3>
                    <DynamicSimpleChart data={w.data} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MÀN HÌNH 3: TỪ ĐIỂN DỮ LIỆU (DATA DICTIONARY) */}
        {activeNav === 'dictionary' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Định nghĩa thuật ngữ kinh doanh cho AI</h3>
              <p className="text-xs text-slate-500">
                Các quy tắc tại đây sẽ được Spring Boot tự động nối vào System Prompt giúp chống ảo giác (Hallucination) khi AI viết SQL.
              </p>
              <div className="space-y-3">
                {dictionaries.map(d => (
                  <div key={d.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-indigo-700 text-sm">{d.term}</span>
                      <p className="text-xs text-slate-600 mt-0.5">{d.rule}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}