import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '../src/components/BottomNav';
import { fetchCarryProfile, type CarryProfile } from '../src/features/profile/profile-service';
import { colours, radius, spacing } from '../src/theme/tokens';

export default function YouScreen() {
  const [profile, setProfile] = useState<CarryProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setError(null);
    fetchCarryProfile()
      .then((value) => { if (active) setProfile(value); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load how Carry works for you'); });
    return () => { active = false; };
  }, []));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>What Carry knows, can access and is allowed to do</Text>
          <Text style={styles.title}>You</Text>
          <Text style={styles.intro}>Autonomy should be inspectable. This is the place to see the context Carry works with and the boundaries it follows.</Text>

          {!profile && !error ? <View style={styles.loading}><ActivityIndicator /><Text style={styles.muted}>Loading Carry’s working context…</Text></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {profile ? (
            <>
              <Section title="Spaces">
                <View style={styles.pills}>
                  {profile.spaces.map((space) => <View key={space.id} style={styles.pill}><Text style={styles.pillText}>{space.label}</Text></View>)}
                </View>
              </Section>

              <Section title="Connections">
                {profile.connections.map((connection) => (
                  <View key={connection.id} style={styles.rowCard}>
                    <View style={[styles.dot, connection.connected && styles.dotOn]} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{connection.label}</Text>
                      <Text style={styles.rowBody}>{connection.detail}</Text>
                    </View>
                    <Text style={[styles.status, connection.connected && styles.statusOn]}>{connection.connected ? 'On' : 'Off'}</Text>
                  </View>
                ))}
              </Section>

              <Section title="Permission boundaries" copy="These are enforced rules, not suggestions to the model.">
                {profile.permissions.map((permission) => (
                  <View key={permission.id} style={styles.rule}>
                    <Text style={styles.ruleTitle}>{permission.label}</Text>
                    <Text style={styles.ruleBody}>{permission.policy}</Text>
                  </View>
                ))}
              </Section>

              <Section title="What Carry has learnt" copy="Explicit case feedback is soft context. It never becomes a hidden permanent rule.">
                {profile.learning.length ? profile.learning.map((signal, index) => (
                  <View key={`${signal.domain}-${signal.title}-${index}`} style={styles.learning}>
                    <Text style={styles.learningMeta}>{signal.domain.toUpperCase()} · {signal.rating === 'good' ? 'WORKED WELL' : signal.rating === 'mostly' ? 'MOSTLY' : 'MISSED'}</Text>
                    <Text style={styles.rowTitle}>{signal.title}</Text>
                    {signal.note ? <Text style={styles.rowBody}>{signal.note}</Text> : null}
                  </View>
                )) : <Text style={styles.muted}>Carry has no explicit learning signals yet. Feedback on completed cases will appear here.</Text>}
              </Section>
            </>
          ) : null}
        </ScrollView>
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, copy, children }: { title: string; copy?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {copy ? <Text style={styles.sectionCopy}>{copy}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper },
  page: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 110 },
  kicker: { color: colours.muted, fontSize: 14, marginTop: spacing.sm },
  title: { color: colours.ink, fontSize: 34, fontWeight: '700', letterSpacing: -1.2, marginTop: spacing.xs },
  intro: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, maxWidth: 540 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  muted: { color: colours.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colours.rust, fontSize: 14, lineHeight: 20, marginTop: spacing.xl },
  section: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.lg },
  sectionTitle: { color: colours.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  sectionCopy: { color: colours.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  sectionBody: { gap: spacing.sm, marginTop: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { borderRadius: radius.pill, borderWidth: 1, borderColor: colours.line, backgroundColor: colours.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pillText: { color: colours.ink, fontSize: 14, fontWeight: '700' },
  rowCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.line, borderRadius: radius.md, padding: spacing.md },
  dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: colours.muted, marginTop: 5 },
  dotOn: { backgroundColor: colours.success },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: colours.ink, fontSize: 15, fontWeight: '700' },
  rowBody: { color: colours.secondaryInk, fontSize: 13, lineHeight: 19 },
  status: { color: colours.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  statusOn: { color: colours.success },
  rule: { backgroundColor: colours.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colours.line, padding: spacing.md, gap: 4 },
  ruleTitle: { color: colours.ink, fontSize: 15, fontWeight: '700' },
  ruleBody: { color: colours.secondaryInk, fontSize: 13, lineHeight: 19 },
  learning: { backgroundColor: colours.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colours.line, padding: spacing.md, gap: 4 },
  learningMeta: { color: colours.moss, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
