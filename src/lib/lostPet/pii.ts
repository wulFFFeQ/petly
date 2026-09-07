/**
 * Strip obvious PII before storing/displaying secure-contact messages.
 * Defense-in-depth — never rely on this alone for privacy.
 */
export function scrubPersonalData(text: string): { text: string; scrubbed: boolean } {
  let next = text
  let scrubbed = false

  const patterns: RegExp[] = [
    // E-mail
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // Phone-like sequences (CZ / intl-ish)
    /(?:\+|00)?\s?\d{1,3}[\s./-]?(?:\(?\d{2,4}\)?[\s./-]?)?\d{3}[\s./-]?\d{3,4}[\s./-]?\d{0,4}/g,
    // Street + house number heuristics (CZ)
    /\b(?:ulice|ul\.|náměstí|nám\.|třída|trida|avenue|street|road)\s+[^\n,]{2,40}\s+\d+[a-zA-Z]?\/?\d*/gi,
    /\b[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:ova|ová|ského|ského)?\s+\d{1,4}[a-zA-Z]?(?:\/\d{1,4})?\b/g,
  ]

  for (const pattern of patterns) {
    const replaced = next.replace(pattern, '[skryto]')
    if (replaced !== next) scrubbed = true
    next = replaced
  }

  return { text: next.trim(), scrubbed }
}

export const FINDER_QUICK_REPLIES = [
  'Je u mě v bezpečí.',
  'Je stále na místě.',
  'Nemohu ho bezpečně držet.',
  'Potřebuje veterinární pomoc.',
] as const

export const OWNER_QUICK_REPLIES = [
  'Děkuji, jsem na cestě.',
  'Kde přesně se nacházíte (oblast)?',
  'Prosím, zůstaňte na místě.',
  'Můžete ho bezpečně držet?',
] as const
