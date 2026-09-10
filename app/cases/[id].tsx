import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionableResultCard } from '../../src/features/cases/ActionableResultCard';
import { continueCase, fetchCase, respondToCase } from '../../src/features/cases/case-service';
import type { CarryCase, CarryCaseResponse } from '../../src/features/cases/types';
import { LocationDecisionInput } from '../../src/features/location/LocationDecisionInput';
import { colours, radius, spacing } from '../../src/theme/tokens';

const stateLabels = {
  needs_user: 'NEEDS YOU',
  carrying: 'WORKING',
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

  async function submitResponse(response: string | CarryCaseResponse) {
    if (!id || working) return;
    if (typeof response === 'string' && !response.trim()) return;
    setWorking(true);
    setError(null);
    try {
      await respondToCase(id, response);
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
  const decisionInput = item.decisionInput ?? { kind: 'text' as const, askRadius: false };
  const actionableEvidence = evidenceItems.find((evidence) =>
    Boolean(evidence.preparedAction) || evidence.options.some((option) => option.contacts.length > 0),
  );
  const hasActionableHandback = item.state === 'needs_user' && Boolean(actionableEvidence);
  const hasRecommendation = evidenceItems.some((evidence) => evidence.options.some((option) => option.recommended));

  const responseControls = (
    <>
      <TextInput
        value={responseText}
        onChangeText={setResponseText}
        placeholder="Tell Carry what happened"
        placeholderTextColor={colours.muted}
        multiline
        editable={!working}
        style={styles.responseInput}
      />
      <Pressable
        disabled={!responseText.trim() || working}
        onPress={() => { void submitResponse(responseText.trim()); }}
        style={[styles.actionButton, (!responseText.trim() || working) && styles.disabledButton]}
      >
        {working ? <ActivityIndicator color={colours.white} /> : <Text style={styles.actionButtonText}>Update Carry</Text>}
      </Pressable>
    </>
  );

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

          {item.state === 'needs_user' && !hasActionableHandback ? (
            <View style={styles.responseCard}>
              {item.decisionLabel && item.decisionLabel !== item.nextAction ? <Text style={styles.responsePrompt}>{item.decisionLabel}</Text> : null}
              {decisionInput.kind === 'location' ? (
                <LocationDecisionInput
                  decision={decisionInput}
                  disabled={working}
                  onSubmit={(response) => { void submitResponse(response); }}
                />
              ) : responseControls}
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
            <Text style={styles.blockTitle}>{hasRecommendation ? 'Carry recommends' : 'What Carry found'}</Text>
            <View style={styles.evidenceList}>
              {evidenceItems.map((evidence) => <ActionableResultCard key={evidence.id} evidence={evidence} />)}
            </View>
          </View>
        ) : null}

        {hasActionableHandback ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>After you act</Text>
            <Text style={styles.helperText}>Call, email or use the contact route above. Then tell Carry what happened and it can keep carrying this.</Text>
            <View style={styles.responseCard}>{responseControls}</View>
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
  title: { color: colours.ink, fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -1.2, marginTop: spacing.xs },
  outcome: { color: colours.secondaryInk, fontSize: 18, lineHeight: 26, marginTop: spacing.sm },
  block: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.lg },
  blockTitle: { color: colours.ink, fontSize: 20, lineHeight: 25, fontWeight: '700', marginBottom: spacing.md, letterSpacing: -0.2 },
  nowText: { color: colours.ink, fontSize: 17, lineHeight: 25 },
  helperText: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22 },
  responseCard: { marginTop: spacing.lg, gap: spacing.sm }, responsePrompt: { color: colours.ink, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  responseInput: { minHeight: 82, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, color: colours.ink, backgroundColor: colours.white, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  actionButton: { marginTop: spacing.xs, backgroundColor: colours.ink, borderRadius: radius.pill, minHeight: 52, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 }, actionButtonText: { color: colours.white, fontWeight: '700', fontSize: 15 },
  errorText: { color: colours.rust, marginTop: spacing.sm, fontSize: 14, lineHeight: 20 },
  evidenceList: { gap: spacing.md },
  plan: { gap: spacing.md }, planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, stepMark: { color: colours.muted, width: 20, fontSize: 15 }, activeMark: { color: colours.rust }, stepText: { flex: 1, color: colours.ink, fontSize: 15, lineHeight: 22 }, doneText: { color: colours.muted },
  activity: { gap: spacing.md }, activityRow: { flexDirection: 'row', gap: spacing.md }, activityTime: { color: colours.muted, fontSize: 12, width: 42, paddingTop: 2 }, activityCopy: { flex: 1 }, activityActor: { color: colours.ink, fontSize: 13, fontWeight: '700' }, activityText: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20, marginTop: 2 },
  tellButton: { marginTop: spacing.xl, backgroundColor: colours.ink, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' }, tellButtonText: { color: colours.white, fontWeight: '700', fontSize: 15 },
});
