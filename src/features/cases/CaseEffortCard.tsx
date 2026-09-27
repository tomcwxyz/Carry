import { StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';
import type { CaseEffort } from './types';

export function CaseEffortCard({ effort }: { effort: CaseEffort }) {
  const items = [
    { label: 'Times Carry needed you', value: effort.humanHandbacks },
    { label: 'Your responses', value: effort.humanResponses },
    { label: 'Useful autonomous actions', value: effort.autonomousActions },
    { label: 'External actions completed', value: effort.externalActions },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>How much did Carry carry?</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.metric}>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
      {typeof effort.timeToFirstUsefulActionMinutes === 'number' ? (
        <Text style={styles.foot}>First useful action after about {effort.timeToFirstUsefulActionMinutes} min.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, backgroundColor: colours.surface, padding: spacing.md, gap: spacing.md },
  title: { color: colours.ink, fontSize: 17, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '47%', backgroundColor: colours.paper, borderRadius: radius.md, padding: spacing.md, gap: 3 },
  value: { color: colours.ink, fontSize: 24, fontWeight: '800' },
  label: { color: colours.secondaryInk, fontSize: 12, lineHeight: 17 },
  foot: { color: colours.muted, fontSize: 12, lineHeight: 18 },
});
