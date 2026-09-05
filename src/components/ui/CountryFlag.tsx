import { cn } from '../../lib/utils'

interface CountryFlagProps {
  code: string
  country: string
  className?: string
}

/** Renders a national flag image (Windows-safe; emoji flags often show as letters). */
export function CountryFlag({ code, country, className }: CountryFlagProps) {
  const normalized = code.trim().toLowerCase()

  return (
    <img
      src={`https://flagcdn.com/w40/${normalized}.png`}
      srcSet={`https://flagcdn.com/w80/${normalized}.png 2x`}
      alt={`Vlajka: ${country}`}
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      className={cn(
        'inline-block h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(25,30,27,0.08)]',
        className,
      )}
    />
  )
}
