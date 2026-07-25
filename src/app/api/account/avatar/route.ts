import { auth, bad, ok } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * Uploads a profile photo. Runs with the service role so it works even if the
 * storage RLS policies weren't applied, and creates the bucket if it's missing.
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { userId } = ctx;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return bad('No file uploaded');
  if (file.size > 3 * 1024 * 1024) return bad('Image must be under 3MB', 413);

  const admin = createAdminClient();

  // ensure the bucket exists
  const { data: bucket } = await admin.storage.getBucket('avatars');
  if (!bucket) {
    await admin.storage.createBucket('avatars', { public: true, fileSizeLimit: 3 * 1024 * 1024 });
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await admin.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/png',
    cacheControl: '3600',
  });
  if (error) return bad(error.message, 500);

  const { data } = admin.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: e2 } = await admin.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (e2) return bad(e2.message, 500);

  return ok({ url });
}
