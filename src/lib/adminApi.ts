/**
 * adminApi.ts — Centralized Admin Data Layer
 * 
 * All admin CRUD operations go through this module.
 */
import { supabase } from '@/lib/supabase';

// ── Type Mappers ─────────────────────────────────────────────────────────────

export interface DbExchanger {
  id: string;
  name: string;
  email: string | null;
  country: string;
  volume_24h: number;
  rating: number;
  trading_limit: number;
  status: 'verified' | 'pending' | 'suspended';
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  badge: string | null;
  badge_color: string | null;
  created_at: string;
}

export interface DbProcessingFee {
  id: string;
  fee_name: string;
  calc_type: 'flat' | 'percent';
  value: number;
  is_active: boolean;
  updated_at: string;
}

export interface DbPaymentGateway {
  id: string;
  name: string;
  gateway_type: string;
  status: 'active' | 'coming_soon' | 'disabled';
  fees: string | null;
  description: string | null;
  country: string;
  config: Record<string, unknown>;
  created_at: string;
}

export interface DbFeatureFlag {
  id: string;
  feature_key: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
  restricted_countries: string[];
  restricted_roles: string[];
  config: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

// ── Exchangers ───────────────────────────────────────────────────────────────

export const exchangerApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('exchangers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbExchanger[];
  },

  async create(exchanger: Omit<DbExchanger, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('exchangers')
      .insert(exchanger)
      .select()
      .single();
    if (error) throw error;
    return data as DbExchanger;
  },

  async update(id: string, updates: Partial<DbExchanger>) {
    const { data, error } = await supabase
      .from('exchangers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as DbExchanger;
  },

  async delete(id: string) {
    const { error } = await supabase.from('exchangers').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Users (Admin view) ──────────────────────────────────────────────────────

export const adminUserApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        wallets (nrt_balance),
        kyc_submissions (status, logo_url, business_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Record<string, unknown>) {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Transactions ────────────────────────────────────────────────────────────

export const adminTransactionApi = {
  async fetchAll(filters?: { country?: string; type?: string; status?: string }) {
    let query = supabase
      .from('transactions')
      .select('*, wallets!inner(users!inner(email, display_name, country))')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filters?.country) query = query.eq('wallets.users.country', filters.country);
    if (filters?.type) query = query.eq('tx_type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string) {
    const { error } = await supabase.from('transactions').update({ status }).eq('id', id);
    if (error) throw error;
  },
};

// ── Campaigns ───────────────────────────────────────────────────────────────

export const adminCampaignApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        sp_profiles!sp_id (company_name, logo_url, users (display_name)),
        isp_profiles!isp_id (isp_name, logo_url, users (display_name)),
        services!service_id (name, logo_url),
        networks!network_id (name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Normalize creator info for the admin UI
    return (data || []).map(camp => {
      const spName = camp.sp_profiles?.company_name === 'Alpha SP' ? (camp.sp_profiles?.users as any)?.display_name : camp.sp_profiles?.company_name;
      const ispName = camp.isp_profiles?.isp_name === 'Alpha ISP' ? (camp.isp_profiles?.users as any)?.display_name : camp.isp_profiles?.isp_name;

      return {
        ...camp,
        creator_name: spName || ispName || 'System',
        creator_logo: camp.sp_profiles?.logo_url || camp.isp_profiles?.logo_url || null,
        service_name: camp.services?.name || camp.networks?.name || 'N/A',
        is_combined: !!(camp.services?.name && camp.networks?.name),
        display_service: [camp.services?.name, camp.networks?.name].filter(Boolean).join(' / ')
      };
    });
  },

  async updateCampaign(id: string, updates: Record<string, unknown>) {
    const { error } = await supabase.from('campaigns').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteCampaign(id: string) {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Services (SP) ───────────────────────────────────────────────────────────

export const adminServiceApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        sp_profiles!sp_id (
          company_name, 
          logo_url,
          users (country, display_name)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map(s => {
      const spName = s.sp_profiles?.company_name === 'Alpha SP' ? (s.sp_profiles?.users as any)?.display_name : s.sp_profiles?.company_name;
      return {
        ...s,
        provider_name: spName || 'Unknown SP',
        country: s.country || (s.sp_profiles?.users as any)?.country || 'Global'
      };
    });
  },
};

// ── Networks (ISP) ──────────────────────────────────────────────────────────

export const adminNetworkApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('networks')
      .select(`
        *,
        isp_profiles!isp_id (
          isp_name, 
          logo_url,
          users (country, display_name)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map(n => {
      const ispName = n.isp_profiles?.isp_name === 'Alpha ISP' ? (n.isp_profiles?.users as any)?.display_name : n.isp_profiles?.isp_name;
      return {
        ...n,
        provider_name: ispName || 'Unknown ISP',
        country: n.country || (n.isp_profiles?.users as any)?.country || 'Global'
      };
    });
  },
};

// ── KYC ─────────────────────────────────────────────────────────────────────

export const adminKycApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*, users!user_id (email, display_name, role, country)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string, reviewedBy: string) {
    const { error } = await supabase
      .from('kyc_submissions')
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

// ── Support Tickets ─────────────────────────────────────────────────────────

export const adminSupportApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, users!user_id (email, display_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateTicket(id: string, updates: Record<string, unknown>) {
    const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
    if (error) throw error;
  },
};

// ── Dashboard Aggregation ───────────────────────────────────────────────────

export const adminDashboardApi = {
  async fetchKPIs() {
    const [
      { count: totalUsers },
      { count: activeCampaigns },
      { count: activeDevices },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('devices').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    return {
      totalUsers: totalUsers ?? 0,
      activeCampaigns: activeCampaigns ?? 0,
      activeDevices: activeDevices ?? 0,
      openDisputes: 0,
    };
  },

  async fetchUsersByRole(): Promise<{ name: string; value: number }[]> {
    const { data, error } = await supabase.from('users').select('role');
    if (error) throw error;
    
    const counts: Record<string, number> = {};
    data.forEach(u => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async fetchUsersByCountry(): Promise<{ country: string; users: number }[]> {
    const { data, error } = await supabase.from('users').select('country');
    if (error) throw error;

    const counts: Record<string, number> = {};
    data.forEach(u => {
      const c = u.country || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([country, users]) => ({ country, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);
  },

  async fetchRecentActivity(limit = 10) {
    const { data, error } = await supabase
      .from('system_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
};

// ── Treasury ────────────────────────────────────────────────────────────────

export const adminTreasuryApi = {
  async fetchTreasuryBalance() {
    const { data, error } = await supabase
      .from('admin_treasury')
      .select('*')
      .limit(1)
      .single();
    if (error) throw error;
    return data as { id: string; nrt_balance: number; updated_at: string };
  },

  async fetchGatewayLiquidity() {
    const { data, error } = await supabase
      .from('gateway_liquidity')
      .select('*')
      .order('provider_name');
    if (error) throw error;
    return data as { id: string; provider_name: string; currency: string; fiat_balance: number; status: string; last_funded_at: string; updated_at: string }[];
  },

  async fetchPayoutAudits(limit = 20) {
    const { data, error } = await supabase
      .from('payout_audits')
      .select(`
        *,
        withdrawal_requests!withdrawal_id (user_id, amount_nrt, amount_fiat, currency, status, created_at),
        gateway_liquidity!gateway_id (provider_name, currency)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async fetchRecentWithdrawals(limit = 20) {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        users!user_id (email, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async updateGatewayLiquidity(id: string, updates: Record<string, unknown>) {
    const { error } = await supabase
      .from('gateway_liquidity')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

// ── Backups ─────────────────────────────────────────────────────────────────

export const adminBackupApi = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('system_backups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createBackup(size_mb: number) {
    const { data, error } = await supabase
      .from('system_backups')
      .insert({ backup_id: `bk_${Date.now()}`, size_mb })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
