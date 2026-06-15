import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, FlatList } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'expo-router';
import { useThemeColors, shadows } from '@/theme';
import { ArrowRight, Coins, ShieldCheck, Wifi } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Earn passively',
    description: 'Get rewarded with NRT tokens simply by using your favorite apps and consuming data.',
    icon: Coins,
  },
  {
    id: '2',
    title: 'Privacy first',
    description: 'No credit cards, no data selling. Your internet habits remain completely private.',
    icon: ShieldCheck,
  },
  {
    id: '3',
    title: 'Seamless tracking',
    description: 'Connect your devices once, and start earning instantly in the background.',
    icon: Wifi,
  },
];

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setHasOnboarded } = useAuthStore();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex === slides.length - 1) {
      setHasOnboarded(true);
      router.replace('/(auth)');
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    }
  };

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Decorators */}
      <View style={styles.decorator} />

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={styles.slide}>
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.iconContainer}
              >
                <Icon size={64} color={colors.accentPrimary} />
              </LinearGradient>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <Pressable style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? 'Start Earning' : 'Continue'}
          </Text>
          <ArrowRight size={20} color={colors.bgPrimary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  decorator: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 128,
    height: 128,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.glow,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 32,
    backgroundColor: colors.accentPrimary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  button: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 16,
    ...shadows.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bgPrimary,
  },
});
