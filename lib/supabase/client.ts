import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ogyhdvmnshgvugusgawf.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zjmq4G6OyAZRtbQ9eows-w_p-XUb9li';

  return createBrowserClient(url, key);
}
