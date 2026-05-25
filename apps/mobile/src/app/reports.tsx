import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';;
import { useRouter } from 'expo-router';
import { FileText, Download, Percent, DollarSign, PieChart, ChevronLeft, Loader2 } from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/theme';

interface Report {
  id: string;
  report_type: string;
  format: string;
  status: string;
  download_url: string | null;
  metadata: any;
  created_at: string;
}

export default function ReportsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { profile } = useAuthStore();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState<any>(null);

  useEffect(() => {
    fetchReports();
    fetchTaxRate();
  }, [profile?.country]);

  async function fetchReports() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('financial_reports')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }

  async function fetchTaxRate() {
    if (!profile?.country) return;
    const { data } = await supabase
      .from('country_tax_rates')
      .select('*')
      .eq('country_code', profile.country.toUpperCase())
      .single();
    setTaxRate(data);
  }

  const handleGenerateReport = async (type: string) => {
    setIsGenerating(type);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: txData } = await supabase
        .from('transactions')
        .select('tx_type, amount')
        .eq('user_id', profile?.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      const totalEarnings = (txData || [])
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalWithdrawals = (txData || [])
        .filter(t => t.tx_type === 'withdrawal')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      const reportTotal = type === 'earnings' ? totalEarnings : type === 'withdrawals' ? totalWithdrawals : totalEarnings;
      const taxPct = taxRate?.tax_percentage || 0;

      const reportMetadata = {
        date_range: `${new Date(startOfMonth).toLocaleDateString()} - ${new Date(endOfMonth).toLocaleDateString()}`,
        tax_applied: taxPct,
        tax_label: taxRate?.tax_label || 'VAT',
        total_earnings: Number(reportTotal.toFixed(4)),
        net_after_tax: Number((reportTotal * (1 - taxPct / 100)).toFixed(4)),
        total_transactions: (txData || []).length,
      };

      await supabase.from('financial_reports').insert({
        user_id: profile?.id,
        report_type: type,
        format: 'csv',
        status: 'completed',
        metadata: reportMetadata,
        download_url: '#'
      });

      fetchReports();
    } catch (err: any) {
      console.log('Report Error:', err.message);
    } finally {
      setIsGenerating(null);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'earnings': return DollarSign;
      case 'campaign_roi': return PieChart;
      case 'tax_summary': return Percent;
      default: return FileText;
    }
  };

  const reportTypes = [
    { id: 'earnings', title: 'Earnings History', desc: 'Detailed breakdown of all NRT earned.', icon: DollarSign },
    { id: 'tax_summary', title: 'Tax Liability', desc: 'Summary of taxes for the current period.', icon: Percent },
    { id: 'campaign_roi', title: 'Performance Audit', desc: 'Campaign efficiency and ROI metrics.', icon: PieChart, hidden: profile?.role === 'user' },
  ].filter(r => !r.hidden);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Financial Reports</Text>
            <Text style={styles.headerSubtitle}>Export your earnings and performance data</Text>
          </View>
        </View>

        {/* Tax Info Card */}
        <View style={styles.taxCard}>
          <View style={styles.taxCardLeft}>
            <View style={styles.taxIconWrapper}>
              <Percent size={20} color={colors.accentPrimary} />
            </View>
            <View>
              <Text style={styles.taxTitle}>LOCAL TAX CONFIGURATION</Text>
              <Text style={styles.taxValue}>
                {taxRate ? `${taxRate.tax_label}: ${taxRate.tax_percentage}% (${profile?.country})` : `No specific tax rate found for ${profile?.country || 'your country'}`}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/settings/profile')}>
            <Text style={styles.taxChangeLink}>Change Country</Text>
          </Pressable>
        </View>

        {/* Generate Reports */}
        <View style={styles.generateSection}>
          {reportTypes.map(rpt => (
            <View key={rpt.id} style={styles.generateCard}>
              <View style={styles.generateIconWrapper}>
                <rpt.icon size={24} color={colors.accentPrimary} />
              </View>
              <View style={styles.generateDetails}>
                <Text style={styles.generateTitle}>{rpt.title}</Text>
                <Text style={styles.generateDesc} numberOfLines={1}>{rpt.desc}</Text>
              </View>
              <Pressable
                style={[styles.generateBtn, isGenerating === rpt.id && { opacity: 0.7 }]}
                disabled={!!isGenerating}
                onPress={() => handleGenerateReport(rpt.id)}
              >
                {isGenerating === rpt.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Download size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.generateBtnText}>CSV</Text>
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>

        {/* Recent Downloads */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Downloads</Text>
          {reports.length > 0 ? (
            reports.map(report => {
              const Icon = getReportIcon(report.report_type);
              return (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportLeft}>
                    <View style={styles.reportIconWrapper}>
                      <Icon size={20} color={colors.textSecondary} />
                    </View>
                    <View>
                      <Text style={styles.reportTitle}>{report.report_type.replace('_', ' ').toUpperCase()}</Text>
                      <Text style={styles.reportDate}>
                        {new Date(report.created_at).toLocaleDateString()} • {report.metadata?.date_range}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reportRight}>
                    <View style={styles.reportTaxInfo}>
                      <Text style={styles.reportTaxLabel}>TAX RATE</Text>
                      <Text style={styles.reportTaxValue}>{report.metadata?.tax_applied}% {report.metadata?.tax_label}</Text>
                    </View>
                    <Pressable
                      style={styles.downloadBtn}
                      onPress={() => report.download_url && report.download_url !== '#' && Linking.openURL(report.download_url)}
                    >
                      <Download size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No reports generated yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  taxCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16, marginBottom: 24 },
  taxCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 },
  taxIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(5, 150, 105, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taxTitle: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 2 },
  taxValue: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },
  taxChangeLink: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },

  generateSection: { marginBottom: 32, gap: 12 },
  generateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16 },
  generateIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  generateDetails: { flex: 1, marginRight: 12 },
  generateTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  generateDesc: { fontSize: 12, color: colors.textSecondary },
  generateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentPrimary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  generateBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  recentSection: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  reportCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16 },
  reportLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  reportIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  reportTitle: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  reportDate: { fontSize: 10, color: colors.textSecondary },
  reportRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reportTaxInfo: { alignItems: 'flex-end', display: 'none' }, // Can un-hide on larger screens if needed
  reportTaxLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 2 },
  reportTaxValue: { fontSize: 12, fontWeight: '900', color: colors.textPrimary },
  downloadBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
