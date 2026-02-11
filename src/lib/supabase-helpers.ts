import { supabase } from "@/integrations/supabase/client";

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });
  
  return !!data;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
