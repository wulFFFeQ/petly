import { Dna, Medal, PawPrint } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PublicBreederShowcase } from '../../../lib/professional'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalBreedingSectionProps {
  showcase: PublicBreederShowcase
}

export function ProfessionalBreedingSection({ showcase }: ProfessionalBreedingSectionProps) {
  if (!showcase.animals.length) return null

  return (
    <ProfessionalProfileSection
      title="Chovný profil"
      icon={<Dna size={14} className="text-[#B8934A]" />}
      testId="professional-breeding"
    >
      <div className="space-y-6">
        {showcase.kennelSummary ? (
          <p
            className="inline-flex items-center rounded-full bg-[#EBF2EE] px-2.5 py-1 text-xs font-semibold text-[#2C4A3E]"
            data-testid="professional-breeding-kennel"
          >
            {showcase.kennelSummary}
          </p>
        ) : null}

        <ul className="space-y-5">
          {showcase.animals.map((animal) => {
            const breeding = animal.breeding
            return (
              <li
                key={animal.id}
                data-testid={`professional-breeding-animal-${animal.id}`}
                className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4"
              >
                <div className="flex gap-3">
                  <img
                    src={animal.image}
                    alt={animal.name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover border border-[#E8E4DC]"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/discover/${animal.id}`}
                      className="text-sm font-bold text-[#191E1B] hover:text-[#2C4A3E] hover:underline"
                    >
                      {animal.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#7D8B82]">{animal.breed}</p>
                  </div>
                </div>

                {breeding ? (
                  <div className="mt-4 space-y-4">
                    {breeding.status && breeding.status !== showcase.kennelSummary ? (
                      <p className="text-xs font-semibold text-[#2C4A3E]">{breeding.status}</p>
                    ) : null}

                    {breeding.titles && breeding.titles.length > 0 ? (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                          <Medal size={11} />
                          Tituly
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {breeding.titles.map((title) => (
                            <span
                              key={title}
                              className="rounded-lg border border-[#E8D8B5] bg-[#FAF4E6]/70 px-2.5 py-1 text-xs font-medium text-[#191E1B]"
                            >
                              {title}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {breeding.pedigreeSummary ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                          Rodokmen
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[#4A564F]">
                          {breeding.pedigreeSummary}
                        </p>
                      </div>
                    ) : null}

                    {breeding.shows && breeding.shows.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                          Výstavy
                        </p>
                        <ul className="divide-y divide-[#F0EDE6] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white">
                          {breeding.shows.map((show) => (
                            <li
                              key={`${show.name}-${show.year}`}
                              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-[#191E1B]">{show.name}</p>
                                <p className="text-[11px] text-[#7D8B82]">{show.year}</p>
                              </div>
                              {show.result ? (
                                <span className="shrink-0 text-xs font-semibold text-[#2C4A3E]">
                                  {show.result}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {breeding.litters && breeding.litters.length > 0 ? (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                          <PawPrint size={11} />
                          Vrhy
                        </p>
                        <ul className="space-y-2">
                          {breeding.litters.map((litter) => (
                            <li
                              key={`${litter.date}-${litter.count}`}
                              className="rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-2.5"
                            >
                              <p className="text-sm font-semibold text-[#191E1B]">
                                {litter.date} · {litter.count}{' '}
                                {litter.count === 1
                                  ? 'štěně'
                                  : litter.count < 5
                                    ? 'štěňata'
                                    : 'štěňat'}
                              </p>
                              {litter.note ? (
                                <p className="mt-0.5 text-xs text-[#5A6660]">{litter.note}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </ProfessionalProfileSection>
  )
}
