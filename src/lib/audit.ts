import { supabase } from './supabase';

export async function logAuditAction({
  action,
  resource_type,
  resource_id,
  payload_before = null,
  payload_after = null
}: {
  action: string;
  resource_type: string;
  resource_id?: string;
  payload_before?: any;
  payload_after?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('system_audit_logs').insert({
      admin_id: user.id,
      action,
      resource_type,
      resource_id,
      payload_before,
      payload_after,
      user_agent: navigator.userAgent
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}
