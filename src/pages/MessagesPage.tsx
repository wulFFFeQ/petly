import { Sparkles } from 'lucide-react'
import { MessagesPageContent } from '../components/messages/MessagesPageContent'
import { Badge } from '../components/ui/Badge'

export function MessagesPage() {
  return (
    <div className="space-y-6">
      <div className="hidden md:flex md:items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Zabezpečené zprávy
            </Badge>
            <span className="text-xs text-[#7D8B82] font-medium">
              Veterináři a ověření majitelé
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
            Zprávy a konzultace
          </h1>
          <p className="mt-1 text-sm text-[#4A564F]">
            Přímá komunikace s veterináři, venčiteli psů a přáteli z komunity.
          </p>
        </div>
      </div>

      <MessagesPageContent />
    </div>
  )
}
