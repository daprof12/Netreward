import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'payment' | 'campaign' | 'system' | 'p2p';
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ 
        notifications: data || [], 
        unreadCount: (data || []).filter(n => !n.is_read).length,
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      set((state) => {
        const updated = state.notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.is_read).length
        };
      });
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  },

  subscribeToNotifications: (userId: string) => {
    const channelId = `notifications:${userId}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
