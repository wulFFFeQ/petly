import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProfessionalCatalogCard } from '../components/professionals/ProfessionalCatalogCard'
import { ProfessionalCatalogEmpty } from '../components/professionals/ProfessionalCatalogEmpty'
import { ProfessionalCatalogFilters } from '../components/professionals/ProfessionalCatalogFilters'
import { PageHeader } from '../components/ui/PageHeader'
import {
  buildCatalogSearchParams,
  catalogHasActiveFilters,
  listPublicProfessionals,
  parseCatalogSearchParams,
  queryPublicProfessionals,
  type ProfessionalCatalogCriteria,
} from '../lib/professional'
import { loadVerifications } from '../lib/verification'

export function ProfessionalsCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const criteria = useMemo(
    () => parseCatalogSearchParams(searchParams),
    [searchParams],
  )

  const { totalPublic, results } = useMemo(() => {
    const verifications = loadVerifications()
    return {
      totalPublic: listPublicProfessionals(verifications).length,
      results: queryPublicProfessionals(criteria, verifications),
    }
  }, [criteria, searchParams])

  const onCriteriaChange = (next: ProfessionalCatalogCriteria) => {
    setSearchParams(buildCatalogSearchParams(next), { replace: true })
  }

  const nonePublic = totalPublic === 0
  const showFilteredEmpty =
    !nonePublic && results.length === 0 && catalogHasActiveFilters(criteria)

  return (
    <div className="space-y-8" data-testid="professional-catalog-page">
      <PageHeader
        badge="Profesionálové"
        title="Najděte pomoc pro svého mazlíčka"
        description="Veterinář, útulek, groomer, trenér, chovatel nebo další služba pro mazlíčky ve vašem okolí."
      />

      <ProfessionalCatalogFilters
        criteria={criteria}
        onChange={onCriteriaChange}
        resultCount={results.length}
        totalPublic={totalPublic}
      />

      <div
        className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="professional-catalog-results"
      >
        {nonePublic || showFilteredEmpty || results.length === 0 ? (
          <ProfessionalCatalogEmpty nonePublic={nonePublic} />
        ) : (
          results.map((profile) => (
            <ProfessionalCatalogCard key={profile.id} profile={profile} />
          ))
        )}
      </div>

      <p className="text-center text-[11px] text-[#A3AEA7]">
        Hledáte konkrétní profil?{' '}
        <Link to="/discover" className="font-semibold text-[#5A6660] hover:text-[#234B54]">
          Zpět na Objevovat
        </Link>
      </p>
    </div>
  )
}
