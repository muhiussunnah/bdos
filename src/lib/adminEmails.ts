// Server-only. Do NOT import from a client component (keeps emails out of the bundle).
// These accounts are admins even before the DB trigger runs.
export const ADMIN_EMAILS = ['itsinjamul@gmail.com', 'gigwings@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  const e = email?.toLowerCase();
  if (!e) return false;
  const envAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  return ADMIN_EMAILS.includes(e) || (!!envAdmin && e === envAdmin);
}
