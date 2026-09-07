import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '../src/components/BottomNav';
import { CaseCard } from '../src/components/CaseCard';
import { VoiceButton } from '../src/components/VoiceButton';
import { mockCases } from '../src/features/cases/mock-cases';
import type { CaseState } from '../src/features/cases/types';
import { colours, spacing } from '../src/theme/tokens';

const sections: Array<{ state: CaseState; label: string; description: string }> = [
  { state: 'needs_user', label: 'Needs you', description: 'Carry cannot sensibly continue without you.' },
  { state: 'carrying', label: 'Carrying', description: 'Work Carry can move forward on its own.' },
  { state: 'waiting', label: 'Waiting', description: 'Something outside Carry has to happen next.' },
];

export default function NowScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.wordmark}>Carry</Text>
            <View style={styles.presence} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.kicker}>Good evening</Text>
            <Text style={styles.headline}>What actually needs you?</Text>
          </View>

          {sections.map((section) => {
            const items = mockCases.filter((item) => item.state === section.state);
            if (!items.length) return null;

            return (
              <View key={section.state} style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                  <Text style={styles.count}>{items.length}</Text>
                </View>
                <Text style={styles.sectionDescription}>{section.description}</Text>
                <View style={styles.list}>
                  {items.map((item) => (
                    <CaseCard
                      item={item}
                      key={item.id}
                      onPress={() => router.push(`/cases/${item.id}`)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        <VoiceButton onPress={() => router.push('/capture')} />
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper },
  page: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: colours.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  presence: { width: 10, height: 10, borderRadius: 10, backgroundColor: colours.moss },
  intro: { paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xs },
  kicker: { color: colours.muted, fontSize: 14 },
  headline: { color: colours.ink, fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -1.2 },
  section: { marginBottom: spacing.xl },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { color: colours.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  count: { color: colours.muted, fontSize: 14 },
  sectionDescription: { color: colours.muted, fontSize: 13, marginTop: 3, marginBottom: spacing.md },
  list: { gap: spacing.sm },
  bottomSpacer: { height: 110 },
});
