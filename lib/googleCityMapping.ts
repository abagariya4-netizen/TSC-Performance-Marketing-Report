import { GOOGLE_CITY_MAP } from './googleCityMap';

export function getMappedCity(
  googleCityName: string,
  customMapping: Record<string, string> | null = null
): string {
  if (!googleCityName) return 'Rest';
  const lower = googleCityName.toLowerCase().trim();

  if (customMapping && customMapping[lower]) {
    return customMapping[lower];
  }

  if (GOOGLE_CITY_MAP[lower]) {
    return GOOGLE_CITY_MAP[lower];
  }

  return 'Rest';
}
