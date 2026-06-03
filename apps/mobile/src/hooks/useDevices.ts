import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import * as SecureStore from 'expo-secure-store';

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'phone' | 'laptop' | 'tablet' | 'desktop' | 'other';
  os?: string;
  mac_address?: string;
  ip_address?: string;
  fingerprint?: string;
  status: 'active' | 'offline' | 'disconnected';
  country?: string;
  isp_name?: string;
  signal_strength: number;
  created_at: string;
  updated_at?: string;
}

export interface DeviceSession {
  id: string;
  device_id: string;
  campaign_id: string;
  bytes_up: number;
  bytes_down: number;
  nrt_awarded: number;
  session_start: string;
  session_end: string;
}

export function useDevices() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch all devices for current user
  const { data: devices, isLoading: isLoadingDevices } = useQuery({
    queryKey: ['devices', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as Device[];
    },
    enabled: !!user,
  });

  // Mutation to add (or re-activate) a device — upsert on fingerprint
  // so the same physical device can never be linked twice.
  const addDeviceMutation = useMutation({
    mutationFn: async (devicePayload: Partial<Device> & { fingerprint?: string }) => {
      if (!user) throw new Error('Must be logged in to add device');

      const fingerprint = devicePayload.fingerprint
        || (await SecureStore.getItemAsync('nrt_device_fingerprint'))
        || undefined;

      // Check if this fingerprint already exists for THIS user — re-activate if so
      if (fingerprint) {
        const { data: existing } = await supabase
          .from('devices')
          .select('id, user_id')
          .eq('fingerprint', fingerprint)
          .maybeSingle();

        if (existing) {
          if (existing.user_id !== user.id) {
            throw new Error('This device is already linked to another account.');
          }
          // Already linked to this user — just refresh status
          const { data, error } = await supabase
            .from('devices')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      }

      // New device — insert
      const { data, error } = await supabase
        .from('devices')
        .insert({
          user_id: user.id,
          device_name: devicePayload.device_name || 'New Device',
          device_type: devicePayload.device_type || 'phone',
          status: 'active',
          os: devicePayload.os || 'Unknown',
          isp_name: devicePayload.isp_name || 'Unknown ISP',
          country: devicePayload.country,
          fingerprint: fingerprint,
          signal_strength: 100,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', user?.id] });
    },
  });

  // Mutation to disconnect/delete a device
  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', user.id); // extra security

      if (error) throw error;
      return deviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', user?.id] });
    }
  });

  // Mutation to update a device (name, status, etc.)
  const updateDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, updates }: { deviceId: string; updates: Partial<Device> }) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from('devices')
        .update(updates)
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['device'] });
    }
  });

  return {
    devices,
    isLoading: isLoadingDevices,
    addDevice: addDeviceMutation.mutateAsync,
    isAdding: addDeviceMutation.isPending,
    removeDevice: removeDeviceMutation.mutateAsync,
    isRemoving: removeDeviceMutation.isPending,
    updateDevice: updateDeviceMutation.mutateAsync,
    isUpdating: updateDeviceMutation.isPending
  };
}
