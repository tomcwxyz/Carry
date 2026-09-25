import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';
import type { CaseApprovalAction, CarryCaseApproval } from './types';

export function ApprovalActionCard({
  action,
  disabled = false,
  compact = false,
  onSubmit,
}: {
  action: CaseApprovalAction;
  disabled?: boolean;
  compact?: boolean;
  onSubmit: (approval: CarryCaseApproval) => void;
}) {
  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <Text style={styles.eyebrow}>READY FOR YOUR APPROVAL</Text>
      <Text style={styles.title}>{action.label}</Text>

      {action.to ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>To</Text>
          <Text style={styles.metaValue}>{action.to}</Text>
        </View>
      ) : null}
      {action.subject ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Subject</Text>
          <Text style={styles.metaValue}>{action.subject}</Text>
        </View>
      ) : null}
      {action.body ? (
        <View style={styles.bodyBox}>
          <Text numberOfLines={compact ? 4 : undefined} style={styles.body}>{action.body}</Text>
        </View>
      ) : null}

      <Text style={styles.helper}>Carry will do exactly this action and nothing broader.</Text>
      <View style={styles.actions}>
        <Pressable disabled={disabled} onPress={() => onSubmit('approve')} style={[styles.primary, disabled && styles.disabled]}>
          <Text style={styles.primaryText}>{action.capability === 'email.send' ? 'Send this' : 'Approve this'}</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={() => onSubmit('decline')} style={[styles.secondary, disabled && styles.disabled]}>
          <Text style={styles.secondaryText}>Not this</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colours.rust, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colours.surface, gap: spacing.sm },
  compactCard: { padding: spacing.md },
  eyebrow: { color: colours.rust, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colours.ink, fontSize: 19, lineHeight: 24, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  metaLabel: { width: 54, color: colours.muted, fontSize: 13, fontWeight: '700' },
  metaValue: { flex: 1, color: colours.ink, fontSize: 14, lineHeight: 20 },
  bodyBox: { backgroundColor: colours.paper, borderRadius: radius.md, padding: spacing.md },
  body: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20 },
  helper: { color: colours.muted, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  primary: { flex: 1, minHeight: 50, borderRadius: radius.pill, backgroundColor: colours.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  secondary: { flex: 1, minHeight: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: colours.ink, backgroundColor: colours.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  primaryText: { color: colours.white, fontSize: 14, fontWeight: '700' },
  secondaryText: { color: colours.ink, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
