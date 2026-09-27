import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';
import { ApprovalActionCard } from './ApprovalActionCard';
import type { CarryCase, CarryCaseApproval, CarryCaseCompletion } from './types';

export function NeedsYouCard({
  item,
  disabled = false,
  onApproval,
  onCompletion,
  onOpen,
}: {
  item: CarryCase;
  disabled?: boolean;
  onApproval: (approval: CarryCaseApproval) => void;
  onCompletion: (completion: CarryCaseCompletion) => void;
  onOpen: () => void;
}) {
  const kind = item.decisionInput?.kind ?? 'text';

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.summary}>{item.summary}</Text>
        </View>
        <Text style={styles.open}>Open →</Text>
      </Pressable>

      {item.approvalAction && kind === 'approval' ? (
        <ApprovalActionCard action={item.approvalAction} compact disabled={disabled} onSubmit={onApproval} />
      ) : kind === 'completion' ? (
        <View style={styles.handback}>
          <Text style={styles.prompt}>{item.decisionLabel ?? 'Is this actually finished?'}</Text>
          <Text style={styles.next}>{item.nextAction}</Text>
          <View style={styles.actions}>
            <Pressable disabled={disabled} onPress={() => onCompletion('confirm')} style={[styles.primary, disabled && styles.disabled]}>
              <Text style={styles.primaryText}>Yes, it’s done</Text>
            </Pressable>
            <Pressable disabled={disabled} onPress={() => onCompletion('not_yet')} style={[styles.secondary, disabled && styles.disabled]}>
              <Text style={styles.secondaryText}>Not yet</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable disabled={disabled} onPress={onOpen} style={styles.handback}>
          <Text style={styles.eyebrow}>NEEDS YOU</Text>
          <Text style={styles.prompt}>{item.decisionLabel ?? item.nextAction ?? 'Carry needs one thing from you.'}</Text>
          <Text style={styles.answer}>Answer this →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colours.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colours.line, padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: colours.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  summary: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20 },
  open: { color: colours.muted, fontSize: 12, fontWeight: '700', paddingTop: 3 },
  handback: { borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.md, gap: spacing.sm },
  eyebrow: { color: colours.rust, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  prompt: { color: colours.ink, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  next: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20 },
  answer: { color: colours.rust, fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  primary: { flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: colours.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  secondary: { flex: 1, minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: colours.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  primaryText: { color: colours.white, fontSize: 14, fontWeight: '700' },
  secondaryText: { color: colours.ink, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
