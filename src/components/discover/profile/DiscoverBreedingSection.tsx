import { Dna, Medal, PawPrint } from 'lucide-react'
import type { DiscoverBreedingPublic } from '../../../types'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverBreedingSectionProps {
  breeding: DiscoverBreedingPublic
}

export function DiscoverBreedingSection({ breeding }: DiscoverBreedingSectionProps) {
  const hasContent =
    breeding.status ||
    (breeding.titles && breeding.titles.length > 0) ||
    (breeding.shows && breeding.shows.length > 0) ||
    breeding.pedigreeSummary ||
    (breeding.litters && breeding.litters.length > 0)

  if (!hasContent) return null

  return (
    <DiscoverProfileSection
      title="Chovný profil"
      icon={<Dna size={14} className="text-[#B8934A]" />}
    >
      <div className="space-y-4">
        {breeding.status && (
          <p className="inline-flex items-center rounded-full bg-[#EBF2EE] px-2.5 py-1 text-xs font-semibold text-[#2C4A3E]">
            {breeding.status}
          </p>
        )}

        {breeding.titles && breeding.titles.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              <Medal size={11} />
              Tituly a ocenění
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
        )}

        {breeding.pedigreeSummary && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Rodokmen
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#4A564F]">{breeding.pedigreeSummary}</p>
          </div>
        )}

        {breeding.shows && breeding.shows.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Výstavy
            </p>
            <ul className="divide-y divide-[#F0EDE6] rounded-xl border border-[#E8E4DC] overflow-hidden">
              {breeding.shows.map((show) => (
                <li
                  key={`${show.name}-${show.year}`}
                  className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[#191E1B]">{show.name}</p>
                    <p className="text-[11px] text-[#7D8B82]">{show.year}</p>
                  </div>
                  {show.result && (
                    <span className="shrink-0 text-xs font-semibold text-[#2C4A3E]">
                      {show.result}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {breeding.litters && breeding.litters.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              <PawPrint size={11} />
              Vrhy
            </p>
            <ul className="space-y-2">
              {breeding.litters.map((litter) => (
                <li
                  key={`${litter.date}-${litter.count}`}
                  className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] px-3.5 py-2.5"
                >
                  <p className="text-sm font-semibold text-[#191E1B]">
                    {litter.date} · {litter.count}{' '}
                    {litter.count === 1 ? 'štěně' : litter.count < 5 ? 'štěňata' : 'štěňat'}
                  </p>
                  {litter.note && (
                    <p className="mt-0.5 text-xs text-[#5A6660]">{litter.note}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DiscoverProfileSection>
  )
}
