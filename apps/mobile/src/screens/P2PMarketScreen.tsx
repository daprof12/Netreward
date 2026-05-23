import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, borderRadius, shadows } from '../theme';

type OfferTab = 'buy' | 'sell';
type MyTab = 'offers' | 'orders';
type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  accepted: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  paid: { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
  completed: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  disputed: { bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
};

export default function P2PMarketScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<OfferTab>('buy');
  const [myTab, setMyTab] = useState<MyTab>('offers');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [search, setSearch] = useState('');
  const [offers, setOffers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMyOffers, setShowMyOffers] = useState(false);

  useEffect(() => {
    fetchOffers();
    if (profile?.id) fetchOrders();
  }, [profile?.id]);

  const fetchOffers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('p2p_offers')
      .select('*, users(display_name, kyc_verified)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);
    setOffers(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('p2p_orders')
      .select('*, p2p_offers(*, users(display_name))')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('created_at', { ascending: false })
      .limit(50);
    setOrders(data || []);
  };

  const filteredOffers = offers.filter(o => {
    const matchType = o.type === (activeTab === 'buy' ? 'sell' : 'buy');
    const matchSearch = !search || (o.users?.display_name || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'active') return ['pending', 'accepted', 'paid'].includes(o.status);
    if (orderFilter === 'completed') return o.status === 'completed';
    if (orderFilter === 'cancelled') return ['cancelled', 'disputed'].includes(o.status);
    return true;
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: 8 }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{showMyOffers ? 'My Trading' : 'P2P Market'}</Text>
        <Pressable
          style={s.toggleMyOffers}
          onPress={() => setShowMyOffers(!showMyOffers)}
        >
          <Text style={s.toggleText}>{showMyOffers ? '← Market' : 'My Offers →'}</Text>
        </Pressable>
      </View>

      {/* Tab Switcher */}
      {!showMyOffers ? (
        <View style={s.tabRow}>
          <Pressable
            style={[s.tab, activeTab === 'buy' && s.tabActive]}
            onPress={() => setActiveTab('buy')}
          >
            <Text style={[s.tabText, activeTab === 'buy' && s.tabTextActive]}>Buy NRT</Text>
          </Pressable>
          <Pressable
            style={[s.tab, activeTab === 'sell' && s.tabActiveSell]}
            onPress={() => setActiveTab('sell')}
          >
            <Text style={[s.tabText, activeTab === 'sell' && { color: '#ef4444' }]}>Sell NRT</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.tabRow}>
          <Pressable style={[s.tab, myTab === 'offers' && s.tabActive]} onPress={() => setMyTab('offers')}>
            <Text style={[s.tabText, myTab === 'offers' && s.tabTextActive]}>My Offers</Text>
          </Pressable>
          <Pressable style={[s.tab, myTab === 'orders' && s.tabActive]} onPress={() => setMyTab('orders')}>
            <Text style={[s.tabText, myTab === 'orders' && s.tabTextActive]}>My Orders</Text>
          </Pressable>
        </View>
      )}

      {/* Search */}
      {(!showMyOffers || myTab === 'offers') && (
        <TextInput
          style={s.searchInput}
          placeholder="Search user or offer..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      )}

      {/* Order Filter Pills */}
      {showMyOffers && myTab === 'orders' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {(['all', 'active', 'completed', 'cancelled'] as OrderFilter[]).map(f => (
            <Pressable
              key={f}
              style={[s.filterPill, orderFilter === f && s.filterPillActive]}
              onPress={() => setOrderFilter(f)}
            >
              <Text style={[s.filterPillText, orderFilter === f && s.filterPillTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Offers List */}
          {(!showMyOffers || myTab === 'offers') && (
            filteredOffers.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>🔍</Text>
                <Text style={s.emptyTitle}>No offers found</Text>
                <Text style={s.emptyDesc}>Check back later or create your own offer</Text>
              </View>
            ) : (
              filteredOffers.map(offer => (
                <View key={offer.id} style={s.offerCard}>
                  <View style={s.offerHeader}>
                    <View style={s.offerUser}>
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarText}>{(offer.users?.display_name || 'U')[0].toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={s.userName}>{offer.users?.display_name || 'User'}</Text>
                        <Text style={s.userStats}>⭐ {offer.rating || 'N/A'} · {offer.completion_rate || 100}%</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={s.priceLabel}>Price</Text>
                      <Text style={s.priceValue}>${Number(offer.price_per_nrt || 0).toFixed(4)}</Text>
                    </View>
                  </View>

                  <View style={s.offerInfo}>
                    <View style={s.offerInfoItem}>
                      <Text style={s.offerInfoLabel}>AVAILABLE</Text>
                      <Text style={s.offerInfoValue}>{Number(offer.max_amount || 0).toLocaleString()} NRT</Text>
                    </View>
                    <View style={[s.offerInfoItem, { alignItems: 'flex-end' }]}>
                      <Text style={s.offerInfoLabel}>LIMITS</Text>
                      <Text style={s.offerInfoValue}>{Number(offer.min_amount || 0)}-{Number(offer.max_amount || 0)}</Text>
                    </View>
                  </View>

                  <View style={s.offerFooter}>
                    <View style={s.paymentMethods}>
                      {(offer.payment_methods || ['Bank']).slice(0, 3).map((m: string, i: number) => (
                        <View key={i} style={s.paymentBadge}>
                          <Text style={s.paymentBadgeText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                    <Pressable style={[s.tradeButton, activeTab === 'sell' && { backgroundColor: '#ef4444' }]}>
                      <Text style={s.tradeButtonText}>{activeTab === 'buy' ? 'Buy' : 'Sell'}</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )
          )}

          {/* Orders List */}
          {showMyOffers && myTab === 'orders' && (
            filteredOrders.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>📋</Text>
                <Text style={s.emptyTitle}>No orders found</Text>
                <Text style={s.emptyDesc}>Start trading to see your order history</Text>
              </View>
            ) : (
              filteredOrders.map(order => {
                const isSelling = profile?.id === order.seller_id;
                const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                return (
                  <View key={order.id} style={s.offerCard}>
                    <View style={s.offerHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[s.userAvatar, { backgroundColor: isSelling ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }]}>
                          <Text style={[s.userAvatarText, { color: isSelling ? '#ef4444' : '#10b981' }]}>{isSelling ? 'S' : 'B'}</Text>
                        </View>
                        <View>
                          <Text style={s.userName}>{isSelling ? 'Sold' : 'Bought'} NRT</Text>
                          <Text style={s.userStats}>with {order.p2p_offers?.users?.display_name || 'User'}</Text>
                        </View>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[s.statusBadgeText, { color: statusStyle.text }]}>
                          {order.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={s.offerInfo}>
                      <View style={s.offerInfoItem}>
                        <Text style={[s.offerInfoValue, { color: colors.accentPrimary, fontSize: 16 }]}>
                          {Number(order.nrt_amount).toLocaleString()} NRT
                        </Text>
                        <Text style={s.offerInfoLabel}>${Number(order.fiat_amount).toFixed(2)}</Text>
                      </View>
                      <Text style={[s.offerInfoLabel, { alignSelf: 'flex-end' }]}>
                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )
          )}
        </>
      )}

      {/* KYC Warning */}
      <View style={s.kycWarning}>
        <Text style={s.kycWarningText}>
          ⚠️ <Text style={{ color: '#f59e0b', fontWeight: '800' }}>Verification Required:</Text>{' '}
          All P2P participants must use their legal names as submitted in KYC documents.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  toggleMyOffers: { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toggleText: { fontSize: 11, fontWeight: '800', color: colors.accentPrimary },

  tabRow: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.bgCard, ...shadows.sm },
  tabActiveSell: { backgroundColor: colors.bgCard, ...shadows.sm },
  tabText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
  tabTextActive: { color: colors.accentPrimary },

  searchInput: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: colors.textPrimary, marginBottom: 12 },

  filterPill: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  filterPillActive: { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: colors.accentPrimary },
  filterPillText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  filterPillTextActive: { color: colors.accentPrimary },

  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  emptyDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },

  offerCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  offerUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 14, fontWeight: '900', color: colors.accentPrimary },
  userName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  userStats: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  priceLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'right' },
  priceValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },

  offerInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  offerInfoItem: { gap: 2 },
  offerInfoLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
  offerInfoValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  offerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentMethods: { flexDirection: 'row', gap: 6 },
  paymentBadge: { backgroundColor: colors.bgSecondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  paymentBadgeText: { fontSize: 9, fontWeight: '700', color: colors.textSecondary },
  tradeButton: { backgroundColor: colors.accentPrimary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8, ...shadows.accent },
  tradeButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  kycWarning: { marginTop: 20, backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)', borderRadius: 14, padding: 14 },
  kycWarningText: { fontSize: 11, color: colors.textSecondary, lineHeight: 18 },
});
