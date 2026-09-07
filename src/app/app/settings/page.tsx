'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, ExternalLink, KeyRound, Mail, SlidersHorizontal, CircleCheck, Star, Trash2, Plus } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Thinking } from '@/components/ui';
import { SecretInput } from '@/components/SecretInput';
import { PROVIDERS, LANGS, type ProviderKey } from '@/lib/constants';
import { sendersFrom } from '@/lib/email/resend';
import type { Sender } from '@/lib/types';

type Secrets = Record<string, { has: boolean; hint: string; key: string; meta: Record<string, unknown> }>;

export default function SettingsPage() {
  const { user, supabase, settings, refreshSettings } = useApp();
  const [tab, setTab] = useState<'ai' | 'email' | 'workspace'>('ai');
  const [secrets, setSecrets] = useState<Secrets>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('user_secrets').select('provider, api_key, meta').eq('owner_id', user.id);
    const map: Secrets = {};
    (data || []).forEach((r: { provider: string; api_key: string | null; meta: Record<string, unknown> }) => {
      map[r.provider] = { has: !!r.api_key, hint: r.api_key ? `••••${r.api_key.slice(-4)}` : '', key: r.api_key || '', meta: r.meta || {} };
    });
    setSecrets(map);
    setLoading(false);
  }, [supabase, user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Thinking label="Loading settings…" />;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[3px]">
        {([['ai', 'AI Providers', KeyRound], ['email', 'Email', Mail], ['workspace', 'Workspace', SlidersHorizontal]] as const).map(([k, label, Ico]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition ${tab === k ? 'bg-ink text-bg' : 'text-dim'}`}>
            <Ico size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'ai' && <AITab secrets={secrets} reload={load} />}
      {tab === 'email' && <EmailTab secrets={secrets} reload={load} settings={settings} refreshSettings={refreshSettings} />}
      {tab === 'workspace' && <WorkspaceTab settings={settings} refreshSettings={refreshSettings} />}
    </div>
  );
}

function AITab({ secrets, reload }: { secrets: Secrets; reload: () => void }) {
  const { user, supabase, settings, refreshSettings } = useApp();
  const [defProvider, setDefProvider] = useState<ProviderKey>((settings?.default_provider as ProviderKey) || 'openai');
  const [defModel, setDefModel] = useState(settings?.default_model || 'gpt-4o-mini');

  async function saveDefaults(provider: ProviderKey, model: string) {
    setDefProvider(provider); setDefModel(model);
    await supabase.from('user_settings').update({ default_provider: provider, default_model: model }).eq('owner_id', user.id);
    refreshSettings();
    toast.success('Default model updated');
  }

  const modelsFor = PROVIDERS.find((p) => p.key === defProvider)?.models || [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="card-h"><h3>Default engine</h3><span className="text-[12px] text-dim">Used across discovery, outreach, inbox &amp; reports</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field !mb-0"><label>Provider</label>
            <select className="input" value={defProvider} onChange={(e) => saveDefaults(e.target.value as ProviderKey, PROVIDERS.find((p) => p.key === e.target.value)!.models[0])}>
              {PROVIDERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select></div>
          <div className="field !mb-0"><label>Model</label>
            <select className="input" value={defModel} onChange={(e) => saveDefaults(defProvider, e.target.value)}>
              {modelsFor.map((m) => <option key={m} value={m}>{m}</option>)}
              {defProvider === 'openrouter' && <option value={defModel}>{defModel} (custom)</option>}
            </select></div>
        </div>
        {defProvider === 'openrouter' && (
          <input className="input mt-2" placeholder="Or type any OpenRouter model id…" defaultValue={defModel}
            onBlur={(e) => e.target.value && saveDefaults(defProvider, e.target.value)} />
        )}
      </Card>

      {PROVIDERS.map((p) => <ProviderCard key={p.key} provider={p} state={secrets[p.key]} reload={reload} />)}
    </div>
  );
}

function ProviderCard({ provider, state, reload }: { provider: (typeof PROVIDERS)[number]; state?: Secrets[string]; reload: () => void }) {
  const { user, supabase } = useApp();
  const saved = state?.key || '';
  const [key, setKey] = useState(saved);
  const [model, setModel] = useState(provider.models[0]);
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null);
  useEffect(() => { setKey(saved); }, [saved]);
  const dirty = key.trim() !== saved;

  async function save() {
    if (!key.trim()) return toast.error('Paste a key first');
    setBusy('save');
    const { error } = await supabase.from('user_secrets').upsert({ owner_id: user.id, provider: provider.key, api_key: key.trim(), updated_at: new Date().toISOString() });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${provider.label} key saved`); reload();
  }

  async function remove() {
    if (!window.confirm(`Remove the saved ${provider.label} key?`)) return;
    setBusy('remove');
    const { error } = await supabase.from('user_secrets').delete().eq('owner_id', user.id).eq('provider', provider.key);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${provider.label} key removed`); setKey(''); reload();
  }

  async function test() {
    const useKey = key.trim();
    if (!useKey) return toast.error('Save or paste a key first');
    setBusy('test');
    try {
      const res = await fetch('/api/ai/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: provider.key, model, apiKey: useKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${provider.label} works ✓`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Test failed'); }
    finally { setBusy(null); }
  }

  return (
    <Card>
      <div className="card-h">
        <h3 className="flex items-center gap-2">{provider.label}
          {state?.has && <span className="tag" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><CircleCheck size={12} /> connected</span>}</h3>
        <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline">Get key <ExternalLink size={12} /></a>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="field !mb-0 flex-1 min-w-[240px]"><label>API key {state?.has && <span className="text-faint">· saved {state.hint}</span>}{dirty && <span className="text-accent"> · unsaved change</span>}</label>
          <SecretInput value={key} onChange={setKey} placeholder={provider.placeholder} saved={state?.has} onRemove={remove} /></div>
        <div className="field !mb-0 w-40"><label>Test model</label>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>{provider.models.map((m) => <option key={m}>{m}</option>)}</select></div>
        <button onClick={test} disabled={!!busy || !key.trim()} className="btn btn-ghost">{busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : 'Test'}</button>
        <button onClick={save} disabled={!!busy || !dirty || !key.trim()} className="btn btn-accent">{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
      </div>
    </Card>
  );
}

function EmailTab({ secrets, reload, settings, refreshSettings }: { secrets: Secrets; reload: () => void; settings: ReturnType<typeof useApp>['settings']; refreshSettings: () => void }) {
  const { user, supabase } = useApp();
  const saved = secrets.resend?.key || '';
  const [key, setKey] = useState(saved);
  const [senders, setSenders] = useState<Sender[]>(() => sendersFrom(settings));
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setKey(saved); }, [saved]);
  useEffect(() => { setSenders(sendersFrom(settings)); }, [settings]);

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  function addSender() {
    const email = newEmail.trim().toLowerCase(), name = newName.trim();
    if (!emailOk(email)) return toast.error('Enter a valid email address');
    if (!name) return toast.error('Enter the name recipients should see');
    if (senders.some((s) => s.email.toLowerCase() === email)) return toast.error('That address is already in the list');
    setSenders((list) => [...list, { id: `s_${Date.now().toString(36)}`, name, email, isDefault: list.length === 0 }]);
    setNewName(''); setNewEmail('');
  }
  function setDefault(id: string) { setSenders((list) => list.map((s) => ({ ...s, isDefault: s.id === id }))); }
  function removeSender(id: string) {
    setSenders((list) => { const next = list.filter((s) => s.id !== id); if (next.length && !next.some((s) => s.isDefault)) next[0].isDefault = true; return next; });
  }
  function editSender(id: string, patch: Partial<Sender>) { setSenders((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s))); }

  async function save() {
    if (senders.some((s) => !emailOk(s.email) || !s.name.trim())) return toast.error('Every sender needs a name and a valid email');
    setBusy(true);
    if (key.trim() && key.trim() !== saved) {
      const { error } = await supabase.from('user_secrets').upsert({ owner_id: user.id, provider: 'resend', api_key: key.trim(), updated_at: new Date().toISOString() });
      if (error) { setBusy(false); return toast.error(error.message); }
    }
    const def = senders.find((s) => s.isDefault) || senders[0] || null;
    const { error } = await supabase.from('user_settings').update({
      from_name: def?.name || null, from_email: def?.email || null,
      data: { ...(settings?.data || {}), senders: senders.map((s) => ({ ...s, name: s.name.trim(), email: s.email.trim().toLowerCase() })) },
    }).eq('owner_id', user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    reload(); refreshSettings();
    toast.success('Email settings saved');
  }

  async function removeKey() {
    if (!window.confirm('Remove the saved Resend key? Sending will stop until you add one.')) return;
    const { error } = await supabase.from('user_secrets').delete().eq('owner_id', user.id).eq('provider', 'resend');
    if (error) return toast.error(error.message);
    toast.success('Resend key removed'); setKey(''); reload();
  }

  return (
    <Card>
      <div className="card-h"><h3 className="flex items-center gap-2">Resend
        {secrets.resend?.has && <span className="tag" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><CircleCheck size={12} /> connected</span>}</h3>
        <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline">Get key <ExternalLink size={12} /></a>
      </div>
      <div className="field"><label>Resend API key {secrets.resend?.has && <span className="text-faint">· saved {secrets.resend.hint}</span>}{key.trim() !== saved && <span className="text-accent"> · unsaved change</span>}</label>
        <SecretInput value={key} onChange={setKey} placeholder="re_..." saved={secrets.resend?.has} onRemove={removeKey} /></div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[12px] font-bold text-ink">Sender addresses</label>
        <span className="text-[11.5px] text-faint">{senders.length ? `${senders.length} sender${senders.length > 1 ? 's' : ''} · default is used by the agent` : 'Add at least one'}</span>
      </div>
      <div className="mb-3 overflow-hidden rounded-xl border border-line">
        {senders.length === 0 && <div className="px-3.5 py-4 text-center text-[12.5px] text-faint">No sender yet. Add the name and address your emails should come from.</div>}
        {senders.map((s) => (
          <div key={s.id} className={`flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 first:border-t-0 ${s.isDefault ? 'bg-[var(--accent-soft)]' : ''}`}>
            <button type="button" onClick={() => setDefault(s.id)} title={s.isDefault ? 'Default sender' : 'Make default'} aria-label={s.isDefault ? 'Default sender' : 'Make default'}
              className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${s.isDefault ? 'text-accent' : 'text-faint hover:text-ink'}`}>
              {s.isDefault ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
            </button>
            <input className="input !w-40 !py-1.5 !text-[12.5px]" value={s.name} onChange={(e) => editSender(s.id, { name: e.target.value })} placeholder="Name" />
            <input className="input min-w-[200px] flex-1 !py-1.5 !text-[12.5px]" value={s.email} onChange={(e) => editSender(s.id, { email: e.target.value })} placeholder="name@yourdomain.com" />
            {s.isDefault ? <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>default</span>
              : <button type="button" onClick={() => setDefault(s.id)} className="btn btn-ghost btn-sm">Set default</button>}
            <button type="button" onClick={() => removeSender(s.id)} aria-label="Remove sender" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-[var(--red-soft)] hover:text-bad"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3 py-2">
          <Plus size={15} className="ml-2 text-faint" />
          <input className="input !w-40 !py-1.5 !text-[12.5px]" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name, e.g. Albin" />
          <input className="input min-w-[200px] flex-1 !py-1.5 !text-[12.5px]" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="albin@yourdomain.com"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSender(); } }} />
          <button type="button" onClick={addSender} className="btn btn-primary btn-sm">Add sender</button>
        </div>
      </div>
      <p className="hint mb-3">Every address must be on a domain verified in Resend. The <b>default</b> sender is used by automated outreach and follow-ups; when you compose or send to a list you can pick any sender. Replies are answered from the address that received them.</p>
      <div className="flex justify-end"><button onClick={save} disabled={busy} className="btn btn-accent">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button></div>
    </Card>
  );
}

function WorkspaceTab({ settings, refreshSettings }: { settings: ReturnType<typeof useApp>['settings']; refreshSettings: () => void }) {
  const { user, supabase } = useApp();
  const [lang, setLang] = useState(settings?.language || 'en');
  const [theme, setTheme] = useState(settings?.theme || 'light');

  async function save(patch: Record<string, string>) {
    await supabase.from('user_settings').update(patch).eq('owner_id', user.id);
    refreshSettings();
    if (patch.theme) document.documentElement.classList.toggle('dark', patch.theme === 'dark');
    toast.success('Saved');
  }

  return (
    <Card>
      <div className="card-h"><h3>Preferences</h3></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field !mb-0"><label>Interface language</label>
          <select className="input" value={lang} onChange={(e) => { setLang(e.target.value); save({ language: e.target.value }); }}>
            {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select><p className="hint">Outreach language is set per project.</p></div>
        <div className="field !mb-0"><label>Theme</label>
          <select className="input" value={theme} onChange={(e) => { setTheme(e.target.value); save({ theme: e.target.value }); }}>
            <option value="light">Light</option><option value="dark">Dark</option>
          </select></div>
      </div>
    </Card>
  );
}
