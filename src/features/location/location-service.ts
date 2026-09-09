import * as Location from 'expo-location';

import type { CarryLocationResponse } from '../cases/types';

function compactParts(parts: Array<string | null | undefined>) {
  return parts.flatMap((part) => {
    const value = part?.trim();
    return value ? [value] : [];
  }).filter((value, index, values) => values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);
}

function labelFromAddress(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) return undefined;
  const locality = address.city ?? address.district ?? address.subregion;
  const parts = compactParts([address.postalCode, locality, address.region, address.country]);
  return parts.length ? parts.join(' · ') : undefined;
}

export async function reverseGeocodeLabel(latitude: number, longitude: number) {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    return labelFromAddress(addresses[0]);
  } catch {
    return undefined;
  }
}

export async function getCurrentCarryLocation(): Promise<CarryLocationResponse> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission was not granted. Drop a pin or type a postcode or place instead.');
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude, accuracy } = position.coords;
  const label = await reverseGeocodeLabel(latitude, longitude);

  return {
    source: 'device',
    latitude,
    longitude,
    accuracyMetres: typeof accuracy === 'number' ? accuracy : undefined,
    label,
  };
}
