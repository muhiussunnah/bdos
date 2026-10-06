'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '@/components/ui';
import { ConfirmDialog } from '@/components/listing';

/* ────────────────────────────────────────────────────────────────────────────
 * In-app replacements for window.confirm / window.prompt.
 *   const { confirm, prompt } = useDialogs();
 *   if (!(await confirm({ title: 'Delete this lead?', body: '…', confirmLabel: 'Delete' }))) return;
 *   const v = await prompt({ title: 'Link URL', fields: [{ key: 'url', label: 'URL', value: 'https://' }] });
 * Dialogs render in a portal above every other modal.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ConfirmOptions { title: string; body?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
export interface PromptField { key: string; label: string; value?: string; placeholder?: string; type?: 'text' | 'url' | 'number'; min?: number; max?: number }
export interface PromptOptions { title: string; hint?: string; fields: PromptField[]; confirmLabel?: string }

interface Dialogs {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  prompt: (o: PromptOptions) => Promise<Record<string, string> | null>;
}

const Ctx = createContext<Dialogs | null>(null);

/** Outside the provider (e.g. marketing pages) this degrades to the browser dialogs instead of crashing. */
const FALLBACK: Dialogs = {
  confirm: async (o) => typeof window !== 'undefined' && window.confirm(o.title),
  prompt: async (o) => {
    if (typeof window === 'undefined') return null;
    const out: Record<string, string> = {};
    for (const f of o.fields) { const v = window.prompt(f.label, f.value ?? ''); if (v === null) return null; out[f.key] = v; }
    return out;
  },
};

export function useDialogs(): Dialogs {
  return useContext(Ctx) || FALLBACK;
}

type ConfirmState = ConfirmOptions & { resolve: (v: boolean) => void };
type PromptState = PromptOptions & { resolve: (v: Record<string, string> | null) => void };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [c, setC] = useState<ConfirmState | null>(null);
  const [p, setP] = useState<PromptState | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => setMounted(true), []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setC({ ...o, resolve })), []);
  const prompt = useCallback((o: PromptOptions) => new Promise<Record<string, string> | null>((resolve) => {
    setValues(Object.fromEntries(o.fields.map((f) => [f.key, f.value ?? ''])));
    setP({ ...o, resolve });
  }), []);

  useEffect(() => { if (p) setTimeout(() => { firstInput.current?.focus(); firstInput.current?.select(); }, 40); }, [p]);

  const closeConfirm = (v: boolean) => { c?.resolve(v); setC(null); };
  const closePrompt = (ok: boolean) => { p?.resolve(ok ? values : null); setP(null); };

  const dialogs = (
    <div className="relative z-[300]">
      <ConfirmDialog open={!!c} title={c?.title || ''} body={c?.body} confirmLabel={c?.confirmLabel || 'Confirm'} danger={c?.danger ?? true}
        onCancel={() => closeConfirm(false)} onConfirm={() => closeConfirm(true)} />
      {p && (
        <Modal open onClose={() => closePrompt(false)} title={p.title}>
          <form onSubmit={(e) => { e.preventDefault(); closePrompt(true); }}>
            {p.hint && <p className="mb-3 text-[12.5px] text-dim">{p.hint}</p>}
            <div className={`grid gap-3 ${p.fields.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {p.fields.map((f, i) => (
                <div key={f.key} className="field !mb-0">
                  <label>{f.label}</label>
                  <input ref={i === 0 ? firstInput : undefined} className="input" type={f.type || 'text'} min={f.min} max={f.max} placeholder={f.placeholder}
                    value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => closePrompt(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-accent">{p.confirmLabel || 'OK'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {mounted && createPortal(dialogs, document.body)}
    </Ctx.Provider>
  );
}
