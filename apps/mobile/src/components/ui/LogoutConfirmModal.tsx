import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TouchableWithoutFeedback } from 'react-native';
import { useThemeColors } from '@/theme';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>Confirm Logout</Text>
              <Text style={styles.message}>Are you sure you want to log out of your account?</Text>
              
              <View style={styles.buttonRow}>
                <Pressable onPress={onClose} style={[styles.button, styles.cancelButton]}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
                  <Text style={styles.confirmText}>Log Out</Text>
                </Pressable>
              </View>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  confirmText: {
    color: '#ef4444',
    fontWeight: 'bold',
  }
});
