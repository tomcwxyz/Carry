import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';

interface VoiceCaptureProps {
  onRecorded: (uri: string) => void;
}

export function VoiceCapture({ onRecorded }: VoiceCaptureProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Carry needs microphone permission before it can listen.');
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (recorder.uri) onRecorded(recorder.uri);
  };

  const seconds = Math.max(0, Math.round(state.durationMillis / 1000));

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.isRecording ? 'Stop recording' : 'Start recording'}
        onPress={state.isRecording ? stop : start}
        style={({ pressed }) => [styles.button, state.isRecording && styles.recording, pressed && styles.pressed]}
      >
        <View style={[styles.dot, state.isRecording && styles.dotRecording]} />
      </Pressable>
      <Text style={styles.prompt}>{state.isRecording ? `Listening · ${seconds}s` : 'Tap and tell Carry'}</Text>
      <Text style={styles.hint}>{state.isRecording ? 'Speak naturally. Stop when you are done.' : '“My gutter is blocked.”  “Sort out the MOT.”  “Finish this proposal.”'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  button: { width: 112, height: 112, borderRadius: 112, backgroundColor: colours.ink, alignItems: 'center', justifyContent: 'center' },
  recording: { backgroundColor: colours.rust },
  pressed: { transform: [{ scale: 0.97 }] },
  dot: { width: 28, height: 28, borderRadius: 28, backgroundColor: colours.rust },
  dotRecording: { borderRadius: radius.sm, backgroundColor: colours.white },
  prompt: { color: colours.ink, fontSize: 19, fontWeight: '700', marginTop: spacing.sm },
  hint: { color: colours.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 310 },
  error: { color: colours.rust, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
