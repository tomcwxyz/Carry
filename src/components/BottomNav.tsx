import { Link, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colours, spacing } from '../theme/tokens';

const items = [
  { href: '/', label: 'Now' },
  { href: '/cases', label: 'Cases' },
  { href: '/you', label: 'You' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link href={item.href} key={item.href} style={styles.link}>
            <Text style={[styles.label, active && styles.active]}>{item.label}</Text>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    borderTopWidth: 1,
    borderTopColor: colours.line,
    backgroundColor: colours.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
  },
  link: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  label: { color: colours.muted, fontSize: 13, fontWeight: '600' },
  active: { color: colours.ink },
});
