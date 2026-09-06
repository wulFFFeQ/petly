import QRCode from 'qrcode'

const QR_SIZE = 512

/** Data URL (PNG) large enough for print / tag scanning. */
export async function generateFoundPetQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: QR_SIZE,
    color: {
      dark: '#191E1B',
      light: '#FFFFFF',
    },
  })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function printQrImage(dataUrl: string, petName: string) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"/><title>QR — ${petName}</title>
<style>
  body{margin:0;font-family:Georgia,serif;color:#191E1B;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:12px}
  img{width:280px;height:280px}
  h1{font-size:18px;margin:0}
  p{font-size:12px;color:#5A6660;margin:0;text-align:center;max-width:280px}
</style></head><body>
<h1>${petName} · LOVED &amp; KNOWN</h1>
<img src="${dataUrl}" alt="QR kód" />
<p>Naskenujte pro bezpečný kontakt při nálezu</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
  win.document.close()
}
