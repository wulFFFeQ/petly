import { cn } from '../../lib/utils'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pills'
  className?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}: TabsProps) {
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'inline-flex p-1 rounded-xl bg-[#EFECE6] border border-[#E8E4DC] gap-1',
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5',
                isActive
                  ? 'bg-white text-[#191E1B] shadow-sm'
                  : 'text-[#4A564F] hover:text-[#191E1B] hover:bg-white/50',
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                      : 'bg-black/5 text-[#7D8B82]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex w-full border-b border-[#E8E4DC]', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 min-w-0 px-2 py-3 text-sm font-medium transition-all duration-200 -mb-px relative whitespace-nowrap cursor-pointer flex items-center justify-center gap-2',
              isActive
                ? 'text-[#2C4A3E] font-semibold'
                : 'text-[#7D8B82] hover:text-[#191E1B]',
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-semibold',
                  isActive
                    ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                    : 'bg-[#FAF8F5] text-[#7D8B82] border border-[#E8E4DC]',
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C4A3E] rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
