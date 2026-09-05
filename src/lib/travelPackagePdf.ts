import { jsPDF } from 'jspdf'
import { BRAND_NAME, BRAND_TAGLINE } from './brand'
import {
  localizeTravelPackForPdf,
  type TravelPackPdfSource,
} from './travelPdfI18n'

export type TravelPackPdfInput = TravelPackPdfSource

const COLORS = {
  bg: '#FAF8F5',
  surface: '#FFFFFF',
  text: '#191E1B',
  muted: '#7D8B82',
  secondary: '#5A6660',
  teal: '#234B54',
  primary: '#2C4A3E',
  gold: '#B8934A',
  goldDark: '#9E7D3A',
  goldBg: '#FAF4E6',
  border: '#E8E4DC',
  readyBg: '#EBF2EE',
  readyFg: '#2C4A3E',
  attentionBg: '#FAF4E6',
  attentionFg: '#B8934A',
  missingBg: '#F0EDE6',
  missingFg: '#7D8B82',
  chipBg: '#E0EAEC',
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

/** Centered checkmark drawn as geometry — no glyph metrics quirks. */
function drawCheckMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const s = size
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1.6, s * 0.14)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - s * 0.28, cy + s * 0.02)
  ctx.lineTo(cx - s * 0.06, cy + s * 0.24)
  ctx.lineTo(cx + s * 0.32, cy - s * 0.26)
  ctx.stroke()
}

function drawStatusCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  status: 'ready' | 'attention' | 'missing',
) {
  const bg =
    status === 'ready' ? COLORS.readyBg : status === 'attention' ? COLORS.attentionBg : COLORS.missingBg
  const fg =
    status === 'ready' ? COLORS.readyFg : status === 'attention' ? COLORS.attentionFg : COLORS.missingFg

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = bg
  ctx.fill()

  if (status === 'ready') {
    drawCheckMark(ctx, cx, cy, radius * 1.15, fg)
  } else if (status === 'attention') {
    ctx.fillStyle = fg
    ctx.font = `700 ${Math.round(radius * 1.2)}px "Plus Jakarta Sans", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', cx, cy + 0.5)
  } else {
    ctx.strokeStyle = fg
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - radius * 0.28, cy)
    ctx.lineTo(cx + radius * 0.28, cy)
    ctx.stroke()
  }
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  xRight: number,
  cy: number,
  bg: string,
  fg: string,
) {
  ctx.font = '700 9px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const label = text.toUpperCase()
  const textWidth = ctx.measureText(label).width
  const padX = 10
  const h = 18
  const w = textWidth + padX * 2
  const x = xRight - w
  const y = cy - h / 2
  fillRoundRect(ctx, x, y, w, h, h / 2, bg)
  ctx.fillStyle = fg
  ctx.fillText(label, x + padX, cy + 0.5)
  return w
}

async function loadPetImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch(src, { mode: 'cors' })
    if (!response.ok) throw new Error('fetch failed')
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('load failed'))
        img.src = objectUrl
      })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  ctx.save()
  roundRect(ctx, x, y, size, size, radius)
  ctx.clip()
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h)
  ctx.restore()
}

async function renderTravelPackCanvas(input: TravelPackPdfInput): Promise<{
  canvas: HTMLCanvasElement
  filename: string
}> {
  const L = localizeTravelPackForPdf(input)
  const width = 794
  // Tall enough for destinations with more requirements; PDF scales to one A4 page.
  const height = 1400
  const canvas = document.createElement('canvas')
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.scale(2, 2)

  await (document.fonts?.ready ?? Promise.resolve())
  const petImage = await loadPetImage(input.pet.image)

  const { pet, pack } = input
  const pad = 36
  let y = pad

  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)

  // Header
  ctx.fillStyle = COLORS.primary
  ctx.font = '600 26px "Playfair Display", Georgia, serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(BRAND_NAME, pad, y)

  ctx.fillStyle = COLORS.gold
  ctx.font = '600 9px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.fillText(BRAND_TAGLINE.toUpperCase(), pad, y + 32)

  ctx.textAlign = 'right'
  ctx.fillStyle = COLORS.teal
  ctx.font = '700 9px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.fillText(L.travelPackTitle, width - pad, y)
  drawPill(ctx, L.readinessLabel, width - pad, y + 28, COLORS.goldBg, COLORS.goldDark)
  ctx.textAlign = 'left'

  y += 52
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, y)
  ctx.lineTo(width - pad, y)
  ctx.stroke()
  y += 16

  // Pet card
  const photo = 64
  const petCardH = photo + 24
  fillRoundRect(ctx, pad, y, width - pad * 2, petCardH, 14, COLORS.surface, COLORS.border)
  const photoX = pad + 12
  const photoY = y + 12
  if (petImage) {
    drawCoverImage(ctx, petImage, photoX, photoY, photo, 12)
  } else {
    fillRoundRect(ctx, photoX, photoY, photo, photo, 12, COLORS.missingBg)
  }
  ctx.fillStyle = COLORS.text
  ctx.font = '700 17px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${pet.name} · ${L.breed}`, photoX + photo + 14, y + 30)
  ctx.fillStyle = COLORS.muted
  ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.fillText(L.destinationLine, photoX + photo + 14, y + 50)
  y += petCardH + 12

  // Summary
  ctx.fillStyle = COLORS.secondary
  ctx.font = '400 11px "Plus Jakarta Sans", Arial, sans-serif'
  const summaryLines = wrapText(ctx, L.summary, width - pad * 2)
  for (const line of summaryLines) {
    ctx.fillText(line, pad, y + 12)
    y += 15
  }
  y += 8

  // Info cards 2x2
  const gap = 8
  const cardW = (width - pad * 2 - gap) / 2
  const cardH = 68
  const infoCards: Array<[string, string, string]> = [
    [L.euPassportTitle, pack.euPassport.number, L.validUntilLine],
    [L.vaccinationTitle, L.vaccinationSummary, L.nextDueLine],
    [L.microchipTitle, pack.microchip, L.registeredLine],
    [L.healthRecordsTitle, L.clinicalRecordsLine, L.lastVisitLine],
  ]
  infoCards.forEach(([title, primary, secondary], index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = pad + col * (cardW + gap)
    const cy = y + row * (cardH + gap)
    fillRoundRect(ctx, x, cy, cardW, cardH, 12, COLORS.surface, COLORS.border)
    ctx.fillStyle = COLORS.teal
    ctx.font = '700 9px "Plus Jakarta Sans", Arial, sans-serif'
    ctx.fillText(title, x + 12, cy + 18)
    ctx.fillStyle = COLORS.text
    ctx.font = '700 12px "Plus Jakarta Sans", Arial, sans-serif'
    const primaryLines = wrapText(ctx, primary, cardW - 24)
    ctx.fillText(primaryLines[0] ?? '', x + 12, cy + 38)
    ctx.fillStyle = COLORS.muted
    ctx.font = '400 10px "Plus Jakarta Sans", Arial, sans-serif'
    ctx.fillText(secondary, x + 12, cy + 54)
  })
  y += cardH * 2 + gap + 16

  // Requirements
  ctx.fillStyle = COLORS.teal
  ctx.font = '700 9px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.fillText(L.requirementsHeading, pad, y + 10)
  y += 20

  for (const item of L.evaluated) {
    const badgeBg =
      item.status === 'ready'
        ? COLORS.readyBg
        : item.status === 'attention'
          ? COLORS.attentionBg
          : COLORS.missingBg
    const badgeFg =
      item.status === 'ready'
        ? COLORS.readyFg
        : item.status === 'attention'
          ? COLORS.attentionFg
          : COLORS.missingFg
    const statusText = L.statusLabel(item.status)

    ctx.font = '400 10px "Plus Jakarta Sans", Arial, sans-serif'
    const detailLines = wrapText(ctx, item.detail, width - pad * 2 - 120)
    const rowH = Math.max(58, 28 + detailLines.length * 13 + 16)

    const cardBg = item.status === 'attention' ? '#FCFBF8' : COLORS.surface
    const cardBorder = item.status === 'ready' ? COLORS.border : '#E8D8B5'
    fillRoundRect(ctx, pad, y, width - pad * 2, rowH, 10, cardBg, cardBorder)

    const circleX = pad + 22
    const circleY = y + 22
    drawStatusCircle(ctx, circleX, circleY, 9, item.status)

    const textLeft = pad + 40
    const textRight = width - pad - 12
    drawPill(ctx, statusText, textRight, circleY, badgeBg, badgeFg)

    ctx.fillStyle = COLORS.text
    ctx.font = '700 12px "Plus Jakarta Sans", Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(item.label, textLeft, y + 18)

    ctx.fillStyle = COLORS.secondary
    ctx.font = '400 10px "Plus Jakarta Sans", Arial, sans-serif'
    let textY = y + 34
    for (const line of detailLines.slice(0, 2)) {
      ctx.fillText(line, textLeft, textY)
      textY += 13
    }
    ctx.fillStyle = COLORS.teal
    ctx.font = '600 10px "Plus Jakarta Sans", Arial, sans-serif'
    ctx.fillText(item.hint, textLeft, textY + 2)

    y += rowH + 6
  }

  // Documents
  y += 4
  const docsH = 22 + L.documents.length * 24
  fillRoundRect(ctx, pad, y, width - pad * 2, docsH, 12, COLORS.surface, COLORS.border)
  ctx.fillStyle = COLORS.teal
  ctx.font = '700 9px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.fillText(L.documentsHeading, pad + 14, y + 16)

  L.documents.forEach((doc, index) => {
    const dy = y + 30 + index * 24
    drawStatusCircle(ctx, pad + 24, dy, 8, doc.ready ? 'ready' : 'missing')
    ctx.fillStyle = doc.ready ? COLORS.text : COLORS.muted
    ctx.font = `${doc.ready ? 600 : 500} 11px "Plus Jakarta Sans", Arial, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillText(doc.label, pad + 40, dy)
  })
  y += docsH + 16

  // Footer
  ctx.strokeStyle = COLORS.border
  ctx.beginPath()
  ctx.moveTo(pad, y)
  ctx.lineTo(width - pad, y)
  ctx.stroke()
  y += 14
  ctx.fillStyle = COLORS.muted
  ctx.font = '400 10px "Plus Jakarta Sans", Arial, sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillText(L.footerLeft, pad, y)
  ctx.textAlign = 'right'
  ctx.fillText(L.footerRight, width - pad, y)
  ctx.textAlign = 'left'

  // Crop unused bottom whitespace so scaling stays sharp on A4.
  const usedHeight = Math.min(height, Math.ceil(y + pad))
  const cropped = document.createElement('canvas')
  cropped.width = width * 2
  cropped.height = usedHeight * 2
  const cropCtx = cropped.getContext('2d')
  if (!cropCtx) return { canvas, filename: L.filename }
  cropCtx.drawImage(
    canvas,
    0,
    0,
    width * 2,
    usedHeight * 2,
    0,
    0,
    width * 2,
    usedHeight * 2,
  )
  return { canvas: cropped, filename: L.filename }
}

function downloadPdfToBrowserShelf(bytes: ArrayBuffer, filename: string) {
  // octet-stream + download attribute → Chrome/Edge put the file into
  // “Recent download history” instead of opening the inline PDF viewer.
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 2000)
}

export async function downloadTravelPackagePdf(input: TravelPackPdfInput) {
  const { canvas, filename } = await renderTravelPackCanvas(input)
  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 6
  const maxW = pageWidth - margin * 2
  const maxH = pageHeight - margin * 2
  // Canvas is rendered at 2x; logical size is in CSS pixels.
  const cssW = canvas.width / 2
  const cssH = canvas.height / 2
  const scale = Math.min(maxW / cssW, maxH / cssH)
  const imgW = cssW * scale
  const imgH = cssH * scale
  const x = (pageWidth - imgW) / 2
  const y = margin + (maxH - imgH) / 2
  pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH)

  downloadPdfToBrowserShelf(pdf.output('arraybuffer'), filename)
  return filename
}

export function buildTravelPackShareText(input: TravelPackPdfInput) {
  return localizeTravelPackForPdf(input).shareText
}
