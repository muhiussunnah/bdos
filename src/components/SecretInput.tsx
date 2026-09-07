'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * API-key field with a reveal toggle. Shows the saved key (masked) so the user
 * can peek at it, copy it, edit it, or remove it — without re-pasting.
 */
export function SecretInput({ value, onChange, placeholder, onRemove, saved }: {
  value: string; onChange: (v: string) => void; placeholder?: string; onRemove?: () => void; saved?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className="input !pr-[108px] font-mono text-[13px]" type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        <button type="button" onClick={() => setShow((v) => !v)} title={show ? 'Hide key' : 'Show key'} aria-label={show ? 'Hide key' : 'Show key'}
          className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-surface-2 hover:text-ink">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button type="button" disabled={!value} onClick={() => { navigator.clipboard.writeText(value); toast.success('Key copied'); }} title="Copy key" aria-label="Copy key"
          className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-surface-2 hover:text-ink disabled:opacity-30">
          <Copy size={14} />
        </button>
        {onRemove && (
          <button type="button" disabled={!saved} onClick={onRemove} title="Remove saved key" aria-label="Remove saved key"
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-[var(--red-soft)] hover:text-bad disabled:opacity-30">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
