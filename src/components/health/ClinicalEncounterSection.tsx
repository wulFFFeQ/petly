import { useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { useApp } from '../../context/AppContext'
import type { ClinicalEncounter, ClinicalEncounterType } from '../../types'
import { cn } from '../../lib/utils'

const ENCOUNTER_TYPE_LABELS: Record<ClinicalEncounterType, string> = {
  preventive: 'Prevence',
  acute: 'Akutní',
  follow_up: 'Kontrola',
  vaccination: 'Očkování',
  laboratory: 'Laboratoř',
  procedure: 'Zákrok',
  hospitalization: 'Hospitalizace',
  telemedicine: 'Telemedicína',
  emergency: 'Pohotovost',
  other: 'Jiné',
}

const STATUS_LABELS: Record<ClinicalEncounter['status'], string> = {
  scheduled: 'Naplánováno',
  in_progress: 'Probíhá',
  completed: 'Dokončeno',
  cancelled: 'Zrušeno',
}

type Props = {
  petIds: string[]
  canWrite: (petId: string) => boolean
  /** Optional filter — when set, only this pet. */
  lockedPetId?: string
}

/**
 * K58 — minimal Clinical Encounter section for workflow validation.
 * DEMO authority only — localStorage ≠ production.
 */
export function ClinicalEncounterSection({ petIds, canWrite, lockedPetId }: Props) {
  const {
    pets,
    clinicalEncounters,
    healthRecords,
    documents,
    createClinicalEncounter,
    startClinicalEncounter,
    completeClinicalEncounter,
    cancelClinicalEncounter,
  } = useApp()

  const scopePetIds = lockedPetId ? [lockedPetId] : petIds
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createPetId, setCreatePetId] = useState(scopePetIds[0] ?? '')
  const [createType, setCreateType] = useState<ClinicalEncounterType>('preventive')
  const [createReason, setCreateReason] = useState('')

  const encounters = useMemo(() => {
    return clinicalEncounters
      .filter(
        (e) =>
          scopePetIds.includes(e.petId) &&
          e.lifecycleStatus !== 'withdrawn',
      )
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }, [clinicalEncounters, scopePetIds])

  const selected = encounters.find((e) => e.id === selectedId) ?? encounters[0] ?? null

  const linked = useMemo(() => {
    if (!selected) return { healthRecords: 0, documents: 0 }
    return {
      healthRecords: healthRecords.filter(
        (r) => r.encounterId === selected.id && r.lifecycleStatus !== 'withdrawn',
      ).length,
      documents: documents.filter(
        (d) => d.encounterId === selected.id && d.lifecycleStatus !== 'withdrawn',
      ).length,
    }
  }, [selected, healthRecords, documents])

  const petName = (petId: string) => pets.find((p) => p.id === petId)?.name ?? petId

  return (
    <section
      className="space-y-4 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4"
      data-testid="clinical-encounter-section"
    >
      <div>
        <h2 className="text-sm font-bold text-[#191E1B]">Klinické epizody</h2>
        <p className="mt-0.5 text-xs text-[#7D8B82]">
          Kontejner klinické návštěvy (DEMO) — HealthRecord zůstává SSOT faktů.
        </p>
      </div>

      {canWrite(createPetId) ? (
        <div
          className="flex flex-wrap items-end gap-2 rounded-lg border border-[#E8E4DC] bg-white p-3"
          data-testid="clinical-encounter-create"
        >
          {!lockedPetId && scopePetIds.length > 1 ? (
            <label className="text-xs text-[#5A6660]">
              Mazlíček
              <select
                className="mt-1 block rounded-md border border-[#E8E4DC] px-2 py-1.5 text-sm"
                value={createPetId}
                onChange={(e) => setCreatePetId(e.target.value)}
              >
                {scopePetIds.map((id) => (
                  <option key={id} value={id}>
                    {petName(id)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-xs text-[#5A6660]">
            Typ
            <select
              className="mt-1 block rounded-md border border-[#E8E4DC] px-2 py-1.5 text-sm"
              value={createType}
              onChange={(e) => setCreateType(e.target.value as ClinicalEncounterType)}
              data-testid="clinical-encounter-type"
            >
              {(Object.keys(ENCOUNTER_TYPE_LABELS) as ClinicalEncounterType[]).map((t) => (
                <option key={t} value={t}>
                  {ENCOUNTER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[10rem] flex-1 text-xs text-[#5A6660]">
            Důvod
            <input
              className="mt-1 block w-full rounded-md border border-[#E8E4DC] px-2 py-1.5 text-sm"
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
              placeholder="Stručný důvod"
              data-testid="clinical-encounter-reason"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            data-testid="clinical-encounter-create-btn"
            onClick={() => {
              const petId = lockedPetId ?? createPetId
              if (!petId || !canWrite(petId)) return
              const created = createClinicalEncounter({
                petId,
                encounterType: createType,
                reason: createReason.trim() || undefined,
              })
              if (created) {
                setSelectedId(created.id)
                setCreateReason('')
              }
            }}
          >
            Nová epizoda
          </Button>
        </div>
      ) : null}

      {encounters.length === 0 ? (
        <p className="text-xs text-[#7D8B82]" data-testid="clinical-encounter-empty">
          Zatím žádné klinické epizody.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <ul className="space-y-1.5" data-testid="clinical-encounter-list">
            {encounters.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer',
                    selected?.id === e.id
                      ? 'border-[#234B54] bg-white'
                      : 'border-[#E8E4DC] bg-white/60 hover:bg-white',
                  )}
                  data-testid={`clinical-encounter-row-${e.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#191E1B]">
                      {ENCOUNTER_TYPE_LABELS[e.encounterType]}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[#7D8B82]">
                      {STATUS_LABELS[e.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#5A6660]">
                    {petName(e.petId)} · {new Date(e.startedAt).toLocaleString('cs-CZ')}
                    {' · v'}
                    {e.version}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div
              className="rounded-lg border border-[#E8E4DC] bg-white p-3 space-y-2"
              data-testid="clinical-encounter-detail"
            >
              <h3 className="text-sm font-bold text-[#191E1B]">
                {ENCOUNTER_TYPE_LABELS[selected.encounterType]}
              </h3>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#5A6660]">
                <dt>Stav</dt>
                <dd className="font-medium text-[#191E1B]">{STATUS_LABELS[selected.status]}</dd>
                <dt>Začátek</dt>
                <dd>{new Date(selected.startedAt).toLocaleString('cs-CZ')}</dd>
                {selected.endedAt ? (
                  <>
                    <dt>Konec</dt>
                    <dd>{new Date(selected.endedAt).toLocaleString('cs-CZ')}</dd>
                  </>
                ) : null}
                {selected.reason ? (
                  <>
                    <dt>Důvod</dt>
                    <dd data-testid="clinical-encounter-detail-reason">{selected.reason}</dd>
                  </>
                ) : null}
                <dt>Propojené záznamy</dt>
                <dd>{linked.healthRecords}</dd>
                <dt>Propojené dokumenty</dt>
                <dd>{linked.documents}</dd>
                <dt>Verze</dt>
                <dd>{selected.version}</dd>
              </dl>
              {canWrite(selected.petId) ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.status === 'scheduled' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="clinical-encounter-start"
                      onClick={() => startClinicalEncounter(selected.petId, selected.id)}
                    >
                      Zahájit
                    </Button>
                  ) : null}
                  {selected.status === 'scheduled' || selected.status === 'in_progress' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        data-testid="clinical-encounter-complete"
                        onClick={() => completeClinicalEncounter(selected.petId, selected.id)}
                      >
                        Dokončit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="clinical-encounter-cancel"
                        onClick={() => cancelClinicalEncounter(selected.petId, selected.id)}
                      >
                        Zrušit
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
              <p className="text-[10px] text-[#9AA59E]">
                Dokončení ≠ clinical.finalize / podpis. DEMO authority.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
