import { BRAND_NAME } from '../brand'
import type { EmergencyCardPublicView } from './publicView'
import { buildEmergencyCardUrl } from './url'

/** Opens a print-friendly physical emergency card (no owner phone unless opted in). */
export function printEmergencyCard(options: {
  view: EmergencyCardPublicView
  ownerPhoneOnPrint?: string | null
}): void {
  const { view, ownerPhoneOnPrint } = options
  const url = buildEmergencyCardUrl(view.publicSlug)
  const win = window.open('', '_blank', 'noopener,noreferrer,width=520,height=720')
  if (!win) return

  const healthRows: string[] = []
  if (view.health?.allergies) healthRows.push(`Alergie: ${escapeHtml(view.health.allergies)}`)
  if (view.health?.chronicConditions) {
    healthRows.push(`Chronické onemocnění: ${escapeHtml(view.health.chronicConditions)}`)
  }
  if (view.health?.regularMedication) {
    healthRows.push(`Léčba: ${escapeHtml(view.health.regularMedication)}`)
  }
  if (view.health?.importantRestrictions) {
    healthRows.push(`Omezení: ${escapeHtml(view.health.importantRestrictions)}`)
  }
  if (view.health?.other) healthRows.push(escapeHtml(view.health.other))

  const meta = [
    escapeHtml(view.breed),
    view.ageLabel ? escapeHtml(view.ageLabel) : null,
    view.gender ? escapeHtml(view.gender) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const chipLine = view.maskedMicrochip
    ? `Mikročip ${escapeHtml(view.maskedMicrochip)}`
    : ''
  const chipNote = view.maskedMicrochip
    ? `<p class="safe">Číslo čipu je částečně skryté kvůli ochraně soukromí. Mikročip je registrován v profilu mazlíčka — celé číslo není z bezpečnostních důvodů veřejné.</p>`
    : ''

  const phoneLine =
    ownerPhoneOnPrint?.trim()
      ? `<p class="phone">Tísňový telefon majitele: ${escapeHtml(ownerPhoneOnPrint.trim())}</p>`
      : ''

  const lostBanner = view.isLost
    ? `<div class="lost">ZTRATIL SE — ${escapeHtml(view.name)} se hledá</div>`
    : ''

  win.document.write(`<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"/>
<title>Nouzová karta — ${escapeHtml(view.name)}</title>
<style>
  body{margin:0;padding:24px;font-family:Georgia,'Times New Roman',serif;color:#191E1B;background:#FAF8F5}
  .card{max-width:420px;margin:0 auto;border:2px solid #234B54;border-radius:16px;padding:20px;background:#fff}
  .brand{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#B8934A;font-weight:700;text-align:center}
  img{width:100%;height:180px;object-fit:cover;border-radius:12px;margin:12px 0}
  h1{font-size:22px;margin:0}
  .meta{font-size:13px;color:#4A564F;margin-top:4px}
  .chip{font-size:11px;font-family:ui-monospace,monospace;color:#234B54;margin-top:8px}
  .msg{margin-top:14px;padding:12px;background:#E0EAEC;border-radius:10px;font-size:13px;line-height:1.45}
  .health{margin-top:12px;font-size:12px;color:#4A564F}
  .health strong{display:block;color:#191E1B;margin-bottom:4px}
  .lost{background:#7A1F1F;color:#fff;text-align:center;font-size:11px;font-weight:700;letter-spacing:.12em;padding:8px;border-radius:8px;margin-bottom:10px}
  .qr{margin-top:16px;text-align:center;font-size:11px;color:#5A6660;word-break:break-all}
  .phone{margin-top:10px;font-size:12px;font-weight:700}
  .safe{margin-top:10px;font-size:11px;color:#5A6660}
</style></head><body>
<div class="card">
  <div class="brand">${escapeHtml(BRAND_NAME)}</div>
  ${lostBanner}
  <img src="${escapeHtml(view.image)}" alt="${escapeHtml(view.name)}" />
  <h1>${escapeHtml(view.name)}</h1>
  <p class="meta">${meta}</p>
  ${chipLine ? `<p class="chip">${chipLine}</p>` : ''}
  ${chipNote}
  <div class="msg">Tento mazlíček má svého majitele. Pomozte nám ho bezpečně vrátit domů.<br/>Naskenujte QR nebo otevřete odkaz — kontakt přes ${escapeHtml(BRAND_NAME)}.</div>
  ${
    healthRows.length
      ? `<div class="health"><strong>Důležité zdravotní informace</strong>${healthRows.map((r) => `<div>${r}</div>`).join('')}</div>`
      : ''
  }
  ${
    view.vet
      ? `<div class="health"><strong>${escapeHtml(view.vet.label)}</strong>${escapeHtml(view.vet.clinicOrName)}${view.vet.phone ? ` · ${escapeHtml(view.vet.phone)}` : ''}</div>`
      : ''
  }
  ${phoneLine}
  <p class="safe">Telefon majitele se na digitální kartě nezobrazuje. Preferujte bezpečný kontakt přes ${escapeHtml(BRAND_NAME)}.</p>
  <p class="qr">${escapeHtml(url)}</p>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
  win.document.close()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
