import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  buildDashboardHealthAlerts,
  buildUrgentHealthAlerts,
} from '../../lib/dashboardCare'
import {
  findActiveAnnouncementForPet,
  formatRelativeCzech,
} from '../../lib/lostPet'
import { cn } from '../../lib/utils'

function lostHeadline(name: string): string {
  const feminine = /[aá]$/i.test(name.trim())
  return `${name.toUpperCase()} JE ${feminine ? 'ZTRACENÁ' : 'ZTRACENÝ'}`
}

function reportCountLabel(count: number): string {
  if (count === 1) return '1 nové hlášení'
  if (count >= 2 && count <= 4) return `${count} nová hlášení`
  return `${count} nových hlášení`
}

export function UrgentAlertsSection() {
  const { pets, lostAnnouncements, lostReports, healthRecords, calendarEvents } =
    useApp()

  const lostAlerts = useMemo(() => {
    return pets
      .map((pet) => {
        const announcement = findActiveAnnouncementForPet(lostAnnouncements, pet.id)
        if (!announcement) return null

        const reports = lostReports
          .filter((r) => r.announcementId === announcement.id && !r.ownerFlag)
          .sort((a, b) => b.observedAt.localeCompare(a.observedAt))

        const latest = reports[0]
        const lastSeenIso = latest?.observedAt ?? announcement.lastSeen.seenAt

        return {
          pet,
          reportCount: reports.length,
          lastSeenRelative: formatRelativeCzech(lastSeenIso),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
  }, [pets, lostAnnouncements, lostReports])

  const urgentHealth = useMemo(
    () =>
      buildUrgentHealthAlerts(
        buildDashboardHealthAlerts(pets, healthRecords, calendarEvents),
      ),
    [pets, healthRecords, calendarEvents],
  )

  if (lostAlerts.length === 0 && urgentHealth.length === 0) return null

  return (
    <section className="space-y-3" aria-label="Urgentní upozornění">
      {lostAlerts.map(({ pet, reportCount, lastSeenRelative }) => (
        <div
          key={pet.id}
          className={cn(
            'overflow-hidden rounded-2xl border border-rose-200/80',
            'bg-gradient-to-br from-rose-50/90 via-white to-white',
            'shadow-[0_2px_16px_rgba(190,40,60,0.06)]',
          )}
        >
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <img
                src={pet.image}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-rose-100"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700/80">
                  Urgentní
                </p>
                <h2 className="mt-0.5 text-base font-bold tracking-tight text-rose-900 sm:text-lg">
                  🔴 {lostHeadline(pet.name)}
                </h2>
                <p className="mt-1 text-sm text-[#5A6660]">
                  {reportCount === 0
                    ? `Zatím žádná hlášení · naposledy spatřen${/[aá]$/i.test(pet.name) ? 'a' : ''} ${lastSeenRelative}`
                    : `${reportCountLabel(reportCount)} · poslední spatření ${lastSeenRelative}`}
                </p>
              </div>
            </div>
            <Link
              to={`/pets/${pet.id}`}
              className={cn(
                'inline-flex shrink-0 items-center justify-center self-start sm:self-center',
                'rounded-lg border border-rose-200/60 bg-rose-50 px-3.5 py-1.5',
                'text-xs font-medium text-rose-700 transition-colors',
                'hover:bg-rose-100 active:bg-rose-200',
              )}
            >
              Otevřít hledání
            </Link>
          </div>
        </div>
      ))}

      {urgentHealth.map((alert) => (
        <Link
          key={alert.id}
          to={alert.href}
          className={cn(
            'flex items-center gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/50 px-4 py-3.5',
            'transition-colors hover:bg-rose-50 sm:px-5',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-900">{alert.message}</p>
            <p className="text-xs text-[#5A6660]">Otevřít zdravotní sekci</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-rose-400" />
        </Link>
      ))}
    </section>
  )
}
