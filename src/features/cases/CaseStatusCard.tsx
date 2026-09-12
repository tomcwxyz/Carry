import { StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';
import type { CaseState } from './types';

const copy: Record<CaseState, { eyebrow: string; title: string; helper: string }> = {
  needs_user: {
    eyebrow: 'NEEDS YOU',
    title: 'Carry needs one thing from you',
    helper: 'Once you answer, Carry will pick this back up.',
  },
  carrying: {
    eyebrow: 'CARRYING',
    title: 'Carry has this',
    helper: 'You do not need to keep checking. Carry will hand it back only when something genuinely needs you.',
  },
  waiting: {
    eyebrow: 'WAITING',
    title: 'Waiting on something outside Carry',
    helper: 'Carry has done what it can for now. This should only move when the external dependency changes.',
  },
  done: {
    eyebrow: 'DONE',
    title: 'This outcome is complete',
    helper: 'You can leave it here, or tell Carry how well it handled the case.',
  },
};

export function CaseStatusCard({ state, nextAction, busy = false }: { state: CaseState; nextAction?: string; busy?: boolean }) {
  const stateCopy = copy[state];

  return (
    <View style={[styles.card, state === 'needs_user' && styles.needsYou, state === 'done' && styles.done]}>
      <Text style={styles.eyebrow}>{busy ? 'CARRYING' : stateCopy.eyebrow}</Text>
      <Text style={styles.title}>{busy ? 'Carry is picking this back up' : stateCopy.title}</Text>
      {nextAction ? <Text style={styles.next}>{nextAction}</Text> : null}
      <Text style={styles.helper}>{busy ? 'You can leave this screen while it continues.' : stateCopy.helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colours.line,
    borderRadius: radius.lg,
    backgroundColor: colours.surface,
    padding: spacing.lg,
  },
  needsYou: { borderColor: colours.rust },
  done: { borderColor: colours.success },
  eyebrow: { color: colours.moss, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colours.ink, fontSize: 21, lineHeight: 26, fontWeight: '700', marginTop: spacing.xs, letterSpacing: -0.3 },
  next: { color: colours.ink, fontSize: 16, lineHeight: 23, marginTop: spacing.sm },
  helper: { color: colours.secondaryInk, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
});
