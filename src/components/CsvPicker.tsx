'use client';

import { useRef, useState } from 'react';
import { Upload, ClipboardPaste, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV } from '@/lib/csv';

/**
 * Drag-and-drop / click-to-upload CSV picker with a paste fallback.
 * Emits the parsed rows (2D string array) and the source file name.
 */
export function CsvPicker({ onParsed, onClear, fileName }: {
  onParsed: (rows: string[][], name: string) => void;
  onClear?: () => void;
  fileName?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast.error('File is too large (max 10MB)');
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) return toast.error('The file looks empty');
    onParsed(rows, file.name);
  }

  function usePasted() {
    const rows = parseCSV(pasted);
    if (!rows.length) return toast.error('Nothing to parse');
    onParsed(rows, 'Pasted list');
    setPasteOpen(false); setPasted('');
  }

  if (fileName) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><FileSpreadsheet size={17} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-ink">{fileName}</div>
          <div className="text-[11.5px] text-faint">Parsed and ready</div>
        </div>
        {onClear && <button onClick={onClear} className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-line"><X size={16} /></button>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-accent bg-[var(--accent-soft)]' : 'border-line bg-surface-2 hover:border-line-2'}`}>
        <Upload size={26} className="mb-2 text-accent" />
        <div className="text-[13.5px] font-bold text-ink">Drop a CSV here or click to upload</div>
        <div className="mt-1 text-[12px] text-dim">.csv, .tsv or .txt · exported from Excel, Google Sheets, Apollo, LinkedIn, anything</div>
        <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </div>
      {pasteOpen ? (
        <div className="space-y-2">
          <textarea className="input min-h-[140px] font-mono text-[12px]" value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder={'company,name,email\nAcme AB,Anna Svensson,anna@acme.se'} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setPasteOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={usePasted} className="btn btn-primary btn-sm">Use pasted list</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setPasteOpen(true)} className="btn btn-ghost btn-sm"><ClipboardPaste size={14} /> Paste from a spreadsheet instead</button>
      )}
    </div>
  );
}
