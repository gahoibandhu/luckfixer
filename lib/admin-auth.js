// lib/admin-auth.js
// Simple hardcoded admin check by email

export const ADMIN_EMAIL = 'dendthdel@gmail.com';

export async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }
  return user;
}
