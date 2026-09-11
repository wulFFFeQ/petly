import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  createProfessionalService,
  disableProfessionalService,
  ensureSeedServices,
  formatServicePrice,
  listProfessionalServices,
  updateProfessionalService,
  type ProfessionalService,
} from '../../lib/booking'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'
import { useApp } from '../../context/AppContext'

type Draft = {
  name: string
  description: string
  durationMinutes: string
  price: string
  currency: string
  bookingEnabled: boolean
}

const emptyDraft = (): Draft => ({
  name: '',
  description: '',
  durationMinutes: '30',
  price: '',
  currency: 'CZK',
  bookingEnabled: true,
})

export function ProfessionalServicesPage() {
  const profile = getActiveSelfProfessionalProfile()
  const { showToast } = useApp()
  const [revision, setRevision] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  const services = useMemo(() => {
    if (!profile) return [] as ProfessionalService[]
    ensureSeedServices(profile.id, profile.type)
    return listProfessionalServices(profile.id, { includeInactive: true })
  }, [profile, revision])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Správa služeb vyžaduje profesionální účet."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  const openCreate = () => {
    setEditId(null)
    setDraft(emptyDraft())
    setOpen(true)
  }

  const openEdit = (s: ProfessionalService) => {
    setEditId(s.id)
    setDraft({
      name: s.name,
      description: s.description ?? '',
      durationMinutes: String(s.durationMinutes),
      price: s.price !== undefined ? String(s.price) : '',
      currency: s.currency ?? 'CZK',
      bookingEnabled: s.bookingEnabled,
    })
    setOpen(true)
  }

  const save = () => {
    const duration = Number(draft.durationMinutes)
    const priceRaw = draft.price.trim()
    const price = priceRaw === '' ? undefined : Number(priceRaw)
    if (editId) {
      const result = updateProfessionalService(
        editId,
        {
          name: draft.name,
          description: draft.description,
          durationMinutes: duration,
          price,
          currency: draft.currency,
          bookingEnabled: draft.bookingEnabled,
          active: true,
        },
        profile.id,
      )
      if (!result.ok) {
        showToast('Uložení selhalo', result.message, 'error')
        return
      }
    } else {
      const result = createProfessionalService({
        professionalId: profile.id,
        name: draft.name,
        description: draft.description || undefined,
        durationMinutes: duration,
        price,
        currency: draft.currency || undefined,
        bookingEnabled: draft.bookingEnabled,
      })
      if (!result.ok) {
        showToast('Uložení selhalo', result.message, 'error')
        return
      }
    }
    setOpen(false)
    setRevision((r) => r + 1)
    showToast('Služba uložena', draft.name, 'success')
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-services-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#191E1B]">Služby</h1>
          <p className="text-xs text-[#7D8B82]">
            Nastavte služby, délku a informativní cenu. Platba zatím neprobíhá.
          </p>
        </div>
        <Button variant="primary" size="sm" data-testid="add-service" onClick={openCreate}>
          Přidat službu
        </Button>
      </div>

      <Link
        to="/professional/availability"
        className="inline-flex text-xs font-semibold text-[#2C4A3E] hover:underline"
      >
        Nastavit dostupnost →
      </Link>

      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.id}>
            <Card variant="elevated" className={!s.active ? 'opacity-60' : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#191E1B]">{s.name}</p>
                  {s.description ? (
                    <p className="mt-0.5 text-xs text-[#7D8B82]">{s.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#4A564F]">
                    {s.durationMinutes} min · {formatServicePrice(s.price, s.currency)}
                    {!s.active ? ' · neaktivní' : ''}
                    {s.active && !s.bookingEnabled ? ' · bez rezervace' : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(s)}>
                    Upravit
                  </Button>
                  {s.active ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      data-testid={`disable-service-${s.id}`}
                      onClick={() => {
                        const r = disableProfessionalService(s.id, profile.id)
                        if (!r.ok) {
                          showToast('Nelze deaktivovat', r.message, 'error')
                          return
                        }
                        setRevision((x) => x + 1)
                        showToast('Služba deaktivována', s.name, 'info')
                      }}
                    >
                      Deaktivovat
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Upravit službu' : 'Přidat službu'}
      >
        <div className="space-y-3">
          <Input
            label="Název"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            data-testid="service-name-input"
          />
          <label className="block text-xs font-semibold text-[#4A564F]">
            Popis
            <textarea
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <Input
            label="Délka (min)"
            type="number"
            value={draft.durationMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, durationMinutes: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Cena (volitelné)"
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            />
            <Input
              label="Měna"
              value={draft.currency}
              onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#4A564F]">
            <input
              type="checkbox"
              checked={draft.bookingEnabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, bookingEnabled: e.target.checked }))
              }
            />
            Povolit rezervaci
          </label>
          <Button variant="primary" className="w-full" onClick={save} data-testid="service-save">
            Uložit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
