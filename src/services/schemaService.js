// src/services/schemaService.js
// Dịch vụ lấy & chuẩn hóa Database Schema từ Backend (GET /api/admin/schema)
// Hỗ trợ cả JSON có cấu trúc từ SchemaExtractorService lẫn chuỗi {schema} dạng DDL/text thuần.

import { apiRequest, authStorage } from './apiClient';

const MOCK_TABLES = [
  {
    tableName: 'service_categories',
    description: 'Danh mục nhóm dịch vụ gia đình (Điện nước, Vệ sinh, Điện lạnh, Sửa chữa...).',
    rowCountEstimate: 12,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Khóa chính danh mục' },
      { name: 'name', type: 'varchar(120)', primaryKey: false, nullable: false, description: 'Tên danh mục dịch vụ' },
      { name: 'slug', type: 'varchar(120)', primaryKey: false, nullable: false, description: 'Định danh URL duy nhất' },
      { name: 'description', type: 'text', primaryKey: false, nullable: true, description: 'Mô tả nhóm dịch vụ' },
      { name: 'created_at', type: 'timestamp', primaryKey: false, nullable: false, description: 'Thời gian tạo' },
    ],
    foreignKeys: [],
  },
  {
    tableName: 'users',
    description: 'Tài khoản người dùng hệ thống gồm Khách hàng, Thợ kỹ thuật và Quản trị viên.',
    rowCountEstimate: 3840,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Khóa chính người dùng' },
      { name: 'full_name', type: 'varchar(150)', primaryKey: false, nullable: false, description: 'Họ và tên đầy đủ' },
      { name: 'email', type: 'varchar(150)', primaryKey: false, nullable: false, description: 'Email đăng nhập' },
      { name: 'phone', type: 'varchar(20)', primaryKey: false, nullable: true, description: 'Số điện thoại liên hệ' },
      { name: 'role', type: 'varchar(30)', primaryKey: false, nullable: false, description: 'CUSTOMER | TECHNICIAN | ADMIN' },
      { name: 'created_at', type: 'timestamp', primaryKey: false, nullable: false, description: 'Ngày đăng ký' },
    ],
    foreignKeys: [],
  },
  {
    tableName: 'services',
    description: 'Danh sách các gói dịch vụ cụ thể kèm đơn giá niêm yết và thời lượng ước tính.',
    rowCountEstimate: 48,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Khóa chính dịch vụ' },
      { name: 'category_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Thuộc danh mục dịch vụ' },
      { name: 'name', type: 'varchar(180)', primaryKey: false, nullable: false, description: 'Tên dịch vụ (VD: Vệ sinh máy lạnh)' },
      { name: 'base_price', type: 'numeric(14,2)', primaryKey: false, nullable: false, description: 'Giá cơ bản (VNĐ)' },
      { name: 'duration_minutes', type: 'integer', primaryKey: false, nullable: true, description: 'Thời gian thực hiện dự kiến' },
      { name: 'is_active', type: 'boolean', primaryKey: false, nullable: false, description: 'Đang mở đặt lịch hay không' },
    ],
    foreignKeys: [
      { column: 'category_id', targetTable: 'service_categories', targetColumn: 'id' },
    ],
  },
  {
    tableName: 'technicians',
    description: 'Hồ sơ thợ kỹ thuật, tay nghề chuyên môn, điểm đánh giá và số đơn đã hoàn thành.',
    rowCountEstimate: 215,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Khóa chính thợ kỹ thuật' },
      { name: 'user_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Liên kết tài khoản users' },
      { name: 'full_name', type: 'varchar(150)', primaryKey: false, nullable: false, description: 'Tên hiển thị của thợ' },
      { name: 'specialty', type: 'varchar(120)', primaryKey: false, nullable: true, description: 'Chuyên môn chính' },
      { name: 'rating_avg', type: 'numeric(3,2)', primaryKey: false, nullable: true, description: 'Điểm đánh giá trung bình (1-5)' },
      { name: 'completed_orders', type: 'integer', primaryKey: false, nullable: false, description: 'Tổng đơn đã hoàn tất' },
      { name: 'created_at', type: 'timestamp', primaryKey: false, nullable: false, description: 'Ngày gia nhập hệ thống' },
    ],
    foreignKeys: [
      { column: 'user_id', targetTable: 'users', targetColumn: 'id' },
    ],
  },
  {
    tableName: 'bookings',
    description: 'Bảng trung tâm lưu đơn đặt lịch dịch vụ, trạng thái xử lý, lịch hẹn và tổng tiền.',
    rowCountEstimate: 14820,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Mã đơn đặt lịch' },
      { name: 'customer_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Khách hàng đặt đơn' },
      { name: 'tech_id', type: 'bigint', primaryKey: false, nullable: true, description: 'Thợ được phân công' },
      { name: 'service_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Gói dịch vụ đã chọn' },
      { name: 'status', type: 'varchar(30)', primaryKey: false, nullable: false, description: 'PENDING | CONFIRMED | COMPLETED | CANCELLED' },
      { name: 'scheduled_at', type: 'timestamp', primaryKey: false, nullable: false, description: 'Thời gian hẹn thực hiện' },
      { name: 'total_amount', type: 'numeric(14,2)', primaryKey: false, nullable: false, description: 'Tổng giá trị đơn (VNĐ)' },
      { name: 'created_at', type: 'timestamp', primaryKey: false, nullable: false, description: 'Thời điểm tạo đơn' },
    ],
    foreignKeys: [
      { column: 'customer_id', targetTable: 'users', targetColumn: 'id' },
      { column: 'tech_id', targetTable: 'technicians', targetColumn: 'id' },
      { column: 'service_id', targetTable: 'services', targetColumn: 'id' },
    ],
  },
  {
    tableName: 'payments',
    description: 'Giao dịch thanh toán cho từng đơn đặt lịch, phương thức và trạng thái thu tiền.',
    rowCountEstimate: 13960,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Mã giao dịch thanh toán' },
      { name: 'booking_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Thuộc đơn đặt lịch' },
      { name: 'amount', type: 'numeric(14,2)', primaryKey: false, nullable: false, description: 'Số tiền thanh toán (VNĐ)' },
      { name: 'payment_method', type: 'varchar(40)', primaryKey: false, nullable: false, description: 'CASH | VNPAY | MOMO | BANK_TRANSFER' },
      { name: 'status', type: 'varchar(30)', primaryKey: false, nullable: false, description: 'PAID | PENDING | REFUNDED' },
      { name: 'paid_at', type: 'timestamp', primaryKey: false, nullable: true, description: 'Thời gian thanh toán thành công' },
    ],
    foreignKeys: [
      { column: 'booking_id', targetTable: 'bookings', targetColumn: 'id' },
    ],
  },
  {
    tableName: 'reviews',
    description: 'Đánh giá sao và nhận xét của khách hàng sau khi hoàn thành dịch vụ.',
    rowCountEstimate: 9430,
    columns: [
      { name: 'id', type: 'bigint', primaryKey: true, nullable: false, description: 'Khóa chính đánh giá' },
      { name: 'booking_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Đơn được đánh giá' },
      { name: 'customer_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Khách hàng gửi đánh giá' },
      { name: 'tech_id', type: 'bigint', primaryKey: false, nullable: false, description: 'Thợ được đánh giá' },
      { name: 'rating', type: 'integer', primaryKey: false, nullable: false, description: 'Số sao từ 1 đến 5' },
      { name: 'comment', type: 'text', primaryKey: false, nullable: true, description: 'Nội dung nhận xét' },
      { name: 'created_at', type: 'timestamp', primaryKey: false, nullable: false, description: 'Thời điểm đánh giá' },
    ],
    foreignKeys: [
      { column: 'booking_id', targetTable: 'bookings', targetColumn: 'id' },
      { column: 'customer_id', targetTable: 'users', targetColumn: 'id' },
      { column: 'tech_id', targetTable: 'technicians', targetColumn: 'id' },
    ],
  },
];

/**
 * Chuẩn hóa danh sách bảng từ nhiều kiểu JSON khác nhau
 */
function normalizeTablesList(rawTables = []) {
  return (rawTables || []).map((t) => {
    const tableName = t.tableName || t.name || 'unknown_table';
    const fks = (t.foreignKeys || []).map((fk) => ({
      column: fk.column || fk.columnName || fk.fromColumn,
      targetTable: fk.targetTable || fk.referencedTable || fk.toTable,
      targetColumn: fk.targetColumn || fk.referencedColumn || fk.toColumn || 'id',
    })).filter((fk) => fk.column && fk.targetTable);

    const fkByCol = new Map(fks.map((fk) => [fk.column, fk]));

    const columns = (t.columns || []).map((c) => {
      const colName = c.name || c.columnName || '';
      const fkTarget = c.fkTarget || fkByCol.get(colName) || null;
      return {
        name: colName,
        type: c.type || c.dataType || 'varchar',
        primaryKey: Boolean(c.primaryKey ?? c.isPrimaryKey),
        nullable: c.nullable ?? c.isNullable ?? true,
        description: c.description || c.comment || c.columnComment || '',
        isForeignKey: Boolean(c.isForeignKey || fkTarget),
        fkTarget,
      };
    });

    return {
      tableName,
      description: t.description || t.tableComment || t.comment || '',
      rowCountEstimate: t.rowCountEstimate ?? t.estimatedRows ?? null,
      columns,
      foreignKeys: fks,
    };
  });
}

/**
 * Tạo chuỗi Raw {schema} chuẩn đọc giống SchemaExtractorService từ danh sách bảng
 */
export function buildRawSchemaText(tables = []) {
  return tables
    .map((t) => {
      const cols = t.columns
        .map((c) => {
          const flags = [];
          if (c.primaryKey) flags.push('PK');
          if (c.isForeignKey && c.fkTarget) {
            flags.push(`FK -> ${c.fkTarget.targetTable}.${c.fkTarget.targetColumn}`);
          }
          if (!c.nullable) flags.push('NOT NULL');
          const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
          const descStr = c.description ? ` -- ${c.description}` : '';
          return `  - ${c.name}: ${c.type}${flagStr}${descStr}`;
        })
        .join('\n');
      const headerDesc = t.description ? ` -- ${t.description}` : '';
      return `Table: ${t.tableName}${headerDesc}\n${cols}`;
    })
    .join('\n\n');
}

/**
 * Parser cho chuỗi schema text từ SchemaExtractorService.java và các định dạng phổ biến:
 * 1) Format SchemaExtractorService (PostgreSQL):
 *    Table: bookings
 *     - id (bigint)
 *     - status (character varying)
 *     Constraint:
 *       - PRIMARY KEY (id)
 *       - FOREIGN KEY (tech_id) REFERENCES technicians(id)
 * 2) Format SQL DDL: CREATE TABLE name (col TYPE ..., FOREIGN KEY (c) REFERENCES t(tc));
 * 3) Format block/inline: Table: name (col type, ...) hoặc - col: type [PK, FK -> t.tc]
 */
export function parseRawSchemaText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const tablesMap = new Map();
  const ensureTable = (name, desc = '') => {
    const clean = name.replace(/["`[\]]/g, '').split('.').pop().trim();
    if (!clean) return null;
    if (!tablesMap.has(clean)) {
      tablesMap.set(clean, {
        tableName: clean,
        description: desc,
        rowCountEstimate: null,
        columns: [],
        foreignKeys: [],
      });
    } else if (desc && !tablesMap.get(clean).description) {
      tablesMap.get(clean).description = desc;
    }
    return tablesMap.get(clean);
  };

  const addColumnUnique = (table, col) => {
    if (!col?.name) return;
    const existing = table.columns.find((c) => c.name === col.name);
    if (!existing) {
      table.columns.push(col);
    }
  };

  const addForeignKeyUnique = (table, fk) => {
    if (!fk?.column || !fk?.targetTable) return;
    const exists = table.foreignKeys.some(
      (x) =>
        x.column === fk.column &&
        x.targetTable === fk.targetTable &&
        x.targetColumn === fk.targetColumn
    );
    if (!exists) {
      table.foreignKeys.push(fk);
    }
  };

  // Thử parse định dạng SQL DDL: CREATE TABLE ... (...)
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(([\s\S]*?)\)\s*;/gi;
  let match;
  while ((match = createTableRegex.exec(rawText)) !== null) {
    const table = ensureTable(match[1]);
    if (!table) continue;

    const bodyLines = match[2]
      .split(/,(?![^(]*\))/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const line of bodyLines) {
      const fkMatch = line.match(/(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const srcCols = fkMatch[1].split(',').map((s) => s.replace(/["`]/g, '').trim());
        const refCols = fkMatch[3].split(',').map((s) => s.replace(/["`]/g, '').trim());
        const targetTbl = fkMatch[2].replace(/["`]/g, '').split('.').pop().trim();
        srcCols.forEach((sc, idx) => {
          addForeignKeyUnique(table, {
            column: sc,
            targetTable: targetTbl,
            targetColumn: refCols[idx] || refCols[0] || 'id',
          });
        });
        continue;
      }

      const pkConstraint = line.match(/(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkConstraint) {
        const pkCols = pkConstraint[1].split(',').map((s) => s.replace(/["`]/g, '').trim());
        table.columns.forEach((c) => {
          if (pkCols.includes(c.name)) {
            c.primaryKey = true;
            c.nullable = false;
          }
        });
        continue;
      }

      if (/^(UNIQUE|CHECK|CONSTRAINT|INDEX)\b/i.test(line)) continue;

      const commentSplit = line.split(/\s*--\s*/);
      const defPart = commentSplit[0].trim();
      const descPart = commentSplit[1]?.trim() || '';
      const colMatch = defPart.match(/^["`]?([a-zA-Z0-9_]+)["`]?\s+([a-zA-Z0-9_]+(?:\([^)]*\))?)(.*)$/i);
      if (!colMatch) continue;

      const [, colName, colType, rest] = colMatch;
      const isPk = /PRIMARY\s+KEY/i.test(rest);
      const isNullable = !/NOT\s+NULL/i.test(rest);
      const inlineRef = rest.match(/REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
      if (inlineRef) {
        addForeignKeyUnique(table, {
          column: colName,
          targetTable: inlineRef[1].replace(/["`]/g, '').split('.').pop().trim(),
          targetColumn: inlineRef[2].replace(/["`]/g, '').trim(),
        });
      }

      addColumnUnique(table, {
        name: colName,
        type: colType.toLowerCase(),
        primaryKey: isPk,
        nullable: isNullable,
        description: descPart,
      });
    }
  }

  if (tablesMap.size > 0) {
    return normalizeTablesList(Array.from(tablesMap.values()));
  }

  // Parse định dạng của SchemaExtractorService.java & block text
  const lines = rawText.split(/\r?\n/);
  let currentTable = null;
  let section = 'columns'; // 'columns' | 'constraints'

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Dạng inline: Table: bookings (id bigint, ...) hoặc bookings(id bigint, ...)
    const inlineTable = line.match(/^(?:[-#*]*\s*)?(?:Table\s*:?\s+)?([a-zA-Z0-9_.]+)\s*\((.+)\)\s*;?$/i);
    if (inlineTable && !line.startsWith('-') && !inlineTable[1].includes(' ')) {
      const t = ensureTable(inlineTable[1]);
      if (t) {
        const parts = inlineTable[2].split(',').map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
          const fkArrow = p.match(/(?:FK\s*->|REFERENCES)\s*([a-zA-Z0-9_]+)[.(]([a-zA-Z0-9_]+)\)?/i);
          const colTokens = p.replace(/\[.*?\]/g, '').trim().split(/[\s:]+/).filter(Boolean);
          if (colTokens[0]) {
            const cName = colTokens[0].replace(/["`]/g, '');
            const cType = colTokens[1] || 'varchar';
            const isPk = /\bPK\b|PRIMARY\s+KEY/i.test(p);
            if (fkArrow) {
              addForeignKeyUnique(t, {
                column: cName,
                targetTable: fkArrow[1].trim(),
                targetColumn: fkArrow[2].trim(),
              });
            }
            addColumnUnique(t, {
              name: cName,
              type: cType,
              primaryKey: isPk,
              nullable: !/NOT\s+NULL/i.test(p),
              description: '',
            });
          }
        }
        currentTable = t;
        section = 'columns';
        continue;
      }
    }

    // Header bảng: "Table: bookings" hoặc "Table: bookings -- mô tả"
    const headerMatch = line.match(/^(?:###?\s*)?Table\s*:?\s+([a-zA-Z0-9_.]+)(?:\s*(?:--|-)\s*(.+))?$/i);
    if (headerMatch && !line.startsWith('-')) {
      currentTable = ensureTable(headerMatch[1], headerMatch[2]?.trim() || '');
      section = 'columns';
      continue;
    }

    // Mục Constraint: trong SchemaExtractorService.java
    if (currentTable && /^Constraints?\s*:?\s*$/i.test(line)) {
      section = 'constraints';
      continue;
    }

    // Xử lý các dòng trong mục Constraint:
    //   - PRIMARY KEY (id)
    //   - FOREIGN KEY (tech_id) REFERENCES technicians(id)
    if (currentTable && section === 'constraints') {
      const conText = line.replace(/^[-*]\s*/, '').trim();

      const pkMatch = conText.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map((s) => s.replace(/["`]/g, '').trim());
        currentTable.columns.forEach((c) => {
          if (pkCols.includes(c.name)) {
            c.primaryKey = true;
            c.nullable = false;
          }
        });
        continue;
      }

      const fkMatch = conText.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const srcCols = fkMatch[1].split(',').map((s) => s.replace(/["`]/g, '').trim());
        const refCols = fkMatch[3].split(',').map((s) => s.replace(/["`]/g, '').trim());
        const targetTbl = fkMatch[2].replace(/["`]/g, '').split('.').pop().trim();
        srcCols.forEach((sc, idx) => {
          addForeignKeyUnique(currentTable, {
            column: sc,
            targetTable: targetTbl,
            targetColumn: refCols[idx] || refCols[0] || 'id',
          });
        });
        continue;
      }
      continue;
    }

    // Xử lý dòng cột trong SchemaExtractorService:
    // " - column_name (data_type)" (vd: " - created_at (timestamp without time zone)")
    // hoặc " - column_name: data_type [PK, FK -> t.c] -- mô tả"
    if (currentTable && (line.startsWith('-') || line.startsWith('*') || /^[a-zA-Z0-9_]+\s*[:(]/.test(line))) {
      const cleaned = line.replace(/^[-*]\s*/, '').trim();
      const [beforeComment, ...commentParts] = cleaned.split(/\s+--\s+/);
      const desc = commentParts.join(' -- ').trim();

      const fkArrow = beforeComment.match(/(?:FK\s*->|REFERENCES)\s*([a-zA-Z0-9_]+)[.(]([a-zA-Z0-9_]+)\)?/i);
      const isPk = /\bPK\b|PRIMARY\s+KEY/i.test(beforeComment);
      const isNotNull = /NOT\s+NULL/i.test(beforeComment);

      const stripped = beforeComment.replace(/\[.*?\]/g, '').trim();

      // Match "col_name (full data type with spaces)"
      const parenColMatch = stripped.match(/^([a-zA-Z0-9_]+)\s*\((.+)\)$/);
      if (parenColMatch) {
        const [, cName, cType] = parenColMatch;
        if (fkArrow) {
          addForeignKeyUnique(currentTable, {
            column: cName,
            targetTable: fkArrow[1].trim(),
            targetColumn: fkArrow[2].trim(),
          });
        }
        addColumnUnique(currentTable, {
          name: cName,
          type: cType.trim(),
          primaryKey: isPk,
          nullable: !isNotNull,
          description: desc,
        });
        continue;
      }

      // Match "col_name: type"
      const colonColMatch = stripped.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
      if (colonColMatch) {
        const [, cName, cType] = colonColMatch;
        if (fkArrow) {
          addForeignKeyUnique(currentTable, {
            column: cName,
            targetTable: fkArrow[1].trim(),
            targetColumn: fkArrow[2].trim(),
          });
        }
        addColumnUnique(currentTable, {
          name: cName,
          type: cType.trim(),
          primaryKey: isPk,
          nullable: !isNotNull,
          description: desc,
        });
      }
    }
  }

  return normalizeTablesList(Array.from(tablesMap.values()));
}

function normalizeSchemaResponse(data) {
  // Trường hợp backend trả thẳng chuỗi {schema}
  if (typeof data === 'string') {
    const parsedTables = parseRawSchemaText(data);
    return {
      databaseName: 'homeservice_prod',
      extractedAt: new Date().toISOString(),
      rawSchema: data,
      tables: parsedTables,
    };
  }

  // Trường hợp backend trả { schema: "..." } hoặc { rawSchema: "..." } mà chưa có tables
  const rawString = data?.rawSchema || data?.schema;
  if (rawString && (!data?.tables || data.tables.length === 0)) {
    const parsedTables = parseRawSchemaText(rawString);
    return {
      databaseName: data.databaseName || 'homeservice_prod',
      extractedAt: data.extractedAt || new Date().toISOString(),
      rawSchema: rawString,
      tables: parsedTables,
    };
  }

  // Trường hợp JSON có cấu trúc
  const tableArray = Array.isArray(data) ? data : (data?.tables || data?.items || []);
  const tables = normalizeTablesList(tableArray);

  return {
    databaseName: data?.databaseName || 'homeservice_prod',
    extractedAt: data?.extractedAt || new Date().toISOString(),
    rawSchema: rawString || buildRawSchemaText(tables),
    tables,
  };
}

function _getMockSchema() {
  const tables = normalizeTablesList(MOCK_TABLES);
  return {
    databaseName: 'homeservice_prod',
    extractedAt: new Date().toISOString(),
    rawSchema: buildRawSchemaText(tables),
    tables,
    isMock: true,
  };
}

export const schemaService = {
  /**
   * Lấy Database Schema thật từ Backend: GET /api/admin/schema
   * @param {Object} [options]
   * @param {boolean} [options.refresh=false] - Yêu cầu backend trích xuất lại schema mới nhất
   * @param {string} [options.dataSource] - Tên data source nếu có nhiều kết nối
   */
  async getDatabaseSchema({ refresh = false, dataSource = '' } = {}) {
    try {
      const params = {};
      if (refresh) params.refresh = true;
      if (dataSource) params.dataSource = dataSource;

      const data = await apiRequest('/api/admin/schema', {
        method: 'GET',
        params,
      });
      return normalizeSchemaResponse(data);
    } catch (error) {
      if (error.isNetworkError && authStorage.isMockEnabled()) {
        console.warn('Backend chưa chạy, đang sử dụng mock schema cho homeservice_prod...');
        return _getMockSchema();
      }
      throw error;
    }
  },
};

