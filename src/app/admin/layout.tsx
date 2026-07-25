import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppProvider } from '@/components/providers/AppProvider';
import { AppShell } from '@/components/AppShell';
import { isAdminEmail } from '@/lib/adminEmails';
import type { Profile, Project, UserSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: projects }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('user_settings').select('*').eq('owner_id', user.id).maybeSingle(),
  ]);

  const isAdmin = Boolean(profile?.is_admin) || isAdminEmail(user.email);
  if (!isAdmin) redirect('/app/dashboard');

  return (
    <AppProvider
      user={user}
      profile={(profile as Profile) || null}
      isAdmin
      initialProjects={(projects as Project[]) || []}
      initialSettings={(settings as UserSettings) || null}
    >
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
