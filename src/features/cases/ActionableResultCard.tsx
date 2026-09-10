import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, radius, spacing } from '../../theme/tokens';
import type { CaseEvidence, PreparedAction, ResultContact } from './types';

function contactLabel(contact: ResultContact) {
  if (contact.kind === 'phone') return 'Call';
  if (contact.kind === 'email') return 'Email';
  if (contact.kind === 'contact_form') return 'Contact form';
  return 'Website';
}

function contactUrl(contact: ResultContact, preparedAction?: PreparedAction | null) {
  if (contact.kind === 'phone') {
    const number = contact.value.replace(/[^+\d]/g, '');
    return `tel:${number}`;
  }
  if (contact.kind === 'email') {
    const query = new URLSearchParams();
    if (preparedAction?.subject) query.set('subject', preparedAction.subject);
    if (preparedAction?.body) query.set('body', preparedAction.body);
    const suffix = query.toString();
    return `mailto:${contact.value}${suffix ? `?${suffix}` : ''}`;
  }
  return contact.value;
}

function sourceName(url: string, title?: string) {
  if (title?.trim()) return title.trim();
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || url;
}

export function ActionableResultCard({ evidence }: { evidence: CaseEvidence }) {
  const [showSources, setShowSources] = useState(false);
  const options = [...evidence.options].sort((a, b) => Number(b.recommended) - Number(a.recommended));

  async function openContact(contact: ResultContact) {
    await Linking.openURL(contactUrl(contact, evidence.preparedAction));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{evidence.title}</Text>
      {evidence.body ? <Text style={styles.body}>{evidence.body}</Text> : null}

      {options.length > 0 ? (
        <View style={styles.options}>
          {options.map((option, index) => (
            <View key={`${option.name}-${index}`} style={[styles.option, option.recommended && styles.recommendedOption]}>
              {option.recommended ? <Text style={styles.recommended}>RECOMMENDED</Text> : null}
              <Text style={styles.optionTitle}>{option.name}</Text>
              {option.location ? <Text style={styles.location}>{option.location}</Text> : null}
              <Text style={styles.optionSummary}>{option.summary}</Text>
              {option.reason ? <Text style={styles.reason}>{option.reason}</Text> : null}

              {option.contacts.length > 0 ? (
                <View style={styles.actions}>
                  {option.contacts.map((contact, contactIndex) => (
                    <Pressable
                      key={`${contact.kind}-${contact.value}-${contactIndex}`}
                      onPress={() => { void openContact(contact); }}
                      style={[styles.action, contact.kind === 'phone' && option.recommended && styles.primaryAction]}
                    >
                      <Text style={[styles.actionText, contact.kind === 'phone' && option.recommended && styles.primaryActionText]}>
                        {contactLabel(contact)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.noContact}>No verified direct contact route found yet.</Text>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {evidence.preparedAction ? (
        <View style={styles.prepared}>
          <Text style={styles.preparedEyebrow}>READY TO USE</Text>
          <Text style={styles.preparedTitle}>{evidence.preparedAction.label}</Text>
          <Text style={styles.preparedBody}>{evidence.preparedAction.body}</Text>
        </View>
      ) : null}

      {evidence.sources.length > 0 ? (
        <View style={styles.evidence}>
          <Pressable onPress={() => setShowSources((current) => !current)} style={styles.evidenceToggle}>
            <Text style={styles.evidenceToggleText}>
              Evidence · {evidence.sources.length} {evidence.sources.length === 1 ? 'source' : 'sources'} {showSources ? '↑' : '↓'}
            </Text>
          </Pressable>
          {showSources ? (
            <View style={styles.sourceList}>
              {evidence.sources.map((source) => (
                <Pressable key={source.url} onPress={() => Linking.openURL(source.url)}>
                  <Text numberOfLines={2} style={styles.sourceLink}>↗ {sourceName(source.url, source.title)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colours.surface },
  title: { color: colours.ink, fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3 },
  body: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  options: { marginTop: spacing.md, gap: spacing.sm },
  option: { borderTopWidth: 1, borderTopColor: colours.line, paddingTop: spacing.md },
  recommendedOption: { borderTopWidth: 0, backgroundColor: colours.paper, borderRadius: radius.md, padding: spacing.md },
  recommended: { color: colours.moss, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: spacing.xs },
  optionTitle: { color: colours.ink, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  location: { color: colours.muted, fontSize: 13, marginTop: 3 },
  optionSummary: { color: colours.secondaryInk, fontSize: 15, lineHeight: 21, marginTop: spacing.xs },
  reason: { color: colours.ink, fontSize: 14, lineHeight: 20, marginTop: spacing.xs, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { borderWidth: 1, borderColor: colours.ink, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryAction: { backgroundColor: colours.ink },
  actionText: { color: colours.ink, fontSize: 14, fontWeight: '700' },
  primaryActionText: { color: colours.white },
  noContact: { color: colours.muted, fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  prepared: { marginTop: spacing.md, borderRadius: radius.md, backgroundColor: colours.paper, padding: spacing.md },
  preparedEyebrow: { color: colours.rust, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  preparedTitle: { color: colours.ink, fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  preparedBody: { color: colours.secondaryInk, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  evidence: { marginTop: spacing.md },
  evidenceToggle: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  evidenceToggleText: { color: colours.muted, fontSize: 13, fontWeight: '700' },
  sourceList: { gap: spacing.xs, marginTop: spacing.xs },
  sourceLink: { color: colours.rust, fontSize: 13, lineHeight: 18 },
});
