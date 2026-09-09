/**
 * Emergency card data is intentionally separate from the private pet profile.
 * Public surfaces must only read fields gated by EmergencyCardVisibility
 * (defaults: everything OFF except basic pet identification).
 */

/** Opt-in flags — every sensitive field defaults to false. */
export interface EmergencyCardVisibility {
  /** Age on the public / shared card. */
  showAge: boolean
  /** Gender on the public / shared card. */
  showGender: boolean
  /**
   * Show masked microchip only (e.g. ••••••••7890).
   * Full chip number is never allowed on the public card.
   */
  showMaskedMicrochip: boolean
  showHealthAllergies: boolean
  showHealthChronic: boolean
  showHealthMedication: boolean
  showHealthRestrictions: boolean
  showHealthOther: boolean
  /** Clinic / vet name on the public card. */
  showVet: boolean
  /** Vet phone (Call button) — only if showVet is also true. */
  showVetPhone: boolean
  /** Navigate to clinic — only if showVet is also true. */
  showVetNavigate: boolean
  /**
   * Owner phone on a printed physical card only.
   * Never shown on the digital public emergency page unless this is true
   * AND the print path is used — still never on the finder web view by default.
   */
  showOwnerPhoneOnPrint: boolean
}

/** Owner-authored acute health text for optional public disclosure. */
export interface EmergencyCardHealthContent {
  allergies?: string
  chronicConditions?: string
  regularMedication?: string
  importantRestrictions?: string
  other?: string
}

/** Vet contact the owner may optionally publish on the emergency card. */
export interface EmergencyCardVetContent {
  label?: string
  clinicOrName: string
  phone?: string
  /** Free-text place query for maps navigation (not home address). */
  navigateQuery?: string
}

/**
 * Per-pet emergency card settings.
 * Private profile fields (owner phone, email, address, partner, full chip, …)
 * are never stored here as “public by default”.
 */
export interface EmergencyCardSettings {
  /**
   * Public path segment for `/pet/:publicSlug/emergency`.
   * Prefer a short slug (e.g. pet id); never equal to microchip.
   */
  publicSlug: string
  health?: EmergencyCardHealthContent
  vet?: EmergencyCardVetContent
  /** Optional owner phone for print-only when visibility.showOwnerPhoneOnPrint. */
  ownerPhoneForPrint?: string
  visibility: EmergencyCardVisibility
}

export const DEFAULT_EMERGENCY_VISIBILITY: EmergencyCardVisibility = {
  showAge: false,
  showGender: false,
  showMaskedMicrochip: false,
  showHealthAllergies: false,
  showHealthChronic: false,
  showHealthMedication: false,
  showHealthRestrictions: false,
  showHealthOther: false,
  showVet: false,
  showVetPhone: false,
  showVetNavigate: false,
  showOwnerPhoneOnPrint: false,
}
