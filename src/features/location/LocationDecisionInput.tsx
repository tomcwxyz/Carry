import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CarryCaseResponse, CarryLocationResponse, CaseDecisionInput } from '../cases/types';
import { colours, radius, spacing } from '../../theme/tokens';
import { getCurrentCarryLocation, reverseGeocodeLabel } from './location-service';
import { PinPickerModal } from './PinPickerModal';

type LocationDecisionInputProps = {
  decision: CaseDecisionInput;
  disabled?: boolean;
  onSubmit: (response: CarryCaseResponse) => void;
};

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

function selectionLabel(location: CarryLocationResponse) {
  if (location.label) return location.label;
  if (location.source === 'device') return 'Current location';
  return `Pinned location · ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

export function LocationDecisionInput({ decision, disabled = false, onSubmit }: LocationDecisionInputProps) {
  const [selectedLocation, setSelectedLocation] = useState<CarryLocationResponse>();
  const [typedLocation, setTypedLocation] = useState('');
  const [extraText, setExtraText] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [locating, setLocating] = useState(false);
  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const canSubmit = Boolean(selectedLocation) || Boolean(typedLocation.trim());

  async function useCurrentLocation() {
    if (disabled || locating) return;
    setLocating(true);
    setLocationMessage(null);
    try {
      const location = await getCurrentCarryLocation();
      setSelectedLocation(location);
      setTypedLocation('');
    } catch (cause) {
      setLocationMessage(cause instanceof Error ? cause.message : 'Carry could not read your location. Drop a pin or type a place instead.');
    } finally {
      setLocating(false);
    }
  }

  async function confirmPin(coordinates: { latitude: number; longitude: number }) {
    setPinPickerOpen(false);
    setLocationMessage(null);
    const label = await reverseGeocodeLabel(coordinates.latitude, coordinates.longitude);
    setSelectedLocation({
      source: 'pin',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      label,
    });
    setTypedLocation('');
  }

  function updateTypedLocation(value: string) {
    setTypedLocation(value);
    if (value.trim()) setSelectedLocation(undefined);
    setLocationMessage(null);
  }

  function submit() {
    if (!canSubmit || disabled) return;
    const extra = extraText.trim();
    if (selectedLocation) {
      onSubmit({
        location: {
          ...selectedLocation,
          radiusMiles: decision.askRadius ? radiusMiles : undefined,
        },
        text: extra || undefined,
      });
      return;
    }

    const parts = [`Location: ${typedLocation.trim()}`];
    if (decision.askRadius) parts.push(`Search radius: ${radiusMiles} miles`);
    if (extra) parts.push(extra);
    onSubmit({ text: parts.join('. ') });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.helper}>Use the phone's location, choose a point on the map, or type a place instead.</Text>
      <View style={styles.locationActions}>
        <Pressable disabled={disabled || locating} onPress={useCurrentLocation} style={[styles.secondaryButton, (disabled || locating) && styles.disabled]}>
          {locating ? <ActivityIndicator size="small" color={colours.ink} /> : <Text style={styles.secondaryButtonText}>⌖ Use my location</Text>}
        </Pressable>
        <Pressable disabled={disabled} onPress={() => setPinPickerOpen(true)} style={[styles.secondaryButton, disabled && styles.disabled]}>
          <Text style={styles.secondaryButtonText}>⌖ Drop a pin</Text>
        </Pressable>
      </View>
      <Text style={styles.permissionNote}>Location permission is requested only when you tap “Use my location”. Carry does not request background location.</Text>

      {selectedLocation ? (
        <View style={styles.selectionCard}>
          <View style={styles.selectionDot} />
          <View style={styles.selectionCopy}>
            <Text style={styles.selectionTitle}>{selectionLabel(selectedLocation)}</Text>
            {typeof selectedLocation.accuracyMetres === 'number' ? (
              <Text style={styles.selectionMeta}>Approx. {Math.max(1, Math.round(selectedLocation.accuracyMetres))} m accuracy</Text>
            ) : null}
          </View>
          <Pressable onPress={() => setSelectedLocation(undefined)} hitSlop={10}><Text style={styles.clearText}>Clear</Text></Pressable>
        </View>
      ) : null}

      {locationMessage ? <Text style={styles.message}>{locationMessage}</Text> : null}

      <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>or type a place</Text><View style={styles.orLine} /></View>
      <TextInput
        value={typedLocation}
        onChangeText={updateTypedLocation}
        placeholder="Postcode, town, address or area"
        placeholderTextColor={colours.muted}
        autoCapitalize="words"
        editable={!disabled}
        style={styles.locationInput}
      />

      {decision.askRadius ? (
        <View style={styles.radiusBlock}>
          <Text style={styles.fieldLabel}>How far should Carry look?</Text>
          <View style={styles.radiusOptions}>
            {RADIUS_OPTIONS.map((option) => {
              const active = radiusMiles === option;
              return (
                <Pressable
                  key={option}
                  disabled={disabled}
                  onPress={() => setRadiusMiles(option)}
                  style={[styles.radiusChip, active && styles.radiusChipActive, disabled && styles.disabled]}
                >
                  <Text style={[styles.radiusChipText, active && styles.radiusChipTextActive]}>{option} mi</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.extraBlock}>
        <Text style={styles.fieldLabel}>Anything else Carry needs to know?</Text>
        <TextInput
          value={extraText}
          onChangeText={setExtraText}
          placeholder="Optional details, such as access, timing or building type"
          placeholderTextColor={colours.muted}
          multiline
          editable={!disabled}
          style={styles.extraInput}
        />
      </View>

      <Pressable disabled={!canSubmit || disabled} onPress={submit} style={[styles.primaryButton, (!canSubmit || disabled) && styles.disabled]}>
        {disabled ? <ActivityIndicator color={colours.white} /> : <Text style={styles.primaryButtonText}>Continue with this</Text>}
      </Pressable>

      <PinPickerModal
        visible={pinPickerOpen}
        initial={selectedLocation ? { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude } : undefined}
        onCancel={() => setPinPickerOpen(false)}
        onConfirm={confirmPin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg, gap: spacing.sm },
  helper: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22 },
  locationActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colours.line, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, backgroundColor: colours.surface },
  secondaryButtonText: { color: colours.ink, fontSize: 14, fontWeight: '700' },
  permissionNote: { color: colours.muted, fontSize: 12, lineHeight: 17 },
  selectionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colours.surface },
  selectionDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colours.rust },
  selectionCopy: { flex: 1 },
  selectionTitle: { color: colours.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  selectionMeta: { color: colours.muted, fontSize: 12, marginTop: 2 },
  clearText: { color: colours.rust, fontSize: 13, fontWeight: '700' },
  message: { color: colours.rust, fontSize: 13, lineHeight: 19 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  orLine: { flex: 1, height: 1, backgroundColor: colours.line },
  orText: { color: colours.muted, fontSize: 12 },
  locationInput: { minHeight: 50, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, paddingHorizontal: spacing.md, color: colours.ink, backgroundColor: colours.white, fontSize: 16 },
  radiusBlock: { gap: spacing.sm, marginTop: spacing.xs },
  fieldLabel: { color: colours.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  radiusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  radiusChip: { borderWidth: 1, borderColor: colours.line, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: colours.surface },
  radiusChipActive: { backgroundColor: colours.ink, borderColor: colours.ink },
  radiusChipText: { color: colours.secondaryInk, fontSize: 13, fontWeight: '700' },
  radiusChipTextActive: { color: colours.white },
  extraBlock: { gap: spacing.sm, marginTop: spacing.xs },
  extraInput: { minHeight: 76, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, padding: spacing.md, color: colours.ink, backgroundColor: colours.white, fontSize: 15, lineHeight: 21, textAlignVertical: 'top' },
  primaryButton: { marginTop: spacing.xs, backgroundColor: colours.ink, borderRadius: radius.pill, minHeight: 52, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colours.white, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.45 },
});
