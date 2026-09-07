'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Undo2, Redo2, Heading2, Heading3, Heading4, Pilcrow, Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Quote, Code2, Minus, Table2, Link2, Image as ImageIcon,
  Upload, Code, Eraser, AArrowUp, AArrowDown, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RichEditorHandle {
  insertText: (text: string) => void;
  insertHtml: (html: string) => void;
  focus: () => void;
}

/** Turn editor HTML into readable plain text (for the text/plain email part and list previews). */
export function htmlToPlain(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const el = document.createElement('div');
  el.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, '$&\n');
  return (el.innerText || el.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Plain text (e.g. an AI draft) → simple HTML paragraphs. */
export function plainToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.trim().split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

export function isHtmlEmpty(html: string): boolean {
  return !html || htmlToPlain(html).trim() === '' && !/<img/i.test(html);
}

const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'A', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'IMG', 'SPAN', 'DIV', 'FONT', 'SUP', 'SUB']);
const ALLOWED_ATTR = new Set(['href', 'src', 'alt', 'colspan', 'rowspan', 'style', 'size', 'target']);

/** Strip pasted markup down to email-safe tags. */
function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,meta,link,title,iframe,object,embed,form,input,button').forEach((n) => n.remove());
  const walk = (node: Element) => {
    [...node.children].forEach((child) => {
      walk(child);
      if (!ALLOWED.has(child.tagName)) { child.replaceWith(...Array.from(child.childNodes)); return; }
      [...child.attributes].forEach((a) => {
        if (!ALLOWED_ATTR.has(a.name)) child.removeAttribute(a.name);
        else if (a.name === 'style') {
          const keep = a.value.split(';').map((s) => s.trim()).filter((s) => /^(font-size|font-weight|font-style|text-decoration|text-align|color|background-color)\s*:/i.test(s) && !/windowtext/i.test(s));
          if (keep.length) child.setAttribute('style', keep.join(';')); else child.removeAttribute('style');
        } else if ((a.name === 'href' || a.name === 'src') && /^\s*javascript:/i.test(a.value)) child.removeAttribute(a.name);
      });
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

const SIZES = ['x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'xxx-large'];

export const RichEditor = forwardRef<RichEditorHandle, {
  value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number; className?: string;
}>(function RichEditor({ value, onChange, placeholder = 'Write your message…', minHeight = 240, className }, ref) {
  const ed = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [htmlMode, setHtmlMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, force] = useState(0);
  const savedRange = useRef<Range | null>(null);

  // keep DOM in sync when the value changes from outside (AI draft, reset)
  useEffect(() => {
    const el = ed.current;
    if (el && !htmlMode && el.innerHTML !== value) el.innerHTML = value || '';
  }, [value, htmlMode]);

  const emit = useCallback(() => { if (ed.current) onChange(ed.current.innerHTML); }, [onChange]);

  const saveSelection = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ed.current?.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const el = ed.current; if (!el) return;
    el.focus();
    const s = window.getSelection();
    if (savedRange.current && s) { s.removeAllRanges(); s.addRange(savedRange.current); }
  };

  const exec = useCallback((cmd: string, arg?: string) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, arg);
    emit(); force((n) => n + 1);
  }, [emit]); // eslint-disable-line react-hooks/exhaustive-deps

  const insertHtml = useCallback((html: string) => { exec('insertHTML', html); }, [exec]);

  useImperativeHandle(ref, () => ({
    insertText: (t) => exec('insertText', t),
    insertHtml,
    focus: () => ed.current?.focus(),
  }), [exec, insertHtml]);

  function fontStep(delta: number) {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    const cur = parseInt(document.queryCommandValue('fontSize') || '3', 10) || 3;
    const next = Math.min(7, Math.max(1, cur + delta));
    document.execCommand('fontSize', false, String(next));
    // Chrome writes <font size>; normalise to inline font-size so email clients respect it
    ed.current?.querySelectorAll('font[size]').forEach((f) => {
      const span = document.createElement('span');
      span.style.fontSize = SIZES[Number(f.getAttribute('size')) - 1] || 'medium';
      span.innerHTML = f.innerHTML; f.replaceWith(span);
    });
    emit(); force((n) => n + 1);
  }

  function link() {
    saveSelection();
    const sel = window.getSelection()?.toString();
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    restoreSelection();
    if (sel) exec('createLink', url);
    else insertHtml(`<a href="${url.replace(/"/g, '&quot;')}" target="_blank">${url}</a>`);
  }

  function imageByUrl() {
    saveSelection();
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    insertHtml(`<img src="${url.replace(/"/g, '&quot;')}" alt="" style="max-width:100%;height:auto">`);
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/uploads/image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      insertHtml(`<img src="${data.url}" alt="${file.name.replace(/"/g, '')}" style="max-width:100%;height:auto">`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploading(false); }
  }

  function table() {
    const rows = Number(window.prompt('Rows', '2') || 0), cols = Number(window.prompt('Columns', '2') || 0);
    if (!rows || !cols) return;
    const cell = '<td style="border:1px solid #d9d6e0;padding:6px 10px">&nbsp;</td>';
    insertHtml(`<table style="border-collapse:collapse;width:100%"><tbody>${Array.from({ length: rows }, () => `<tr>${cell.repeat(cols)}</tr>`).join('')}</tbody></table><p><br></p>`);
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (!html && !text) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, html ? sanitize(html) : plainToHtml(text));
    emit();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) { e.preventDefault(); ed.current?.focus(); upload(f); }
  }

  const inEditor = () => typeof document !== 'undefined' && !!ed.current && ed.current.contains(document.activeElement);
  const active = (cmd: string) => { try { return inEditor() && document.queryCommandState(cmd); } catch { return false; } };
  const block = () => { try { return inEditor() ? String(document.queryCommandValue('formatBlock')).toLowerCase() : ''; } catch { return ''; } };

  const Btn = ({ title, onClick, on, children, disabled }: { title: string; onClick: () => void; on?: boolean; children: React.ReactNode; disabled?: boolean }) => (
    <button type="button" title={title} aria-label={title} disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} onClick={onClick}
      className={cn('grid h-8 w-8 place-items-center rounded-lg text-dim transition hover:bg-surface-2 hover:text-ink disabled:opacity-40', on && 'bg-[var(--accent-soft)] text-accent')}>
      {children}
    </button>
  );
  const Sep = () => <span className="mx-0.5 h-5 w-px bg-line" />;

  return (
    <div className={cn('rte overflow-hidden rounded-[13px] border border-line bg-surface focus-within:border-accent', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-2 py-1.5" onMouseUp={saveSelection} onKeyUp={saveSelection}>
        <Btn title="Undo" onClick={() => exec('undo')}><Undo2 size={15} /></Btn>
        <Btn title="Redo" onClick={() => exec('redo')}><Redo2 size={15} /></Btn>
        <Sep />
        <Btn title="Heading 2" on={block() === 'h2'} onClick={() => exec('formatBlock', 'H2')}><Heading2 size={15} /></Btn>
        <Btn title="Heading 3" on={block() === 'h3'} onClick={() => exec('formatBlock', 'H3')}><Heading3 size={15} /></Btn>
        <Btn title="Heading 4" on={block() === 'h4'} onClick={() => exec('formatBlock', 'H4')}><Heading4 size={15} /></Btn>
        <Btn title="Paragraph" on={block() === 'p'} onClick={() => exec('formatBlock', 'P')}><Pilcrow size={15} /></Btn>
        <Sep />
        <Btn title="Smaller text" onClick={() => fontStep(-1)}><AArrowDown size={15} /></Btn>
        <Btn title="Larger text" onClick={() => fontStep(1)}><AArrowUp size={15} /></Btn>
        <Sep />
        <Btn title="Bold (Ctrl+B)" on={active('bold')} onClick={() => exec('bold')}><Bold size={15} /></Btn>
        <Btn title="Italic (Ctrl+I)" on={active('italic')} onClick={() => exec('italic')}><Italic size={15} /></Btn>
        <Btn title="Underline (Ctrl+U)" on={active('underline')} onClick={() => exec('underline')}><Underline size={15} /></Btn>
        <Btn title="Strikethrough" on={active('strikeThrough')} onClick={() => exec('strikeThrough')}><Strikethrough size={15} /></Btn>
        <Btn title="Clear formatting" onClick={() => { exec('removeFormat'); exec('formatBlock', 'P'); }}><Eraser size={15} /></Btn>
        <Sep />
        <Btn title="Bullet list" on={active('insertUnorderedList')} onClick={() => exec('insertUnorderedList')}><List size={15} /></Btn>
        <Btn title="Numbered list" on={active('insertOrderedList')} onClick={() => exec('insertOrderedList')}><ListOrdered size={15} /></Btn>
        <Sep />
        <Btn title="Align left" on={active('justifyLeft')} onClick={() => exec('justifyLeft')}><AlignLeft size={15} /></Btn>
        <Btn title="Align center" on={active('justifyCenter')} onClick={() => exec('justifyCenter')}><AlignCenter size={15} /></Btn>
        <Btn title="Align right" on={active('justifyRight')} onClick={() => exec('justifyRight')}><AlignRight size={15} /></Btn>
        <Sep />
        <Btn title="Quote" on={block() === 'blockquote'} onClick={() => exec('formatBlock', 'BLOCKQUOTE')}><Quote size={15} /></Btn>
        <Btn title="Code block" on={block() === 'pre'} onClick={() => exec('formatBlock', 'PRE')}><Code2 size={15} /></Btn>
        <Btn title="Divider" onClick={() => exec('insertHorizontalRule')}><Minus size={15} /></Btn>
        <Btn title="Table" onClick={table}><Table2 size={15} /></Btn>
        <Sep />
        <Btn title="Link" onClick={link}><Link2 size={15} /></Btn>
        <Btn title="Image from URL" onClick={imageByUrl}><ImageIcon size={15} /></Btn>
        <Btn title="Upload image" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}</Btn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        <div className="ml-auto">
          <button type="button" onClick={() => { if (htmlMode && ed.current) ed.current.innerHTML = value; setHtmlMode((v) => !v); }}
            className={cn('flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-dim transition hover:bg-surface-2 hover:text-ink', htmlMode && 'bg-[var(--accent-soft)] text-accent')}>
            <Code size={14} /> HTML
          </button>
        </div>
      </div>

      {htmlMode ? (
        <textarea className="block w-full resize-y bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none" style={{ minHeight }}
          value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      ) : (
        <div ref={ed} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder}
          className="rte-body max-w-none px-4 py-3 text-[14px] leading-relaxed text-ink outline-none" style={{ minHeight }}
          onInput={emit} onBlur={emit} onKeyUp={() => { saveSelection(); force((n) => n + 1); }} onMouseUp={() => { saveSelection(); force((n) => n + 1); }}
          onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }} />
      )}
    </div>
  );
});
