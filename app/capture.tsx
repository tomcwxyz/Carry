import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaptureBackendUnavailableError, submitCapture } from '../src/features/capture/capture-service';
import { VoiceCapture } from '../src/features/capture/VoiceCapture';
import { colours, radius, spacing } from '../src/theme/tokens';

export default function CaptureScreen() {
  const [text, setText] = useState('');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createFromText = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const result = await submitCapture({ kind: 'text', text: text.trim() });
      router.replace(`/cases/${result.caseId}`);
    } finally {
      setBusy(false);
    }
  };

  const createFromVoice = async () => {
    if (!recordingUri) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await submitCapture({ kind: 'voice', uri: recordingUri });
      router.replace(`/cases/${result.caseId}`);
    } catch (error) {
      if (error instanceof CaptureBackendUnavailableError) {
        setMessage('Recording captured. The native voice path works; transcription/orchestration is the next backend slice.');
      } else {
        setMessage(error instanceof Error ? error.message : 'Carry could not process that recording.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}><Text style={styles.close}>Close</Text></Pressable>
          <Text style={styles.wordmark}>Carry</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>What needs sorting?</Text>
          <Text style={styles.subtitle}>Don't organise it first. Just tell Carry what is going on.</Text>
        </View>

        <VoiceCapture onRecorded={(uri) => { setRecordingUri(uri); setMessage(null); }} />

        {recordingUri ? (
          <View style={styles.recorded}>
            <Text style={styles.recordedTitle}>Voice captured</Text>
            <Pressable disabled={busy} onPress={createFromVoice} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{busy ? 'Working…' : 'Turn this into a case'}</Text>
            </Pressable>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        ) : null}

        <View style={styles.orRow}>
          <View style={styles.line} /><Text style={styles.or}>or type</Text><View style={styles.line} />
        </View>

        <View style={styles.textComposer}>
          <TextInput
            multiline
            placeholder="I need to…"
            placeholderTextColor={colours.muted}
            value={text}
            onChangeText={setText}
            style={styles.input}
          />
          <Pressable disabled={!text.trim() || busy} onPress={createFromText} style={[styles.send, (!text.trim() || busy) && styles.sendDisabled]}>
            <Text style={styles.sendText}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper },
  page: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  close: { color: colours.secondaryInk, fontSize: 15 },
  wordmark: { color: colours.ink, fontWeight: '800', fontSize: 18 },
  headerSpacer: { width: 38 },
  hero: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.sm },
  title: { color: colours.ink, fontSize: 31, fontWeight: '750', letterSpacing: -1, textAlign: 'center' },
  subtitle: { color: colours.muted, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  recorded: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  recordedTitle: { color: colours.moss, fontSize: 13, fontWeight: '700' },
  primaryButton: { backgroundColor: colours.ink, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  primaryText: { color: colours.white, fontWeight: '700' },
  message: { color: colours.secondaryInk, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 320 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  line: { height: 1, flex: 1, backgroundColor: colours.line },
  or: { color: colours.muted, fontSize: 12 },
  textComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.sm, marginTop: spacing.md },
  input: { flex: 1, minHeight: 52, maxHeight: 120, color: colours.ink, fontSize: 16, lineHeight: 22, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  send: { width: 42, height: 42, borderRadius: 42, backgroundColor: colours.rust, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: colours.white, fontSize: 22, fontWeight: '700' },
});
