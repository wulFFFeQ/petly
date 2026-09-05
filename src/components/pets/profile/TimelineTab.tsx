import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import type { PetProfileTabState } from './usePetProfileTabState'

type TimelineTabProps = PetProfileTabState['timeline']

export function TimelineTab({
  mergedTimeline,
  openTimelineEvent,
  handleDeleteTimelineEvent,
  setAddEventOpen,
}: TimelineTabProps) {
  return (
    <Card variant="elevated">
      <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#191E1B]">Časová osa životní cesty</h3>
          <p className="text-xs text-[#7D8B82] mt-0.5">
            Automaticky zahrnuje zdravotní záznamy, očkování a vaše vlastní události
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setAddEventOpen(true)}>
          <Plus size={15} />
          Přidat událost
        </Button>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E4DC]">
        {mergedTimeline.map((event) => (
          <div key={event.id} className="relative group">
            <div className="absolute -left-6 sm:-left-8 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#234B54] bg-white ring-4 ring-[#FAF8F5] transition-transform group-hover:scale-125" />
            <div className="relative rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] hover:bg-white hover:shadow-xs transition-all">
              <button
                type="button"
                onClick={() => openTimelineEvent(event)}
                className="w-full cursor-pointer p-4 pr-12 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-[#191E1B] flex items-center gap-2 flex-wrap">
                    <span>{event.title}</span>
                    {event.category === 'birthday' && (
                      <Sparkles size={13} className="text-[#B8934A]" />
                    )}
                    {event.source && event.source !== 'manual' && (
                      <Badge variant="outline" size="sm">
                        {event.source === 'vaccination'
                          ? 'Očkování'
                          : event.source === 'medication'
                            ? 'Léky'
                            : 'Zdraví'}
                      </Badge>
                    )}
                  </h4>
                  <span className="text-xs font-semibold text-[#234B54] font-mono">
                    {event.date}
                  </span>
                </div>
                {event.description && (
                  <p className="mt-1.5 text-xs text-[#4A564F] leading-relaxed">
                    {event.description}
                  </p>
                )}
                <p className="mt-1.5 text-[10px] font-semibold text-[#234B54]">
                  {event.sourceId
                    ? 'Klepnutím otevřete detail záznamu →'
                    : 'Klepnutím otevřete detail události →'}
                </p>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteTimelineEvent(event)
                }}
                aria-label={`Smazat událost ${event.title}`}
                title="Smazat událost"
                className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A3AEA7] opacity-70 transition-colors hover:bg-rose-50 hover:text-rose-700 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
