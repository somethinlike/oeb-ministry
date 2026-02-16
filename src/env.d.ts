/// <reference types="astro/client" />

// Using import() type syntax instead of top-level imports to keep this
// file as a global ambient module. Top-level imports would turn it into
// a regular module and break the namespace augmentation.
declare namespace App {
  interface Locals {
    user: import("@supabase/supabase-js").User | null;
    supabase: import("@supabase/supabase-js").SupabaseClient<
      import("./types/database").Database
    > | null;
  }
}
