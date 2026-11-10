/**
 * Inbox folders ("Auto replies", "Not now", …): conversations can be moved out of the main
 * Inbox into folders and back. Stored in user_settings.data.inbox_folders:
 *   folders: [{ id, name }]
 *   map:     { [threadKey]: { f: folderId, at: when it was moved } }
 * Thread keys are "lead:<uuid>" / "addr:<email>" (lib/threads.ts), unique across projects, so one
 * set of folders serves every project. A conversation comes back to the Inbox by itself when
 * they write again after it was moved — a real answer never hides behind an auto-reply.
 */
export interface InboxFolder { id: string; name: string }
export interface FolderState { folders: InboxFolder[]; map: Record<string, { f: string; at: string }> }

export function folderState(settingsData: unknown): FolderState {
  const raw = (settingsData as { inbox_folders?: Partial<FolderState> } | null | undefined)?.inbox_folders;
  const folders = Array.isArray(raw?.folders) ? raw!.folders.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string') : [];
  const map = raw?.map && typeof raw.map === 'object' ? raw.map : {};
  return { folders, map };
}

/** The folder a conversation sits in, or null for the main Inbox. */
export function folderOf(state: FolderState, key: string, lastInboundAt: number | null): string | null {
  const e = state.map[key];
  if (!e || !state.folders.some((f) => f.id === e.f)) return null;
  // they wrote again after it was moved → back in the Inbox
  if (lastInboundAt && lastInboundAt > new Date(e.at).getTime() + 1000) return null;
  return e.f;
}

export function newFolderId(): string {
  return `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Pure updates — applied to the latest stored state before saving. */
export const folderOps = {
  move(s: FolderState, keys: string[], folderId: string | null): FolderState {
    const map = { ...s.map };
    const at = new Date().toISOString();
    for (const k of keys) { if (folderId) map[k] = { f: folderId, at }; else delete map[k]; }
    return { ...s, map };
  },
  create(s: FolderState, folder: InboxFolder): FolderState {
    return { ...s, folders: [...s.folders, folder] };
  },
  rename(s: FolderState, id: string, name: string): FolderState {
    return { ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) };
  },
  /** deleting a folder puts its conversations back in the Inbox */
  remove(s: FolderState, id: string): FolderState {
    const map = Object.fromEntries(Object.entries(s.map).filter(([, v]) => v.f !== id));
    return { folders: s.folders.filter((f) => f.id !== id), map };
  },
};
