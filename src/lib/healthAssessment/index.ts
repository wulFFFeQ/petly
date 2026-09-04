export {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_SECTIONS,
  getQuestionsForSpecies,
  findQuestionOption,
} from './questions'
export type {
  AnswerSeverity,
  AssessmentOption,
  AssessmentQuestion,
  AssessmentQuestionId,
  AssessmentSectionId,
} from './questions'
export {
  evaluateHealthAssessment,
  buildPreventionDefaults,
  emptyAnswersForPet,
} from './evaluate'
export type { EvaluationContext, EvaluationResult } from './evaluate'
