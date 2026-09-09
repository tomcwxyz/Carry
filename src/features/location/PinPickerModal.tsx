import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colours, radius, spacing } from '../../theme/tokens';

type Coordinates = { latitude: number; longitude: number };

type PinPickerModalProps = {
  visible: boolean;
  initial?: Coordinates;
  onCancel: () => void;
  onConfirm: (coordinates: Coordinates) => void;
};

function mapHtml(initial?: Coordinates) {
  const latitude = initial?.latitude ?? 54.5;
  const longitude = initial?.longitude ?? -3;
  const zoom = initial ? 15 : 5;
  const initialMarker = initial
    ? `setPin(${JSON.stringify(initial.latitude)}, ${JSON.stringify(initial.longitude)}, false);`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; background: #F4F0E8; }
    .leaflet-control-attribution { font: 10px system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${latitude}, ${longitude}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    let marker;
    function setPin(lat, lng, notify = true) {
      if (marker) marker.setLatLng([lat, lng]);
      else marker = L.marker([lat, lng]).addTo(map);
      if (notify && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pin', latitude: lat, longitude: lng }));
      }
    }
    ${initialMarker}
    map.on('click', (event) => setPin(event.latlng.lat, event.latlng.lng));
  </script>
</body>
</html>`;
}

export function PinPickerModal({ visible, initial, onCancel, onConfirm }: PinPickerModalProps) {
  const [selected, setSelected] = useState<Coordinates | undefined>(initial);
  const [mapError, setMapError] = useState(false);
  const html = useMemo(() => mapHtml(initial), [initial]);

  useEffect(() => {
    if (!visible) return;
    setSelected(initial);
    setMapError(false);
  }, [initial, visible]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; latitude?: number; longitude?: number };
      if (message.type !== 'pin' || typeof message.latitude !== 'number' || typeof message.longitude !== 'number') return;
      setSelected({ latitude: message.latitude, longitude: message.longitude });
    } catch {
      // Ignore messages that are not pin selections.
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Drop a pin</Text>
            <Text style={styles.subtitle}>Tap the map to place or move the pin.</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={12}><Text style={styles.close}>Close</Text></Pressable>
        </View>

        <View style={styles.mapFrame}>
          {mapError ? (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackTitle}>The map could not load.</Text>
              <Text style={styles.mapFallbackText}>Close this view and type a postcode, town or area instead.</Text>
            </View>
          ) : (
            <WebView
              source={{ html }}
              originWhitelist={['*']}
              onMessage={handleMessage}
              onError={() => setMapError(true)}
              startInLoadingState
              renderLoading={() => <View style={styles.loading}><ActivityIndicator /></View>}
              javaScriptEnabled
              domStorageEnabled={false}
              setSupportMultipleWindows={false}
              style={styles.webview}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.selectionText}>
            {selected ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}` : 'No pin selected yet'}
          </Text>
          <Pressable
            disabled={!selected || mapError}
            onPress={() => selected && onConfirm(selected)}
            style={[styles.confirmButton, (!selected || mapError) && styles.disabledButton]}
          >
            <Text style={styles.confirmText}>Use this location</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.md },
  headerCopy: { flex: 1 },
  title: { color: colours.ink, fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colours.secondaryInk, fontSize: 15, lineHeight: 21, marginTop: spacing.xs },
  close: { color: colours.rust, fontSize: 15, fontWeight: '700', paddingTop: 5 },
  mapFrame: { flex: 1, marginHorizontal: spacing.lg, borderWidth: 1, borderColor: colours.line, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colours.surface },
  webview: { flex: 1, backgroundColor: colours.surface },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.surface },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  mapFallbackTitle: { color: colours.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  mapFallbackText: { color: colours.secondaryInk, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing.sm },
  footer: { padding: spacing.lg, gap: spacing.sm },
  selectionText: { color: colours.muted, fontSize: 13, textAlign: 'center' },
  confirmButton: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colours.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  disabledButton: { opacity: 0.4 },
  confirmText: { color: colours.white, fontSize: 15, fontWeight: '700' },
});
