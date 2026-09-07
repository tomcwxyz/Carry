import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchCase } from '../../src/features/cases/case-service';
import { getCaseById } from '../../src/features/cases/mock-cases';
import type { CarryCase } from '../../src/features/cases/types';
import { colours, radius, spacing } from '../../src/theme/tokens';

const stateLabels = {
  needs_user: 'NEEDS YOU',
  carrying: 'CARRYING',
  waiting: 'WAITING',
  done: 'DONE',
} as const;

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<CarryCase | undefined>(() => getCaseById(id));
  const [loading, setLoading] = useState(!item);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || getCaseById(id)) return;
    let active = true;
    setLoading(true);
    fetchCase(id)
      .then((loaded) => { if (active) setItem(loaded); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load this case'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.empty}><ActivityIndicator /><Text style={styles.muted}>Carry is loading this case…</Text></View></SafeAreaView>;
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.title}>Case not found</Text>
          {error ? <Text style={styles.muted}>{error}</Text> : null}
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.state}>{stateLabels[item.state]}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.outcome}>{item.outcome}</Text>

        {item.state === 'needs_user' && (
          <View style={styles.decisionCard}>
            <Text style={styles.decisionKicker}>Carry needs a decision</Text>
            <Text style={styles.decisionText}>{item.nextAction}</Text>
            <View style={styles.actions}>
              <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>{item.decisionLabel ?? 'Go ahead'}</Text></Pressable>
              <Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Not this</Text></Pressable>
            </View>
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Now</Text>
          <Text style={styles.nowText}>{item.nextAction}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Plan</Text>
          <View style={styles.plan}>
            {item.plan.map((step) => (
              <View key={step.id} style={styles.planRow}>
                <Text style={[styles.stepMark, step.state === 'active' && styles.activeMark]}>{step.state === 'done' ? '✓' : step.state === 'active' ? '●' : '○'}</Text>
                <Text style={[styles.stepText, step.state === 'done' && styles.doneText]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Activity</Text>
          <View style={styles.activity}>
            {item.activity.map((event) => (
              <View key={event.id} style={styles.activityRow}>
                <Text style={styles.activityTime}>{event.at}</Text>
                <View style={styles.activityCopy}>
                  <Text style={styles.activityActor}>{event.actor === 'you' ? 'You' : event.actor === 'carry' ? 'Carry' : 'External'}</Text>
                  <Text style={styles.activityText}>{event.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.tellButton} onPress={() => router.push('/capture')}><Text style={styles.tellButtonText}>●  Tell Carry something</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper }, content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  back: { paddingVertical: spacing.sm, alignSelf: 'flex-start' }, backText: { color: colours.secondaryInk, fontSize: 15 },
  link: { color: colours.rust, fontWeight: '700' }, muted: { color: colours.muted, textAlign: 'center' },
  state: { color: colours.moss, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginTop: spacing.lg },
  title: { color: colours.ink, fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.5, marginTop: spacing.xs },
  outcome: { color: colours.secondaryInk, fontSize: 19, lineHeight: 28, marginTop: spacing.sm },
  decisionCard: { backgroundColor: '#F5E3D8', borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, gap: spacing.sm },
  decisionKicker: { color: colours.rust, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  decisionText: { color: colours.ink, fontSize: 20, lineHeight: 27, fontWeight: '700' }, actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryButton: { backgroundColor: colours.ink, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 12 }, primaryButtonText: { color: colours.white, fontWeight: '700' },
  secondaryButton: { borderColor: colours.ink, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 12 }, secondaryButtonText: { color: colours.ink, fontWeight: '700' },
  block: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.lg }, blockTitle: { color: colours.ink, fontSize: 17, fontWeight: '700', marginBottom: spacing.md }, nowText: { color: colours.secondaryInk, fontSize: 17, lineHeight: 25 },
  plan: { gap: spacing.md }, planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, stepMark: { color: colours.muted, width: 20, fontSize: 15 }, activeMark: { color: colours.rust }, stepText: { flex: 1, color: colours.ink, fontSize: 15, lineHeight: 22 }, doneText: { color: colours.muted },
  activity: { gap: spacing.md }, activityRow: { flexDirection: 'row', gap: spacing.md }, activityTime: { color: colours.muted, fontSize: 12, width: 42, paddingTop: 2 }, activityCopy: { flex: 1 }, activityActor: { color: colours.ink, fontSize: 13, fontWeight: '700' }, activityText: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20, marginTop: 2 },
  tellButton: { marginTop: spacing.xl, backgroundColor: colours.ink, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' }, tellButtonText: { color: colours.white, fontWeight: '700', fontSize: 15 },
});
