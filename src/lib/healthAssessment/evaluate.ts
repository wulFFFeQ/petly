import type { HealthAssessmentSnapshot, HealthRecord, HealthStatus, Pet } from '../../types'
import { todayIsoDate } from '../petProfileUtils'
import type { PetType } from '../petTypes'
import {
  findQuestionOption,
  getQuestionsForSpecies,
  type AnswerSeverity,
  type AssessmentQuestionId,
} from './questions'

const SEVERITY_RANK: Record<AnswerSeverity, number> = {
  ok: 0,
  watch: 1,
  concern: 2,
  urgent: 3,
  emergency: 4,
}

export type EvaluationContext = {
  pet: Pet
  answers: Record<string, string>
  healthRecords: HealthRecord[]
}

export type EvaluationResult = Omit<HealthAssessmentSnapshot, 'answers' | 'assessedAt'> & {
  assessedAt: string
}

function collectSignals(type: PetType, answers: Record<string, string>) {
  const questions = getQuestionsForSpecies(type)
  const flags = new Set<string>()
  let maxSeverity: AnswerSeverity = 'ok'
  const notable: { id: AssessmentQuestionId; label: string; optionLabel: string; severity: AnswerSeverity }[] =
    []

  for (const question of questions) {
    const option = findQuestionOption(question, answers[question.id])
    if (!option) continue
    if (SEVERITY_RANK[option.severity] > SEVERITY_RANK[maxSeverity]) {
      maxSeverity = option.severity
    }
    if (option.flag) flags.add(option.flag)
    if (option.severity !== 'ok') {
      notable.push({
        id: question.id,
        label: question.label,
        optionLabel: option.label,
        severity: option.severity,
      })
    }
  }

  return { flags, maxSeverity, notable }
}

function buildUrgentWarning(flags: Set<string>, maxSeverity: AnswerSeverity): string | undefined {
  if (
    maxSeverity === 'emergency' ||
    flags.has('urinary_block') ||
    flags.has('collapse') ||
    flags.has('allergy_severe')
  ) {
    return 'Podle zadaných příznaků může jít o naléhavou situaci. Kontaktujte veterináře nebo veterinární pohotovost bez zbytečného odkladu.'
  }
  if (
    maxSeverity === 'urgent' ||
    flags.has('gi_bleed') ||
    flags.has('vomiting') ||
    flags.has('urinary') ||
    flags.has('pain') ||
    flags.has('breathing')
  ) {
    return 'Zvažte brzké kontaktování veterináře. Tento přehled nenahrazuje vyšetření — při zhoršení volejte pohotovost.'
  }
  return undefined
}

function pickStatus(
  maxSeverity: AnswerSeverity,
  flags: Set<string>,
  notableCount: number,
): HealthStatus {
  // Priority ladder — severe signals dominate clusters of mild ones.
  if (
    maxSeverity === 'emergency' ||
    flags.has('urinary_block') ||
    flags.has('collapse') ||
    flags.has('allergy_severe')
  ) {
    return 'urgent'
  }

  if (
    maxSeverity === 'urgent' ||
    flags.has('gi_bleed') ||
    (flags.has('breathing') && SEVERITY_RANK[maxSeverity] >= SEVERITY_RANK.concern) ||
    (flags.has('vomiting') && flags.has('dehydration_risk')) ||
    (flags.has('anorexia') && flags.has('lethargy')) ||
    (flags.has('post_op') && maxSeverity === 'urgent')
  ) {
    return 'vet_check'
  }

  if (maxSeverity === 'concern' || flags.has('chronic_flare') || flags.has('lump')) {
    return 'vet_check'
  }

  if (maxSeverity === 'watch') {
    // Several mild deviations → attention; a single mild → still good
    if (notableCount >= 3 || flags.has('prevention_gap') && notableCount >= 2) {
      return 'attention'
    }
    return 'good'
  }

  if (flags.has('prevention_gap')) return 'good'
  return 'excellent'
}

function buildSummary(status: HealthStatus, petName: string): string {
  switch (status) {
    case 'excellent':
      return `Podle zadaných informací a dostupných zdravotních údajů nevykazuje ${petName} známky aktuálního problému.`
    case 'good':
      return `Celkový obraz působí stabilně. Objevují se drobné odchylky, které stojí za sledování, ale bez známky akutního ohrožení.`
    case 'attention':
      return `Některé odpovědi naznačují změny, které si zaslouží pozornost. Sledujte vývoj a při zhoršení konzultujte veterináře.`
    case 'vet_check':
      return `Orientační přehled upozorňuje na příznaky, u kterých je vhodné domluvit veterinární kontrolu.`
    case 'urgent':
      return `Zadané informace ukazují na potenciálně závažný stav. Nečekejte na běžný termín — kontaktujte veterináře nebo pohotovost.`
  }
}

function buildReasons(
  notable: ReturnType<typeof collectSignals>['notable'],
  status: HealthStatus,
): string[] {
  const sorted = [...notable].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  )
  const top = sorted.slice(0, 5).map((item) => `${item.label}: ${item.optionLabel}`)
  if (top.length === 0) {
    return ['Všechny vyplněné oblasti bez varovných příznaků.']
  }
  if (status === 'excellent' || status === 'good') {
    return top.length ? top : ['Bez významných odchylek od běžného stavu.']
  }
  return top
}

function buildRecommendations(
  status: HealthStatus,
  flags: Set<string>,
): string[] {
  const recs: string[] = []
  if (status === 'urgent') {
    recs.push('Ihned kontaktujte veterináře nebo veterinární pohotovost.')
  } else if (status === 'vet_check') {
    recs.push('Objednejte se ke kontrole u veterináře a popište uvedené příznaky.')
  } else if (status === 'attention') {
    recs.push('Sledujte příznaky 24–48 hodin a při zhoršení volejte veterináře.')
  } else {
    recs.push('Pokračujte v běžné péči a prevenci.')
  }

  if (flags.has('prevention_gap')) {
    recs.push('Doplňte prevenci (očkování / antiparazitika / prohlídka) podle doporučení veterináře.')
  }
  if (flags.has('dental') || flags.has('mouth')) {
    recs.push('Zvažte dentální kontrolu.')
  }
  if (flags.has('weight_loss')) {
    recs.push('Zvažte kontrolu hmotnosti a celkového zdravotního stavu.')
  }
  if (flags.has('urinary') || flags.has('urinary_block')) {
    recs.push('Potíže s močením u koček i psů mohou rychle eskalovat — neotálejte.')
  }

  return [...new Set(recs)].slice(0, 4)
}

/** Priority-based orientational assessment — not a veterinary diagnosis. */
export function evaluateHealthAssessment(ctx: EvaluationContext): EvaluationResult {
  const { flags, maxSeverity, notable } = collectSignals(ctx.pet.type, ctx.answers)
  const status = pickStatus(maxSeverity, flags, notable.length)
  const urgentWarning = buildUrgentWarning(flags, maxSeverity)

  return {
    status,
    assessedAt: todayIsoDate(),
    summary: buildSummary(status, ctx.pet.name),
    reasons: buildReasons(notable, status),
    recommendations: buildRecommendations(status, flags),
    urgentWarning,
  }
}

/** Prefill prevention answers from existing profile / health records. */
export function buildPreventionDefaults(
  pet: Pet,
  healthRecords: HealthRecord[],
): Partial<Record<string, string>> {
  const defaults: Partial<Record<string, string>> = {}
  const petRecords = healthRecords.filter((r) => r.petId === pet.id)

  const vaccinations = petRecords.filter((r) => r.type === 'vaccination')
  const scheduledVax = vaccinations.find((r) => r.status === 'scheduled')
  if (scheduledVax) defaults.vaccination_status = 'due_soon'
  else if (vaccinations.length > 0 || pet.nextVaccination) defaults.vaccination_status = 'up_to_date'
  else defaults.vaccination_status = 'overdue'

  const meds = petRecords.filter((r) => r.type === 'medication' && r.status === 'active')
  if (meds.length > 0) defaults.active_meds = 'yes'

  if (pet.lastVetVisit) defaults.last_vet_check = 'recent'
  else {
    const vet = petRecords.find((r) => r.type === 'vet')
    defaults.last_vet_check = vet ? 'recent' : 'unknown'
  }

  defaults.parasite_prevention = 'regular'
  defaults.dental_care = 'ok'

  return defaults
}

export function emptyAnswersForPet(type: PetType): Record<string, string> {
  const answers: Record<string, string> = {}
  for (const q of getQuestionsForSpecies(type)) {
    answers[q.id] = q.options[0]?.value ?? ''
  }
  return answers
}
