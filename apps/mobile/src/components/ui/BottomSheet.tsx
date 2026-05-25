import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, PanResponder, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useThemeColors } from '@/theme';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const { height } = Dimensions.get('window');

export default function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const panY = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else {
      Animated.timing(panY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, panY]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[styles.sheet, { transform: [{ translateY: panY }], paddingBottom: insets.bottom + 20 }]}
            >
              <View {...panResponder.panHandlers} style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
              
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <X size={16} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.content}>
                {children}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '90%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.glassBorder,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
  },
  content: {
    paddingHorizontal: 20,
  }
});
