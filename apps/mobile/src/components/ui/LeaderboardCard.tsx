import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Trophy, ChevronRight, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors } from '@/theme';

export default function LeaderboardCard() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const { user } = useAuthStore();
  const [event, setEvent] = useState<any>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myScore, setMyScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: events, error: eventErr } = await supabase
          .from('leaderboard_events')
          .select('*')
          .eq('status', 'active')
          .order('end_time', { ascending: true })
          .limit(1);

        if (eventErr) throw eventErr;
        
        let activeEvent = events && events.length > 0 ? events[0] : null;

        if (!activeEvent) {
          const { data: endedEvents } = await supabase
            .from('leaderboard_events')
            .select('*')
            .eq('status', 'ended')
            .order('end_time', { ascending: false })
            .limit(1);
          if (endedEvents && endedEvents.length > 0) activeEvent = endedEvents[0];
        }

        setEvent(activeEvent);

        if (activeEvent && user) {
          const { data: entry } = await supabase
            .from('leaderboard_entries')
            .select('*')
            .eq('event_id', activeEvent.id)
            .eq('user_id', user.id)
            .single();
          
          if (entry) {
            setMyRank(entry.rank);
            setMyScore(entry.score);
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) return null;

  if (!event) {
    return (
      <View style={styles.fallbackCard}>
        <View style={styles.fallbackRow}>
          <View style={styles.fallbackIconWrapper}>
            <Trophy size={20} color={colors.accentPrimary} />
          </View>
          <View style={styles.fallbackTextWrapper}>
            <Text style={styles.fallbackTitle}>Leaderboard</Text>
            <Text style={styles.fallbackSubtitle}>View rankings and past events</Text>
          </View>
        </View>
        <Pressable 
          style={styles.fallbackBtn} 
          onPress={() => router.push('/wallet/leaderboard')}
        >
          <Text style={styles.fallbackBtnText}>Open</Text>
          <ChevronRight size={14} color={colors.accentPrimary} />
        </Pressable>
      </View>
    );
  }

  const isEnded = event?.status === 'ended';
  const eventTitle = event?.title || "Season 1 has ended";
  const desc = event?.description || "Winners will receive prizes by June 30. Follow our social media handles for next season challenges.";

  return (
    <View style={styles.card}>
      <Image 
        source={require('../../../assets/leaderboard-trophy.png')} 
        style={styles.bgIcon}
        contentFit="contain"
      />
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          {isEnded ? (
            <View style={styles.badgeEnded}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={styles.badgeTextEnded}>EVENT ENDED</Text>
            </View>
          ) : (
            <View style={styles.badgeActive}>
              <Trophy size={12} color={colors.accentPrimary} />
              <Text style={styles.badgeTextActive}>ACTIVE EVENT</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{eventTitle}</Text>
        <Text style={styles.description}>{desc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridBox}>
            <View style={styles.gridValueRow}>
              <Trophy size={14} color="#fb923c" />
              <Text style={styles.gridValueRank}>{myRank ? myRank.toLocaleString() : '-'}</Text>
            </View>
            <Text style={styles.gridLabel}>MY RANK</Text>
          </View>

          <View style={styles.gridBox}>
             <View style={styles.gridValueRow}>
              <Text style={styles.gridValuePrize}>$100</Text>
            </View>
            <Text style={styles.gridLabel}>PRIZE DRAW</Text>
          </View>

          <View style={styles.gridBox}>
            <View style={styles.gridValueRow}>
              <Text style={styles.gridValueScore}>{myScore > 0 ? myScore.toLocaleString() : '-'}</Text>
            </View>
            <Text style={styles.gridLabel}>{event?.event_type === 'nrt_spent' ? 'NRT SPENT' : 'EARNED'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.avatarRow}>
            {[1, 2, 3, 4, 5].map((i, idx) => (
              <View key={i} style={[styles.avatarWrapper, { zIndex: 10 - i, marginLeft: idx > 0 ? -8 : 0 }]}>
                 <Image 
                    source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=User${i}` }}
                    style={styles.avatar}
                    contentFit="cover"
                 />
              </View>
            ))}
          </View>
          <Pressable 
            style={styles.openBtn}
            onPress={() => router.push('/wallet/leaderboard')}
          >
            <Text style={styles.openBtnText}>Open Leaderboard</Text>
            <ChevronRight size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  fallbackCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder },
  fallbackRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fallbackIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(5, 150, 105, 0.1)', alignItems: 'center', justifyContent: 'center' },
  fallbackTextWrapper: { },
  fallbackTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  fallbackSubtitle: { fontSize: 12, color: colors.textSecondary },
  fallbackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fallbackBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },

  card: { backgroundColor: colors.bgCard, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder },
  bgIcon: { position: 'absolute', right: -20, top: 20, width: 140, height: 140, opacity: 0.15 },
  content: { padding: 20, zIndex: 10 },
  
  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  badgeEnded: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTextEnded: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 0.5 },
  badgeActive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5, 150, 105, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTextActive: { fontSize: 10, fontWeight: 'bold', color: colors.accentPrimary, letterSpacing: 0.5 },

  title: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  description: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 20 },

  grid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  gridBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  gridValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  gridValueRank: { fontSize: 18, fontWeight: '900', color: '#fb923c' },
  gridValuePrize: { fontSize: 18, fontWeight: '900', color: '#34d399' },
  gridValueScore: { fontSize: 18, fontWeight: '900', color: colors.accentPrimary },
  gridLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, borderWidth: 2, borderColor: colors.bgCard, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openBtnText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
});
