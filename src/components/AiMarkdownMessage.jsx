// src/components/AiMarkdownMessage.jsx
// Hiển thị nội dung phản hồi của AI dưới định dạng Markdown chuẩn đẹp

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

export default function AiMarkdownMessage({ content }) {
  if (!content) return null;

  return (
    <div className="ai-markdown-content text-xs text-slate-700 leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Đoạn văn
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-800">{children}</p>,

          // Tiêu đề
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-slate-900 mt-3 mb-1.5 pb-1 border-b border-slate-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-1 text-[#5B42F3]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1 text-slate-800">
              {children}
            </h3>
          ),

          // In đậm, in nghiêng
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,

          // Danh sách
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2 text-slate-700">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2 text-slate-700">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,

          // Trích dẫn (Blockquote)
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-[#5B42F3] pl-3 py-1 my-2 bg-indigo-50/60 rounded-r-lg text-slate-700 italic text-[11px]">
              {children}
            </blockquote>
          ),

          // Đường kẻ ngang
          hr: () => <hr className="my-2.5 border-slate-200" />,

          // Liên kết
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5B42F3] font-semibold hover:underline"
            >
              {children}
            </a>
          ),

          // Bảng Markdown (GFM Table)
          table: ({ children }) => (
            <div className="overflow-x-auto my-2.5 rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-left border-collapse text-[11px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-slate-50/70 transition">{children}</tr>,
          th: ({ children }) => <th className="py-2 px-3 uppercase tracking-wider text-[10px] font-bold">{children}</th>,
          td: ({ children }) => <td className="py-2 px-3 text-slate-700">{children}</td>,

          // Xử lý khối code hoặc inline code
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            // Nếu là code block nhiều dòng
            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={language} code={codeString} />;
            }

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-slate-200/80 text-indigo-700 font-mono text-[11px] font-semibold"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Khung hiển thị Code Block kèm nút Sao chép
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-800 bg-[#0D111D] shadow-md group">
      {/* Header code bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161B2E] border-b border-slate-800 text-[10px] text-slate-400 font-mono">
        <span className="uppercase font-semibold text-indigo-300">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700/60 transition"
          title="Sao chép mã"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Đã chép</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3 text-[11px] font-mono text-indigo-100 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
