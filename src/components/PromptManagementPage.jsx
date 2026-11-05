// src/components/PromptManagementPage.jsx
// Giao diện Quản lý Prompt AI động (Admin Prompt Management)
// Hỗ trợ chọn Prompt, soạn thảo với thẻ biến động, Client Guard Validation và Rollback phiên bản

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles, Terminal, History, RotateCcw, Check, CheckCircle2,
  AlertCircle, AlertTriangle, Copy, Plus, Search, Code, FileText,
  Clock, Tag, X, RefreshCw, Save, Shield, HelpCircle, Eye, EyeOff,
  Edit2, Edit3, ArrowLeft, ChevronUp
} from 'lucide-react';
import {
  promptService,
  PROMPT_DEFINITIONS,
  validatePromptPlaceholders
} from '../services/promptService';

export default function PromptManagementPage({ onShowToast }) {
  // Danh sách PromptCode & Prompts đang active
  const [promptCodes, setPromptCodes] = useState(Object.keys(PROMPT_DEFINITIONS));
  const [activePromptsMap, setActivePromptsMap] = useState({});
  const [selectedCode, setSelectedCode] = useState('TEXT_TO_SQL_SYSTEM');
  const [isLoading, setIsLoading] = useState(true);

  // Trạng thái ô soạn thảo (Editor)
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const textareaRef = useRef(null);

  // Trạng thái Lịch sử phiên bản (History & Rollback) - Mặc định đóng (false) để ưu tiên không gian cho Editor
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState(null);
  const [rollbackConfirmModal, setRollbackConfirmModal] = useState(null); // { item }
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [editingHistoryContent, setEditingHistoryContent] = useState({});
  const [isSavingFromHistory, setIsSavingFromHistory] = useState(null);

  // Bộ lọc danh mục prompt
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'SQL Generator' | 'Data Analytics'
  const [searchKeyword, setSearchKeyword] = useState('');

  // Lấy thông tin cấu hình của promptCode hiện tại
  const currentDef = useMemo(() => {
    return PROMPT_DEFINITIONS[selectedCode] || {
      code: selectedCode,
      title: selectedCode,
      description: 'Mẫu prompt AI nghiệp vụ',
      category: 'General',
      requiredPlaceholders: [],
      defaultContent: '',
    };
  }, [selectedCode]);

  // Phiên bản active hiện tại của selectedCode
  const currentActivePrompt = useMemo(() => {
    return activePromptsMap[selectedCode] || null;
  }, [activePromptsMap, selectedCode]);

  // Kiểm tra nội dung editor có thay đổi so với bản active chưa
  const hasUnsavedChanges = useMemo(() => {
    const original = currentActivePrompt?.content || currentDef.defaultContent || '';
    return editorContent !== original;
  }, [editorContent, currentActivePrompt, currentDef]);

  // Thống kê ký tự, từ, dòng
  const editorStats = useMemo(() => {
    const chars = editorContent.length;
    const words = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
    const lines = editorContent.split('\n').length;
    return { chars, words, lines };
  }, [editorContent]);

  // Kiểm tra trạng thái hiện diện của các biến bắt buộc trong editor
  const placeholderStatus = useMemo(() => {
    const req = currentDef.requiredPlaceholders || [];
    return req.map((ph) => ({
      placeholder: ph,
      isPresent: editorContent.includes(ph),
    }));
  }, [currentDef, editorContent]);

  const allPlaceholdersPresent = useMemo(() => {
    return placeholderStatus.every((p) => p.isPresent);
  }, [placeholderStatus]);

  // 1. Tải danh sách PromptCode và các Prompt Active khi khởi tạo
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [codes, activeList] = await Promise.all([
        promptService.getPromptCodes(),
        promptService.getActivePrompts(),
      ]);

      setPromptCodes(codes && codes.length > 0 ? codes : Object.keys(PROMPT_DEFINITIONS));

      const map = {};
      (activeList || []).forEach((p) => {
        if (p.promptCode) {
          map[p.promptCode] = p;
        }
      });
      setActivePromptsMap(map);

      // Nạp nội dung cho prompt đang chọn
      const current = map[selectedCode];
      const initialContent = current?.content || PROMPT_DEFINITIONS[selectedCode]?.defaultContent || '';
      setEditorContent(initialContent);
      setValidationError(null);
    } catch (err) {
      console.error('Lỗi nạp danh sách prompts:', err);
      if (onShowToast) onShowToast('error', err.message || 'Không thể tải danh sách prompt từ máy chủ.', 'Lỗi tải Prompt');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCode, onShowToast]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Tải lịch sử các phiên bản của promptCode đang chọn
  const loadHistory = useCallback(async (code) => {
    if (!code) return;
    setIsLoadingHistory(true);
    try {
      const history = await promptService.getPromptHistory(code);
      setHistoryList(history || []);
    } catch (err) {
      console.warn(`Lỗi nạp lịch sử phiên bản của ${code}:`, err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Khi chuyển đổi promptCode: nạp nội dung tương ứng và tải history
  const handleSelectCode = (code) => {
    if (code === selectedCode) return;

    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa lưu trên prompt này. Bạn có chắc muốn chuyển sang prompt khác không?'
      );
      if (!confirmLeave) return;
    }

    setSelectedCode(code);
    const activeItem = activePromptsMap[code];
    const targetContent = activeItem?.content || PROMPT_DEFINITIONS[code]?.defaultContent || '';
    setEditorContent(targetContent);
    setValidationError(null);
    setPreviewVersionId(null);
    loadHistory(code);
  };

  // Tải history khi selectedCode thay đổi lần đầu
  useEffect(() => {
    loadHistory(selectedCode);
  }, [selectedCode, loadHistory]);

  // 3. Chèn biến động (Placeholder) vào vị trí con trỏ chuột trong Textarea
  const handleInsertPlaceholder = (placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setEditorContent((prev) => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart ?? editorContent.length;
    const end = textarea.selectionEnd ?? editorContent.length;
    const before = editorContent.substring(0, start);
    const after = editorContent.substring(end);

    const newContent = before + placeholder + after;
    setEditorContent(newContent);

    // Xóa lỗi validation nếu biến thiếu vừa được chèn
    setValidationError(null);

    // Di chuyển con trỏ chuột ra ngay sau biến vừa chèn
    setTimeout(() => {
      textarea.focus();
      const newPos = start + placeholder.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Chèn tất cả các biến còn thiếu
  const handleInsertAllMissing = () => {
    const missing = placeholderStatus.filter((p) => !p.isPresent).map((p) => p.placeholder);
    if (missing.length === 0) return;

    const appendText = '\n\n' + missing.join('\n');
    setEditorContent((prev) => prev + appendText);
    setValidationError(null);
    if (onShowToast) {
      onShowToast('info', `Đã chèn tự động các biến: ${missing.join(', ')}`, 'Chèn biến thành công');
    }
  };

  // 4. Lưu phiên bản mới với Client Guard Validation
  const handleSavePrompt = async () => {
    if (!editorContent || !editorContent.trim()) {
      const errMsg = 'Nội dung prompt không được để trống.';
      setValidationError(errMsg);
      if (onShowToast) onShowToast('error', errMsg, 'Lỗi kiểm tra dữ liệu');
      return;
    }

    // Client Guard: Kiểm tra toàn bộ biến bắt buộc
    const validation = validatePromptPlaceholders(selectedCode, editorContent);
    if (!validation.isValid) {
      const missingList = validation.missing.join(', ');
      const errMsg = `Nội dung prompt còn thiếu thẻ biến bắt buộc: ${missingList}. Vui lòng chèn thẻ biến này trước khi lưu.`;
      setValidationError(errMsg);
      if (onShowToast) {
        onShowToast('error', `Thiếu thẻ biến bắt buộc: ${missingList}`, 'Lỗi quy tắc biến');
      }
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      const savedPrompt = await promptService.createPrompt({
        promptCode: selectedCode,
        content: editorContent.trim(),
      });

      // Cập nhật lại active map
      setActivePromptsMap((prev) => ({
        ...prev,
        [selectedCode]: savedPrompt,
      }));

      // Cập nhật lại lịch sử
      await loadHistory(selectedCode);

      if (onShowToast) {
        onShowToast(
          'success',
          `Đã tạo và kích hoạt phiên bản v${savedPrompt.version || 'mới'} cho ${currentDef.title}!`,
          'Lưu Prompt thành công'
        );
      }
    } catch (err) {
      console.error('Lỗi lưu prompt:', err);
      const msg = err.message || 'Không thể tạo phiên bản mới của prompt.';
      setValidationError(msg);
      if (onShowToast) onShowToast('error', msg, 'Lỗi lưu Prompt');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Khôi phục (Rollback) phiên bản cũ
  const handleRollbackConfirm = async () => {
    if (!rollbackConfirmModal) return;
    const target = rollbackConfirmModal;
    setIsRollingBack(true);

    try {
      await promptService.rollbackPrompt(target.id);

      // Cập nhật trạng thái active
      setActivePromptsMap((prev) => ({
        ...prev,
        [selectedCode]: { ...target, isActive: true },
      }));

      // Đồng bộ nội dung vào Editor
      setEditorContent(target.content);
      setValidationError(null);
      setPreviewVersionId(null);

      // Tải lại lịch sử phiên bản
      await loadHistory(selectedCode);

      if (onShowToast) {
        onShowToast(
          'success',
          `Đã khôi phục thành công về phiên bản v${target.version} (${new Date(target.createdAt).toLocaleDateString('vi-VN')})!`,
          'Khôi phục phiên bản'
        );
      }
      setRollbackConfirmModal(null);
    } catch (err) {
      console.error('Lỗi rollback prompt:', err);
      if (onShowToast) {
        onShowToast('error', err.message || 'Không thể khôi phục phiên bản đã chọn.', 'Lỗi khôi phục');
      }
    } finally {
      setIsRollingBack(false);
    }
  };

  // Khôi phục lại bản gốc của phiên bản active đang chọn
  const handleResetToActive = () => {
    const original = currentActivePrompt?.content || currentDef.defaultContent || '';
    setEditorContent(original);
    setValidationError(null);
    if (onShowToast) {
      onShowToast('info', 'Đã đặt lại nội dung về phiên bản đang kích hoạt.', 'Khôi phục gốc');
    }
  };

  // Sao chép nội dung prompt
  const handleCopyContent = (text, label = 'nội dung prompt') => {
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('success', `Đã sao chép ${label} vào clipboard!`, 'Đã sao chép');
  };

  // Nạp nội dung từ một phiên bản lịch sử vào ô Editor chính để chỉnh sửa
  const handleLoadIntoMainEditor = (item, customContent = null) => {
    const contentToLoad = customContent !== null && customContent !== undefined ? customContent : item.content;
    setEditorContent(contentToLoad);
    setValidationError(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (onShowToast) {
      onShowToast(
        'info',
        `Đã nạp nội dung của phiên bản v${item.version} vào ô soạn thảo. Bạn có thể sửa và bấm "Lưu Prompt" để lưu thành phiên bản mới!`,
        'Nạp Prompt thành công'
      );
    }
  };

  // Lưu trực tiếp thành phiên bản mới từ thẻ lịch sử đã chỉnh sửa
  const handleSaveNewVersionFromHistory = async (item, contentToSave) => {
    if (!contentToSave || !contentToSave.trim()) {
      if (onShowToast) onShowToast('error', 'Nội dung prompt không được để trống.', 'Lỗi dữ liệu');
      return;
    }

    // Client Guard Validation kiểm tra biến bắt buộc
    const validation = validatePromptPlaceholders(selectedCode, contentToSave);
    if (!validation.isValid) {
      const missingList = validation.missing.join(', ');
      if (onShowToast) {
        onShowToast(
          'error',
          `Thiếu thẻ biến bắt buộc: ${missingList}. Vui lòng bổ sung vào nội dung trước khi lưu!`,
          'Lỗi quy tắc biến'
        );
      }
      return;
    }

    setIsSavingFromHistory(item.id);
    try {
      const savedPrompt = await promptService.createPrompt({
        promptCode: selectedCode,
        content: contentToSave.trim(),
      });

      // Cập nhật lại active map và editor
      setActivePromptsMap((prev) => ({
        ...prev,
        [selectedCode]: savedPrompt,
      }));
      setEditorContent(savedPrompt.content);

      // Tải lại lịch sử phiên bản
      await loadHistory(selectedCode);
      setPreviewVersionId(null);

      if (onShowToast) {
        onShowToast(
          'success',
          `Đã tạo và kích hoạt phiên bản mới v${savedPrompt.version || ''} (từ bản v${item.version})!`,
          'Tạo phiên bản mới thành công'
        );
      }
    } catch (err) {
      console.error('Lỗi lưu phiên bản mới từ lịch sử:', err);
      if (onShowToast) {
        onShowToast('error', err.message || 'Không thể tạo phiên bản mới.', 'Lỗi lưu prompt');
      }
    } finally {
      setIsSavingFromHistory(null);
    }
  };

  // Lọc danh sách promptCode theo tìm kiếm & danh mục
  const filteredCodes = useMemo(() => {
    return promptCodes.filter((code) => {
      const def = PROMPT_DEFINITIONS[code] || { title: code, category: 'General' };
      const matchesCategory =
        categoryFilter === 'ALL' || def.category === categoryFilter;
      const q = searchKeyword.toLowerCase().trim();
      const matchesSearch =
        !q ||
        code.toLowerCase().includes(q) ||
        (def.title && def.title.toLowerCase().includes(q)) ||
        (def.description && def.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [promptCodes, categoryFilter, searchKeyword]);

  // Hỗ trợ phím tắt Ctrl+S / Cmd+S để lưu nhanh
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSavePrompt();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      {/* ========================================================= */}
      {/* 1. TOP BANNER / HEADER                                    */}
      {/* ========================================================= */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B42F3] to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Terminal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Admin Prompt Management</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-[#5B42F3] flex items-center gap-1 font-mono">
                <Sparkles size={11} /> AI Dynamic Prompts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý các mẫu Prompt hệ thống cho quy trình Text-to-SQL, Fix lỗi truy vấn & Phân tích dữ liệu tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadInitialData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu từ API"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#5B42F3]' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={`px-3.5 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              showHistoryPanel
                ? 'bg-indigo-50 border-indigo-200 text-[#5B42F3]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History size={14} />
            <span>Lịch sử ({historyList.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BODY CONTENT: SIDEBAR + EDITOR + HISTORY PANEL         */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ------------------------------------------------------- */}
        {/* 2A. LEFT SIDEBAR: DANH SÁCH PROMPT CODE                 */}
        {/* ------------------------------------------------------- */}
        <div className="w-72 min-w-[280px] max-w-[288px] bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Search & Category Filter */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm prompt code, mô tả..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5B42F3] focus:ring-1 focus:ring-indigo-100 transition"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'SQL Generator', label: 'Text-to-SQL' },
                { id: 'Data Analytics', label: 'Phân tích' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    categoryFilter === tab.id
                      ? 'bg-indigo-100 text-[#5B42F3]'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Prompt Codes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-[#5B42F3] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải danh mục Prompt...</span>
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Không tìm thấy prompt phù hợp.
              </div>
            ) : (
              filteredCodes.map((code) => {
                const def = PROMPT_DEFINITIONS[code] || {
                  title: code,
                  description: 'Tùy chỉnh Prompt',
                  category: 'General',
                  requiredPlaceholders: [],
                };
                const activePrompt = activePromptsMap[code];
                const isSelected = selectedCode === code;
                const reqCount = def.requiredPlaceholders?.length || 0;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectCode(code)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-50/90 to-violet-50/40 border-[#5B42F3] shadow-md ring-2 ring-indigo-100'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-bold text-xs text-slate-900 leading-tight">
                        {def.title}
                      </div>
                      {/* Active Version Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                          activePrompt?.version
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        v{activePrompt?.version || '1'}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-[#5B42F3] mt-1 truncate">
                      {code}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {def.description}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {def.category}
                      </span>
                      {reqCount > 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 flex items-center gap-1">
                          <Tag size={10} /> {reqCount} biến bắt buộc
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Không biến</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* 2B. MAIN EDITOR: SOẠN THẢO PROMPT VỚI TAGS & VALIDATION */}
        {/* ------------------------------------------------------- */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
          {/* Editor Header Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">{currentDef.title}</span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] font-bold rounded-md">
                  {selectedCode}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active: v{currentActivePrompt?.version || '1'}
                </span>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1 animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Chưa lưu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{currentDef.description}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToActive}
                disabled={!hasUnsavedChanges}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  hasUnsavedChanges
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title="Khôi phục nội dung về phiên bản Active hiện tại"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyContent(editorContent, 'nội dung prompt hiện tại')}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Sao chép nội dung prompt vào clipboard"
              >
                <Copy size={13} />
                <span>Sao chép</span>
              </button>

              <button
                type="button"
                onClick={handleSavePrompt}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[#5B42F3] hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-50"
                title="Lưu phiên bản mới (Ctrl+S / Cmd+S)"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Lưu Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tag Badges: Khu vực gợi ý & chèn biến bắt buộc */}
          <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Tag size={12} className="text-[#5B42F3]" /> Biến động:
              </span>

              {placeholderStatus.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  Prompt này không bắt buộc biến động nào.
                </span>
              ) : (
                placeholderStatus.map(({ placeholder, isPresent }) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => handleInsertPlaceholder(placeholder)}
                    title={
                      isPresent
                        ? `Biến ${placeholder} đã có trong nội dung. Nhấn để chèn thêm vào vị trí con trỏ.`
                        : `Biến bắt buộc! Nhấn để chèn ${placeholder} vào vị trí con trỏ chuột.`
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                      isPresent
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 ring-2 ring-rose-100 animate-pulse'
                    }`}
                  >
                    {isPresent ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <Plus size={13} className="text-rose-600" />
                    )}
                    <span>{placeholder}</span>
                    <span
                      className={`text-[9px] uppercase font-sans font-bold px-1.5 py-0.2 rounded ${
                        isPresent ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/80 text-rose-900'
                      }`}
                    >
                      {isPresent ? 'Đã có' : 'Bắt buộc'}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Quick Helper: Chèn tất cả biến còn thiếu nếu có */}
            {!allPlaceholdersPresent && placeholderStatus.length > 0 && (
              <button
                type="button"
                onClick={handleInsertAllMissing}
                className="text-[11px] font-bold text-[#5B42F3] hover:underline flex items-center gap-1 cursor-pointer ml-auto"
              >
                <Plus size={12} /> Chèn tất cả biến còn thiếu
              </button>
            )}
          </div>

          {/* Validation Alert Banner (Client Guard Feedback) */}
          {validationError && (
            <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-800 animate-fadeIn shrink-0">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold">Lỗi kiểm tra quy tắc biến (Client Guard):</span>
                  <p className="leading-relaxed">{validationError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-600 p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Editor Body with Textarea */}
          <div className="flex-1 p-5 overflow-hidden flex flex-col">
            <div className="flex-1 relative rounded-2xl border border-slate-200 bg-slate-900 flex flex-col shadow-inner overflow-hidden focus-within:border-[#5B42F3] focus-within:ring-2 focus-within:ring-indigo-100 transition">
              {/* Textarea Header bar */}
              <div className="px-4 py-2 bg-slate-800/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <Code size={13} /> {selectedCode}.prompt
                </span>
                <span className="text-slate-400 text-[10px]">
                  Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-700 text-slate-200 rounded">Ctrl+S</kbd> để lưu
                </span>
              </div>

              {/* Textarea Input */}
              <textarea
                ref={textareaRef}
                value={editorContent}
                onChange={(e) => {
                  setEditorContent(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Nhập nội dung mẫu Prompt tại đây..."
                spellCheck={false}
                className="flex-1 w-full p-4 bg-transparent text-slate-100 font-mono text-xs sm:text-[13px] leading-relaxed resize-none focus:outline-none overflow-y-auto selection:bg-[#5B42F3] selection:text-white"
              />

              {/* Textarea Footer Stats */}
              <div className="px-4 py-1.5 bg-slate-800/70 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>Dòng: {editorStats.lines}</span>
                  <span>Từ: {editorStats.words}</span>
                  <span>Ký tự: {editorStats.chars}</span>
                </div>
                <div className="flex items-center gap-2">
                  {allPlaceholdersPresent ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-sans font-semibold">
                      <Check size={12} /> Hợp lệ biến
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 font-sans font-semibold">
                      <AlertTriangle size={12} /> Thiếu biến bắt buộc
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* 2C. RIGHT PANEL: LỊCH SỬ PHIÊN BẢN & ROLLBACK           */}
        {/* ------------------------------------------------------- */}
        {showHistoryPanel && (
          <div className="w-[340px] min-w-[340px] max-w-[340px] bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 overflow-hidden animate-fadeIn">
            {/* Header Lịch sử */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#5B42F3]" />
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Lịch sử ({historyList.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryPanel(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Đóng bảng lịch sử"
              >
                <X size={15} />
              </button>
            </div>

            {/* Danh sách các phiên bản */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {isLoadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                  <div className="w-5 h-5 border-2 border-[#5B42F3] border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải lịch sử phiên bản...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa có lịch sử phiên bản nào cho prompt này.
                </div>
              ) : (
                historyList.map((item, idx) => {
                  const isActive = Boolean(item.isActive);
                  const isPreviewing = previewVersionId === item.id;
                  const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'Gần đây';

                  return (
                    <div
                      key={item.id || idx}
                      className={`group/card p-3 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-white border-emerald-300 shadow-sm ring-2 ring-emerald-100'
                          : isPreviewing
                          ? 'bg-white border-indigo-300 shadow-sm ring-2 ring-indigo-100'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      {/* Version & Badge Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-xs text-slate-900">
                            v{item.version || (historyList.length - idx)}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          )}
                        </div>

                        {/* Hover Actions: Nút Copy & Sửa nhanh trên header */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContent(editingHistoryContent[item.id] ?? item.content, `prompt v${item.version}`);
                            }}
                            className="opacity-0 group-hover/card:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title={`Sao chép nội dung prompt v${item.version}`}
                          >
                            <Copy size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadIntoMainEditor(item, editingHistoryContent[item.id]);
                            }}
                            className="opacity-0 group-hover/card:opacity-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#5B42F3] hover:bg-indigo-50 border border-indigo-200 rounded-md transition cursor-pointer flex items-center gap-0.5"
                            title={`Nạp prompt v${item.version} sang Editor chính để sửa`}
                          >
                            <Edit2 size={10} />
                            <span>Sửa</span>
                          </button>

                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 ml-1">
                            <Clock size={11} /> {dateStr}
                          </span>
                        </div>
                      </div>

                      {/* Content Preview Snippet (khi chưa mở rộng) */}
                      {!isPreviewing && (
                        <div
                          className="mt-2 text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed whitespace-pre-wrap break-words break-all overflow-hidden cursor-pointer hover:bg-slate-100/70 transition"
                          onClick={() => setPreviewVersionId(item.id)}
                          title="Nhấn để mở rộng & chỉnh sửa phiên bản này"
                        >
                          {editingHistoryContent[item.id] ?? item.content}
                        </div>
                      )}

                      {/* Khi mở rộng: Khung soạn thảo cho phép sửa trực tiếp và lưu thành phiên bản mới */}
                      {isPreviewing && (
                        <div className="mt-2.5 space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                            <span className="flex items-center gap-1 text-[#5B42F3] font-mono">
                              <Edit3 size={11} /> Chỉnh sửa v{item.version}:
                            </span>
                            <span className="text-slate-400 font-mono">
                              {(editingHistoryContent[item.id] ?? item.content).length} ký tự
                            </span>
                          </div>

                          <textarea
                            value={editingHistoryContent[item.id] ?? item.content}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingHistoryContent((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            rows={8}
                            spellCheck={false}
                            placeholder="Chỉnh sửa nội dung prompt..."
                            className="w-full p-2.5 bg-slate-900 text-indigo-100 font-mono text-[11px] leading-relaxed rounded-xl border border-slate-800 focus:outline-none focus:border-[#5B42F3] focus:ring-1 focus:ring-indigo-300 resize-y selection:bg-[#5B42F3] selection:text-white"
                          />

                          {/* Action bar trong chế độ mở rộng */}
                          <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyContent(editingHistoryContent[item.id] ?? item.content, `prompt v${item.version}`)}
                                className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                title="Sao chép nội dung prompt"
                              >
                                <Copy size={11} /> Copy
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLoadIntoMainEditor(item, editingHistoryContent[item.id])}
                                className="px-2 py-1 bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                title="Chuyển sang ô soạn thảo lớn bên trái"
                              >
                                <ArrowLeft size={11} className="text-[#5B42F3]" /> Editor chính
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveNewVersionFromHistory(item, editingHistoryContent[item.id] ?? item.content)}
                              disabled={isSavingFromHistory === item.id}
                              className="px-2.5 py-1 bg-[#5B42F3] hover:bg-indigo-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50 ml-auto"
                              title="Lưu nội dung chỉnh sửa này thành phiên bản mới nhất"
                            >
                              {isSavingFromHistory === item.id ? (
                                <>
                                  <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Đang lưu...</span>
                                </>
                              ) : (
                                <>
                                  <Save size={11} />
                                  <span>Lưu bản mới</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer của card: Toggle Expand & Rollback */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewVersionId(isPreviewing ? null : item.id)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-[#5B42F3] flex items-center gap-1 cursor-pointer"
                        >
                          {isPreviewing ? (
                            <>
                              <ChevronUp size={12} />
                              <span>Thu gọn</span>
                            </>
                          ) : (
                            <>
                              <Edit3 size={12} />
                              <span>Expand & Sửa</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Nút Rollback: chỉ kích hoạt khi phiên bản này không phải active */}
                          {isActive ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Đang dùng
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRollbackConfirmModal(item)}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-[#5B42F3] border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="Khôi phục lại phiên bản này thành active"
                            >
                              <RotateCcw size={11} />
                              <span>Rollback</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer lịch sử */}
            <div className="p-3 bg-white border-t border-slate-200 text-[10px] text-slate-400 text-center">
              Khôi phục (Rollback) sẽ kích hoạt lại phiên bản cũ mà không làm mất lịch sử các phiên bản khác.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL CONFIRM ROLLBACK                                 */}
      {/* ========================================================= */}
      {rollbackConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-[#5B42F3] flex items-center justify-center shadow-inner">
              <RotateCcw size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận khôi phục phiên bản v{rollbackConfirmModal.version}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Phiên bản này sẽ được kích hoạt lại làm Prompt chính cho danh mục{' '}
                <span className="font-mono font-bold text-indigo-600">{selectedCode}</span>. Nội dung ô soạn thảo
                sẽ được tự động cập nhật về phiên bản này.
              </p>
            </div>

            {/* Xem trước nội dung bản sẽ khôi phục */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-36 overflow-y-auto text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
              {rollbackConfirmModal.content}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRollbackConfirmModal(null)}
                disabled={isRollingBack}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRollbackConfirm}
                disabled={isRollingBack}
                className="px-4 py-2 bg-[#5B42F3] hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {isRollingBack ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang khôi phục...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Xác nhận Rollback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

