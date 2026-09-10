import type {
  HealthRecord,
  Pet,
  PetDocument,
  PetTravelPackage,
  TravelDestination,
  TravelPrefs,
  TravelRequirementCheck,
  TravelRequirementStatus,
  TravelStepDeepLink,
} from '../../types'
import { confirmationKey } from './travelPrefs'

const EXPIRING_SOON_DAYS = 90

function daysUntil(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim())
  if (!m) return null
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - today) / (24 * 60 * 60 * 1000))
}

function formatCzechDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim())
  if (!m) return isoDate
  return `${Number(m[3])}. ${Number(m[2])}. ${m[1]}`
}

function docsForPet(documents: PetDocument[], petId: string): PetDocument[] {
  return documents.filter((d) => d.petId === petId)
}

function healthForPet(records: HealthRecord[], petId: string): HealthRecord[] {
  return records.filter((r) => r.petId === petId)
}

function findEuPassport(docs: PetDocument[]): PetDocument | undefined {
  return docs.find((d) => d.documentType === 'eu_passport')
}

function findInsurance(docs: PetDocument[]): PetDocument | undefined {
  return docs.find(
    (d) =>
      d.documentType === 'insurance_policy' ||
      d.documentType === 'insurance_confirmation' ||
      d.category === 'insurance',
  )
}

function findHealthCert(docs: PetDocument[]): PetDocument | undefined {
  return docs.find(
    (d) =>
      d.documentType === 'health_report' ||
      d.documentType === 'travel_document' ||
      d.documentType === 'travel_confirmation' ||
      (d.category === 'travel' && d.documentType !== 'travel_other'),
  )
}

function isRabiesVaccination(record: HealthRecord): boolean {
  if (record.type !== 'vaccination') return false
  const hay = `${record.title} ${record.subtitle} ${record.vaccineName ?? ''}`.toLowerCase()
  return /vzteklina|rabies|nobivac\s*rabies/.test(hay)
}

function passportStatus(doc: PetDocument | undefined): {
  number: string
  validUntil: string
  status: 'valid' | 'expiring' | 'missing'
} {
  if (!doc) {
    return { number: '', validUntil: '', status: 'missing' }
  }
  const expiresAt = doc.expiresAt?.trim()
  if (!expiresAt) {
    return {
      number: doc.name,
      validUntil: 'doplňte platnost',
      status: 'expiring',
    }
  }
  const days = daysUntil(expiresAt)
  if (days == null) {
    return { number: doc.name, validUntil: expiresAt, status: 'valid' }
  }
  if (days < 0) {
    return { number: doc.name, validUntil: formatCzechDate(expiresAt), status: 'missing' }
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return { number: doc.name, validUntil: formatCzechDate(expiresAt), status: 'expiring' }
  }
  return { number: doc.name, validUntil: formatCzechDate(expiresAt), status: 'valid' }
}

export function buildPetTravelPackage(
  pet: Pet,
  documents: PetDocument[],
  healthRecords: HealthRecord[],
): PetTravelPackage {
  const docs = docsForPet(documents, pet.id)
  const health = healthForPet(healthRecords, pet.id)
  const passport = findEuPassport(docs)
  const insurance = findInsurance(docs)
  const healthCert = findHealthCert(docs)
  const rabies = health.find(isRabiesVaccination)
  const vaccinations = health.filter((r) => r.type === 'vaccination')
  const chip = pet.microchip?.trim() ?? ''

  let vaccinationSummary = 'Očkování není v záznamech'
  if (rabies) {
    const due = rabies.nextDueDate ? ` · další ${rabies.nextDueDate}` : ''
    vaccinationSummary = `${rabies.vaccineName || rabies.title || 'Vzteklina'} – v záznamech${due}`
  } else if (vaccinations.length > 0) {
    vaccinationSummary = `${vaccinations.length} očkování v záznamech (vzteklina neověřena)`
  }

  const euPassport = passportStatus(passport)

  return {
    petId: pet.id,
    euPassport,
    vaccinationSummary,
    microchip: chip,
    healthRecordCount: health.length,
    documents: [
      { label: 'EU pas mazlíčka', ready: Boolean(passport) && euPassport.status !== 'missing' },
      { label: 'Očkovací certifikát', ready: Boolean(rabies) || vaccinations.length > 0 },
      { label: 'Potvrzení o čipu', ready: Boolean(chip) },
      { label: 'Zdravotní souhrn', ready: Boolean(healthCert) || health.length > 0 },
      { label: 'Pojišťovací kartička', ready: Boolean(insurance) },
    ],
  }
}

export function deepLinkForCheck(check: TravelRequirementCheck): TravelStepDeepLink {
  switch (check) {
    case 'eu_passport':
    case 'insurance':
    case 'health_cert':
      return 'documents'
    case 'rabies':
      return 'health'
    case 'microchip':
      return 'overview'
    case 'tapeworm':
    case 'parasite_prevention':
    case 'import_permit':
      return 'confirm'
  }
}

export function getRequirementStatus(
  check: TravelRequirementCheck,
  pack: PetTravelPackage,
  prefs: TravelPrefs,
  petId: string,
  destinationId: string,
): { status: TravelRequirementStatus; hint: string } {
  const confirmed = Boolean(prefs.confirmations[confirmationKey(petId, destinationId, check)])
  const insuranceDoc = pack.documents.find((d) => d.label.includes('Pojišťovací'))
  const healthDoc = pack.documents.find((d) => d.label.includes('Zdravotní'))

  switch (check) {
    case 'eu_passport':
      if (pack.euPassport.status === 'valid') {
        return { status: 'ready', hint: `Platný do ${pack.euPassport.validUntil}` }
      }
      if (pack.euPassport.status === 'expiring') {
        return { status: 'attention', hint: `Platnost končí ${pack.euPassport.validUntil}` }
      }
      return { status: 'missing', hint: 'EU pas chybí nebo expiroval' }
    case 'rabies': {
      const hasRabies = /vzteklina|rabies/i.test(pack.vaccinationSummary)
      if (hasRabies && !/neověřena/i.test(pack.vaccinationSummary)) {
        return { status: 'ready', hint: pack.vaccinationSummary }
      }
      if (pack.healthRecordCount > 0) {
        return { status: 'attention', hint: 'Doplňte / ověřte očkování proti vzteklině' }
      }
      return { status: 'missing', hint: 'Chybí ověření očkování' }
    }
    case 'microchip':
      return pack.microchip
        ? { status: 'ready', hint: pack.microchip }
        : { status: 'missing', hint: 'Čip není zapsán v systému' }
    case 'tapeworm':
      if (confirmed) return { status: 'ready', hint: 'Ošetření potvrzeno' }
      return { status: 'attention', hint: 'Nutné ošetření u veterináře před vstupem' }
    case 'parasite_prevention':
      if (confirmed) return { status: 'ready', hint: 'Prevence potvrzena' }
      return { status: 'attention', hint: 'Doporučeno zajistit před cestou u veterináře' }
    case 'health_cert':
      if (confirmed) return { status: 'ready', hint: 'Certifikát potvrzen' }
      return healthDoc?.ready
        ? { status: 'ready', hint: 'Zdravotní dokumentace je k dispozici' }
        : { status: 'missing', hint: 'Vyžaduje se oficiální certifikát od veterináře' }
    case 'insurance':
      return insuranceDoc?.ready
        ? { status: 'ready', hint: 'Pojištění je v dokumentech' }
        : { status: 'attention', hint: 'Doporučeno doplnit před cestou' }
    case 'import_permit':
      if (confirmed) return { status: 'ready', hint: 'Povolení potvrzeno' }
      return { status: 'attention', hint: 'Nutno vyřídit online před odletem' }
  }
}

export function getDestinationReadiness(
  destination: TravelDestination,
  pack: PetTravelPackage,
  prefs: TravelPrefs,
  petId: string,
) {
  const evaluated = destination.requirements.map((req) => ({
    req,
    ...getRequirementStatus(req.check, pack, prefs, petId, destination.id),
    deepLink: deepLinkForCheck(req.check),
  }))
  const ready = evaluated.filter((e) => e.status === 'ready').length
  const attention = evaluated.filter((e) => e.status === 'attention').length
  const missing = evaluated.filter((e) => e.status === 'missing').length
  const overall: TravelRequirementStatus =
    missing > 0 ? 'missing' : attention > 0 ? 'attention' : 'ready'
  const incompleteSteps = attention + missing

  return { evaluated, ready, attention, missing, overall, incompleteSteps }
}

export function overallReadinessLabel(
  overall: TravelRequirementStatus,
  incompleteSteps: number,
): string {
  if (overall === 'ready') return 'Připraveno k cestě'
  if (overall === 'attention') {
    return `Ještě je potřeba dokončit ${incompleteSteps} ${incompleteSteps === 1 ? 'krok' : incompleteSteps < 5 ? 'kroky' : 'kroků'}`
  }
  return 'Něco důležitého chybí'
}
