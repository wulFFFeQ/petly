import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useApp } from '../../context/AppContext'
import {
  CANCELLATION_NOTICE_OPTIONS,
  ensureDefaultBookingPolicy,
  formatCancellationPolicyPublic,
  setBookingPolicy,
  type ProfessionalBookingPolicy,
} from '../../lib/booking'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'

export function ProfessionalBookingRulesPage() {
  const profile = getActiveSelfProfessionalProfile()
  const { showToast } = useApp()

  const initial = useMemo(() => {
    if (!profile) return null
    return ensureDefaultBookingPolicy(profile.id)
  }, [profile])

  const [policy, setPolicy] = useState<ProfessionalBookingPolicy | null>(initial)
  const [saved, setSaved] = useState(false)

  if (!profile || !policy) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Pravidla rezervací vyžadují profesionální účet."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  const noticeValue =
    policy.cancellationNoticeHours === null
      ? 'null'
      : String(policy.cancellationNoticeHours)

  const save = () => {
    const next = setBookingPolicy(profile.id, {
      cancellationNoticeHours: policy.cancellationNoticeHours,
      allowReschedule: policy.allowReschedule,
      confirmMode: 'manual',
      noShowMode: 'after_start',
    })
    setPolicy(next)
    setSaved(true)
    showToast('Uloženo', 'Pravidla rezervací byla aktualizována.', 'success')
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-booking-rules-page">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/professional/availability"
          className="text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
        >
          ← Dostupnost
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Pravidla rezervací</h1>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Základní pravidla rušení a přesunu. Bez plateb a storno poplatků.
        </p>
      </div>

      <Card variant="elevated" data-testid="booking-rules-form">
        <label className="block text-xs font-semibold text-[#4A564F]">
          Rušení
          <select
            className="mt-1.5 w-full max-w-sm rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
            value={noticeValue}
            data-testid="booking-rules-cancel-hours"
            onChange={(e) => {
              const raw = e.target.value
              setPolicy({
                ...policy,
                cancellationNoticeHours: raw === 'null' ? null : Number(raw),
              })
              setSaved(false)
            }}
          >
            {CANCELLATION_NOTICE_OPTIONS.map((opt) => (
              <option
                key={String(opt.value)}
                value={opt.value === null ? 'null' : String(opt.value)}
              >
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[11px] text-[#7D8B82]" data-testid="booking-rules-public-preview">
          Veřejně: {formatCancellationPolicyPublic(policy)}
        </p>

        <label className="mt-5 block text-xs font-semibold text-[#4A564F]">
          Možnost přesunu
          <select
            className="mt-1.5 w-full max-w-sm rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
            value={policy.allowReschedule ? 'yes' : 'no'}
            data-testid="booking-rules-reschedule"
            onChange={(e) => {
              setPolicy({ ...policy, allowReschedule: e.target.value === 'yes' })
              setSaved(false)
            }}
          >
            <option value="yes">Ano</option>
            <option value="no">Ne</option>
          </select>
        </label>

        <div className="mt-5 space-y-2 text-xs text-[#5A6660]">
          <p>
            <span className="font-semibold text-[#4A564F]">Potvrzování:</span> ručně
          </p>
          <p>
            <span className="font-semibold text-[#4A564F]">No-show:</span> označit po
            termínu
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="mt-5"
          data-testid="booking-rules-save"
          onClick={save}
        >
          Uložit pravidla
        </Button>
        {saved ? (
          <p className="mt-2 text-[11px] font-medium text-[#2C4A3E]" data-testid="booking-rules-saved">
            Uloženo
          </p>
        ) : null}
      </Card>
    </div>
  )
}
