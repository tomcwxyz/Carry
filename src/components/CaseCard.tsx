import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../theme/tokens';
import type { CarryCase, CaseState } from '../features/cases/types';

const stateMeta: Record<CaseState, { label: string; colour: string }> = {
  needs_user: { label: 'Needs you', colour: colours.rust },
  carrying: { label: 'Carrying', colour: colours.moss },
  waiting: { label: 'Waiting', colour: colours.waiting },
  done: { label: 'Done', colour: colours.success },
};

interface CaseCardProps {
  item: CarryCase;
  onPress: () => void;
}

export function CaseCard({ item, onPress }: CaseCardProps) {
  const meta = stateMeta[item.state];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.stateDot, { backgroundColor: meta.colour }]} />
      </View>
      <Text style={styles.summary}>{item.summary}</Text>
      <View style={styles.footer}>
        <Text style={[styles.state, { color: meta.colour }]}>{meta.label}</Text>
        <Text style={styles.space}>{item.space}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colours.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.72 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colours.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  summary: { color: colours.secondaryInk, fontSize: 15, lineHeight: 21 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  state: { fontSize: 13, fontWeight: '700' },
  space: { color: colours.muted, fontSize: 13 },
  stateDot: { width: 9, height: 9, borderRadius: 9 },
});
