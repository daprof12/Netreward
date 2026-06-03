import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';

interface PulseDotProps {
  size?: number;
  color?: string;
  style?: any;
}

export default function PulseDot({ size = 8, color = '#22c55e', style }: PulseDotProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const opacity = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.8, 0, 0] });

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Animated.View 
        style={{ 
          position: 'absolute', 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          backgroundColor: color, 
          transform: [{ scale }], 
          opacity 
        }} 
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
