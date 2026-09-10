const CONNECT_DRAFT_KEY = 'lovedandknown.connectMessageDraft'

export type ConnectMessageDraft = {
  petId: string
  text: string
}

export function defaultConnectIntro(petName: string): string {
  return `Ahoj, viděla jsem profil ${petName}. Myslím, že by si naši mazlíčci mohli dobře rozumět. Ráda bych je propojila.`
}

export function saveConnectMessageDraft(draft: ConnectMessageDraft): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(CONNECT_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // best-effort
  }
}

export function takeConnectMessageDraft(petId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(CONNECT_DRAFT_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(CONNECT_DRAFT_KEY)
    const parsed = JSON.parse(raw) as Partial<ConnectMessageDraft>
    if (parsed.petId !== petId) return null
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : ''
    return text || null
  } catch {
    return null
  }
}

export { CONNECT_DRAFT_KEY }
