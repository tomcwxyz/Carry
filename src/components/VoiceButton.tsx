import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../theme/tokens';

interface VoiceButtonProps {
  onPress: () => void;
}

export function VoiceButton({ onPress }: VoiceButtonProps) {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        accessibilityLabel="Tell Carry"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.mic}>●</Text>
        <Text style={styles.label}>Tell Carry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 76, alignItems: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colours.ink,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  mic: { color: colours.rust, fontSize: 18 },
  label: { color: colours.white, fontWeight: '700', fontSize: 15 },
});
