// src/components/DataChart.jsx
// Biểu đồ tự động dựa trên chartType từ backend (BAR_CHART, PIE_CHART, METRIC, TABLE)
// Pure CSS/SVG — không cần thư viện bên ngoài

import React, { useMemo } from 'react';
import { BarChart2, PieChart, Hash, Table, TrendingUp } from 'lucide-react';

// Bảng màu gradient chuyên nghiệp
const CHART_COLORS = [
  '#5B42F3', '#7C6BF5', '#A78BFA', '#818CF8',
  '#6366F1', '#4F46E5', '#C084FC', '#8B5CF6',
  '#3B82F6', '#60A5FA', '#34D399', '#10B981',
  '#F59E0B', '#F97316', '#EF4444', '#EC4899',
];

const PIE_COLORS = [
  '#5B42F3', '#34D399', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#8B5CF6', '#F97316',
  '#06B6D4', '#10B981', '#A78BFA', '#FBBF24',
];

/**
 * Tự động detect cột label (string) và cột số (number) từ data
 */
function autoDetectFields(data) {
  if (!data || data.length === 0) return { labelField: null, numericFields: [] };

  const sample = data[0];
  const keys = Object.keys(sample);

  const isNumeric = (val) =>
    typeof val === 'number' ||
    (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)));

  // Tìm cột label: ưu tiên tên có "name", "tho", "dich_vu", "title", hoặc cột string đầu tiên
  const labelField =
    keys.find((k) =>
      (k.includes('name') || k.includes('tho') || k.includes('dich_vu') || k.includes('title') || k.includes('ten')) &&
      typeof sample[k] === 'string'
    ) || keys.find((k) => typeof sample[k] === 'string' && k !== 'id');

  // Tìm các cột số: loại bỏ id
  const numericFields = keys.filter(
    (k) => isNumeric(sample[k]) && k.toLowerCase() !== 'id'
  );

  // Cột số "chính": ưu tiên doanh_thu, amount, revenue, total, count,...
  const priorityTerms = ['doanh_thu', 'amount', 'revenue', 'total', 'price', 'don_hoan_thanh', 'so_luong', 'count', 'ty_le'];
  const primaryNumField =
    numericFields.find((k) => priorityTerms.some((term) => k.toLowerCase().includes(term))) ||
    numericFields[0];

  return { labelField, numericFields, primaryNumField };
}

function formatNumber(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return new Intl.NumberFormat('vi-VN').format(num);
}

function formatFullNumber(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat('vi-VN').format(num);
}

function formatHeader(key) {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toUpperCase();
}

// ========================================================================
// BAR CHART — Biểu đồ cột ngang với animation
// ========================================================================
function BarChartView({ data, labelField, primaryNumField, compact = false }) {
  const displayData = compact ? data.slice(0, 5) : data;
  const maxVal = useMemo(
    () => Math.max(...displayData.map((r) => Number(r[primaryNumField]) || 0), 1),
    [displayData, primaryNumField]
  );

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        <BarChart2 size={compact ? 12 : 14} className="text-[#5B42F3]" />
        <span>Biểu đồ cột — {formatHeader(primaryNumField)}</span>
      </div>
      {displayData.map((row, idx) => {
        const val = Number(row[primaryNumField]) || 0;
        const pct = Math.max(8, Math.round((val / maxVal) * 100));
        const label = labelField ? (row[labelField] || `#${idx + 1}`) : `#${idx + 1}`;
        const color = CHART_COLORS[idx % CHART_COLORS.length];

        return (
          <div key={idx} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className={`font-semibold text-slate-800 truncate max-w-[65%] ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {label}
              </span>
              <span className={`font-bold ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color }}>
                {formatFullNumber(val)}
              </span>
            </div>
            <div className={`w-full bg-slate-100 rounded-lg overflow-hidden relative ${compact ? 'h-5' : 'h-7'}`}>
              <div
                className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}CC, ${color})`,
                  animationDelay: `${idx * 80}ms`,
                }}
              >
                {pct > 25 && (
                  <span className="text-[10px] font-bold text-white/90">
                    {formatNumber(val)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {compact && data.length > 5 && (
        <div className="text-[10px] text-slate-400 font-medium pt-1">
          + {data.length - 5} mục khác...
        </div>
      )}
    </div>
  );
}

// ========================================================================
// PIE CHART — Biểu đồ tròn SVG với legend
// ========================================================================
function PieChartView({ data, labelField, primaryNumField, compact = false }) {
  const displayData = compact ? data.slice(0, 5) : data;
  const total = useMemo(
    () => displayData.reduce((acc, r) => acc + (Number(r[primaryNumField]) || 0), 0),
    [displayData, primaryNumField]
  );

  const slices = useMemo(() => {
    let currentAngle = 0;
    return displayData.map((row, idx) => {
      const val = Number(row[primaryNumField]) || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      const angle = (pct / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        label: labelField ? (row[labelField] || `#${idx + 1}`) : `#${idx + 1}`,
        value: val,
        pct,
        startAngle,
        angle,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      };
    });
  }, [displayData, labelField, primaryNumField, total]);

  const svgSize = compact ? 150 : 200;
  const radius = compact ? 60 : 80;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  function polarToCartesian(centerX, centerY, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  }

  function describeArc(centerX, centerY, r, startAngle, endAngle) {
    const start = polarToCartesian(centerX, centerY, r, endAngle);
    const end = polarToCartesian(centerX, centerY, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <PieChart size={compact ? 12 : 14} className="text-[#5B42F3]" />
        <span>Biểu đồ tròn — {formatHeader(primaryNumField)}</span>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        {/* SVG Pie */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            {slices.map((slice, idx) => {
              if (slice.angle < 0.5) return null;
              if (slice.angle >= 359.9) {
                return (
                  <circle key={idx} cx={cx} cy={cy} r={radius} fill={slice.color} />
                );
              }
              return (
                <path
                  key={idx}
                  d={describeArc(cx, cy, radius, slice.startAngle, slice.startAngle + slice.angle)}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-opacity hover:opacity-80"
                >
                  <title>{slice.label}: {formatFullNumber(slice.value)} ({slice.pct.toFixed(1)}%)</title>
                </path>
              );
            })}
            <circle cx={cx} cy={cy} r={radius * 0.45} fill="white" />
            <text x={cx} y={cy - 4} textAnchor="middle" className="font-bold fill-slate-800" fontSize={compact ? "11" : "13"}>
              {formatNumber(total)}
            </text>
            <text x={cx} y={cy + (compact ? 9 : 11)} textAnchor="middle" className="fill-slate-400 font-medium" fontSize={compact ? "8" : "9"}>
              Tổng
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-[160px]">
          {slices.map((slice, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: slice.color }}
              />
              <span className={`text-slate-700 font-medium truncate flex-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {slice.label}
              </span>
              <span className={`font-bold text-slate-900 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {slice.pct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatNumber(slice.value)}
              </span>
            </div>
          ))}
          {compact && data.length > 5 && (
            <div className="text-[10px] text-slate-400 pt-1">
              + {data.length - 5} mục khác...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================================================
// METRIC — Hiển thị số liệu đơn lẻ nổi bật
// ========================================================================
function MetricView({ data, labelField, numericFields, primaryNumField, compact = false }) {
  const row = data[0] || {};
  const primaryTotal = data.reduce((acc, r) => acc + (Number(r[primaryNumField]) || 0), 0);
  const label = labelField && row[labelField]
    ? row[labelField]
    : formatHeader(primaryNumField);

  const otherMetrics = numericFields
    .filter((f) => f !== primaryNumField)
    .map((f) => ({
      label: formatHeader(f),
      value: data.length === 1 ? Number(row[f]) || 0 : data.reduce((acc, r) => acc + (Number(r[f]) || 0), 0),
    }));

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <Hash size={compact ? 12 : 14} className="text-[#5B42F3]" />
        <span>Chỉ số tổng hợp</span>
      </div>

      {/* Main metric */}
      <div className={`bg-gradient-to-br from-[#5B42F3] to-indigo-600 rounded-2xl text-white text-center shadow-md shadow-indigo-100 ${
        compact ? 'p-5' : 'p-8'
      }`}>
        <div className={`font-medium text-white/70 uppercase tracking-wider mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {label}
        </div>
        <div className={`font-extrabold tracking-tight ${compact ? 'text-3xl' : 'text-5xl'}`}>
          {formatFullNumber(primaryTotal)}
        </div>
        {data.length > 1 && (
          <div className="text-xs text-white/70 mt-2 flex items-center justify-center gap-1">
            <TrendingUp size={12} />
            Tổng hợp từ {data.length} bản ghi
          </div>
        )}
      </div>

      {/* Secondary metrics */}
      {otherMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {otherMetrics.slice(0, 4).map((m, idx) => (
            <div
              key={idx}
              className={`bg-white border border-slate-200 rounded-xl text-center ${compact ? 'p-2.5' : 'p-4'}`}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">
                {m.label}
              </div>
              <div className={`font-extrabold text-slate-900 ${compact ? 'text-sm' : 'text-lg'}`}>
                {formatFullNumber(m.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================================================
// MAIN COMPONENT — Tự động chọn loại biểu đồ dựa trên chartType
// ========================================================================
export default function DataChart({
  chartType = 'TABLE',
  tableData = [],
  compact = false,
  showHeader = true,
  className = '',
}) {
  const { labelField, numericFields, primaryNumField } = useMemo(
    () => autoDetectFields(tableData),
    [tableData]
  );

  const containerClasses = className
    ? className
    : compact
    ? 'bg-white p-4 rounded-2xl space-y-2'
    : 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2';

  if (!tableData || tableData.length === 0) {
    return (
      <div className={containerClasses}>
        <div className="py-6 text-center text-slate-400 text-xs">
          Không có dữ liệu để vẽ biểu đồ.
        </div>
      </div>
    );
  }

  if (!primaryNumField) {
    return (
      <div className={containerClasses}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          <Table size={14} className="text-[#5B42F3]" />
          <span>Dữ liệu trả về</span>
        </div>
        <div className="space-y-1.5">
          {tableData.slice(0, compact ? 4 : 10).map((row, idx) => (
            <div key={idx} className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 font-mono truncate">
              {JSON.stringify(row)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const resolvedType = (chartType || 'TABLE').toUpperCase();

  return (
    <div className={containerClasses}>
      {/* Chart type indicator badge */}
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Trực quan hóa dữ liệu AI
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-[#5B42F3] border border-indigo-100">
            {resolvedType === 'BAR_CHART' && '📊 Bar Chart'}
            {resolvedType === 'PIE_CHART' && '🥧 Pie Chart'}
            {resolvedType === 'METRIC' && '🔢 Metric'}
            {resolvedType === 'TABLE' && '📊 Chart View'}
          </span>
        </div>
      )}

      {resolvedType === 'BAR_CHART' && (
        <BarChartView
          data={tableData}
          labelField={labelField}
          primaryNumField={primaryNumField}
          compact={compact}
        />
      )}

      {resolvedType === 'PIE_CHART' && (
        <PieChartView
          data={tableData}
          labelField={labelField}
          primaryNumField={primaryNumField}
          compact={compact}
        />
      )}

      {resolvedType === 'METRIC' && (
        <MetricView
          data={tableData}
          labelField={labelField}
          numericFields={numericFields}
          primaryNumField={primaryNumField}
          compact={compact}
        />
      )}

      {resolvedType === 'TABLE' && (
        <BarChartView
          data={tableData}
          labelField={labelField}
          primaryNumField={primaryNumField}
          compact={compact}
        />
      )}
    </div>
  );
}
