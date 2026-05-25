import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Plus, Search, Filter, ArrowRightLeft, ListOrdered, ShieldAlert, AlertCircle, CheckCircle2, TrendingUp, XCircle, CreditCard, ShieldCheck, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useP2PStore } from '@/stores/useP2PStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors } from '@/theme';

export default function P2PMarketplaceScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: string }>(); // 'my-offers' or undefined
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const isMyOffersMode = mode === 'my-offers';

  const { user } = useAuthStore();
  const { offers, orders, fetchOrders } = useP2PStore();
  const { getCurrencyDetails } = useCurrencyStore();
  const { symbol, rate } = getCurrencyDetails();
  const NRT_LIVE_PRICE = useTokenPrice();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [myTab, setMyTab] = useState<'offers' | 'orders'>('offers');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isMyOffersMode && user) {
      fetchOrders(user.id);
    }
  }, [isMyOffersMode, user]);

  const filteredOffers = useMemo(() => {
    let baseOffers = offers || [];

    if (isMyOffersMode && user) {
      baseOffers = baseOffers.filter((o: any) => o.userId === user.id);
    } else {
      baseOffers = baseOffers.filter((o: any) => o.type === (activeTab === 'buy' ? 'sell' : 'buy'));
    }

    return baseOffers.filter((o: any) => {
      if (o.asset !== 'NRT') return false;
      if (search && !o.userName.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [offers, activeTab, search, isMyOffersMode, user]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    // Just returning all for now, can implement filters later
    return orders;
  }, [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
      case 'accepted': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' };
      case 'paid': return { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' };
      case 'completed': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' };
      case 'cancelled': case 'disputed': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' };
      default: return { bg: colors.bgSecondary, text: colors.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => isMyOffersMode ? router.back() : router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>{isMyOffersMode ? 'My Trading' : 'P2P Market'}</Text>
            <Text style={styles.headerSubtitle}>{isMyOffersMode ? 'Manage offers & orders' : 'Trade NRT directly with others'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push('/wallet/deposit/p2p/disputes')} style={styles.iconBtn}>
            <ShieldAlert size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => router.push('/wallet/deposit/p2p/create')} style={[styles.iconBtn, styles.iconBtnAdd]}>
            <Plus size={22} color={colors.accentPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Tabs */}
        {isMyOffersMode ? (
          <View style={styles.tabContainer}>
            <Pressable onPress={() => setMyTab('offers')} style={[styles.tab, myTab === 'offers' && styles.tabActive]}>
              <ArrowRightLeft size={16} color={myTab === 'offers' ? colors.accentPrimary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, myTab === 'offers' && { color: colors.accentPrimary }]}>My Offers</Text>
            </Pressable>
            <Pressable onPress={() => setMyTab('orders')} style={[styles.tab, myTab === 'orders' && styles.tabActive]}>
              <ListOrdered size={16} color={myTab === 'orders' ? colors.accentPrimary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, myTab === 'orders' && { color: colors.accentPrimary }]}>My Orders</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tabContainer}>
            <Pressable onPress={() => setActiveTab('buy')} style={[styles.tab, activeTab === 'buy' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'buy' && { color: colors.accentPrimary }]}>Buy</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('sell')} style={[styles.tab, activeTab === 'sell' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'sell' && { color: colors.textPrimary }]}>Sell</Text>
            </Pressable>
          </View>
        )}

        {/* Search and Price */}
        {(!isMyOffersMode || myTab === 'offers') && (
          <View style={styles.searchSection}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search user or ID..."
                  placeholderTextColor={colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <Pressable style={styles.filterBtn}>
                <Filter size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.priceBanner}>
              <TrendingUp size={16} color={colors.accentPrimary} />
              <Text style={styles.priceBannerText}>
                NRT Live Price: <Text style={{ fontWeight: 'bold' }}>{symbol}{(NRT_LIVE_PRICE * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 7 })}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* List content */}
        {isMyOffersMode && myTab === 'orders' ? (
          <View style={styles.listContainer}>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order: any) => {
                const amISelling = user && order.seller_id === user.id;
                const counterpartyName = order.p2p_offers?.users?.display_name || (amISelling ? 'Buyer' : 'Seller');
                const sColor = getStatusColor(order.status);

                return (
                  <Pressable key={order.id} style={styles.offerCard} onPress={() => router.push(`/wallet/deposit/p2p/orders/${order.id}` as any)}>
                    <View style={styles.offerHeader}>
                      <View style={styles.offerUser}>
                        <View style={[styles.userInitial, { backgroundColor: amISelling ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                          <Text style={{ color: amISelling ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                            {amISelling ? 'S' : 'B'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.userName}>{amISelling ? 'Sold' : 'Bought'} NRT</Text>
                          <Text style={styles.userStats}>with {counterpartyName}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: sColor.bg }]}>
                        <Text style={[styles.statusText, { color: sColor.text }]}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.offerLimits, { borderTopWidth: 0, paddingVertical: 0, marginTop: 12 }]}>
                      <View>
                        <Text style={[styles.priceValue, { color: colors.accentPrimary }]}>{Number(order.nrt_amount).toLocaleString()} NRT</Text>
                        <Text style={styles.limitValue}>${Number(order.fiat_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                        <Text style={styles.limitValue}>
                          {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <ListOrdered size={40} color={colors.textTertiary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No orders found.</Text>
                <Text style={styles.emptySub}>Start trading to see your order history here.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredOffers.length > 0 ? (
              filteredOffers.map((offer: any) => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <View style={styles.offerUser}>
                      <View style={styles.userInitial}>
                        <Text style={styles.userInitialText}>{offer.userName[0]}</Text>
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.userName}>{offer.userName}</Text>
                          {offer.isVerified && <ShieldCheck size={14} color="#3b82f6" />}
                        </View>
                        <Text style={styles.userStats}>
                          <Text style={{ color: colors.accentPrimary, fontWeight: 'bold' }}>⭐ {offer.rating || 'N/A'} </Text>
                          ({offer.reviewCount || 0}) · {offer.completionRate}% completion
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceLabel}>Price</Text>
                      <Text style={styles.priceValue}>{symbol}{((Number(offer.price) || 0) * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 7 })}</Text>
                    </View>
                  </View>

                  <View style={styles.offerLimits}>
                    <View>
                      <Text style={styles.limitLabel}>AVAILABLE</Text>
                      <Text style={styles.limitValue}>{(Number(offer.maxAmount) || 0).toLocaleString()} {offer.asset}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.limitLabel}>LIMITS</Text>
                      <Text style={styles.limitValue}>
                        {symbol}{((Number(offer.minAmount) || 0) * (Number(offer.price) || 0) * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })} - {symbol}{((Number(offer.maxAmount) || 0) * (Number(offer.price) || 0) * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.offerFooter}>
                    <View style={styles.methodsRow}>
                      {offer.paymentMethods?.map((m: string) => (
                        <View key={m} style={styles.methodBadge}>
                          <Text style={styles.methodText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                    <Pressable
                      style={[styles.actionBtn, isMyOffersMode || (user && offer.userId === user.id) ? styles.actionBtnManage : activeTab === 'buy' ? styles.actionBtnBuy : styles.actionBtnSell]}
                      onPress={() => {
                        const isOwnOffer = user && offer.userId === user.id;
                        if (isMyOffersMode || isOwnOffer) {
                          router.push({ pathname: '/wallet/deposit/p2p/create', params: { editOfferId: offer.id } });
                        } else {
                          router.push({ pathname: '/wallet/deposit/p2p/flow', params: { offerId: offer.id } });
                        }
                      }}
                    >
                      <Text style={[styles.actionBtnText, isMyOffersMode || (user && offer.userId === user.id) ? { color: colors.textPrimary } : {}]}>
                        {isMyOffersMode || (user && offer.userId === user.id) ? 'Manage' : activeTab === 'buy' ? 'Buy' : 'Sell'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No offers found.</Text>
              </View>
            )}
          </View>
        )}

        {/* Management Links */}
        {!isMyOffersMode && (
          <View style={styles.mgmtGrid}>
            <Pressable style={styles.mgmtCard} onPress={() => router.push('/wallet/deposit/p2p/accounts')}>
              <View style={[styles.mgmtIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <CreditCard size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.mgmtTitle}>Payments</Text>
                <Text style={styles.mgmtSub}>Manage accounts</Text>
              </View>
            </Pressable>
            <Pressable style={styles.mgmtCard} onPress={() => router.push({ pathname: '/wallet/deposit/p2p', params: { mode: 'my-offers' } })}>
              <View style={[styles.mgmtIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                <ArrowRightLeft size={20} color="#a855f7" />
              </View>
              <View>
                <Text style={styles.mgmtTitle}>My Offers</Text>
                <Text style={styles.mgmtSub}>Manage listings</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* KYC Warning */}
        <View style={styles.kycWarning}>
          <AlertCircle size={20} color="#f59e0b" style={{ marginRight: 12, marginTop: 2 }} />
          <Text style={styles.kycWarningText}>
            <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>Verification Required: </Text>
            All P2P participants must use their legal names as submitted in KYC documents. Payments to/from third-party accounts are strictly prohibited.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconBtnAdd: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: colors.bgSecondary },

  container: { flex: 1, paddingHorizontal: 20 },

  tabContainer: { flexDirection: 'row', backgroundColor: colors.bgSecondary, padding: 4, borderRadius: 12, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: colors.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary },

  searchSection: { marginBottom: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.glassBorder },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, color: colors.textPrimary, fontSize: 14 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },

  priceBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', gap: 8 },
  priceBannerText: { fontSize: 12, color: colors.textPrimary },

  listContainer: { marginBottom: 24 },
  offerCard: { backgroundColor: colors.bgPrimary, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  offerUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userInitial: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' },
  userInitialText: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary },
  userName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  userStats: { fontSize: 11, color: colors.textSecondary },
  priceLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: 'bold', marginBottom: 2 },
  priceValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },

  offerLimits: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.glassBorder, paddingVertical: 12, marginBottom: 12 },
  limitLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4 },
  limitValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },

  offerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1, marginRight: 16 },
  methodBadge: { backgroundColor: colors.bgSecondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  methodText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary },

  actionBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnBuy: { backgroundColor: colors.accentPrimary },
  actionBtnSell: { backgroundColor: '#ef4444' },
  actionBtnManage: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 14, color: colors.textSecondary },
  emptySub: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },

  mgmtGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  mgmtCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder, gap: 12 },
  mgmtIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mgmtTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  mgmtSub: { fontSize: 10, color: colors.textSecondary },

  kycWarning: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  kycWarningText: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 18 },
});
