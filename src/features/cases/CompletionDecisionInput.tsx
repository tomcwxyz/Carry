import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';
import type { CarryCaseCompletion } from './types';

export function CompletionDecisionInput({
  disabled = false,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (completion: CarryCaseCompletion) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.helper}>Carry thinks the outcome may be complete. You decide whether it actually is.</Text>
      <View style={styles.actions}>
        <Pressable
          disabled={disabled}
          onPress={() => onSubmit('confirm')}
          style={[styles.primary, disabled && styles.disabled]}
        >
          {disabled ? <ActivityIndicator color={colours.white} /> : <Text style={styles.primaryText}>Yes, it’s done</Text>}
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => onSubmit('not_yet')}
          style={[styles.secondary, disabled && styles.disabled]}
        >
          <Text style={styles.secondaryText}>Not yet</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  helper: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primary: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colours.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondary: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colours.ink,
    backgroundColor: colours.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryText: { color: colours.white, fontSize: 15, fontWeight: '700' },
  secondaryText: { color: colours.ink, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
