declare namespace App {
  interface Locals {
    requestId: string;
    user: import("@supabase/supabase-js").User | null;
  }
}
