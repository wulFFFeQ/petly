import { MapPin, Navigation } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  GeolocationRequestError,
  geolocationErrorMessage,
  resolveCurrentLocation,
  searchPlaces,
  type PlaceSuggestion,
} from '../../../lib/geolocation'
import { buildApproxLocation, buildApproxLocationSync } from '../../../lib/lostPet'
import type { ApproxLocation } from '../../../types'
import { Button } from '../../ui/Button'
import { SearchInput } from '../../ui/SearchInput'

// Fix default Leaflet marker icons under Vite bundling.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

interface LocationPickerProps {
  value: ApproxLocation | null
  onChange: (location: ApproxLocation) => void
  /** Show interactive map for picking. */
  showMap?: boolean
  label?: string
  compact?: boolean
  onError?: (title: string, description: string) => void
}

export function LocationPicker({
  value,
  onChange,
  showMap = true,
  label = 'Kde byl naposledy viděn?',
  compact = false,
  onError,
}: LocationPickerProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const [locating, setLocating] = useState(false)
  const [mapBusy, setMapBusy] = useState(false)

  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [50.028, 15.201] // Kolín fallback

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setSearchStatus('idle')
      return
    }

    const controller = new AbortController()
    setSearchStatus('loading')
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchPlaces(trimmed, controller.signal)
          if (controller.signal.aborted) return
          setSuggestions(results)
          setSearchStatus(results.length === 0 ? 'empty' : 'idle')
        } catch (error) {
          if (controller.signal.aborted) return
          if (error instanceof DOMException && error.name === 'AbortError') return
          setSuggestions([])
          setSearchStatus('error')
        }
      })()
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [query])

  const applyCoords = async (lat: number, lng: number, privateLabel?: string) => {
    setMapBusy(true)
    try {
      const location = privateLabel
        ? buildApproxLocationSync(lat, lng, privateLabel)
        : await buildApproxLocation(lat, lng)
      onChange(location)
      setQuery('')
      setSuggestions([])
    } finally {
      setMapBusy(false)
    }
  }

  const handleSelectSuggestion = (place: PlaceSuggestion) => {
    void applyCoords(place.latitude, place.longitude, place.label)
  }

  const handleUseCurrent = async () => {
    if (locating) return
    setLocating(true)
    try {
      const resolved = await resolveCurrentLocation()
      onChange(buildApproxLocationSync(resolved.latitude, resolved.longitude, resolved.label))
      setQuery('')
      setSuggestions([])
    } catch (error) {
      const code =
        error instanceof GeolocationRequestError ? error.code : 'position_unavailable'
      const message = geolocationErrorMessage(code)
      onError?.(message.title, message.description)
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
          {label}
        </label>
      )}

      <div className="relative">
        <SearchInput
          size="sm"
          placeholder="Vyhledat lokalitu…"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        />
        {(suggestions.length > 0 || searchStatus === 'loading' || searchStatus === 'empty') &&
          query.trim().length >= 2 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#E8E4DC] bg-white shadow-lg">
              {searchStatus === 'loading' && (
                <p className="px-3 py-2 text-xs text-[#7D8B82]">Hledám…</p>
              )}
              {searchStatus === 'empty' && (
                <p className="px-3 py-2 text-xs text-[#7D8B82]">Nic nenalezeno</p>
              )}
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-[#191E1B] hover:bg-[#FAF8F5] cursor-pointer"
                  onClick={() => handleSelectSuggestion(place)}
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[#B8934A]" />
                  <span>{place.label}</span>
                </button>
              ))}
            </div>
          )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => void handleUseCurrent()}
        disabled={locating}
      >
        <Navigation size={14} />
        {locating ? 'Zjišťuji polohu…' : 'Použít aktuální polohu'}
      </Button>

      {value && (
        <div className="rounded-xl border border-[#D1E0D8] bg-[#EBF2EE]/50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
            Veřejná lokalita
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#2C4A3E]">{value.publicLabel}</p>
          {value.privateLabel && value.privateLabel !== value.publicLabel && (
            <p className="mt-1 text-xs text-[#7D8B82]">
              Přesněji (jen pro vás): {value.privateLabel}
            </p>
          )}
        </div>
      )}

      {showMap && (
        <div className="overflow-hidden rounded-2xl border border-[#E8E4DC]">
          <div className={`relative w-full ${compact ? 'h-40' : 'h-52'}`}>
            <MapContainer
              center={center}
              zoom={value ? 14 : 12}
              className="h-full w-full"
              scrollWheelZoom={false}
              key={`${center[0].toFixed(3)}-${center[1].toFixed(3)}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler
                onPick={(lat, lng) => {
                  if (!mapBusy) void applyCoords(lat, lng)
                }}
              />
              {value && <Marker position={[value.lat, value.lng]} />}
            </MapContainer>
          </div>
          <p className="bg-[#FAF8F5] px-3 py-1.5 text-[10px] text-[#7D8B82]">
            Klikněte na mapu pro výběr místa. Veřejně se zobrazí jen přibližná lokalita.
          </p>
        </div>
      )}
    </div>
  )
}
