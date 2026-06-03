import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View, StyleSheet } from 'react-native';

interface MarqueeTextProps {
  style?: any;
  children: React.ReactNode;
}

export default function MarqueeText({ style, children }: MarqueeTextProps) {
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (textWidth > containerWidth && containerWidth > 0) {
      const distance = textWidth - containerWidth + 20; // 20px extra padding
      const duration = distance * 40; // 40ms per pixel
      
      const startAnimation = () => {
        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(animatedValue, {
            toValue: -distance,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) startAnimation();
        });
      };

      startAnimation();
    } else {
      animatedValue.setValue(0);
      animatedValue.stopAnimation();
    }
  }, [textWidth, containerWidth]);

  return (
    <View 
      style={{ overflow: 'hidden', flex: 1 }} 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={{ flexDirection: 'row', alignSelf: 'flex-start', transform: [{ translateX: animatedValue }] }}>
        <Text
          style={[style, { flexShrink: 0 }]}
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          numberOfLines={1}
        >
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}
