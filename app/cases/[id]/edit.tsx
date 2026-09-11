import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchCase, updateCase } from '../../../src/features/cases/case-service';
import { colours, radius, spacing } from '../../../src/theme/tokens';

export default function EditCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) return;
    fetchCase(id)
      .then((item) => {
        if (!active) return;
        setTitle(item.title);
        setSourceText(item.sourceText ?? item.outcome);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load this case'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function save() {
    if (!id || !title.trim() || !sourceText.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateCase(id, { title: title.trim(), sourceText: sourceText.trim() });
      router.replace(`/cases/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Carry could not update this case');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator /><Text style={styles.muted}>Loading case…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← Cancel</Text></Pressable>
        <Text style={styles.kicker}>EDIT CASE</Text>
        <Text style={styles.heading}>Change what Carry is carrying</Text>
        <Text style={styles.intro}>If you change what needs sorting, Carry will reassess the case and continue from the new brief. Previous work stays in the activity trail but will no longer be treated as current evidence.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput value={title} onChangeText={setTitle} editable={!saving} style={styles.titleInput} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What needs sorting</Text>
          <TextInput
            value={sourceText}
            onChangeText={setSourceText}
            editable={!saving}
            multiline
            textAlignVertical="top"
            style={styles.bodyInput}
          />
          <Text style={styles.hint}>Change the substance here when the task itself has changed, not just the wording of its name.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={saving || !title.trim() || !sourceText.trim()}
          onPress={() => void save()}
          style={[styles.saveButton, (saving || !title.trim() || !sourceText.trim()) && styles.disabled]}
        >
          {saving ? <ActivityIndicator color={colours.white} /> : <Text style={styles.saveText}>Save and update Carry</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  muted: { color: colours.muted },
  back: { paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  backText: { color: colours.secondaryInk, fontSize: 15 },
  kicker: { color: colours.moss, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginTop: spacing.lg },
  heading: { color: colours.ink, fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -1.1, marginTop: spacing.xs },
  intro: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
  field: { marginTop: spacing.xl, gap: spacing.sm },
  label: { color: colours.ink, fontSize: 15, fontWeight: '700' },
  titleInput: { borderWidth: 1, borderColor: colours.line, borderRadius: radius.md, backgroundColor: colours.white, color: colours.ink, padding: spacing.md, fontSize: 17 },
  bodyInput: { minHeight: 180, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, backgroundColor: colours.white, color: colours.ink, padding: spacing.md, fontSize: 16, lineHeight: 23 },
  hint: { color: colours.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colours.rust, fontSize: 14, lineHeight: 20, marginTop: spacing.lg },
  saveButton: { marginTop: spacing.xl, minHeight: 54, borderRadius: radius.pill, backgroundColor: colours.ink, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  saveText: { color: colours.white, fontSize: 15, fontWeight: '700' },
});
