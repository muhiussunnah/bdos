'use client';

import { useRef } from 'react';
import { Paperclip, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

export const MAX_ATTACHMENT_MB = 15;

function fmtSize(n: number) {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** Gmail-style attachment chips + picker. Enforces the total size cap client-side. */
export function AttachmentPicker({ files, onChange, compact }: {
  files: File[]; onChange: (files: File[]) => void; compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const total = files.reduce((s, f) => s + f.size, 0);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      next.push(f);
    }
    const sum = next.reduce((s, f) => s + f.size, 0);
    if (sum > MAX_ATTACHMENT_MB * 1048576) return toast.error(`Attachments must stay under ${MAX_ATTACHMENT_MB}MB in total`);
    onChange(next);
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f) => (
            <span key={`${f.name}-${f.size}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[12px] font-semibold text-ink">
              <FileText size={13} className="text-accent" />
              <span className="truncate">{f.name}</span>
              <span className="text-faint">{fmtSize(f.size)}</span>
              <button onClick={() => onChange(files.filter((x) => x !== f))} className="ml-0.5 grid h-4 w-4 place-items-center rounded text-dim hover:bg-line"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => ref.current?.click()} className={`btn btn-ghost ${compact ? 'btn-sm' : ''}`}>
          <Paperclip size={14} /> Attach files
        </button>
        {files.length > 0 && <span className="text-[11.5px] text-faint">{files.length} file{files.length > 1 ? 's' : ''} · {fmtSize(total)} / {MAX_ATTACHMENT_MB} MB</span>}
        <input ref={ref} type="file" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
    </div>
  );
}
