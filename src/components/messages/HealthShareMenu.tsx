/**
 * K61 — Selective clinical share picker.
 * Authorizes each source via ClinicalService before share.
 * Does not grant recipient pet access.
 */
import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import type { ClinicalShareType, Conversation, Pet } from '../../types'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  type ClinicalService,
} from '../../lib/clinical'
import { createDemoSecurityContext } from '../../lib/security'
import { sendClinicalShareRequest } from '../../lib/messaging'
import { useApp } from '../../context/AppContext'

type SharePickItem = {
  shareType: ClinicalShareType
  sourceId: string
  label: string
  meta?: string
}

interface HealthShareMenuProps {
  conversation: Conversation
  onClose: () => void
  onShared?: () => void
}

function buildService(pets: Pet[]): ClinicalService {
  const adapter = createInMemoryDemoClinicalAdapter({
    getHealthRecords: () => {
      try {
        const raw = localStorage.getItem('lovedandknown.healthRecords')
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    },
    getDocuments: () => {
      try {
        const raw = localStorage.getItem('lovedandknown.petDocuments')
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    },
    getWeightMeasurements: () => {
      try {
        const raw = localStorage.getItem('lovedandknown.weightMeasurements')
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    },
    getEncounters: () => {
      try {
        const raw = localStorage.getItem('lovedandknown.clinicalEncounters')
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    },
  })
  return createDemoClinicalService(adapter, { store: { pets } })
}

export function HealthShareMenu({ conversation, onClose, onShared }: HealthShareMenuProps) {
  const { pets, upsertNotification, showToast } = useApp()
  const petId = conversation.petId
  const [tab, setTab] = useState<ClinicalShareType>('health_record')
  const [items, setItems] = useState<SharePickItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canShare = Boolean(
    petId && conversation.participantAccountIds?.length,
  )

  const service = useMemo(() => buildService(pets), [pets])

  useEffect(() => {
    if (!canShare || !petId) {
      setItems([])
      return
    }
    const session = createDemoSecurityContext({ channel: 'web', activeMode: 'personal' })
    if (!session.ok) {
      setError('Nejste přihlášeni')
      setItems([])
      return
    }
    setError(null)
    try {
      const ctx = session.context
      const base = { context: ctx, petId, pets }
      if (tab === 'health_record') {
        const res = service.listRecordsForPet(base)
        setItems(
          res.data.slice(0, 40).map((r) => ({
            shareType: 'health_record' as const,
            sourceId: r.id,
            label: r.title,
            meta: r.date,
          })),
        )
      } else if (tab === 'measurement') {
        const res = service.listWeightMeasurementsForPet(base)
        setItems(
          res.data.slice(0, 40).map((m) => ({
            shareType: 'measurement' as const,
            sourceId: m.id,
            label: `${m.weight} kg`,
            meta: m.date,
          })),
        )
      } else if (tab === 'document') {
        const res = service.listDocumentsForPet(base)
        setItems(
          res.data.slice(0, 40).map((d) => ({
            shareType: 'document' as const,
            sourceId: d.id,
            label: d.name,
            meta: d.issuedAt || d.uploadedAt?.slice(0, 10),
          })),
        )
      } else {
        const res = service.listEncountersForPet(base)
        setItems(
          res.data.slice(0, 40).map((e) => ({
            shareType: 'encounter' as const,
            sourceId: e.id,
            label: `${e.encounterType} · ${e.status}`,
            meta: e.startedAt.slice(0, 10),
          })),
        )
      }
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : 'Nelze načíst záznamy')
    }
  }, [canShare, petId, pets, service, tab])

  const shareItem = (item: SharePickItem) => {
    if (!petId || busy) return
    const session = createDemoSecurityContext({ channel: 'web', activeMode: 'personal' })
    if (!session.ok) {
      showToast('Sdílení selhalo', 'Nejste přihlášeni', 'error')
      return
    }
    setBusy(true)
    const result = sendClinicalShareRequest(
      {
        context: session.context,
        conversationId: conversation.id,
        petId,
        shareType: item.shareType,
        sourceId: item.sourceId,
        pets,
        clinical: service,
      },
      { upsertNotification },
    )
    setBusy(false)
    if (!result.ok) {
      showToast('Sdílení odmítnuto', result.message, 'error')
      return
    }
    showToast('Sdíleno', 'Klinický záznam byl odeslán', 'success')
    onShared?.()
    onClose()
  }

  if (!canShare) {
    return (
      <div
        className="absolute bottom-full left-0 z-20 mb-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-lg"
        data-testid="messages-clinical-share-menu"
      >
        <div className="px-3 py-3">
          <p className="text-xs font-bold text-[#191E1B]">Clinical Share</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#5A6660]">
            Sdílení je dostupné jen v account konverzaci s pet kontextem.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#234B54] cursor-pointer"
          >
            Zavřít
          </button>
        </div>
      </div>
    )
  }

  const tabs: { id: ClinicalShareType; label: string }[] = [
    { id: 'health_record', label: 'Záznamy' },
    { id: 'measurement', label: 'Váha' },
    { id: 'document', label: 'Dokumenty' },
    { id: 'encounter', label: 'Encounter' },
  ]

  return (
    <div
      className="absolute bottom-full left-0 z-20 mb-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-lg"
      data-testid="messages-clinical-share-menu"
    >
      <div className="border-b border-[#F0EDE6] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6660]">
          Clinical Share
        </p>
        <p className="mt-1 text-xs font-bold text-[#191E1B]">
          Sdílet vybraný záznam
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5A6660]">
          Příjemce nezíská dlouhodobý přístup. Dokumenty = pouze metadata.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[#F0EDE6] px-2 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-2 py-1 text-[10px] font-semibold cursor-pointer',
              tab === t.id
                ? 'bg-[#E0EAEC] text-[#234B54]'
                : 'text-[#7D8B82] hover:bg-[#FAF8F5]',
            )}
            data-testid={`clinical-share-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-56 overflow-y-auto px-2 py-2">
        {error && (
          <p className="px-2 py-2 text-[11px] text-[#8A6B2E]" data-testid="clinical-share-error">
            {error}
          </p>
        )}
        {!error && items.length === 0 && (
          <p className="px-2 py-2 text-[11px] text-[#7D8B82]">Žádné položky ke sdílení.</p>
        )}
        {items.map((item) => (
          <button
            key={`${item.shareType}:${item.sourceId}`}
            type="button"
            disabled={busy}
            onClick={() => shareItem(item)}
            className="mb-1 flex w-full flex-col rounded-lg px-2 py-2 text-left hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
            data-testid={`clinical-share-item-${item.shareType}`}
          >
            <span className="text-xs font-semibold text-[#191E1B] truncate">{item.label}</span>
            {item.meta && (
              <span className="text-[10px] text-[#7D8B82]">{item.meta}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
