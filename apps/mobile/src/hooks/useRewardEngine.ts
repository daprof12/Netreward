import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

/** Result from process_tracking_report RPC */
export interface TrackingReportResult {
  status: 'success' | 'error' | 'duplicate' | 'skipped';
  message?: string;
  session_id?: string;
  session_record_id?: string;
  data_gb?: number;
  earned_nrt?: number;
  splits?: {
    user: number;
    sp: number;
    isp: number;
  };
  campaign_budget_remaining?: number;
}

/** Parameters for submitting a tracking report */
export interface TrackingReportPayload {
  device_id: string;
  campaign_id: string;
  session_id: string;
  bytes_up: number;
  bytes_down: number;
  duration_seconds: number;
  session_start: string; // ISO timestamp
  session_end: string;   // ISO timestamp
}

/**
 * Hook for submitting tracking reports to the Reward Engine.
 * Calls the process_tracking_report RPC which handles:
 * - Session deduplication
 * - NRT calculation (data * rate * NHS multiplier)
 * - 85/10/5 split (User/SP/ISP)
 * - Budget enforcement
 * - Transaction ledger entries
 */
export function useTrackingReport() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (payload: TrackingReportPayload): Promise<TrackingReportResult> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('process_tracking_report', {
        p_device_id: payload.device_id,
        p_campaign_id: payload.campaign_id,
        p_session_id: payload.session_id,
        p_bytes_up: payload.bytes_up,
        p_bytes_down: payload.bytes_down,
        p_duration_seconds: payload.duration_seconds,
        p_session_start: payload.session_start,
        p_session_end: payload.session_end,
      });

      if (error) throw error;
      return data as TrackingReportResult;
    },
    onSuccess: () => {
      // Invalidate all caches that depend on tracking data
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['device_summaries'] });
      queryClient.invalidateQueries({ queryKey: ['user_device_stats'] });
      queryClient.invalidateQueries({ queryKey: ['device_app_usage'] });
      queryClient.invalidateQueries({ queryKey: ['user_dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-enrollments'] });
    },
  });

  return {
    submitReport: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    lastResult: submitMutation.data,
    error: submitMutation.error,
  };
}

/** User Dashboard Stats from the DB */
export interface UserDashboardStats {
  nrt_balance: number;
  unclaimed_nrt: number;
  total_earned: number;
  total_data_gb: number;
  active_campaigns: number;
  device_count: number;
}

/** SP Dashboard Stats from the DB */
export interface SpDashboardStats {
  nrt_distributed: number;
  active_campaigns: number;
  users_reached: number;
  revenue: number;
}

/** ISP Dashboard Stats from the DB */
export interface IspDashboardStats {
  nrt_distributed: number;
  active_campaigns: number;
  customers: number;
  earnings: number;
  total_data_gb: number;
}

/**
 * Hook for fetching real-time user dashboard statistics.
 * Returns aggregated data from wallets, sessions, campaigns, and devices.
 */
export function useUserDashboardStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['user_dashboard_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_user_dashboard_stats', {
        p_user_id: user.id,
      });
      if (error) throw error;
      return data as UserDashboardStats;
    },
    enabled: !!user,
    refetchInterval: 30_000, // Refresh every 30s
  });
}

/**
 * Hook for fetching real-time SP dashboard statistics.
 */
export function useSpDashboardStats(spProfileId: string | undefined) {
  return useQuery({
    queryKey: ['sp_dashboard_stats', spProfileId],
    queryFn: async () => {
      if (!spProfileId) return null;
      const { data, error } = await supabase.rpc('get_sp_dashboard_stats', {
        p_sp_profile_id: spProfileId,
      });
      if (error) throw error;
      return data as SpDashboardStats;
    },
    enabled: !!spProfileId,
    refetchInterval: 30_000,
  });
}

/**
 * Hook for fetching real-time ISP dashboard statistics.
 */
export function useIspDashboardStats(ispProfileId: string | undefined) {
  return useQuery({
    queryKey: ['isp_dashboard_stats', ispProfileId],
    queryFn: async () => {
      if (!ispProfileId) return null;
      const { data, error } = await supabase.rpc('get_isp_dashboard_stats', {
        p_isp_profile_id: ispProfileId,
      });
      if (error) throw error;
      return data as IspDashboardStats;
    },
    enabled: !!ispProfileId,
    refetchInterval: 30_000,
  });
}

/**
 * Hook for claiming all accumulated NRT rewards for the current user.
 * Calls the claim_all_rewards RPC which handles:
 * - Tax calculation per country
 * - Ledger entries
 * - Resetting unclaimed balances
 */
export function useClaimRewards() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('claim_all_rewards', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['user_dashboard_stats'] });
        queryClient.invalidateQueries({ queryKey: ['user_campaigns'] });
      }
    },
  });

  return {
    claimRewards: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending,
    claimResult: claimMutation.data,
    error: claimMutation.error,
  };
}
