import { PawPrint } from 'lucide-react'

export function DashboardWarmthStrip() {
  return (
    <div className="relative overflow-hidden rounded-3xl px-6 py-7 sm:px-10 sm:py-9">
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#EBF2EE]/80 via-[#FAF4E6]/50 to-[#FAF8F5]"
        aria-hidden
      />
      <div
        className="absolute -right-6 -top-10 h-36 w-36 rounded-full bg-[#B8934A]/12 blur-2xl"
        aria-hidden
      />
      <div
        className="absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-[#2C4A3E]/8 blur-xl"
        aria-hidden
      />
      <PawPrint
        size={56}
        strokeWidth={1.25}
        className="absolute right-5 bottom-3 text-[#2C4A3E]/[0.07] pointer-events-none"
        aria-hidden
      />
      <p className="relative max-w-md font-serif italic text-xl sm:text-2xl leading-snug text-[#2C4A3E] tracking-tight">
        Dnes je o ně postaráno.
      </p>
      <p className="relative mt-1.5 text-xs font-medium text-[#7D8B82]/90 tracking-wide">
        Všichni tři jsou dnes v péči.
      </p>
    </div>
  )
}
