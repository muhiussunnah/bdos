'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, ExternalLink, KeyRound, Mail, SlidersHorizontal, CircleCheck } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Card, Thinking } from '@/components/ui';
import { PROVIDERS, LANGS, type ProviderKey } from '@/lib/constants';

type Secrets = Record<string, { has: boolean; hint: string; meta: Record<string, unknown> }>;

export default function SettingsPage() {
  const { user, supabase, settings, refreshSettings } = useApp();
  const [tab, setTab] = useState<'ai' | 'email' | 'workspace'>('ai');
  const [secrets, setSecrets] = useState<Secrets>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('user_secrets').select('provider, api_key, meta').eq('owner_id', user.id);
    const map: Secrets = {};
    (data || []).forEach((r: { provider: string; api_key: string | null; meta: Record<string, unknown> }) => {
      map[r.provider] = { has: !!r.api_key, hint: r.api_key ? `••••${r.api_key.slice(-4)}` : '', meta: r.meta || {} };
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
  const [key, setKey] = useState('');
  const [model, setModel] = useState(provider.models[0]);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);

  async function save() {
    if (!key) return toast.error('Paste a key first');
    setBusy('save');
    const { error } = await supabase.from('user_secrets').upsert({ owner_id: user.id, provider: provider.key, api_key: key, updated_at: new Date().toISOString() });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${provider.label} key saved`); setKey(''); reload();
  }

  async function test() {
    const testKey = key || undefined;
    if (!testKey && !state?.has) return toast.error('Save or paste a key first');
    setBusy('test');
    try {
      // if no fresh key typed, pull the stored one to test
      let useKey = testKey;
      if (!useKey) {
        const { data } = await supabase.from('user_secrets').select('api_key').eq('owner_id', user.id).eq('provider', provider.key).single();
        useKey = data?.api_key;
      }
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
        <div className="field !mb-0 flex-1 min-w-[200px]"><label>API key {state?.has && <span className="text-faint">· {state.hint}</span>}</label>
          <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={state?.has ? 'Replace key…' : provider.placeholder} /></div>
        <div className="field !mb-0 w-40"><label>Test model</label>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>{provider.models.map((m) => <option key={m}>{m}</option>)}</select></div>
        <button onClick={test} disabled={!!busy} className="btn btn-ghost">{busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : 'Test'}</button>
        <button onClick={save} disabled={!!busy} className="btn btn-accent">{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
      </div>
    </Card>
  );
}

function EmailTab({ secrets, reload, settings, refreshSettings }: { secrets: Secrets; reload: () => void; settings: ReturnType<typeof useApp>['settings']; refreshSettings: () => void }) {
  const { user, supabase } = useApp();
  const [key, setKey] = useState('');
  const [fromName, setFromName] = useState(settings?.from_name || '');
  const [fromEmail, setFromEmail] = useState(settings?.from_email || '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    if (key) await supabase.from('user_secrets').upsert({ owner_id: user.id, provider: 'resend', api_key: key, updated_at: new Date().toISOString() });
    await supabase.from('user_settings').update({ from_name: fromName || null, from_email: fromEmail || null }).eq('owner_id', user.id);
    setBusy(false); setKey(''); reload(); refreshSettings();
    toast.success('Email settings saved');
  }

  return (
    <Card>
      <div className="card-h"><h3 className="flex items-center gap-2">Resend
        {secrets.resend?.has && <span className="tag" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><CircleCheck size={12} /> connected</span>}</h3>
        <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline">Get key <ExternalLink size={12} /></a>
      </div>
      <div className="field"><label>Resend API key {secrets.resend?.has && <span className="text-faint">· {secrets.resend.hint}</span>}</label>
        <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={secrets.resend?.has ? 'Replace key…' : 're_...'} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field"><label>From name</label><input className="input" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Albin from Famies" /></div>
        <div className="field"><label>From email (verified domain)</label><input className="input" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="albin@famies.se" /></div>
      </div>
      <p className="hint mb-3">Verify your sending domain in Resend so replies land correctly. Until then, outreach uses the Resend sandbox sender.</p>
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
