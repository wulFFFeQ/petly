const USER_CITY_KEY = 'lovedandknown.userCity'

/** Default matches Settings „Město / region“ seed for Tereza V. */
export const DEFAULT_USER_HOME_CITY = 'Kolín'

/** Short city name used in Discover filters (e.g. Kolín). */
export function getUserHomeCity(): string {
  if (typeof window === 'undefined') return DEFAULT_USER_HOME_CITY
  try {
    const raw = window.localStorage.getItem(USER_CITY_KEY)?.trim()
    if (raw) return extractCityName(raw)
  } catch {
    // ignore
  }
  return DEFAULT_USER_HOME_CITY
}

export function setUserHomeCity(value: string): void {
  if (typeof window === 'undefined') return
  const city = extractCityName(value)
  try {
    if (city) window.localStorage.setItem(USER_CITY_KEY, city)
    else window.localStorage.removeItem(USER_CITY_KEY)
  } catch {
    // ignore
  }
}

/** „Kolín, Česká republika“ → „Kolín“ */
export function extractCityName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.split(',')[0]?.trim() || trimmed
}
