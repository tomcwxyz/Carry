import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { continueCase, fetchCase, respondToCase } from '../../src/features/cases/case-service';
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
  const [item, setItem] = useState<CarryCase | undefined>();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const loaded = await fetchCase(id);
    setItem(loaded);
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load this case'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function submitResponse() {
    if (!id || !responseText.trim() || working) return;
    setWorking(true);
    setError(null);
    try {
      await respondToCase(id, responseText.trim());
      setResponseText('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Carry could not continue this case');
      await load().catch(() => undefined);
    } finally {
      setWorking(false);
    }
  }

  async function retryCase() {
    if (!id || working) return;
    setWorking(true);
    setError(null);
    try {
      await continueCase(id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Carry could not retry this case');
      await load().catch(() => undefined);
    } finally {
      setWorking(false);
    }
  }

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

  const canRetry = item.state === 'carrying' && item.nextAction?.toLowerCase().includes('retry');
  const evidenceItems = item.evidence ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.state}>{stateLabels[item.state]}</Text>
        <Text style={styles.saved}>Saved to Carry</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.outcome}>{item.outcome}</Text>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Now</Text>
          <Text style={styles.nowText}>{item.nextAction}</Text>

          {item.state === 'needs_user' ? (
            <View style={styles.responseCard}>
              {item.decisionLabel && item.decisionLabel !== item.nextAction ? <Text style={styles.responsePrompt}>{item.decisionLabel}</Text> : null}
              <TextInput
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Tell Carry what it needs to know"
                placeholderTextColor={colours.muted}
                multiline
                editable={!working}
                style={styles.responseInput}
              />
              <Pressable
                disabled={!responseText.trim() || working}
                onPress={submitResponse}
                style={[styles.actionButton, (!responseText.trim() || working) && styles.disabledButton]}
              >
                {working ? <ActivityIndicator color={colours.white} /> : <Text style={styles.actionButtonText}>Continue with this</Text>}
              </Pressable>
            </View>
          ) : null}

          {canRetry ? (
            <Pressable disabled={working} onPress={retryCase} style={[styles.actionButton, working && styles.disabledButton]}>
              {working ? <ActivityIndicator color={colours.white} /> : <Text style={styles.actionButtonText}>Try again</Text>}
            </Pressable>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {evidenceItems.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>What Carry found</Text>
            <View style={styles.evidenceList}>
              {evidenceItems.map((evidence) => (
                <View key={evidence.id} style={styles.evidenceCard}>
                  <Text style={styles.evidenceTitle}>{evidence.title}</Text>
                  <Text style={styles.evidenceBody}>{evidence.body}</Text>
                  {evidence.sources.length > 0 ? (
                    <View style={styles.sources}>
                      <Text style={styles.sourceHeading}>Sources</Text>
                      {evidence.sources.map((source) => (
                        <Pressable key={source.url} onPress={() => Linking.openURL(source.url)}>
                          <Text numberOfLines={2} style={styles.sourceLink}>↗ {source.title ?? source.url}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

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

        <Pressable style={styles.tellButton} onPress={() => router.push('/capture')}><Text style={styles.tellButtonText}>●  Add another case</Text></Pressable>
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
  saved: { color: colours.muted, fontSize: 12, marginTop: spacing.xs },
  title: { color: colours.ink, fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.5, marginTop: spacing.xs },
  outcome: { color: colours.secondaryInk, fontSize: 19, lineHeight: 28, marginTop: spacing.sm },
  block: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.lg }, blockTitle: { color: colours.ink, fontSize: 17, fontWeight: '700', marginBottom: spacing.md }, nowText: { color: colours.secondaryInk, fontSize: 17, lineHeight: 25 },
  responseCard: { marginTop: spacing.lg, gap: spacing.sm }, responsePrompt: { color: colours.ink, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  responseInput: { minHeight: 92, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, color: colours.ink, backgroundColor: colours.white, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  actionButton: { marginTop: spacing.xs, backgroundColor: colours.ink, borderRadius: radius.pill, minHeight: 52, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' }, disabledButton: { opacity: 0.45 }, actionButtonText: { color: colours.white, fontWeight: '700', fontSize: 15 }, errorText: { color: colours.rust, marginTop: spacing.sm, fontSize: 14, lineHeight: 20 },
  evidenceList: { gap: spacing.md }, evidenceCard: { borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colours.white }, evidenceTitle: { color: colours.ink, fontSize: 16, fontWeight: '700' }, evidenceBody: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  sources: { marginTop: spacing.md, gap: spacing.xs }, sourceHeading: { color: colours.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }, sourceLink: { color: colours.rust, fontSize: 13, lineHeight: 18 },
  plan: { gap: spacing.md }, planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, stepMark: { color: colours.muted, width: 20, fontSize: 15 }, activeMark: { color: colours.rust }, stepText: { flex: 1, color: colours.ink, fontSize: 15, lineHeight: 22 }, doneText: { color: colours.muted },
  activity: { gap: spacing.md }, activityRow: { flexDirection: 'row', gap: spacing.md }, activityTime: { color: colours.muted, fontSize: 12, width: 42, paddingTop: 2 }, activityCopy: { flex: 1 }, activityActor: { color: colours.ink, fontSize: 13, fontWeight: '700' }, activityText: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20, marginTop: 2 },
  tellButton: { marginTop: spacing.xl, backgroundColor: colours.ink, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' }, tellButtonText: { color: colours.white, fontWeight: '700', fontSize: 15 },
});
