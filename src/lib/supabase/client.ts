import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import {
  createLocalDemoSupabaseClient,
  isLocalDemoModeClient,
} from './local-demo-client';

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cachedLocalDemoClient: SupabaseBrowserClient | null = null;
let cachedRealClient: SupabaseBrowserClient | null = null;

export function createClient(): SupabaseBrowserClient {
  if (isLocalDemoModeClient()) {
    if (!cachedLocalDemoClient) {
      cachedLocalDemoClient = createLocalDemoSupabaseClient() as SupabaseBrowserClient;
    }
    return cachedLocalDemoClient;
  }
  if (!cachedRealClient) {
    cachedRealClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cachedRealClient;
}
