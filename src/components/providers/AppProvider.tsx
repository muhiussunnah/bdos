'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Project, UserSettings } from '@/lib/types';

interface AppState {
  user: User;
  profile: Profile | null;
  isAdmin: boolean;
  projects: Project[];
  project: Project | null;
  settings: UserSettings | null;
  counts: { inbox: number; tasks: number };
  setProjectId: (id: string) => void;
  refreshProjects: () => Promise<Project[]>;
  refreshCounts: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
};

const LS_KEY = 'klientic.activeProject';

export function AppProvider({
  user,
  profile,
  isAdmin,
  initialProjects,
  initialSettings,
  children,
}: {
  user: User;
  profile: Profile | null;
  isAdmin: boolean;
  initialProjects: Project[];
  initialSettings: UserSettings | null;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ inbox: 0, tasks: 0 });

  // pick the active project once projects are known
  useEffect(() => {
    if (!projects.length) {
      // auto-create a starter project so the app is never empty
      supabase
        .from('projects')
        .insert({ owner_id: user.id, name: 'My First Project', is_default: true })
        .select()
        .single()
        .then(({ data }) => {
          if (data) {
            setProjects([data as Project]);
            setActiveId(data.id);
          }
        });
      return;
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    const chosen = projects.find((p) => p.id === stored) || projects.find((p) => p.is_default) || projects[0];
    setActiveId(chosen?.id ?? null);
  }, [projects, supabase, user.id]);

  const project = useMemo(() => projects.find((p) => p.id === activeId) || null, [projects, activeId]);

  const setProjectId = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, id);
  }, []);

  const refreshProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at');
    const list = (data as Project[]) || [];
    setProjects(list);
    return list;
  }, [supabase]);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from('user_settings').select('*').eq('owner_id', user.id).maybeSingle();
    setSettings((data as UserSettings) || null);
  }, [supabase, user.id]);

  const refreshCounts = useCallback(async () => {
    if (!activeId) return;
    const [{ count: inbox }, { count: tasks }] = await Promise.all([
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('project_id', activeId).eq('direction', 'inbound').eq('handled', false),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .eq('project_id', activeId).eq('status', 'open'),
    ]);
    setCounts({ inbox: inbox || 0, tasks: tasks || 0 });
  }, [supabase, activeId]);

  useEffect(() => {
    if (activeId) refreshCounts();
  }, [activeId, refreshCounts]);

  // theme
  useEffect(() => {
    const theme = settings?.theme || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [settings?.theme]);

  const value: AppState = {
    user, profile, isAdmin, projects, project, settings, counts,
    setProjectId, refreshProjects, refreshCounts, refreshSettings, supabase,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
