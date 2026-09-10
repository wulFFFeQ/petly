import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getSelfAccount } from '../../lib/account'
import {
  buildRecentActivity,
  computeProfessionalDashboardStats,
  getActiveSelfProfessionalProfile,
  listAvailableQuickActions,
  listProfessionalPetCards,
} from '../../lib/professional/dashboard'
import { OverviewStats } from '../../components/professional/dashboard/OverviewStats'
import { RecentActivity } from '../../components/professional/dashboard/RecentActivity'
import { PendingRequestsSection } from '../../components/professional/dashboard/PendingRequestsSection'
import { QuickActions } from '../../components/professional/dashboard/QuickActions'
import { RoleOverviewPanel } from '../../components/professional/dashboard/RoleOverviewPanel'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'

export function ProfessionalOverviewPage() {
  const { pets, calendarEvents, notifications, healthRecords, documents } = useApp()
  const [refreshKey, setRefreshKey] = useState(0)
  const profile = getActiveSelfProfessionalProfile()
  const accountId = getSelfAccount()?.id

  const stats = useMemo(() => {
    if (!profile) {
      return {
        activeConnections: 0,
        pendingRequests: 0,
        todaysEvents: 0,
        unreadNotifications: 0,
      }
    }
    return computeProfessionalDashboardStats({
      professionalId: profile.id,
      notifications,
      calendarEvents,
      accountId,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey forces reload from storage
  }, [profile, notifications, calendarEvents, accountId, refreshKey])

  const cards = useMemo(() => {
    if (!profile) return []
    return listProfessionalPetCards(profile.id, pets, {
      healthRecords,
      documents,
      statuses: ['pending', 'active'],
    })
  }, [profile, pets, healthRecords, documents, refreshKey])

  const activity = useMemo(() => {
    if (!profile) return []
    return buildRecentActivity({
      professionalId: profile.id,
      pets,
      notifications,
    })
  }, [profile, pets, notifications, refreshKey])

  const quickActions = useMemo(() => {
    if (!profile) return []
    return listAvailableQuickActions(profile)
  }, [profile, refreshKey])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Přidejte profesionální roli v nastavení účtu."
        ctaLabel="Nastavení"
        ctaTo="/settings"
        testId="professional-overview-no-profile"
      />
    )
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-overview-page">
      <div>
        <h2 className="text-lg font-bold text-[#191E1B]">Přehled</h2>
        <p className="text-xs text-[#7D8B82]">
          Pracovní prostředí · {profile.displayName}
        </p>
      </div>

      <OverviewStats stats={stats} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <PendingRequestsSection
            professional={profile}
            cards={cards}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
          <RecentActivity items={activity} />
        </div>
        <div className="space-y-5">
          <QuickActions actions={quickActions} />
          <RoleOverviewPanel profile={profile} stats={stats} />
          {stats.todaysEvents === 0 ? (
            <Card variant="elevated" data-testid="todays-events-empty">
              <p className="text-sm font-bold text-[#191E1B]">Dnešní události</p>
              <p className="mt-1 text-xs text-[#7D8B82]">
                Dnes nemáte žádné naplánované události.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
