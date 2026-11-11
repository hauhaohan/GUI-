// src/components/SchemaExplorerPage.jsx
// Trình khám phá & trực quan hóa Database Schema (ERD Visualizer kiểu Supabase + Danh sách + Raw {schema})

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import {
  Database, Network, Table, Code, Search, RefreshCw,
  KeyRound, Link2, Copy, Check, AlertCircle,
  ZoomIn, ZoomOut, Maximize2, MessageSquare, Info, X, Layers,
  RotateCcw, Scan, Eye, EyeOff
} from 'lucide-react';
import { schemaService } from '../services/schemaService';

const NODE_WIDTH = 236;
const HEADER_HEIGHT = 38;
const LIST_TOP_PAD = 4;
const FIRST_ROW_OFFSET = HEADER_HEIGHT + LIST_TOP_PAD;
const ROW_HEIGHT = 23;
const FOOTER_HEIGHT = 25;
const MAX_PREVIEW_COLS = 8;
const COL_GAP = 88;
const ROW_GAP = 26;
const CLUSTER_GAP = 44;
const PAD_X = 36;
const PAD_Y = 72;

/**
 * Rút gọn tên kiểu dữ liệu PostgreSQL dài khi hiển thị trên card ERD
 */
function formatShortDataType(type = '') {
  const lower = String(type).trim().toLowerCase();
  if (lower === 'character varying') return 'varchar';
  if (lower === 'timestamp without time zone') return 'timestamp';
  if (lower === 'timestamp with time zone') return 'timestamptz';
  if (lower === 'double precision') return 'double';
  if (lower === 'time without time zone') return 'time';
  return type;
}

/**
 * Ưu tiên PK -> FK -> các cột thường để hiển thị gọn trên node ERD
 */
function getPreviewColumns(table) {
  const cols = table?.columns || [];
  const prioritized = [...cols].sort((a, b) => {
    const scoreA = (a.primaryKey ? 2 : 0) + (a.isForeignKey ? 1 : 0);
    const scoreB = (b.primaryKey ? 2 : 0) + (b.isForeignKey ? 1 : 0);
    return scoreB - scoreA;
  });
  return {
    visible: prioritized.slice(0, MAX_PREVIEW_COLS),
    hiddenCount: Math.max(0, prioritized.length - MAX_PREVIEW_COLS),
  };
}

function getNodeHeight(table) {
  const { visible, hiddenCount } = getPreviewColumns(table);
  return FIRST_ROW_OFFSET + Math.max(visible.length, 1) * ROW_HEIGHT + (hiddenCount > 0 ? FOOTER_HEIGHT : LIST_TOP_PAD);
}

/**
 * Chuyển danh sách điểm vuông góc thành SVG path bo tròn góc mềm mại (kiểu Supabase SmoothStep)
 */
function buildRoundedPolylinePath(rawPoints, radius = 8) {
  if (!rawPoints || rawPoints.length < 2) return '';

  // Loại bỏ các điểm trùng liên tiếp hoặc thẳng hàng thừa
  const points = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = points[points.length - 1];
    const curr = rawPoints[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) < 0.5) continue;
    if (points.length >= 2) {
      const prev2 = points[points.length - 2];
      const collinearX = Math.abs(prev2.x - prev.x) < 0.5 && Math.abs(prev.x - curr.x) < 0.5;
      const collinearY = Math.abs(prev2.y - prev.y) < 0.5 && Math.abs(prev.y - curr.y) < 0.5;
      if (collinearX || collinearY) {
        points[points.length - 1] = curr;
        continue;
      }
    }
    points.push(curr);
  }

  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    const r = Math.min(radius, len1 / 2, len2 / 2);

    if (r < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const pInX = curr.x - (v1x / len1) * r;
    const pInY = curr.y - (v1y / len1) * r;
    const pOutX = curr.x + (v2x / len2) * r;
    const pOutY = curr.y + (v2y / len2) * r;

    d += ` L ${pInX} ${pInY} Q ${curr.x} ${curr.y} ${pOutX} ${pOutY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Thuật toán bố trí tự động theo cụm nghiệp vụ + phân tầng Topological (giảm tối đa cắt dây chéo)
 */
function computeAutoPositions(tables) {
  const positions = {};
  if (!tables || tables.length === 0) return positions;

  const tableMap = new Map(tables.map((t) => [t.tableName, t]));
  const inCount = new Map();
  const outCount = new Map();

  tables.forEach((t) => {
    inCount.set(t.tableName, 0);
    outCount.set(t.tableName, 0);
  });

  tables.forEach((t) => {
    (t.foreignKeys || []).forEach((fk) => {
      if (fk.targetTable !== t.tableName && tableMap.has(fk.targetTable)) {
        outCount.set(t.tableName, (outCount.get(t.tableName) || 0) + 1);
        inCount.set(fk.targetTable, (inCount.get(fk.targetTable) || 0) + 1);
      }
    });
  });

  const isolated = [];
  const connected = [];
  tables.forEach((t) => {
    if ((inCount.get(t.tableName) || 0) === 0 && (outCount.get(t.tableName) || 0) === 0) {
      isolated.push(t);
    } else {
      connected.push(t);
    }
  });

  // 1. Tính layer (từ bảng gốc layer 0 -> bảng con layer 1, 2, 3...)
  const layerMap = new Map();
  connected.forEach((t) => layerMap.set(t.tableName, 0));

  for (let pass = 0; pass < connected.length; pass++) {
    let changed = false;
    connected.forEach((t) => {
      const cur = layerMap.get(t.tableName) || 0;
      let nextMin = 0;
      (t.foreignKeys || []).forEach((fk) => {
        if (fk.targetTable !== t.tableName && layerMap.has(fk.targetTable)) {
          const targetLayer = layerMap.get(fk.targetTable);
          if (targetLayer + 1 < connected.length) {
            nextMin = Math.max(nextMin, targetLayer + 1);
          }
        }
      });
      if (nextMin > cur) {
        layerMap.set(t.tableName, nextMin);
        changed = true;
      }
    });
    if (!changed) break;
  }

  // 2. Xác định Mega-hub gốc (như users: layer 0 & được >= 4 bảng tham chiếu) để tách các cụm domain sạch sẽ
  const megaHubs = new Set(
    connected
      .filter((t) => (layerMap.get(t.tableName) || 0) === 0 && (inCount.get(t.tableName) || 0) >= 4)
      .map((t) => t.tableName)
  );

  // Union-Find gom các cụm domain (bỏ qua cạnh tới megaHub để bookings/reports/workers không dính chùm)
  const parent = new Map();
  connected.forEach((t) => parent.set(t.tableName, t.tableName));
  const find = (x) => {
    let p = parent.get(x);
    while (p !== parent.get(p)) p = parent.get(p);
    let curr = x;
    while (curr !== p) {
      const nxt = parent.get(curr);
      parent.set(curr, p);
      curr = nxt;
    }
    return p;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  connected.forEach((t) => {
    (t.foreignKeys || []).forEach((fk) => {
      if (
        fk.targetTable !== t.tableName &&
        tableMap.has(fk.targetTable) &&
        !megaHubs.has(fk.targetTable) &&
        !megaHubs.has(t.tableName)
      ) {
        union(t.tableName, fk.targetTable);
      }
    });
  });

  // Nhóm các bảng vào từng cụm (trừ megaHubs đặt riêng ở cột 0 bên trái)
  const clusterGroups = new Map();
  const megaHubList = [];

  connected.forEach((t) => {
    if (megaHubs.has(t.tableName)) {
      megaHubList.push(t);
      return;
    }
    const root = find(t.tableName);
    if (!clusterGroups.has(root)) clusterGroups.set(root, []);
    clusterGroups.get(root).push(t);
  });

  // Sắp xếp cụm lớn trước (Bookings -> Workers -> Reports/Chat...), mỗi cụm thành 1 dải ngang (swimlane) riêng
  const orderedClusters = Array.from(clusterGroups.values()).sort((a, b) => b.length - a.length);

  // Đặt megaHubs ở cột 0 (bên trái ngoài cùng)
  let megaY = PAD_Y;
  megaHubList
    .sort((a, b) => (inCount.get(b.tableName) || 0) - (inCount.get(a.tableName) || 0))
    .forEach((t) => {
      const h = getNodeHeight(t);
      positions[t.tableName] = {
        x: PAD_X,
        y: megaY,
        width: NODE_WIDTH,
        height: h,
      };
      megaY += h + ROW_GAP;
    });

  // Đặt từng cụm theo dải ngang (swimlane), các cột trong cụm xếp từ trái -> phải theo layer
  let bandTopY = PAD_Y;
  const colShift = megaHubList.length > 0 ? 1 : 0;

  orderedClusters.forEach((clusterTables) => {
    const byLayer = new Map();
    clusterTables.forEach((t) => {
      const l = layerMap.get(t.tableName) || 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l).push(t);
    });

    const sortedLayers = Array.from(byLayer.keys()).sort((a, b) => a - b);
    let maxBandHeight = 0;
    let extraSubColShift = 0;

    sortedLayers.forEach((layerIdx) => {
      const layerTables = byLayer.get(layerIdx);

      // Sắp xếp trong layer theo Barycenter (trung bình Y của các bảng cha đã đặt) để dây thẳng hàng nhất
      layerTables.sort((a, b) => {
        const getAvgParentY = (tbl) => {
          const ys = (tbl.foreignKeys || [])
            .filter((fk) => !megaHubs.has(fk.targetTable))
            .map((fk) => positions[fk.targetTable])
            .filter(Boolean)
            .map((p) => p.y + p.height / 2);
          if (ys.length === 0) return Infinity;
          return ys.reduce((s, v) => s + v, 0) / ys.length;
        };
        const ya = getAvgParentY(a);
        const yb = getAvgParentY(b);
        if (ya !== yb) return ya - yb;
        return (inCount.get(b.tableName) || 0) - (inCount.get(a.tableName) || 0);
      });

      const baseColIndex = layerIdx + colShift + extraSubColShift;
      const baseX = PAD_X + baseColIndex * (NODE_WIDTH + COL_GAP);

      // Nếu một layer có quá nhiều bảng con (> 3), chia thành cột phụ gọn gàng để không kéo dài chiều dọc
      const maxPerCol = 3;
      let curY = bandTopY;
      layerTables.forEach((t, itemIdx) => {
        const subColOffset = Math.floor(itemIdx / maxPerCol);
        if (itemIdx > 0 && itemIdx % maxPerCol === 0) {
          curY = bandTopY;
        }
        const h = getNodeHeight(t);
        const finalX = baseX + subColOffset * (NODE_WIDTH + COL_GAP);
        positions[t.tableName] = {
          x: finalX,
          y: curY,
          width: NODE_WIDTH,
          height: h,
        };
        curY += h + ROW_GAP;
        maxBandHeight = Math.max(maxBandHeight, curY - bandTopY);
      });

      extraSubColShift += Math.floor(Math.max(layerTables.length - 1, 0) / maxPerCol);
    });

    bandTopY += maxBandHeight + (CLUSTER_GAP - ROW_GAP);
  });

  // Căn giữa cột megaHub (users) theo chiều dọc của toàn khối cụm liên kết để dây tỏa đều hơn
  if (megaHubList.length > 0 && bandTopY > megaY) {
    const totalMegaHeight = megaY - PAD_Y - ROW_GAP;
    const totalClusterHeight = bandTopY - PAD_Y - (CLUSTER_GAP - ROW_GAP);
    const centerOffset = Math.max(0, Math.round((totalClusterHeight - totalMegaHeight) * 0.35));
    if (centerOffset > 0) {
      megaHubList.forEach((t) => {
        if (positions[t.tableName]) {
          positions[t.tableName].y += centerOffset;
        }
      });
    }
  }

  // Giải quyết mọi khả năng trùng tọa độ (nếu cụm chia cột phụ chạm nhau)
  const placedNames = Object.keys(positions);
  for (let i = 0; i < placedNames.length; i++) {
    for (let j = i + 1; j < placedNames.length; j++) {
      const a = positions[placedNames[i]];
      const b = positions[placedNames[j]];
      const overlapX = a.x < b.x + b.width + 20 && a.x + a.width + 20 > b.x;
      const overlapY = a.y < b.y + b.height + 16 && a.y + a.height + 16 > b.y;
      if (overlapX && overlapY) {
        b.y = a.y + a.height + ROW_GAP;
      }
    }
  }

  // Đặt các bảng độc lập (0 FK) gọn gàng thành hàng ngang dưới cùng
  if (isolated.length > 0) {
    const bottomY = Math.max(
      bandTopY,
      megaY,
      ...Object.values(positions).map((p) => p.y + p.height + CLUSTER_GAP)
    );
    const colsPerRow = Math.min(4, Math.max(2, isolated.length));
    let rowY = bottomY;
    let rowMaxH = 0;
    isolated.forEach((t, idx) => {
      const col = idx % colsPerRow;
      if (idx > 0 && col === 0) {
        rowY += rowMaxH + ROW_GAP;
        rowMaxH = 0;
      }
      const h = getNodeHeight(t);
      positions[t.tableName] = {
        x: PAD_X + col * (NODE_WIDTH + COL_GAP),
        y: rowY,
        width: NODE_WIDTH,
        height: h,
      };
      rowMaxH = Math.max(rowMaxH, h);
    });
  }

  return positions;
}

/**
 * Định tuyến đường nối FK mượt (SmoothStep) đi qua các hành lang trống, tránh đâm xuyên qua thẻ bảng khác
 */
function buildErdEdges(tables, nodeLayouts) {
  const edges = [];
  const rects = Object.entries(nodeLayouts).map(([name, pos]) => ({ name, ...pos }));

  const hasObstacleInCorridor = (minX, maxX, yBandMin, yBandMax, ignoreA, ignoreB) => {
    return rects.some((r) => {
      if (r.name === ignoreA || r.name === ignoreB) return false;
      const hitX = r.x < maxX - 6 && r.x + r.width > minX + 6;
      const hitY = r.y < yBandMax && r.y + r.height > yBandMin;
      return hitX && hitY;
    });
  };

  // Đếm tổng cạnh theo từng cặp cột để rải làn (lane) đều không bị đè nét
  const rawEdges = [];
  tables.forEach((table) => {
    const srcPos = nodeLayouts[table.tableName];
    if (!srcPos) return;
    (table.foreignKeys || []).forEach((fk) => {
      const dstPos = nodeLayouts[fk.targetTable];
      if (!dstPos) return;
      rawEdges.push({ table, fk, srcPos, dstPos });
    });
  });

  rawEdges.forEach(({ table, fk, srcPos, dstPos }, edgeIdx) => {
    const srcColIdx = srcPos.preview.visible.findIndex((c) => c.name === fk.column);
    const dstColIdx = dstPos.preview.visible.findIndex((c) => c.name === fk.targetColumn);

    const y1 = srcColIdx >= 0
      ? srcPos.y + FIRST_ROW_OFFSET + srcColIdx * ROW_HEIGHT + ROW_HEIGHT / 2
      : srcPos.y + HEADER_HEIGHT / 2;
    const y2 = dstColIdx >= 0
      ? dstPos.y + FIRST_ROW_OFFSET + dstColIdx * ROW_HEIGHT + ROW_HEIGHT / 2
      : dstPos.y + HEADER_HEIGHT / 2;

    // Làn nhỏ (-16..+16) giúp các đường song song không chồng khít lên nhau
    const laneOffset = ((edgeIdx % 7) - 3) * 6;
    let points = [];
    let startSide = 'right';
    let endSide = 'left';
    let startX = 0;
    let endX = 0;

    if (table.tableName === fk.targetTable) {
      // Tự tham chiếu (self-referencing FK)
      startSide = 'right';
      endSide = 'right';
      startX = srcPos.x + srcPos.width;
      endX = dstPos.x + dstPos.width;
      const loopX = startX + 32;
      points = [
        { x: startX, y: y1 },
        { x: loopX, y: y1 },
        { x: loopX, y: y2 },
        { x: endX, y: y2 },
      ];
    } else if (dstPos.x >= srcPos.x + srcPos.width + 20) {
      // Đích nằm bên phải nguồn
      startSide = 'right';
      endSide = 'left';
      startX = srcPos.x + srcPos.width;
      endX = dstPos.x;

      const minY = Math.min(y1, y2) - 8;
      const maxY = Math.max(y1, y2) + 8;
      const blocked = hasObstacleInCorridor(startX + 18, endX - 18, minY, maxY, table.tableName, fk.targetTable);

      if (!blocked) {
        const midX = startX + (endX - startX) / 2 + laneOffset;
        points = [
          { x: startX, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: endX, y: y2 },
        ];
      } else {
        // Vòng qua hành lang ngang phía trên/dưới cặp bảng
        const routeAbove = (srcPos.y + dstPos.y) / 2 > 220;
        const corridorY = routeAbove
          ? Math.min(srcPos.y, dstPos.y) - 18 - (edgeIdx % 4) * 6
          : Math.max(srcPos.y + srcPos.height, dstPos.y + dstPos.height) + 18 + (edgeIdx % 4) * 6;
        const outX = startX + 20 + (edgeIdx % 3) * 5;
        const inX = endX - 20 - (edgeIdx % 3) * 5;
        points = [
          { x: startX, y: y1 },
          { x: outX, y: y1 },
          { x: outX, y: corridorY },
          { x: inX, y: corridorY },
          { x: inX, y: y2 },
          { x: endX, y: y2 },
        ];
      }
    } else if (srcPos.x >= dstPos.x + dstPos.width + 20) {
      // Đích nằm bên trái nguồn (hướng phổ biến: bảng con -> bảng cha)
      startSide = 'left';
      endSide = 'right';
      startX = srcPos.x;
      endX = dstPos.x + dstPos.width;

      const minY = Math.min(y1, y2) - 8;
      const maxY = Math.max(y1, y2) + 8;
      const blocked = hasObstacleInCorridor(endX + 18, startX - 18, minY, maxY, table.tableName, fk.targetTable);

      if (!blocked) {
        const midX = endX + (startX - endX) / 2 + laneOffset;
        points = [
          { x: startX, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: endX, y: y2 },
        ];
      } else {
        const corridorY = Math.min(srcPos.y, dstPos.y) - 18 - (edgeIdx % 4) * 6;
        const outX = startX - 20 - (edgeIdx % 3) * 5;
        const inX = endX + 20 + (edgeIdx % 3) * 5;
        points = [
          { x: startX, y: y1 },
          { x: outX, y: y1 },
          { x: outX, y: corridorY },
          { x: inX, y: corridorY },
          { x: inX, y: y2 },
          { x: endX, y: y2 },
        ];
      }
    } else {
      // Cùng cột dọc -> vòng gọn ra hành lang bên phải
      startSide = 'right';
      endSide = 'right';
      startX = srcPos.x + srcPos.width;
      endX = dstPos.x + dstPos.width;
      const gutterX = Math.max(startX, endX) + 26 + (edgeIdx % 4) * 7;
      points = [
        { x: startX, y: y1 },
        { x: gutterX, y: y1 },
        { x: gutterX, y: y2 },
        { x: endX, y: y2 },
      ];
    }

    const pathD = buildRoundedPolylinePath(points, 8);
    const midPt = points[Math.floor(points.length / 2)] || { x: (startX + endX) / 2, y: (y1 + y2) / 2 };

    edges.push({
      id: `${table.tableName}.${fk.column}->${fk.targetTable}.${fk.targetColumn}`,
      fromTable: table.tableName,
      fromColumn: fk.column,
      toTable: fk.targetTable,
      toColumn: fk.targetColumn,
      startX,
      startY: y1,
      endX,
      endY: y2,
      startSide,
      endSide,
      pathD,
      midX: midPt.x,
      midY: (y1 + y2) / 2,
    });
  });

  return edges;
}

export default function SchemaExplorerPage({ showToast, onAskAboutTable }) {
  const [schemaData, setSchemaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [viewMode, setViewMode] = useState('erd'); // 'erd' | 'list' | 'raw'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hoveredTableName, setHoveredTableName] = useState(null);
  const [selectedTableName, setSelectedTableName] = useState(null);
  const [showAllEdges, setShowAllEdges] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [copiedKey, setCopiedKey] = useState('');
  const [customPositions, setCustomPositions] = useState({});
  const [isPanning, setIsPanning] = useState(false);

  const erdViewportRef = useRef(null);
  const hasAutoFittedRef = useRef(false);
  const zoomRef = useRef(1);
  const pendingZoomScrollRef = useRef(null);

  useLayoutEffect(() => {
    zoomRef.current = zoom;
    const el = erdViewportRef.current;
    if (pendingZoomScrollRef.current && el) {
      el.scrollLeft = Math.max(0, pendingZoomScrollRef.current.scrollLeft);
      el.scrollTop = Math.max(0, pendingZoomScrollRef.current.scrollTop);
      pendingZoomScrollRef.current = null;
    }
  }, [zoom]);

  const applyZoomAtPoint = useCallback((nextZoomRaw, clientX, clientY) => {
    const el = erdViewportRef.current;
    if (!el) return;

    const prevZoom = zoomRef.current;
    const clampedZoom = Math.min(2.0, Math.max(0.35, Number(nextZoomRaw.toFixed(3))));
    if (Math.abs(clampedZoom - prevZoom) < 0.001) return;

    const rect = el.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const baseScrollLeft = pendingZoomScrollRef.current
      ? pendingZoomScrollRef.current.scrollLeft
      : el.scrollLeft;
    const baseScrollTop = pendingZoomScrollRef.current
      ? pendingZoomScrollRef.current.scrollTop
      : el.scrollTop;

    const worldX = (baseScrollLeft + mouseX) / prevZoom;
    const worldY = (baseScrollTop + mouseY) / prevZoom;

    pendingZoomScrollRef.current = {
      scrollLeft: Math.max(0, worldX * clampedZoom - mouseX),
      scrollTop: Math.max(0, worldY * clampedZoom - mouseY),
    };
    zoomRef.current = clampedZoom;
    setZoom(clampedZoom);
  }, []);

  const zoomFromViewportCenter = useCallback((factor) => {
    const el = erdViewportRef.current;
    if (!el) {
      setZoom((z) => Math.min(2.0, Math.max(0.35, Number((z * factor).toFixed(2)))));
      return;
    }
    const rect = el.getBoundingClientRect();
    applyZoomAtPoint(zoomRef.current * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [applyZoomAtPoint]);

  const storageKey = `schema_erd_pos_${schemaData?.databaseName || 'homeservice_prod'}`;

  const fetchSchema = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await schemaService.getDatabaseSchema({ refresh });
      setSchemaData(data);

      // Khôi phục vị trí kéo thả đã lưu của người dùng (nếu có)
      try {
        const saved = localStorage.getItem(`schema_erd_pos_${data?.databaseName || 'homeservice_prod'}`);
        if (saved) {
          setCustomPositions(JSON.parse(saved));
        }
      } catch {
        // ignore storage errors
      }

      if (refresh && showToast) {
        showToast('success', 'Đã đồng bộ cấu trúc Database Schema mới nhất.', 'Schema Explorer');
      }
    } catch (err) {
      console.error('Lỗi tải schema:', err);
      setErrorMessage(
        err.message || 'Không thể tải thông tin Schema từ backend (GET /api/admin/schema).'
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSchema(false);
  }, [fetchSchema]);

  const tables = schemaData?.tables || [];

  const filteredTables = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.tableName.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.columns || []).some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q)
        )
    );
  }, [tables, searchKeyword]);

  // Tính vị trí tự động + gộp với vị trí kéo thả tùy chỉnh
  const autoPositions = useMemo(() => computeAutoPositions(filteredTables), [filteredTables]);

  const layout = useMemo(() => {
    const nodeLayouts = {};
    let maxX = 860;
    let maxY = 540;

    filteredTables.forEach((t) => {
      const auto = autoPositions[t.tableName];
      if (!auto) return;
      const override = !searchKeyword.trim() ? customPositions[t.tableName] : null;
      const x = override?.x ?? auto.x;
      const y = override?.y ?? auto.y;

      nodeLayouts[t.tableName] = {
        x,
        y,
        width: auto.width,
        height: auto.height,
        preview: getPreviewColumns(t),
      };
      maxX = Math.max(maxX, x + auto.width + 64);
      maxY = Math.max(maxY, y + auto.height + 64);
    });

    const edges = buildErdEdges(filteredTables, nodeLayouts);
    return {
      positions: nodeLayouts,
      edges,
      width: maxX,
      height: maxY,
    };
  }, [filteredTables, autoPositions, customPositions, searchKeyword]);

  // Tự động fit zoom lần đầu để nhìn toàn cảnh gọn như Supabase
  const handleFitToScreen = useCallback(() => {
    const el = erdViewportRef.current;
    if (!el || !layout.width || !layout.height) return;
    const availW = Math.max(el.clientWidth - 40, 300);
    const availH = Math.max(el.clientHeight - 40, 300);
    const fit = Math.max(0.35, Math.min(availW / layout.width, availH / layout.height, 1));
    const rounded = Number(fit.toFixed(2));
    pendingZoomScrollRef.current = null;
    zoomRef.current = rounded;
    setZoom(rounded);
    el.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  }, [layout.width, layout.height]);

  useEffect(() => {
    if (!isLoading && filteredTables.length > 0 && viewMode === 'erd' && !hasAutoFittedRef.current) {
      hasAutoFittedRef.current = true;
      requestAnimationFrame(() => {
        handleFitToScreen();
      });
    }
  }, [isLoading, filteredTables.length, viewMode, handleFitToScreen]);

  // Hỗ trợ zoom in/out mượt bằng ngón tay trên trackpad (chụm/mở 2 ngón), con lăn chuột, Safari gesture & cảm ứng
  useEffect(() => {
    const el = erdViewportRef.current;
    if (!el || viewMode !== 'erd' || isLoading) return;

    const handleWheel = (e) => {
      const isPinchOrModifier = e.ctrlKey || e.metaKey;
      const isHorizontalSwipe = !isPinchOrModifier && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.1;
      if (isHorizontalSwipe) {
        return; // Giữ thao tác vuốt ngang để cuộn ngang
      }

      if (e.deltaY === 0) return;
      e.preventDefault();

      const lineScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      const rawDelta = e.deltaY * lineScale;
      const clampedDelta = Math.max(-90, Math.min(90, rawDelta));
      const sensitivity = isPinchOrModifier ? 0.01 : 0.0024;
      const factor = Math.exp(-clampedDelta * sensitivity);

      applyZoomAtPoint(zoomRef.current * factor, e.clientX, e.clientY);
    };

    // Safari macOS trackpad pinch (gesturestart / gesturechange)
    let gestureBaseZoom = zoomRef.current;
    const handleGestureStart = (e) => {
      e.preventDefault();
      gestureBaseZoom = zoomRef.current;
    };
    const handleGestureChange = (e) => {
      e.preventDefault();
      applyZoomAtPoint(gestureBaseZoom * e.scale, e.clientX, e.clientY);
    };
    const handleGestureEnd = (e) => {
      e.preventDefault();
    };

    // Màn hình cảm ứng (2 ngón tay)
    let touchBaseDist = null;
    let touchBaseZoom = zoomRef.current;
    const getTouchDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        touchBaseDist = getTouchDist(e.touches[0], e.touches[1]);
        touchBaseZoom = zoomRef.current;
      }
    };
    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchBaseDist) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        applyZoomAtPoint(touchBaseZoom * (dist / touchBaseDist), midX, midY);
      }
    };
    const handleTouchEnd = () => {
      touchBaseDist = null;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('gesturestart', handleGestureStart, { passive: false });
    el.addEventListener('gesturechange', handleGestureChange, { passive: false });
    el.addEventListener('gestureend', handleGestureEnd, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('gesturestart', handleGestureStart);
      el.removeEventListener('gesturechange', handleGestureChange);
      el.removeEventListener('gestureend', handleGestureEnd);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewMode, isLoading, filteredTables.length, applyZoomAtPoint]);

  const handleResetLayout = () => {
    setCustomPositions({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    requestAnimationFrame(() => {
      handleFitToScreen();
    });
    if (showToast) {
      showToast('info', 'Đã sắp xếp lại sơ đồ theo bố cục phân tầng.', 'Sắp xếp gọn');
    }
  };

  // Kéo thả thẻ bảng trên canvas (hỗ trợ cả click chọn nếu không di chuyển)
  const handleNodePointerDown = (e, tableName) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const pos = layout.positions[tableName];
    if (!pos) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startNodeX = pos.x;
    const startNodeY = pos.y;
    let moved = false;

    const onMove = (ev) => {
      const rawDx = ev.clientX - startClientX;
      const rawDy = ev.clientY - startClientY;
      if (!moved && Math.hypot(rawDx, rawDy) > 4) {
        moved = true;
      }
      if (moved) {
        const currentZ = zoomRef.current || 1;
        const nextX = Math.max(16, Math.round(startNodeX + rawDx / currentZ));
        const nextY = Math.max(16, Math.round(startNodeY + rawDy / currentZ));
        setCustomPositions((prev) => ({
          ...prev,
          [tableName]: { x: nextX, y: nextY },
        }));
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      if (!moved) {
        setSelectedTableName((prev) => (prev === tableName ? null : tableName));
      } else {
        setCustomPositions((latest) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(latest));
          } catch {
            // ignore
          }
          return latest;
        });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Kéo nền trống để di chuyển (pan) sơ đồ
  const handleCanvasPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = erdViewportRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = el.scrollLeft;
    const startScrollTop = el.scrollTop;
    let panned = false;

    setIsPanning(true);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!panned && Math.hypot(dx, dy) > 4) panned = true;
      if (panned) {
        el.scrollLeft = startScrollLeft - dx;
        el.scrollTop = startScrollTop - dy;
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setIsPanning(false);
      if (!panned) {
        setSelectedTableName(null);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const activeFocusTable = hoveredTableName || selectedTableName;

  const relatedTablesSet = useMemo(() => {
    if (!activeFocusTable) return null;
    const set = new Set([activeFocusTable]);
    layout.edges.forEach((edge) => {
      if (edge.fromTable === activeFocusTable) set.add(edge.toTable);
      if (edge.toTable === activeFocusTable) set.add(edge.fromTable);
    });
    return set;
  }, [activeFocusTable, layout.edges]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.tableName === selectedTableName) || null,
    [tables, selectedTableName]
  );

  const incomingReferences = useMemo(() => {
    if (!selectedTable) return [];
    const refs = [];
    tables.forEach((t) => {
      (t.foreignKeys || []).forEach((fk) => {
        if (fk.targetTable === selectedTable.tableName) {
          refs.push({
            fromTable: t.tableName,
            fromColumn: fk.column,
            targetColumn: fk.targetColumn,
          });
        }
      });
    });
    return refs;
  }, [tables, selectedTable]);

  const totalColumnsCount = useMemo(
    () => tables.reduce((sum, t) => sum + (t.columns?.length || 0), 0),
    [tables]
  );
  const totalForeignKeysCount = useMemo(
    () => tables.reduce((sum, t) => sum + (t.foreignKeys?.length || 0), 0),
    [tables]
  );

  const handleCopyText = (text, keyLabel) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyLabel);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === keyLabel ? '' : prev));
    }, 1600);
    if (showToast) {
      showToast('info', `Đã sao chép "${text}"`, 'Sao chép');
    }
  };

  const hoveredTableObj = useMemo(
    () => (hoveredTableName ? filteredTables.find((t) => t.tableName === hoveredTableName) : null),
    [hoveredTableName, filteredTables]
  );

  const hoveredIncomingTables = useMemo(() => {
    if (!hoveredTableName) return [];
    return Array.from(
      new Set(layout.edges.filter((e) => e.toTable === hoveredTableName).map((e) => e.fromTable))
    );
  }, [hoveredTableName, layout.edges]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      {/* Top Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5B42F3] flex items-center justify-center shrink-0">
            <Network size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Schema Explorer
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {schemaData?.databaseName || 'homeservice_prod'}
              </span>
              {schemaData?.isMock && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Dữ liệu mẫu
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {tables.length} bảng · {totalColumnsCount} cột · {totalForeignKeysCount} khóa ngoại — Kéo thả sắp xếp bảng, di chuột xem liên kết, click xem chi tiết cột
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm tên bảng, cột..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B42F3]/20 focus:border-[#5B42F3]"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('erd')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'erd'
                  ? 'bg-white text-[#5B42F3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network size={13} />
              <span>Sơ đồ ERD</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#5B42F3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table size={13} />
              <span>Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-white text-[#5B42F3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code size={13} />
              <span>Raw {'{schema}'}</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchSchema(true)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#5B42F3]' : ''} />
            <span>Đồng bộ Schema</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading && !schemaData ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#5B42F3] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">Đang trích xuất cấu trúc Database Schema...</p>
            <p className="text-xs text-slate-400 font-mono">GET /api/admin/schema</p>
          </div>
        </div>
      ) : errorMessage && tables.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Chưa lấy được Schema từ Backend</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => fetchSchema(true)}
                className="px-4 py-2 bg-[#5B42F3] hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw size={13} /> Thử tải lại
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* VIEW 1: INTERACTIVE SUPABASE-STYLE ERD VISUALIZER */}
          {viewMode === 'erd' && (
            <div className="flex-1 flex overflow-hidden relative">
              {/* Floating Canvas Control Bar (Zoom, Fit, Auto-Arrange, Toggle Lines) */}
              <div className="absolute top-3.5 left-4 z-30 flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1 bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => zoomFromViewportCenter(0.88)}
                    title="Thu nhỏ"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-[11px] font-mono font-semibold text-slate-600 px-1 min-w-[42px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => zoomFromViewportCenter(1.14)}
                    title="Phóng to"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={handleFitToScreen}
                    title="Vừa màn hình"
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-[#5B42F3] hover:bg-indigo-50 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Scan size={13} />
                    <span>Vừa khung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = erdViewportRef.current;
                      if (el) {
                        const rect = el.getBoundingClientRect();
                        applyZoomAtPoint(1, rect.left + rect.width / 2, rect.top + rect.height / 2);
                      } else {
                        setZoom(1);
                      }
                    }}
                    title="Tỷ lệ 100%"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetLayout}
                  title="Sắp xếp lại bố cục gọn gàng theo cụm & phân tầng"
                  className="px-3 py-1.5 bg-white/95 backdrop-blur border border-slate-200 hover:border-indigo-300 hover:text-[#5B42F3] text-slate-700 text-xs font-medium rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Sắp xếp gọn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAllEdges((prev) => !prev)}
                  title="Chuyển chế độ hiển thị đường nối khóa ngoại"
                  className={`px-3 py-1.5 backdrop-blur border text-xs font-medium rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer ${
                    !showAllEdges
                      ? 'bg-[#5B42F3] border-[#5B42F3] text-white'
                      : 'bg-white/95 border-slate-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {showAllEdges ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{showAllEdges ? 'Hiện tất cả dây' : 'Chỉ dây đang chọn'}</span>
                </button>
              </div>

              {/* Scrollable & Pannable ERD Canvas */}
              <div
                ref={erdViewportRef}
                onPointerDown={handleCanvasPointerDown}
                style={{ touchAction: 'none' }}
                className={`flex-1 relative overflow-auto bg-[#F8FAFC] ${
                  isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'
                }`}
              >
                <div
                  className="relative min-w-full min-h-full"
                  style={{
                    width: Math.max(layout.width * zoom + 40, 820),
                    height: Math.max(layout.height * zoom + 40, 560),
                    backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {/* Scaled ERD Content */}
                  <div
                    className="relative origin-top-left"
                    style={{
                      width: layout.width,
                      height: layout.height,
                      transform: `scale(${zoom})`,
                    }}
                  >
                    {/* SVG SmoothStep Relationship Lines */}
                    <svg
                      width={layout.width}
                      height={layout.height}
                      className="absolute inset-0 pointer-events-none"
                    >
                      <defs>
                        <marker
                          id="fk-arrow-subtle"
                          markerWidth="6"
                          markerHeight="6"
                          refX="5.5"
                          refY="3"
                          orient="auto"
                        >
                          <path d="M 0 0.5 L 5.5 3 L 0 5.5 z" fill="#94A3B8" />
                        </marker>
                        <marker
                          id="fk-arrow-focus"
                          markerWidth="8"
                          markerHeight="8"
                          refX="7"
                          refY="4"
                          orient="auto"
                        >
                          <path d="M 0 1 L 7 4 L 0 7 z" fill="#5B42F3" />
                        </marker>
                      </defs>

                      {layout.edges.map((edge) => {
                        const isConnected =
                          activeFocusTable &&
                          (edge.fromTable === activeFocusTable || edge.toTable === activeFocusTable);

                        if (!showAllEdges && !isConnected) {
                          return null;
                        }

                        const isDimmed = Boolean(activeFocusTable && !isConnected);

                        return (
                          <g
                            key={edge.id}
                            style={{
                              opacity: isConnected ? 1 : isDimmed ? 0.1 : 0.65,
                              transition: 'opacity 150ms',
                            }}
                          >
                            <path
                              d={edge.pathD}
                              fill="none"
                              stroke={isConnected ? '#5B42F3' : '#CBD5E1'}
                              strokeWidth={isConnected ? 2.1 : 1.25}
                              markerEnd={isConnected ? 'url(#fk-arrow-focus)' : 'url(#fk-arrow-subtle)'}
                            />
                            {/* Chấm tròn nhỏ gắn vào cột như Supabase */}
                            <circle
                              cx={edge.startX}
                              cy={edge.startY}
                              r={isConnected ? 3.5 : 2.5}
                              fill={isConnected ? '#5B42F3' : '#94A3B8'}
                            />
                            {isConnected && (
                              <circle
                                cx={edge.endX}
                                cy={edge.endY}
                                r={3}
                                fill="#5B42F3"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Table Cards */}
                    {filteredTables.map((table) => {
                      const pos = layout.positions[table.tableName];
                      if (!pos) return null;

                      const isSelected = selectedTableName === table.tableName;
                      const isHovered = hoveredTableName === table.tableName;
                      const isRelated = relatedTablesSet ? relatedTablesSet.has(table.tableName) : true;

                      return (
                        <div
                          key={table.tableName}
                          onPointerDown={(e) => handleNodePointerDown(e, table.tableName)}
                          onMouseEnter={() => setHoveredTableName(table.tableName)}
                          onMouseLeave={() => setHoveredTableName((prev) => (prev === table.tableName ? null : prev))}
                          style={{
                            left: pos.x,
                            top: pos.y,
                            width: pos.width,
                          }}
                          className={`absolute rounded-xl bg-white border transition-shadow duration-150 cursor-pointer select-none ${
                            isHovered
                              ? 'border-[#5B42F3] ring-4 ring-[#5B42F3]/12 shadow-lg z-30'
                              : isSelected
                              ? 'border-[#5B42F3] ring-2 ring-[#5B42F3]/20 shadow-md z-20'
                              : 'border-slate-200/95 shadow-xs hover:border-indigo-300 z-10'
                          } ${!isRelated ? 'opacity-35' : 'opacity-100'}`}
                        >
                          {/* Hover Quick Summary Tooltip */}
                          {isHovered && hoveredTableObj && (() => {
                            const pkNames = (hoveredTableObj.columns || [])
                              .filter((c) => c.primaryKey)
                              .map((c) => c.name);
                            const outTargets = Array.from(
                              new Set((hoveredTableObj.foreignKeys || []).map((fk) => fk.targetTable))
                            );
                            const alignRight = pos.x + 290 > layout.width;
                            const placeBelow = pos.y < 160;

                            return (
                              <div
                                style={{
                                  top: placeBelow ? 'calc(100% + 8px)' : 'auto',
                                  bottom: placeBelow ? 'auto' : 'calc(100% + 8px)',
                                  left: alignRight ? 'auto' : 0,
                                  right: alignRight ? 0 : 'auto',
                                }}
                                className="pointer-events-none absolute w-72 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-700 z-40 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono font-bold text-xs text-indigo-300 truncate">
                                    {hoveredTableObj.tableName}
                                  </span>
                                  <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                                    {hoveredTableObj.columns?.length || 0} cột
                                  </span>
                                </div>

                                {hoveredTableObj.description && (
                                  <p className="text-[11px] text-slate-200 leading-relaxed">
                                    {hoveredTableObj.description}
                                  </p>
                                )}

                                <div className="space-y-0.5 text-[10px]">
                                  {pkNames.length > 0 && (
                                    <div className="text-slate-300">
                                      <span className="text-amber-400 font-semibold">PK: </span>
                                      <span className="font-mono">{pkNames.join(', ')}</span>
                                    </div>
                                  )}
                                  {outTargets.length > 0 && (
                                    <div className="text-slate-300">
                                      <span className="text-indigo-300 font-semibold">Liên kết tới: </span>
                                      <span className="font-mono">{outTargets.join(', ')}</span>
                                    </div>
                                  )}
                                  {hoveredIncomingTables.length > 0 && (
                                    <div className="text-slate-300">
                                      <span className="text-emerald-400 font-semibold">Tham chiếu bởi: </span>
                                      <span className="font-mono">{hoveredIncomingTables.join(', ')}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                  <span>Kéo để di chuyển</span>
                                  <span className="text-indigo-300 font-medium">Click xem chi tiết →</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Card Header (giống Supabase: gọn, rõ tên bảng) */}
                          <div
                            style={{ height: HEADER_HEIGHT }}
                            className={`px-3 rounded-t-xl border-b flex items-center justify-between gap-2 ${
                              isSelected || isHovered
                                ? 'bg-indigo-50/80 border-indigo-100'
                                : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Database size={13} className={isSelected || isHovered ? 'text-[#5B42F3]' : 'text-slate-500'} />
                              <span className="font-mono font-bold text-[12px] text-slate-900 truncate">
                                {table.tableName}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                              {table.columns?.length || 0} cột
                            </span>
                          </div>

                          {/* Columns Preview */}
                          <div className="py-1">
                            {pos.preview.visible.map((col) => (
                              <div
                                key={col.name}
                                style={{ height: ROW_HEIGHT }}
                                className="px-3 flex items-center justify-between gap-2 text-[11px] hover:bg-slate-50"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {col.primaryKey ? (
                                    <KeyRound size={10} className="text-amber-500 shrink-0" title="Primary Key" />
                                  ) : col.isForeignKey ? (
                                    <Link2 size={10} className="text-[#5B42F3] shrink-0" title="Foreign Key" />
                                  ) : (
                                    <span className="w-[10px] h-[10px] inline-flex items-center justify-center shrink-0">
                                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    </span>
                                  )}
                                  <span
                                    className={`font-mono truncate ${
                                      col.primaryKey
                                        ? 'font-bold text-slate-900'
                                        : col.isForeignKey
                                        ? 'font-semibold text-[#5B42F3]'
                                        : 'text-slate-700'
                                    }`}
                                  >
                                    {col.name}
                                  </span>
                                </div>
                                <span
                                  title={col.type}
                                  className="text-[10px] font-mono text-slate-400 shrink-0 max-w-[78px] truncate"
                                >
                                  {formatShortDataType(col.type)}
                                </span>
                              </div>
                            ))}

                            {pos.preview.hiddenCount > 0 && (
                              <div
                                style={{ height: FOOTER_HEIGHT }}
                                className="px-3 flex items-center text-[10px] font-medium text-indigo-600 bg-slate-50/70 border-t border-slate-100 rounded-b-xl"
                              >
                                + {pos.preview.hiddenCount} cột khác
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Inspector Panel: Chỉ mở khi người dùng click chọn bảng */}
              {selectedTable && (
                <aside className="w-80 xl:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-lg z-20">
                  <div className="p-4 border-b border-slate-200 space-y-2.5 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900 truncate">
                            {selectedTable.tableName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(selectedTable.tableName, `tbl-${selectedTable.tableName}`)}
                            title="Sao chép tên bảng"
                            className="p-1 text-slate-400 hover:text-[#5B42F3] rounded-md hover:bg-indigo-50 transition cursor-pointer"
                          >
                            {copiedKey === `tbl-${selectedTable.tableName}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {selectedTable.columns?.length || 0} cột · {(selectedTable.foreignKeys?.length || 0)} khóa ngoại đi · {incomingReferences.length} tham chiếu đến
                          {selectedTable.rowCountEstimate !== null &&
                            ` · ~${selectedTable.rowCountEstimate.toLocaleString('vi-VN')} dòng`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTableName(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Đóng chi tiết"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {selectedTable.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedTable.description}
                      </p>
                    )}

                    {onAskAboutTable && (
                      <button
                        type="button"
                        onClick={() => onAskAboutTable(selectedTable)}
                        className="w-full py-2 px-3 bg-[#5B42F3] hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <MessageSquare size={13} />
                        <span>Hỏi AI về bảng {selectedTable.tableName}</span>
                      </button>
                    )}
                  </div>

                  {/* Relationships & Columns */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {((selectedTable.foreignKeys?.length || 0) > 0 || incomingReferences.length > 0) && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Link2 size={11} /> Quan hệ khóa ngoại
                        </div>
                        <div className="space-y-1.5">
                          {(selectedTable.foreignKeys || []).map((fk, idx) => (
                            <button
                              key={`out-${idx}`}
                              type="button"
                              onClick={() => setSelectedTableName(fk.targetTable)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-100 text-[11px] flex items-center justify-between gap-2 transition cursor-pointer"
                            >
                              <span className="font-mono text-slate-700 truncate">
                                <strong className="text-[#5B42F3]">{fk.column}</strong> → {fk.targetTable}.{fk.targetColumn}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-semibold shrink-0">Đi tới</span>
                            </button>
                          ))}
                          {incomingReferences.map((ref, idx) => (
                            <button
                              key={`in-${idx}`}
                              type="button"
                              onClick={() => setSelectedTableName(ref.fromTable)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] flex items-center justify-between gap-2 transition cursor-pointer"
                            >
                              <span className="font-mono text-slate-700 truncate">
                                {ref.fromTable}.{ref.fromColumn} → <strong>{ref.targetColumn}</strong>
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0">Tham chiếu</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={11} /> Danh sách cột ({selectedTable.columns?.length || 0})
                      </div>
                      <div className="space-y-2">
                        {(selectedTable.columns || []).map((col) => (
                          <div
                            key={col.name}
                            className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200 transition space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-bold text-xs text-slate-900 truncate">
                                  {col.name}
                                </span>
                                {col.primaryKey && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                    PK
                                  </span>
                                )}
                                {col.isForeignKey && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-[#5B42F3]">
                                    FK
                                  </span>
                                )}
                                {!col.nullable && !col.primaryKey && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-500">
                                    NOT NULL
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyText(col.name, `col-${selectedTable.tableName}-${col.name}`)}
                                title="Sao chép tên cột"
                                className="p-1 text-slate-400 hover:text-[#5B42F3] rounded transition cursor-pointer shrink-0"
                              >
                                {copiedKey === `col-${selectedTable.tableName}-${col.name}` ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {col.type}
                              </span>
                              {col.fkTarget && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTableName(col.fkTarget.targetTable)}
                                  className="font-mono text-[10px] text-indigo-600 hover:underline cursor-pointer"
                                >
                                  → {col.fkTarget.targetTable}.{col.fkTarget.targetColumn}
                                </button>
                              )}
                            </div>

                            {col.description && (
                              <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                                {col.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          )}

          {/* VIEW 2: DANH SÁCH BẢNG CHI TIẾT */}
          {viewMode === 'list' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredTables.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                  Không tìm thấy bảng hoặc cột nào khớp với "{searchKeyword}".
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-7xl mx-auto">
                  {filteredTables.map((table) => {
                    const hasColDescriptions = (table.columns || []).some((c) => Boolean(c.description));
                    return (
                      <div
                        key={table.tableName}
                        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col"
                      >
                        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Database size={15} className="text-[#5B42F3]" />
                              <h3 className="font-mono font-bold text-sm text-slate-900">{table.tableName}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                {table.columns?.length || 0} cột
                              </span>
                              {(table.foreignKeys?.length || 0) > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-[#5B42F3] font-medium">
                                  {table.foreignKeys.length} FK
                                </span>
                              )}
                              {table.rowCountEstimate !== null && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                                  ~{table.rowCountEstimate.toLocaleString('vi-VN')} dòng
                                </span>
                              )}
                            </div>
                            {table.description && (
                              <p className="text-xs text-slate-500">{table.description}</p>
                            )}
                          </div>

                          {onAskAboutTable && (
                            <button
                              type="button"
                              onClick={() => onAskAboutTable(table)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#5B42F3] text-[11px] font-semibold rounded-lg flex items-center gap-1 shrink-0 transition cursor-pointer"
                            >
                              <MessageSquare size={12} /> Hỏi AI
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                              <tr>
                                <th className="py-2 px-4">Cột</th>
                                <th className="py-2 px-3">Kiểu dữ liệu</th>
                                <th className="py-2 px-3">Khóa</th>
                                {hasColDescriptions && <th className="py-2 px-4">Mô tả</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(table.columns || []).map((col) => (
                                <tr key={col.name} className="hover:bg-slate-50/70">
                                  <td className="py-2 px-4 font-mono font-semibold text-slate-800">
                                    {col.name}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[11px] text-emerald-700">
                                    {col.type}
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {col.primaryKey && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                          PK
                                        </span>
                                      )}
                                      {col.isForeignKey && col.fkTarget && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-[#5B42F3] font-mono">
                                          FK → {col.fkTarget.targetTable}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {hasColDescriptions && (
                                    <td className="py-2 px-4 text-[11px] text-slate-500">
                                      {col.description || '—'}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: RAW {schema} CHUỖI PROMPT CONTEXT */}
          {viewMode === 'raw' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
                  <Info size={16} className="text-[#5B42F3] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Đây là nội dung chuỗi <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200">{'{schema}'}</code> được trích xuất từ <code className="font-mono font-semibold">SchemaExtractorService</code> và truyền vào System Prompt <code className="font-mono font-semibold">TEXT_TO_SQL_SYSTEM</code> khi AI sinh câu truy vấn SQL.
                  </div>
                </div>

                <div className="bg-slate-900 text-indigo-100 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-indigo-300 flex items-center gap-2">
                      <Code size={14} /> {schemaData?.databaseName || 'homeservice_prod'} · Raw Schema Text
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(schemaData?.rawSchema || '', 'raw-schema')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedKey === 'raw-schema' ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span>Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Sao chép {'{schema}'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-5 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap text-slate-200">
                    {schemaData?.rawSchema || 'Chưa có dữ liệu raw schema.'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
