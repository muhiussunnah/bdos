'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Folder, FolderPlus, Inbox as InboxIcon, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { useDialogs } from '@/components/providers/DialogProvider';
import { ThreeDot } from '@/components/Menu';
import { patchSettingsData } from '@/lib/settingsData';
import { folderState, folderOf as folderOfState, folderOps, newFolderId, type FolderState, type InboxFolder } from '@/lib/inboxFolders';
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

function readKeys(e: React.DragEvent): string[] {
  try { const v = JSON.parse(e.dataTransfer.getData(DRAG_TYPE) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}

/**
 * Inbox + folder chips. Every chip is a drop target: drag a conversation (or several selected
 * ones) onto a folder to move it there, onto "Inbox" to bring it back.
 */
export function FolderBar({ api, active, onPick, inboxCount, counts }: {
  api: InboxFoldersApi; active: string | null; onPick: (folderId: string | null) => void;
  inboxCount: number; counts: Record<string, number>;
}) {
  const [over, setOver] = useState<string | null | undefined>(undefined);
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
      {api.folders.map((f) => chip(f.id, f.name, counts[f.id] || 0, f))}
      <button onClick={() => api.create()} className="inline-flex items-center gap-1.5 rounded-[11px] border border-dashed border-line px-3 py-1.5 text-[12.5px] font-bold text-dim transition hover:border-accent hover:text-accent">
        <FolderPlus size={13} /> New folder
      </button>
      {api.folders.length > 0 && <span className="text-[11.5px] text-faint">Drag a conversation onto a folder to move it</span>}
    </div>
  );
}
