import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// During build time, environment variables might not be available
// We create null clients that will fail gracefully at runtime if used
const hasRequiredVars = supabaseUrl && supabaseAnonKey;

// Public client for client-side operations
export const supabase = hasRequiredVars
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Admin client with service role key - bypasses RLS policies
// Only use this in secure server-side contexts (API routes, server components)
export const supabaseAdmin = hasRequiredVars && supabaseServiceRoleKey
  ? createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;
