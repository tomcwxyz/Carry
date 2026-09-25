import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, spacing } from '../theme/tokens';

export function CollapsibleSection({
  title,
  summary,
  initiallyOpen = false,
  children,
}: PropsWithChildren<{ title: string; summary?: string; initiallyOpen?: boolean }>) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <View style={styles.section}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {!open && summary ? <Text style={styles.summary}>{summary}</Text> : null}
        </View>
        <Text style={styles.chevron}>{open ? '↑' : '↓'}</Text>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.md },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 3 },
  title: { color: colours.ink, fontSize: 17, fontWeight: '700' },
  summary: { color: colours.muted, fontSize: 13, lineHeight: 18 },
  chevron: { color: colours.muted, fontSize: 15, fontWeight: '700' },
  body: { marginTop: spacing.md },
});
