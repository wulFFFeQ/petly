import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  cancelPetProfessionalAccessRequest,
  filterLogsForProfessional,
  loadAccessState,
  resolveAccessStatus,
} from '../../lib/professional'
import {
  getActiveSelfProfessionalProfile,
  listProfessionalPetCards,
} from '../../lib/professional/dashboard'
import { emitProfessionalAccessNotification } from '../../lib/notifications'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

type Tab = 'active' | 'pending' | 'history'

export function ProfessionalAccessPage() {
  const { pets, healthRecords, documents, showToast, upsertNotification } = useApp()
  const [tab, setTab] = useState<Tab>('active')
  const [refreshKey, setRefreshKey] = useState(0)
  const profile = getActiveSelfProfessionalProfile()

  const activeCards = useMemo(() => {
    if (!profile) return []
    return listProfessionalPetCards(profile.id, pets, {
      healthRecords,
      documents,
      statuses: ['active'],
    }).filter((c) => c.effective)
  }, [profile, pets, healthRecords, documents, refreshKey])

  const pendingCards = useMemo(() => {
    if (!profile) return []
    return listProfessionalPetCards(profile.id, pets, {
      statuses: ['pending'],
    })
  }, [profile, pets, refreshKey])

  const historyCards = useMemo(() => {
    if (!profile) return []
    return listProfessionalPetCards(profile.id, pets, {
      statuses: ['revoked', 'expired'],
    })
  }, [profile, pets, refreshKey])

  const logs = useMemo(() => {
    if (!profile) return []
    return filterLogsForProfessional(loadAccessState().logs, profile.id).slice(-12).reverse()
  }, [profile, refreshKey])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Dokončete profil v nastavení."
        ctaTo="/settings"
        ctaLabel="Nastavení"
      />
    )
  }

  const cancel = (accessId: string, petName: string) => {
    const result = cancelPetProfessionalAccessRequest(accessId)
    if (result.access) {
      emitProfessionalAccessNotification(upsertNotification, {
        event: 'revoked',
        access: result.access,
        professional: profile,
        petName,
      })
      showToast('Žádost zrušena', petName, 'info')
      setRefreshKey((k) => k + 1)
    }
  }

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'active', label: 'Aktivní', count: activeCards.length },
    { id: 'pending', label: 'Čekající', count: pendingCards.length },
    { id: 'history', label: 'Historie', count: historyCards.length },
  ]

  const list =
    tab === 'active' ? activeCards : tab === 'pending' ? pendingCards : historyCards

  return (
    <div className="space-y-5 pb-8" data-testid="professional-access-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Propojení a žádosti</h1>
        <p className="text-xs text-[#7D8B82]">
          Pouze akce dovolené access lifecycle. Nelze sobě přidat permissions.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="access-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`access-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[#2C4A3E] text-white'
                : 'border border-[#E8E4DC] bg-white text-[#4A564F] hover:bg-[#EBF2EE]'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={
            tab === 'active'
              ? 'Zatím nemáte propojené žádné mazlíčky.'
              : tab === 'pending'
                ? 'Nemáte žádné čekající žádosti.'
                : 'Historie je prázdná.'
          }
          description={
            tab === 'active'
              ? 'Až vám majitel udělí přístup, objeví se zde.'
              : 'Stav se aktualizuje podle PetProfessionalAccess.'
          }
          ctaLabel={tab === 'active' ? 'Prohlédnout katalog' : undefined}
          ctaTo={tab === 'active' ? '/professionals' : undefined}
          testId={`access-${tab}-empty`}
        />
      ) : (
        <div className="space-y-3">
          {list.map((card) => {
            const status = resolveAccessStatus(card.access)
            return (
              <Card
                key={card.access.id}
                variant="elevated"
                data-testid={`access-row-${card.access.id}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#191E1B]">{card.name}</p>
                    <p className="text-xs text-[#7D8B82]">
                      Stav: {status} · {card.permissionCount} oprávnění
                    </p>
                    <p className="mt-1 text-[11px] text-[#A3AEA7]">
                      {card.access.grantedAt
                        ? `Uděleno: ${new Date(card.access.grantedAt).toLocaleDateString('cs-CZ')}`
                        : card.access.requestedAt
                          ? `Žádost: ${new Date(card.access.requestedAt).toLocaleDateString('cs-CZ')}`
                          : null}
                      {card.access.expiresAt
                        ? ` · Vyprší: ${new Date(card.access.expiresAt).toLocaleDateString('cs-CZ')}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.effective ? (
                      <Link to={`/professional/pets/${card.access.petId}`}>
                        <Button size="sm" variant="outline">
                          Otevřít
                        </Button>
                      </Link>
                    ) : null}
                    {card.access.status === 'pending' ? (
                      <Button
                        size="sm"
                        variant="danger"
                        data-testid={`access-cancel-${card.access.id}`}
                        onClick={() => cancel(card.access.id, card.name)}
                      >
                        Zrušit žádost
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card variant="elevated" data-testid="professional-access-audit">
        <h2 className="text-sm font-bold text-[#191E1B]">Audit (omezená historie)</h2>
        <p className="mt-1 text-[11px] text-[#7D8B82]">
          Majitel zůstává vlastníkem přístupové historie. Zde jen relevantní záznamy.
        </p>
        {logs.length === 0 ? (
          <p className="mt-3 text-xs text-[#A3AEA7]">Zatím zde není žádná aktivita.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="text-xs text-[#4A564F]">
                <span className="font-semibold">{log.action}</span>
                {' · '}
                {log.petId}
                {' · '}
                {new Date(log.timestamp).toLocaleString('cs-CZ')}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
