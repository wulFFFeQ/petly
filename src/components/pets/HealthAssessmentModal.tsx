import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  ASSESSMENT_SECTIONS,
  buildPreventionDefaults,
  emptyAnswersForPet,
  evaluateHealthAssessment,
  getQuestionsForSpecies,
  type AssessmentSectionId,
  type EvaluationResult,
} from '../../lib/healthAssessment'
import {
  formatHealthStatusHeadline,
  formatOptionalWeight,
} from '../../lib/petProfileDisplay'
import { formatIsoDateToCzech } from '../../lib/petProfileUtils'
import type { Pet } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { OptionSelect } from '../ui/OptionSelect'

type Step = 'form' | 'result'

interface HealthAssessmentModalProps {
  open: boolean
  onClose: () => void
  pet: Pet
  /** When opening from a saved result, start on the result step. */
  startOnResult?: boolean
}

export function HealthAssessmentModal({
  open,
  onClose,
  pet,
  startOnResult = false,
}: HealthAssessmentModalProps) {
  const { healthRecords, updatePet, addHealthRecord } = useApp()
  const [step, setStep] = useState<Step>('form')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<EvaluationResult | null>(null)

  const questions = useMemo(() => getQuestionsForSpecies(pet.type), [pet.type])

  const questionsBySection = useMemo(() => {
    const map = new Map<AssessmentSectionId, typeof questions>()
    for (const section of ASSESSMENT_SECTIONS) {
      map.set(
        section.id,
        questions.filter((q) => q.section === section.id),
      )
    }
    return map
  }, [questions])

  useEffect(() => {
    if (!open) return

    const base = emptyAnswersForPet(pet.type)
    const prevention = buildPreventionDefaults(pet, healthRecords)
    const previous = pet.healthAssessment?.answers ?? {}

    setAnswers({ ...base, ...prevention, ...previous })

    if (startOnResult && pet.healthAssessment) {
      setResult({
        status: pet.healthAssessment.status,
        assessedAt: pet.healthAssessment.assessedAt,
        summary: pet.healthAssessment.summary,
        reasons: pet.healthAssessment.reasons,
        recommendations: pet.healthAssessment.recommendations,
        urgentWarning: pet.healthAssessment.urgentWarning,
      })
      setStep('result')
    } else {
      setResult(null)
      setStep('form')
    }
    // Only reset when opening / switching pet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pet.id, startOnResult])

  const currentWeightLabel = formatOptionalWeight(pet.weight)

  const handleEvaluate = () => {
    const evaluation = evaluateHealthAssessment({
      pet,
      answers,
      healthRecords,
    })
    setResult(evaluation)
    setStep('result')
  }

  const handleSave = () => {
    if (!result) return

    updatePet(pet.id, {
      healthStatus: result.status,
      healthAssessment: {
        status: result.status,
        assessedAt: result.assessedAt,
        summary: result.summary,
        reasons: result.reasons,
        recommendations: result.recommendations,
        urgentWarning: result.urgentWarning,
        answers,
      },
    })

    addHealthRecord({
      petId: pet.id,
      type: 'assessment',
      title: formatHealthStatusHeadline(result.status),
      date: result.assessedAt,
    })

    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === 'form'
          ? 'Orientační zdravotní přehled'
          : 'Výsledek zdravotního přehledu'
      }
      subtitle={
        step === 'form'
          ? `Aktuální stav ${pet.name} — nejde o veterinární diagnózu`
          : `${pet.name} · aktualizace ${formatIsoDateToCzech(result?.assessedAt ?? '')}`
      }
      maxWidth="xl"
    >
      {step === 'form' ? (
        <div className="flex max-h-[min(70vh,640px)] flex-col gap-5 overflow-y-auto pr-1">
          <p className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5 text-xs leading-relaxed text-[#5A6660]">
            Tento přehled je orientační a nenahrazuje veterinární vyšetření. Pomáhá zachytit
            změny, které stojí za sledování nebo konzultaci.
          </p>

          <div className="rounded-xl border border-[#D1E0D8] bg-[#EBF2EE]/50 px-3 py-2.5 text-xs text-[#2C4A3E]">
            <span className="font-semibold">Aktuální hmotnost v profilu:</span>{' '}
            {currentWeightLabel}
            {pet.breed ? (
              <span className="text-[#5A6660]"> · {pet.breed}</span>
            ) : null}
          </div>

          {ASSESSMENT_SECTIONS.map((section) => {
            const sectionQuestions = questionsBySection.get(section.id) ?? []
            if (sectionQuestions.length === 0) return null
            return (
              <section key={section.id} className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#191E1B]">{section.title}</h3>
                  <p className="text-xs text-[#7D8B82]">{section.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sectionQuestions.map((question) => (
                    <OptionSelect
                      key={`${section.id}-${question.id}`}
                      id={`ha-${pet.id}-${question.id}`}
                      label={question.label}
                      value={answers[question.id] ?? ''}
                      onChange={(value) =>
                        setAnswers((prev) => ({ ...prev, [question.id]: value }))
                      }
                      options={question.options.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      placeholder="Vyberte…"
                    />
                  ))}
                </div>
              </section>
            )
          })}

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#F0EDE6] bg-white pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="button" variant="primary" onClick={handleEvaluate} className="gap-1.5">
              <ClipboardList size={16} />
              Vyhodnotit stav
            </Button>
          </div>
        </div>
      ) : result ? (
        <div className="flex flex-col gap-4">
          {result.urgentWarning && (
            <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
              <p className="leading-relaxed">{result.urgentWarning}</p>
            </div>
          )}

          <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-5 text-center">
            <p className="text-xl font-bold tracking-tight text-[#191E1B] sm:text-2xl">
              {formatHealthStatusHeadline(result.status)}
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#4A564F]">
              {result.summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E8E4DC] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Hodnocení provedeno
              </p>
              <p className="mt-1 text-sm font-semibold text-[#191E1B]">
                {formatIsoDateToCzech(result.assessedAt)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E8E4DC] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Mazlíček
              </p>
              <p className="mt-1 text-sm font-semibold text-[#191E1B]">
                {pet.name} · {pet.type === 'dog' ? 'pes' : 'kočka'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Hlavní důvody
            </p>
            <ul className="mt-2 space-y-1.5">
              {result.reasons.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2 text-sm text-[#4A564F]"
                >
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#2C4A3E]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Doporučení
            </p>
            <ul className="mt-2 space-y-1.5">
              {result.recommendations.map((rec) => (
                <li key={rec} className="text-sm leading-relaxed text-[#4A564F]">
                  · {rec}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] leading-relaxed text-[#7D8B82]">
            Tento přehled je orientační a nenahrazuje veterinární vyšetření.
          </p>

          <div className="flex flex-col-reverse gap-2 border-t border-[#F0EDE6] pt-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setStep('form')}>
              Aktualizovat zdravotní stav
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Zavřít
              </Button>
              <Button type="button" variant="primary" onClick={handleSave}>
                Uložit do profilu
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
