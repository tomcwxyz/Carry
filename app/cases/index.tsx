import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '../../src/components/BottomNav';
import { CaseCard } from '../../src/components/CaseCard';
import { mockCases } from '../../src/features/cases/mock-cases';
import { colours, spacing } from '../../src/theme/tokens';

export default function CasesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>Everything Carry knows it is sorting</Text>
          <Text style={styles.title}>Cases</Text>
          <View style={styles.list}>
            {mockCases.map((item) => (
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
  title: { color: colours.ink, fontSize: 34, fontWeight: '750', letterSpacing: -1.2, marginTop: spacing.xs },
  list: { gap: spacing.sm, marginTop: spacing.xl },
});
