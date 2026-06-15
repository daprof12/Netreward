import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface NrtLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function NrtLoader({ message = 'Loading…', size = 'lg' }: NrtLoaderProps) {
  const dim = size === 'sm' ? 48 : size === 'md' ? 72 : 100;
  const containerDim = dim + 40;

  // Animations
  const spinAnim = useRef(new Animated.Value(0)).current;
  const reverseSpinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Spin animation (continuous)
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Reverse spin animation (continuous)
    Animated.loop(
      Animated.timing(reverseSpinAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation (continuous)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pop animation (once)
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();

    // Fade animation (continuous)
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dots animation
    const dotAnimations = dotAnims.map((anim, i) => {
      // Create infinite staggered loop using delay inside the loop
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((3 - i) * 200 + 40), // Pad remaining time to maintain 1200ms cycle
        ])
      );
    });
    
    dotAnimations.forEach(anim => anim.start());
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = reverseSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const popScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const popOpacity = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const textOpacity = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      {/* ── Glowing ring + spinning logo ── */}
      <View style={{ width: containerDim, height: containerDim, justifyContent: 'center', alignItems: 'center' }}>
        {/* Outer pulsing glow */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: containerDim,
              height: containerDim,
              borderRadius: containerDim / 2,
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Spinning arc */}
        <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin }] }}>
          <Svg width={containerDim} height={containerDim} viewBox="0 0 120 120">
            <Defs>
              <LinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <Stop offset="50%" stopColor="#34d399" stopOpacity="1" />
                <Stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="120 220"
            />
          </Svg>
        </Animated.View>

        {/* Counter-spinning inner arc */}
        <Animated.View style={{ position: 'absolute', transform: [{ rotate: reverseSpin }] }}>
          <Svg width={containerDim} height={containerDim} viewBox="0 0 120 120">
            <Circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="rgba(52,211,153,0.4)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="60 300"
            />
          </Svg>
        </Animated.View>

        {/* Logo image */}
        <Animated.View
          style={{
            position: 'absolute',
            transform: [{ scale: popScale }],
            opacity: popOpacity,
          }}
        >
          <Image
            source={require('../../../assets/nrt-logo.png')}
            style={{ width: dim, height: dim, borderRadius: dim * 0.18 }}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* ── Brand name ── */}
      <View style={styles.textContainer}>
        <Text style={styles.brandText}>NetReward</Text>
        <Animated.Text style={[styles.messageText, { opacity: textOpacity }]}>
          {message}
        </Animated.Text>
      </View>

      {/* ── Dot progress bar ── */}
      <View style={styles.dotsContainer}>
        {dotAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                transform: [
                  {
                    scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
  brandText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34d399',
    letterSpacing: -0.5,
  },
  messageText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
});
