import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '../src/components/BottomNav';
import { colours, radius, spacing } from '../src/theme/tokens';

const groups = [
  { title: 'Spaces', copy: 'Personal · Good Ship' },
  { title: 'Connected services', copy: 'Email, calendar, files and GitHub will live here.' },
  { title: 'Permissions', copy: 'Carry can research and prepare freely. Sending, spending, publishing and destructive actions require explicit policy.' },
  { title: 'What Carry has learnt', copy: 'Inspectable working preferences and reusable rules — never a mysterious black box.' },
];

export default function YouScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>How Carry works for you</Text>
          <Text style={styles.title}>You</Text>
          <View style={styles.list}>
            {groups.map((group) => (
              <View key={group.title} style={styles.card}>
                <Text style={styles.cardTitle}>{group.title}</Text>
                <Text style={styles.cardCopy}>{group.copy}</Text>
              </View>
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
  list: { gap: spacing.sm, marginTop: spacing.xl },
  card: { backgroundColor: colours.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colours.line, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { color: colours.ink, fontSize: 17, fontWeight: '700' },
  cardCopy: { color: colours.secondaryInk, fontSize: 14, lineHeight: 21 },
});
