import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Trophy, Clock, Medal } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors } from '@/theme';

export default function LeaderboardScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const { user } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [entries, setEntries] = useState<any[]>([]);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('leaderboard_events')
        .select('*')
        .in('status', ['active', 'ended'])
        .order('status', { ascending: true }) // active first
        .order('end_time', { ascending: false });
        
      if (error) throw error;
      setEvents(data || []);
      
      if (data && data.length > 0) {
        fetchEntries(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function fetchEntries(eventId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*, user:user_id(display_name, avatar_url, email)')
        .eq('event_id', eventId)
        .order('rank', { ascending: true })
        .limit(50);
        
      if (error) throw error;
      setEntries(data || []);
      
      if (user) {
        const me = data?.find(e => e.user_id === user.id);
        if (me) {
          setMyEntry(me);
        } else {
          // fetch my rank if not in top 50
          const { data: myData } = await supabase
            .from('leaderboard_entries')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single();
          setMyEntry(myData || null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handlePrev = () => {
    if (currentEventIndex > 0) {
      const newIdx = currentEventIndex - 1;
      setCurrentEventIndex(newIdx);
      fetchEntries(events[newIdx].id);
    }
  };

  const handleNext = () => {
    if (currentEventIndex < events.length - 1) {
      const newIdx = currentEventIndex + 1;
      setCurrentEventIndex(newIdx);
      fetchEntries(events[newIdx].id);
    }
  };

  if (loading && events.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const event = events[currentEventIndex];

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <View style={styles.center}>
          <Trophy size={48} color={colors.glassBorder} />
          <Text style={styles.emptyText}>No leaderboard events found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEnded = event.status === 'ended';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Event Navigator */}
      <View style={styles.navRow}>
        <Pressable onPress={handlePrev} disabled={currentEventIndex === 0} style={[styles.navBtn, currentEventIndex === 0 && styles.navBtnDisabled]}>
          <ChevronLeft size={20} color={currentEventIndex === 0 ? colors.textTertiary : colors.textPrimary} />
        </Pressable>
        
        <View style={styles.navCenter}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.badgeRow}>
            {isEnded ? (
              <View style={styles.badgeEnded}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={styles.badgeTextEnded}>ENDED</Text>
              </View>
            ) : (
              <View style={styles.badgeActive}>
                <Trophy size={12} color={colors.accentPrimary} />
                <Text style={styles.badgeTextActive}>ACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable onPress={handleNext} disabled={currentEventIndex === events.length - 1} style={[styles.navBtn, currentEventIndex === events.length - 1 && styles.navBtnDisabled]}>
          <ChevronRight size={20} color={currentEventIndex === events.length - 1 ? colors.textTertiary : colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top 3 Podium (Optional, just listing for now) */}
        <View style={styles.podiumContainer}>
          <Image source={require('../../../assets/leaderboard-trophy.png')} style={styles.podiumBg} contentFit="contain" />
          <Text style={styles.eventDesc}>{event.description || "Compete for top ranks and earn massive NRT prizes!"}</Text>
        </View>

        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
             <Text style={[styles.listColRank, { color: colors.textSecondary }]}>Rank</Text>
             <Text style={[styles.listColUser, { color: colors.textSecondary }]}>User</Text>
             <Text style={[styles.listColScore, { color: colors.textSecondary }]}>Score</Text>
          </View>
          
          {loading ? (
             <ActivityIndicator style={{ marginTop: 40 }} color={colors.accentPrimary} />
          ) : entries.length === 0 ? (
             <Text style={styles.noEntries}>No participants yet.</Text>
          ) : (
            entries.map((entry, idx) => (
              <View key={entry.id} style={[styles.entryRow, entry.user_id === user?.id && styles.entryRowMe]}>
                <View style={styles.listColRank}>
                  {entry.rank === 1 ? <Medal size={20} color="#fbbf24" /> :
                   entry.rank === 2 ? <Medal size={20} color="#9ca3af" /> :
                   entry.rank === 3 ? <Medal size={20} color="#b45309" /> :
                   <Text style={styles.rankText}>{entry.rank}</Text>}
                </View>
                <View style={styles.listColUser}>
                  <Image source={{ uri: entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${entry.user?.email}` }} style={styles.userAvatar} />
                  <Text style={styles.userName} numberOfLines={1}>{entry.user?.display_name || entry.user?.email?.split('@')[0] || 'Anonymous'}</Text>
                </View>
                <View style={styles.listColScore}>
                  <Text style={styles.scoreText}>{entry.score.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar for Current User if not in Top 50 */}
      {myEntry && (myEntry.rank > 50) && (
        <View style={styles.stickyBar}>
           <Text style={styles.stickyRank}>Your Rank: #{myEntry.rank}</Text>
           <Text style={styles.stickyScore}>{myEntry.score.toLocaleString()} PTS</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, color: colors.textSecondary },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.5 },
  navCenter: { alignItems: 'center', flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  badgeRow: { flexDirection: 'row' },
  badgeEnded: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bgSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTextEnded: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary },
  badgeActive: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(5, 150, 105, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTextActive: { fontSize: 10, fontWeight: 'bold', color: colors.accentPrimary },

  container: { flex: 1 },
  podiumContainer: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  podiumBg: { width: 120, height: 120, opacity: 0.8, marginBottom: 16 },
  eventDesc: { textAlign: 'center', color: colors.textSecondary, fontSize: 13, lineHeight: 20 },

  listContainer: { backgroundColor: colors.bgCard, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, minHeight: 400, borderWidth: 1, borderColor: colors.glassBorder },
  listHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, marginBottom: 12 },
  listColRank: { width: 50, alignItems: 'center', fontSize: 12, fontWeight: 'bold' },
  listColUser: { flex: 1, flexDirection: 'row', alignItems: 'center', fontSize: 12, fontWeight: 'bold' },
  listColScore: { width: 80, alignItems: 'flex-end', fontSize: 12, fontWeight: 'bold' },

  noEntries: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },

  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  entryRowMe: { backgroundColor: 'rgba(5, 150, 105, 0.05)', borderRadius: 12 },
  rankText: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary },
  userAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: colors.bgSecondary },
  userName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  scoreText: { fontSize: 14, fontWeight: '900', color: colors.accentPrimary },

  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bgSecondary, paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.glassBorder },
  stickyRank: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  stickyScore: { fontSize: 16, fontWeight: '900', color: colors.accentPrimary }
});
