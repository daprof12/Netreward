import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, AlertCircle, CheckCircle2, MessageSquare, ShieldAlert, Search, ChevronRight, X, Send, Paperclip, Inbox } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDisputes, type P2PDispute } from '@/hooks/useDisputes';
import { useThemeColors } from '@/theme';

export default function DisputesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const { disputes, isLoading, sendMessage, isSending } = useDisputes();
  const [search, setSearch] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<P2PDispute | null>(null);
  const [reply, setReply] = useState('');

  const filteredDisputes = disputes.filter(d => 
    d.trade_id.toLowerCase().includes(search.toLowerCase()) || 
    d.reason.toLowerCase().includes(search.toLowerCase())
  );

  const activeCases = disputes.filter(d => d.status === 'open' || d.status === 'investigating').length;
  const resolvedCases = disputes.filter(d => d.status === 'resolved').length;

  const handleSendMessage = async () => {
    if (!reply.trim() || !selectedDispute) return;
    try {
      await sendMessage({ disputeId: selectedDispute.id, message: reply });
      setReply('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#f59e0b';
      case 'investigating': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'dismissed': return '#ef4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'open': return 'rgba(245, 158, 11, 0.1)';
      case 'investigating': return 'rgba(59, 130, 246, 0.1)';
      case 'resolved': return 'rgba(16, 185, 129, 0.1)';
      case 'dismissed': return 'rgba(239, 68, 68, 0.1)';
      default: return colors.bgSecondary;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs} hrs ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Dispute Center</Text>
            <Text style={styles.headerSubtitle}>Track and manage your trade resolutions</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AlertCircle size={20} color="#f59e0b" style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>Active Cases</Text>
            <Text style={styles.statValue}>{activeCases}</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle2 size={20} color="#10b981" style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>Resolved</Text>
            <Text style={styles.statValue}>{resolvedCases}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Trade ID..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* List */}
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 60 }}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: 40 }} />
          ) : filteredDisputes.length > 0 ? (
            filteredDisputes.map((dispute) => (
              <Pressable key={dispute.id} style={styles.disputeCard} onPress={() => setSelectedDispute(dispute)}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.iconWrapper}>
                      <ShieldAlert size={20} color={colors.accentPrimary} />
                    </View>
                    <View>
                      <Text style={styles.tradeIdText}>Trade: {dispute.trade_id}</Text>
                      <Text style={styles.dateText}>{formatDate(dispute.created_at)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(dispute.status), borderColor: getStatusColor(dispute.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>{dispute.status}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.reasonText} numberOfLines={1}>{dispute.reason}</Text>
                  <Text style={styles.descText} numberOfLines={2}>{dispute.description}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <MessageSquare size={14} color={colors.textSecondary} />
                    <Text style={styles.msgCountText}>{dispute.messages?.length || 0} Messages</Text>
                  </View>
                  <View style={styles.footerRight}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRight size={14} color={colors.accentPrimary} />
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Inbox size={48} color={colors.textTertiary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No disputes found</Text>
              <Text style={styles.emptyText}>All your P2P trade disputes will appear here</Text>
            </View>
          )}
        </ScrollView>

        {/* Detail Modal */}
        <Modal visible={!!selectedDispute} transparent animationType="slide" onRequestClose={() => setSelectedDispute(null)}>
          {selectedDispute && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <ShieldAlert size={24} color="#f59e0b" />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>Case: {selectedDispute.trade_id}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(selectedDispute.status), borderColor: getStatusColor(selectedDispute.status) }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(selectedDispute.status) }]}>{selectedDispute.status}</Text>
                        </View>
                        <Text style={styles.modalDateText}>{formatDate(selectedDispute.updated_at)}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable onPress={() => setSelectedDispute(null)} style={styles.closeBtn}>
                    <X size={24} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {/* Chat & Details Scroll */}
                <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20 }}>
                  <View style={styles.detailsBox}>
                    <Text style={styles.sectionLabel}>DISPUTE DETAILS</Text>
                    <Text style={styles.detailReason}>{selectedDispute.reason}</Text>
                    <Text style={styles.detailDesc}>{selectedDispute.description}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>Category: {selectedDispute.category.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>

                  <Text style={[styles.sectionLabel, { textAlign: 'center', marginTop: 24, marginBottom: 16 }]}>RESOLUTION CHAT</Text>
                  
                  {(!selectedDispute.messages || selectedDispute.messages.length === 0) ? (
                    <Text style={styles.emptyChatText}>No messages yet</Text>
                  ) : (
                    selectedDispute.messages.map((m: any) => {
                      const isUser = m.sender_type === 'user';
                      const isAdmin = m.sender_type === 'admin';
                      return (
                        <View key={m.id} style={[styles.msgWrapper, isUser ? styles.msgRight : styles.msgLeft]}>
                          <View style={styles.msgMeta}>
                            <Text style={styles.msgSender}>{isUser ? 'You' : isAdmin ? 'Support Agent' : 'Counterparty'}</Text>
                            <Text style={styles.msgTime}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                          <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : isAdmin ? styles.msgBubbleAdmin : styles.msgBubbleOther]}>
                            <Text style={[styles.msgText, isUser ? styles.msgTextUser : isAdmin ? styles.msgTextAdmin : styles.msgTextOther]}>
                              {m.message}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                  
                  <View style={styles.waitBadgeWrapper}>
                    <View style={styles.waitBadge}>
                      <Text style={styles.waitBadgeText}>WAIT FOR ADMIN RESOLUTION</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Input */}
                <View style={styles.inputSection}>
                  <Pressable style={styles.attachBtn}>
                    <Paperclip size={20} color={colors.textSecondary} />
                  </Pressable>
                  <TextInput
                    style={styles.chatInput}
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Reply to the investigation..."
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Pressable 
                    style={[styles.sendBtn, (!reply.trim() || isSending) && styles.sendBtnDisabled]} 
                    onPress={handleSendMessage}
                    disabled={!reply.trim() || isSending}
                  >
                    {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  container: { flex: 1, padding: 20 },
  
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  statLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },

  listContainer: { flex: 1 },
  disputeCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' },
  tradeIdText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  dateText: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  
  cardBody: { marginBottom: 16 },
  reasonText: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  descText: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  msgCountText: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontSize: 11, fontWeight: 'bold', color: colors.accentPrimary },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  emptyText: { fontSize: 12, color: colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', borderWidth: 1, borderColor: colors.glassBorder },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, backgroundColor: colors.bgSecondary },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  modalDateText: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },

  modalScroll: { flex: 1 },
  detailsBox: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  detailReason: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  detailDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: 'bold', color: colors.accentPrimary },

  emptyChatText: { textAlign: 'center', fontSize: 13, color: colors.textSecondary },
  
  msgWrapper: { marginBottom: 16, maxWidth: '85%' },
  msgRight: { alignSelf: 'flex-end' },
  msgLeft: { alignSelf: 'flex-start' },
  msgMeta: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4, paddingHorizontal: 8 },
  msgSender: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  msgTime: { fontSize: 9, color: colors.textTertiary },
  
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  msgBubbleUser: { backgroundColor: colors.accentPrimary, borderTopRightRadius: 4 },
  msgBubbleAdmin: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', borderTopLeftRadius: 4 },
  msgBubbleOther: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderTopLeftRadius: 4 },
  
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: '#fff' },
  msgTextAdmin: { color: '#60a5fa' },
  msgTextOther: { color: colors.textPrimary },

  waitBadgeWrapper: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  waitBadge: { backgroundColor: colors.bgSecondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  waitBadgeText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 1 },

  inputSection: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, backgroundColor: colors.bgSecondary },
  attachBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder, marginRight: 12 },
  chatInput: { flex: 1, height: 44, backgroundColor: colors.bgPrimary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 16, color: colors.textPrimary, marginRight: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
