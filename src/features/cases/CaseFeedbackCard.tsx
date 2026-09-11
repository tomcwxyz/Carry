import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CaseFeedback, CaseFeedbackRating } from './types';
import { colours, radius, spacing } from '../../theme/tokens';

interface CaseFeedbackCardProps {
  feedback?: CaseFeedback;
  disabled?: boolean;
  onSubmit: (rating: CaseFeedbackRating, note?: string) => Promise<void>;
}

const labels: Array<{ rating: CaseFeedbackRating; label: string }> = [
  { rating: 'good', label: 'Yes' },
  { rating: 'mostly', label: 'Mostly' },
  { rating: 'missed', label: 'No' },
];

export function CaseFeedbackCard({ feedback, disabled = false, onSubmit }: CaseFeedbackCardProps) {
  const [rating, setRating] = useState<CaseFeedbackRating | undefined>(feedback?.rating);
  const [note, setNote] = useState(feedback?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(feedback));

  async function submit(nextRating = rating) {
    if (!nextRating || saving || disabled) return;
    setSaving(true);
    try {
      await onSubmit(nextRating, note.trim() || undefined);
      setRating(nextRating);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Did Carry handle this well?</Text>
      <Text style={styles.copy}>This becomes a signal for how Carry should handle similar cases next time.</Text>
      <View style={styles.choices}>
        {labels.map((choice) => (
          <Pressable
            key={choice.rating}
            disabled={saving || disabled}
            onPress={() => {
              setRating(choice.rating);
              setSaved(false);
              if (choice.rating === 'good') void submit(choice.rating);
            }}
            style={[styles.choice, rating === choice.rating && styles.choiceSelected]}
          >
            <Text style={[styles.choiceText, rating === choice.rating && styles.choiceTextSelected]}>{choice.label}</Text>
          </Pressable>
        ))}
      </View>
      {rating && rating !== 'good' ? (
        <>
          <TextInput
            value={note}
            onChangeText={(value) => { setNote(value); setSaved(false); }}
            editable={!saving && !disabled}
            multiline
            placeholder="What should Carry have done differently?"
            placeholderTextColor={colours.muted}
            style={styles.input}
          />
          <Pressable disabled={saving || disabled} onPress={() => void submit()} style={styles.saveButton}>
            {saving ? <ActivityIndicator color={colours.white} /> : <Text style={styles.saveText}>{saved ? 'Saved' : 'Save feedback'}</Text>}
          </Pressable>
        </>
      ) : null}
      {rating === 'good' && saved ? <Text style={styles.saved}>Saved. Carry will treat this as a positive signal.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  title: { color: colours.ink, fontSize: 17, fontWeight: '700' },
  copy: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20 },
  choices: { flexDirection: 'row', gap: spacing.sm },
  choice: { flex: 1, borderWidth: 1, borderColor: colours.line, borderRadius: radius.pill, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.white },
  choiceSelected: { backgroundColor: colours.ink, borderColor: colours.ink },
  choiceText: { color: colours.ink, fontSize: 14, fontWeight: '700' },
  choiceTextSelected: { color: colours.white },
  input: { minHeight: 82, borderWidth: 1, borderColor: colours.line, borderRadius: radius.md, padding: spacing.md, backgroundColor: colours.white, color: colours.ink, fontSize: 15, lineHeight: 21, textAlignVertical: 'top' },
  saveButton: { minHeight: 46, borderRadius: radius.pill, backgroundColor: colours.ink, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colours.white, fontSize: 14, fontWeight: '700' },
  saved: { color: colours.moss, fontSize: 13, lineHeight: 19 },
});
