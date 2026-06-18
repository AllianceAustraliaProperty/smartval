'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Eraser,
} from 'lucide-react';

export interface RichTextEditorHandle {
  insertHtml: (html: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, className = '' }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showSource, setShowSource] = useState(false);

    useEffect(() => {
      if (showSource) return;
      const el = editorRef.current;
      if (el && value !== el.innerHTML) {
        el.innerHTML = value || '';
      }
    }, [value, showSource]);

    const emitChange = () => {
      const el = editorRef.current;
      if (el) onChange(el.innerHTML);
    };

    const exec = (command: string, arg?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, arg);
      emitChange();
    };

    const insertIntoTextarea = (insertText: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      const next = ta.value.slice(0, start) + insertText + ta.value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        const caret = start + insertText.length;
        ta.setSelectionRange(caret, caret);
      });
    };

    useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        if (showSource) {
          insertIntoTextarea(html);
        } else {
          editorRef.current?.focus();
          document.execCommand('insertHTML', false, html);
          emitChange();
        }
      },
      insertText: (text: string) => {
        if (showSource) {
          insertIntoTextarea(text);
        } else {
          editorRef.current?.focus();
          document.execCommand('insertText', false, text);
          emitChange();
        }
      },
      focus: () => editorRef.current?.focus(),
    }));

    const handleLink = () => {
      const url = window.prompt('Enter the link URL (include https://):', 'https://');
      if (url) exec('createLink', url);
    };

    const handleImage = () => {
      const url = window.prompt('Enter the image URL (e.g. a hosted logo or signature):', 'https://');
      if (url) {
        const html = `<img src="${url}" alt="" style="max-width: 100%; height: auto;" />`;
        if (showSource) {
          insertIntoTextarea(html);
        } else {
          editorRef.current?.focus();
          document.execCommand('insertHTML', false, html);
          emitChange();
        }
      }
    };

    const ToolbarButton = ({
      onClick,
      title,
      children,
    }: {
      onClick: () => void;
      title: string;
      children: React.ReactNode;
    }) => (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        {children}
      </button>
    );

    const Divider = () => <span className="w-px h-6 bg-gray-200 mx-1" />;

    return (
      <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${className}`}>
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-gray-200 bg-gray-50">
          <ToolbarButton onClick={() => exec('bold')} title="Bold">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('italic')} title="Italic">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('underline')} title="Underline">
            <Underline className="w-4 h-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton onClick={() => exec('formatBlock', 'H1')} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('formatBlock', 'H2')} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet list">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered list">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton onClick={() => exec('justifyLeft')} title="Align left">
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('justifyCenter')} title="Align center">
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('justifyRight')} title="Align right">
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton onClick={handleLink} title="Insert link">
            <Link2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleImage} title="Insert image (logo / signature)">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('removeFormat')} title="Clear formatting">
            <Eraser className="w-4 h-4" />
          </ToolbarButton>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setShowSource((s) => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showSource ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle HTML source"
            >
              <Code className="w-4 h-4" />
              HTML
            </button>
          </div>
        </div>

        {showSource ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[320px] p-4 font-mono text-sm text-gray-800 outline-none resize-y"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={emitChange}
            onBlur={emitChange}
            className="min-h-[320px] p-4 outline-none text-sm text-gray-800 leading-relaxed
              [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2
              [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2
              [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
              [&_a]:text-blue-600 [&_a]:underline
              [&_img]:max-w-full [&_img]:inline-block
              [&_table]:border-collapse [&_p]:my-1"
          />
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
