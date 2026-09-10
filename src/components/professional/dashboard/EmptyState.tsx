import { Link } from 'react-router-dom'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaTo,
  testId,
}: {
  title: string
  description: string
  ctaLabel?: string
  ctaTo?: string
  testId?: string
}) {
  return (
    <Card variant="elevated" className="text-center" data-testid={testId}>
      <p className="text-sm font-bold text-[#191E1B]">{title}</p>
      <p className="mt-1 text-xs text-[#7D8B82]">{description}</p>
      {ctaLabel && ctaTo ? (
        <Link to={ctaTo} className="mt-3 inline-block">
          <Button size="sm" variant="outline">
            {ctaLabel}
          </Button>
        </Link>
      ) : null}
    </Card>
  )
}
