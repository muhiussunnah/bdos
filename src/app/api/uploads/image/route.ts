import { auth, bad, ok } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const BUCKET = 'email-assets';
const MAX = 5 * 1024 * 1024;

/**
 * Uploads an inline image for the rich-text email editor and returns a public
 * URL. Images must be hosted (not base64) so Gmail/Outlook actually render them.
 */
export async function POST(req: Request) {
  const ctx = await auth();
  if (ctx instanceof Response) return ctx;
  const { userId } = ctx;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return bad('No file uploaded');
  if (!/^image\/(png|jpe?g|gif|webp|svg\+xml)$/i.test(file.type)) return bad('Only PNG, JPG, GIF, WebP or SVG images are allowed', 415);
  if (file.size > MAX) return bad('Image must be under 5MB', 413);

  const admin = createAdminClient();
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (!bucket) await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX });

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${userId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) return bad(error.message, 500);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return ok({ url: data.publicUrl, name: file.name, size: file.size });
}
