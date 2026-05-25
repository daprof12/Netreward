import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Bell, X, CreditCard, Package, MessageCircle, ShieldAlert, ExternalLink } from 'lucide-react-native';
import { useThemeColors } from '@/theme';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'expo-router';

export default function NotificationBell() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications, subscribeToNotifications } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      const unsubscribe = subscribeToNotifications(user.id);
      return () => unsubscribe();
    }
  }, [user?.id]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard color="#34d399" size={16} />;
      case 'campaign': return <Package color="#60a5fa" size={16} />;
      case 'p2p': return <MessageCircle color="#c084fc" size={16} />;
      default: return <ShieldAlert color="#fbbf24" size={16} />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setIsOpen(false);
    if (n.link) {
      // In mobile, we might need to adjust link format to expo-router paths
      router.push(n.link as any);
    }
  };

  return (
    <>
      <Pressable onPress={() => setIsOpen(true)} style={styles.bellBtn}>
        <Bell size={24} color={colors.textSecondary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <Pressable onPress={markAllAsRead}>
                  <Text style={styles.markAllBtn}>Mark all as read</Text>
                </Pressable>
              )}
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Bell size={24} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                <View>
                  {notifications.map((n) => (
                    <Pressable
                      key={n.id}
                      onPress={() => handleNotificationClick(n)}
                      style={[styles.notifItem, !n.is_read && styles.notifItemUnread]}
                    >
                      <View style={styles.iconWrapper}>
                        {getIcon(n.type)}
                      </View>
                      <View style={styles.contentWrapper}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.notifTitle, !n.is_read && { color: colors.textPrimary }]} numberOfLines={1}>
                            {n.title}
                          </Text>
                          <Text style={styles.dateText}>
                            {new Date(n.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.messageText} numberOfLines={2}>
                          {n.message}
                        </Text>
                        {n.link && (
                          <View style={styles.linkRow}>
                            <Text style={styles.linkText}>View Details</Text>
                            <ExternalLink size={10} color={colors.accentPrimary} style={{ marginLeft: 4 }} />
                          </View>
                        )}
                      </View>
                      {!n.is_read && <View style={styles.unreadDot} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  bellBtn: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bgPrimary, paddingHorizontal: 2 },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, backgroundColor: colors.bgPrimary },
  title: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  markAllBtn: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  
  emptyState: { padding: 32, alignItems: 'center' },
  emptyIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, opacity: 0.5 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  
  notifItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  notifItemUnread: { backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  iconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder, marginRight: 12 },
  contentWrapper: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, flex: 1, marginRight: 8 },
  dateText: { fontSize: 10, color: colors.textSecondary },
  messageText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  linkText: { fontSize: 10, fontWeight: 'bold', color: colors.accentPrimary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentPrimary, marginTop: 4, marginLeft: 8 },
  
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, backgroundColor: colors.bgPrimary, alignItems: 'center' },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 16, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  closeBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary }
});
