import { Check, Minus } from 'lucide-react'
import { PLAN_IDS, type PlanId } from '../../lib/entitlements'
import { getPlanMeta } from '../../lib/entitlements'
import {
  buildFeatureComparison,
  type ComparisonSection,
} from '../../lib/membership'
import { useMemo } from 'react'

export function FeatureComparison() {
  const sections = useMemo(() => buildFeatureComparison(), [])

  return (
    <div data-testid="feature-comparison" className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-[#191E1B]">Porovnání funkcí</h2>
        <p className="text-xs text-[#4A564F] mt-1 leading-relaxed">
          Přehled vychází z entitlement matrix — Free zůstává plnohodnotný základ.
        </p>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8E4DC]">
              <th className="py-2 pr-3 text-[11px] font-bold text-[#7D8B82] uppercase tracking-wide">
                Funkce
              </th>
              {PLAN_IDS.map((plan) => (
                <th
                  key={plan}
                  className="py-2 px-1 text-center text-[11px] font-bold text-[#191E1B]"
                >
                  {getPlanMeta(plan).label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <ComparisonCategoryBlock key={section.category.id} section={section} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ComparisonCategoryBlock({ section }: { section: ComparisonSection }) {
  return (
    <>
      <tr>
        <td
          colSpan={1 + PLAN_IDS.length}
          className="pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#B8934A]"
        >
          {section.category.label}
        </td>
      </tr>
      {section.rows.map((row) => (
        <tr key={row.featureId} className="border-b border-[#E8E4DC]/70">
          <td className="py-2 pr-3 text-xs text-[#4A564F]">{row.label}</td>
          {PLAN_IDS.map((plan: PlanId) => (
            <td key={plan} className="py-2 px-1 text-center">
              {row.byPlan[plan] ? (
                <Check
                  size={14}
                  className="inline text-[#5A8F6B]"
                  aria-label="dostupné"
                />
              ) : (
                <Minus
                  size={14}
                  className="inline text-[#C5CCC7]"
                  aria-label="nedostupné"
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
