import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';;
import { useRouter } from 'expo-router';
import { ChevronLeft, HelpCircle, Plus, MessageSquare, Send, AlertCircle, Inbox } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useThemeColors } from '@/theme';
import BottomSheet from '@/components/ui/BottomSheet';

const supportSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Please provide more details (at least 10 characters)'),
});

type SupportFormValues = z.infer<typeof supportSchema>;

const CATEGORIES = [
  'Rewards & Earnings',
  'Device Connection',
  'Account Settings',
  'P2P Dispute',
  'Other'
];

export default function SupportScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [view, setView] = useState<'list' | 'create'>('list');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const { tickets, isLoading, createTicket, isCreating } = useSupportTickets();

  const { control, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      category: 'Rewards & Earnings',
      subject: '',
      description: ''
    }
  });

  const selectedCategory = watch('category');

  const onSubmit = async (data: SupportFormValues) => {
    try {
      await createTicket(data);
      reset();
      setView('list');
    } catch (error: any) {
      console.error('Failed to submit ticket', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs} hrs ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.accentPrimary;
      case 'in_progress': return colors.warning;
      case 'resolved': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      default: return 'Closed';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Support Center</Text>
        </View>
        {view === 'list' && (
          <Pressable onPress={() => setView('create')} style={styles.addBtn}>
            <Plus size={20} color="#fff" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {view === 'list' ? (
          <>
            <View style={styles.helpCard}>
              <View style={styles.helpIconWrapper}>
                <HelpCircle size={24} color={colors.accentPrimary} />
              </View>
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpTitle}>Need Help?</Text>
                <Text style={styles.helpSubtitle}>Our support team usually responds within 24 hours.</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Your Tickets</Text>

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: 40 }} />
            ) : tickets.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Inbox size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No support tickets yet</Text>
                <Text style={styles.emptyText}>Tap + to create your first ticket</Text>
              </View>
            ) : (
              tickets.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketId}>{ticket.id.slice(0, 8).toUpperCase()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                        {getStatusLabel(ticket.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
                    <View style={styles.ticketCategoryRow}>
                      <MessageSquare size={12} color={colors.textSecondary} />
                      <Text style={styles.ticketCategory}>{ticket.category}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create New Ticket</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <Pressable style={styles.pickerBtn} onPress={() => setShowCategoryPicker(true)}>
                <Text style={styles.pickerText}>{selectedCategory}</Text>
              </Pressable>
              {errors.category && (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color={colors.error} />
                  <Text style={styles.errorText}>{errors.category.message}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject</Text>
              <Controller
                control={control}
                name="subject"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.subject && styles.inputError]}
                    placeholder="Brief summary of your issue"
                    placeholderTextColor={colors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.subject && (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color={colors.error} />
                  <Text style={styles.errorText}>{errors.subject.message}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.inputArea, errors.description && styles.inputError]}
                    placeholder="Please provide as much detail as possible..."
                    placeholderTextColor={colors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    multiline
                    textAlignVertical="top"
                  />
                )}
              />
              {errors.description && (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color={colors.error} />
                  <Text style={styles.errorText}>{errors.description.message}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  reset();
                  setView('list');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, isCreating && { opacity: 0.7 }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={showCategoryPicker} onClose={() => setShowCategoryPicker(false)} title="Select Category">
        <View style={styles.pickerContent}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              style={[styles.pickerOption, selectedCategory === cat && styles.pickerOptionActive]}
              onPress={() => {
                setValue('category', cat);
                setShowCategoryPicker(false);
              }}
            >
              <Text style={[styles.pickerOptionText, selectedCategory === cat && styles.pickerOptionTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  
  container: { flex: 1, padding: 20 },
  
  helpCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.glassBorder },
  helpIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(5, 150, 105, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  helpTextContainer: { flex: 1 },
  helpTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  helpSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 4 },
  emptyText: { fontSize: 13, color: colors.textSecondary },

  ticketCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ticketId: { fontSize: 12, fontFamily: 'monospace', color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  ticketSubject: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketDate: { fontSize: 12, color: colors.textSecondary },
  ticketCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ticketCategory: { fontSize: 12, color: colors.textSecondary },

  formCard: { backgroundColor: colors.bgSecondary, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.glassBorder },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  pickerBtn: { width: '100%', height: 50, backgroundColor: colors.bgPrimary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, justifyContent: 'center', paddingHorizontal: 16 },
  pickerText: { color: colors.textPrimary, fontSize: 16 },
  input: { width: '100%', height: 50, backgroundColor: colors.bgPrimary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 16, color: colors.textPrimary, fontSize: 16 },
  inputArea: { width: '100%', minHeight: 120, backgroundColor: colors.bgPrimary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 16, paddingTop: 16, color: colors.textPrimary, fontSize: 16 },
  inputError: { borderColor: colors.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorText: { color: colors.error, fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 56, backgroundColor: colors.bgPrimary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  submitBtn: { flex: 1, height: 56, backgroundColor: colors.accentPrimary, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  pickerContent: { paddingVertical: 12 },
  pickerOption: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  pickerOptionActive: { backgroundColor: 'rgba(5, 150, 105, 0.1)' },
  pickerOptionText: { fontSize: 16, color: colors.textPrimary },
  pickerOptionTextActive: { color: colors.accentPrimary, fontWeight: 'bold' },
});
