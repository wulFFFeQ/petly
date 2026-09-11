import { Link2, Share2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

interface ProfessionalConnectCTAProps {
  onConnect: () => void
  onRequest?: () => void
  requestLabel?: string
  requestDisabled?: boolean
  requestPending?: boolean
  hasServices?: boolean
  onShare?: () => void
  shareLabel?: string
  /** When false, omit data-testid (for repeated bottom CTA). Default true. */
  withTestIds?: boolean
}

export function ProfessionalConnectCTA({
  onConnect,
  onRequest,
  requestLabel = 'Požádat o propojení',
  requestDisabled,
  requestPending,
  hasServices,
  onShare,
  shareLabel = 'Sdílet profil',
  withTestIds = true,
}: ProfessionalConnectCTAProps) {
  const scrollToServices = () => {
    document.getElementById('professional-services')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <Card
      variant="elevated"
      padding="md"
      className="flex flex-wrap items-center gap-2"
      data-testid={withTestIds ? 'professional-connect-cta' : undefined}
    >
      <Button
        variant="primary"
        size="md"
        className="gap-1.5"
        data-testid={withTestIds ? 'pro-connect-with-pet' : undefined}
        onClick={onConnect}
      >
        <Link2 size={15} />
        Propojit s mazlíčkem
      </Button>

      {requestPending ? (
        <Button
          variant="secondary"
          size="md"
          disabled
          data-testid={withTestIds ? 'pro-request-pending' : undefined}
        >
          Žádost čeká na schválení
        </Button>
      ) : onRequest ? (
        <Button
          variant="outline"
          size="md"
          data-testid={withTestIds ? 'pro-request-connect' : undefined}
          onClick={onRequest}
          disabled={requestDisabled}
        >
          {requestLabel}
        </Button>
      ) : null}

      {hasServices ? (
        <Button
          variant="ghost"
          size="md"
          onClick={scrollToServices}
          data-testid={withTestIds ? 'pro-scroll-services' : undefined}
        >
          Zobrazit služby
        </Button>
      ) : null}

      {onShare ? (
        <Button
          variant="ghost"
          size="md"
          className="gap-1.5"
          onClick={onShare}
          data-testid={withTestIds ? 'pro-share-profile' : undefined}
        >
          <Share2 size={14} />
          {shareLabel}
        </Button>
      ) : null}
    </Card>
  )
}
