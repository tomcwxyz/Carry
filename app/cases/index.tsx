import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '../../src/components/BottomNav';
import { CaseCard } from '../../src/components/CaseCard';
import { fetchCases } from '../../src/features/cases/case-service';
import type { CarryCase } from '../../src/features/cases/types';
import { colours, spacing } from '../../src/theme/tokens';

export default function CasesScreen() {
  const [cases, setCases] = useState<CarryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setError(null);
    fetchCases()
      .then((loaded) => { if (active) setCases(loaded); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load cases'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>Everything Carry knows it is sorting</Text>
          <Text style={styles.title}>Cases</Text>

          {loading ? <View style={styles.status}><ActivityIndicator /><Text style={styles.statusText}>Loading cases…</Text></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && cases.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No saved cases yet.</Text>
              <Text style={styles.statusText}>Tell Carry what needs sorting and it will appear here.</Text>
            </View>
          ) : null}

          <View style={styles.list}>
            {cases.map((item) => (
              <CaseCard item={item} key={item.id} onPress={() => router.push(`/cases/${item.id}`)} />
            ))}
          </View>
        </ScrollView>
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper },
  page: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  kicker: { color: colours.muted, fontSize: 14, marginTop: spacing.sm },
  title: { color: colours.ink, fontSize: 34, fontWeight: '700', letterSpacing: -1.2, marginTop: spacing.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  statusText: { color: colours.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colours.rust, fontSize: 14, lineHeight: 20, marginTop: spacing.xl },
  empty: { borderTopWidth: 1, borderTopColor: colours.line, marginTop: spacing.xl, paddingTop: spacing.lg, gap: spacing.xs },
  emptyTitle: { color: colours.ink, fontSize: 18, fontWeight: '700' },
  list: { gap: spacing.sm, marginTop: spacing.xl },
});
