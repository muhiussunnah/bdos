'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Folder, FolderPlus, Inbox as InboxIcon, Pencil, Star, Trash2 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { useDialogs } from '@/components/providers/DialogProvider';
import { ThreeDot } from '@/components/Menu';
import { patchSettingsData } from '@/lib/settingsData';
import { folderState, folderOf as folderOfState, folderOps, newFolderId, starState, starOps, type FolderState, type InboxFolder, type StarState } from '@/lib/inboxFolders';
import type { Thread } from '@/lib/threads';

/** Drag payload type for conversations (one or several thread keys). */
export const DRAG_TYPE = 'application/x-klientic-threads';

/** Folder state for the Inbox + the actions that change it (saved to user_settings.data). */
export function useInboxFolders() {
  const { settings, supabase, user, refreshSettings } = useApp();
  const { prompt, confirm } = useDialogs();
  const [state, setState] = useState<FolderState>(() => folderState(settings?.data));
  useEffect(() => { setState(folderState(settings?.data)); }, [settings?.data]);

  /** apply locally at once, then to the latest stored copy */
  const save = useCallback(async (op: (s: FolderState) => FolderState) => {
    const before = state;
    setState((s) => op(s));
    try {
      await patchSettingsData(supabase, user.id, (cur) => ({ inbox_folders: op(folderState(cur)) }));
      refreshSettings();
      return true;
    } catch (e) {
      setState(before);
      toast.error(e instanceof Error ? e.message : 'Could not save the folder');
      return false;
    }
  }, [state, supabase, user.id, refreshSettings]);

  const folderOf = useCallback((t: Thread) => folderOfState(state, t.key, t.lastInbound ? new Date(t.lastInbound.sent_at || t.lastInbound.created_at).getTime() : null), [state]);
  const nameOf = (id: string | null) => (id ? state.folders.find((f) => f.id === id)?.name || 'Folder' : 'Inbox');

  async function move(keys: string[], folderId: string | null) {
    if (!keys.length) return;
    if (await save((s) => folderOps.move(s, keys, folderId))) {
      toast.success(`${keys.length === 1 ? 'Conversation' : `${keys.length} conversations`} moved to ${folderId ? `“${nameOf(folderId)}”` : 'the Inbox'}`);
    }
  }

  async function create(moveKeys: string[] = []): Promise<string | null> {
    const v = await prompt({ title: 'New folder', hint: 'E.g. Auto replies, Not now, Partners. Drag conversations onto it, or use ⋮ → Move to.', fields: [{ key: 'name', label: 'Folder name', placeholder: 'Auto replies' }], confirmLabel: 'Create folder' });
    const name = v?.name?.trim();
    if (!name) return null;
    if (state.folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) { toast.error(`A folder called “${name}” already exists`); return null; }
    const folder: InboxFolder = { id: newFolderId(), name: name.slice(0, 40) };
    const ok = await save((s) => (moveKeys.length ? folderOps.move(folderOps.create(s, folder), moveKeys, folder.id) : folderOps.create(s, folder)));
    if (ok) toast.success(moveKeys.length ? `Folder “${folder.name}” created · ${moveKeys.length} moved` : `Folder “${folder.name}” created`);
    return ok ? folder.id : null;
  }

  async function rename(id: string) {
    const v = await prompt({ title: 'Rename folder', fields: [{ key: 'name', label: 'Folder name', value: nameOf(id) }], confirmLabel: 'Rename' });
    const name = v?.name?.trim();
    if (name) await save((s) => folderOps.rename(s, id, name.slice(0, 40)));
  }

  async function remove(id: string) {
    if (!(await confirm({ title: `Delete the folder “${nameOf(id)}”?`, body: 'Its conversations go back to the Inbox. No email is deleted.', confirmLabel: 'Delete folder' }))) return;
    if (await save((s) => folderOps.remove(s, id))) toast.success('Folder deleted — its conversations are back in the Inbox');
  }

  return { folders: state.folders, folderOf, nameOf, move, create, rename, remove };
}

export type InboxFoldersApi = ReturnType<typeof useInboxFolders>;

/** Starred conversations (saved to user_settings.data.inbox_stars). */
export function useInboxStars() {
  const { settings, supabase, user, refreshSettings } = useApp();
  const [state, setState] = useState<StarState>(() => starState(settings?.data));
  // while saves are still running, the stored copy is behind what is on screen — don't sync from it
  const pending = useRef(0);
  useEffect(() => { if (!pending.current) setState(starState(settings?.data)); }, [settings?.data]);

  const isStarred = useCallback((key: string) => !!state[key], [state]);

  /** star (on = true) or unstar several conversations; applied at once, then saved */
  const star = useCallback(async (keys: string[], on: boolean, quiet = false) => {
    if (!keys.length) return;
    setState((s) => starOps(s, keys, on));
    pending.current++;
    try {
      const saved = await patchSettingsData(supabase, user.id, (cur) => ({ inbox_stars: starOps(starState(cur), keys, on) }));
      if (pending.current === 1) setState(starState(saved));
      if (!quiet || keys.length > 1) toast.success(on ? `${keys.length === 1 ? 'Conversation' : `${keys.length} conversations`} starred` : `Star removed${keys.length > 1 ? ` from ${keys.length} conversations` : ''}`);
    } catch (e) {
      setState((s) => starOps(s, keys, !on));
      toast.error(e instanceof Error ? e.message : 'Could not save the star');
    } finally {
      pending.current--;
      if (!pending.current) refreshSettings();
    }
  }, [supabase, user.id, refreshSettings]);

  const toggle = useCallback((key: string) => star([key], !state[key], true), [state, star]);

  return { isStarred, star, toggle, count: Object.keys(state).length };
}

export type InboxStarsApi = ReturnType<typeof useInboxStars>;

/** The star button on a conversation row / in the conversation. */
export function StarButton({ on, onClick, size = 16 }: { on: boolean; onClick: () => void; size?: number }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className={`star-btn ${on ? 'on' : ''}`}
      aria-pressed={on} aria-label={on ? 'Remove star' : 'Star — mark as important'} title={on ? 'Starred — click to remove the star' : 'Star — mark as important so it lights up'}>
      <Star size={size} fill={on ? 'currentColor' : 'none'} strokeWidth={on ? 1.6 : 2} />
    </button>
  );
}

function readKeys(e: React.DragEvent): string[] {
  try { const v = JSON.parse(e.dataTransfer.getData(DRAG_TYPE) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}

/**
 * Inbox + folder chips. Every chip is a drop target: drag a conversation (or several selected
 * ones) onto a folder to move it there, onto "Inbox" to bring it back.
 */
export function FolderBar({ api, active, onPick, inboxCount, counts, starred }: {
  api: InboxFoldersApi; active: string | null; onPick: (folderId: string | null) => void;
  inboxCount: number; counts: Record<string, number>;
  /** the "Starred" chip: every starred conversation in one place; dropping on it stars them */
  starred?: { count: number; active: boolean; onPick: () => void; onDrop: (keys: string[]) => void };
}) {
  const [over, setOver] = useState<string | null | undefined>(undefined);
  const starChip = starred && (
    <div key="starred"
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver('__star'); } }}
      onDragLeave={() => setOver((o) => (o === '__star' ? undefined : o))}
      onDrop={(e) => { e.preventDefault(); setOver(undefined); const keys = readKeys(e); if (keys.length) starred.onDrop(keys); }}
      className={`inline-flex items-center rounded-[11px] border transition ${over === '__star' ? 'scale-[1.04] shadow-sm' : ''}`}
      style={{ borderColor: starred.active || over === '__star' ? 'var(--star)' : 'var(--border)', background: starred.active || over === '__star' ? 'var(--star-soft)' : 'var(--surface)' }}>
      <button onClick={starred.onPick} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold ${starred.active ? 'text-ink' : 'text-dim'}`}
        title="Starred conversations — the important ones. Drop a conversation here to star it">
        <Star size={13} fill="currentColor" style={{ color: 'var(--star)' }} />
        <span>Starred</span>
        <span className="rounded-md px-1.5 text-[11px]" style={{ background: 'var(--border)' }}>{starred.count}</span>
      </button>
    </div>
  );
  const chip = (id: string | null, name: string, count: number, folder?: InboxFolder) => {
    const isActive = active === id;
    const isOver = over === id;
    return (
      <div key={id || 'inbox'}
        onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(id); } }}
        onDragLeave={() => setOver((o) => (o === id ? undefined : o))}
        onDrop={(e) => { e.preventDefault(); setOver(undefined); const keys = readKeys(e); if (keys.length) api.move(keys, id); }}
        className={`group inline-flex items-center rounded-[11px] border transition ${isOver ? 'scale-[1.04] border-accent bg-[var(--accent-soft)] shadow-sm' : isActive ? 'border-accent bg-[var(--accent-soft)]' : 'border-line bg-surface hover:border-line-2'}`}>
        <button onClick={() => onPick(id)} className={`inline-flex items-center gap-1.5 py-1.5 pl-3 text-[12.5px] font-bold ${folder ? 'pr-1' : 'pr-3'} ${isActive ? 'text-ink' : 'text-dim'}`}
          title={id ? `Conversations in “${name}” — drop a conversation here to move it` : 'Conversations not in a folder — drop one here to bring it back'}>
          {id ? <Folder size={13} className="text-accent" /> : <InboxIcon size={13} className="text-accent" />}
          <span className="max-w-[160px] truncate">{name}</span>
          <span className="rounded-md px-1.5 text-[11px]" style={{ background: 'var(--border)' }}>{count}</span>
        </button>
        {folder && (
          <span className="pr-1 opacity-60 transition group-hover:opacity-100">
            <ThreeDot items={[
              { label: 'Rename folder', icon: <Pencil size={14} />, run: () => api.rename(folder.id) },
              { label: 'Delete folder', icon: <Trash2 size={14} />, danger: true, run: () => api.remove(folder.id) },
            ]} />
          </span>
        )}
      </div>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chip(null, 'Inbox', inboxCount)}
      {starChip}
      {api.folders.map((f) => chip(f.id, f.name, counts[f.id] || 0, f))}
      <button onClick={() => api.create()} className="inline-flex items-center gap-1.5 rounded-[11px] border border-dashed border-line px-3 py-1.5 text-[12.5px] font-bold text-dim transition hover:border-accent hover:text-accent">
        <FolderPlus size={13} /> New folder
      </button>
      {api.folders.length > 0 && <span className="text-[11.5px] text-faint">Drag a conversation onto a folder to move it</span>}
    </div>
  );
}
