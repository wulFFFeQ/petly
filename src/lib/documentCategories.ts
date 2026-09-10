export type DocumentCategory =
  | 'identification'
  | 'health'
  | 'insurance'
  | 'breeding'
  | 'travel'
  | 'other'

export type DocumentTypeId =
  | 'eu_passport'
  | 'microchip_certificate'
  | 'ownership_adoption'
  | 'identification_other'
  | 'vaccination_record'
  | 'health_report'
  | 'lab_results'
  | 'exam_results'
  | 'vet_report'
  | 'health_other'
  | 'insurance_policy'
  | 'insurance_confirmation'
  | 'insurance_other'
  | 'pedigree'
  | 'breeding_docs'
  | 'breeding_health_tests'
  | 'show_certificate'
  | 'champion_certificate'
  | 'breeding_other'
  | 'travel_document'
  | 'travel_confirmation'
  | 'travel_other'
  | 'other'

export type DocumentTypeOption = {
  id: DocumentTypeId
  label: string
}

export type DocumentCategoryOption = {
  id: DocumentCategory
  label: string
  types: DocumentTypeOption[]
}

export const DOCUMENT_CATEGORIES: DocumentCategoryOption[] = [
  {
    id: 'identification',
    label: 'Identifikace',
    types: [
      { id: 'eu_passport', label: 'Pet pas / evropský pas' },
      { id: 'microchip_certificate', label: 'Certifikát registrace mikročipu' },
      { id: 'ownership_adoption', label: 'Doklad o vlastnictví / adopci' },
      { id: 'identification_other', label: 'Jiný identifikační dokument' },
    ],
  },
  {
    id: 'health',
    label: 'Zdraví',
    types: [
      { id: 'vaccination_record', label: 'Očkovací průkaz / potvrzení o očkování' },
      { id: 'health_report', label: 'Zdravotní zpráva' },
      { id: 'lab_results', label: 'Laboratorní výsledky' },
      { id: 'exam_results', label: 'Výsledky vyšetření' },
      { id: 'vet_report', label: 'Lékařská / veterinární zpráva' },
      { id: 'health_other', label: 'Jiný zdravotní dokument' },
    ],
  },
  {
    id: 'insurance',
    label: 'Pojištění',
    types: [
      { id: 'insurance_policy', label: 'Pojistná smlouva' },
      { id: 'insurance_confirmation', label: 'Potvrzení o pojištění' },
      { id: 'insurance_other', label: 'Jiný dokument pojištění' },
    ],
  },
  {
    id: 'breeding',
    label: 'Chov a rodokmen',
    types: [
      { id: 'pedigree', label: 'Rodokmen / pedigree' },
      { id: 'breeding_docs', label: 'Chovná dokumentace' },
      { id: 'breeding_health_tests', label: 'Zdravotní testy pro chov' },
      { id: 'show_certificate', label: 'Výstavní certifikát' },
      { id: 'champion_certificate', label: 'Certifikát šampiona' },
      { id: 'breeding_other', label: 'Jiný chovatelský dokument' },
    ],
  },
  {
    id: 'travel',
    label: 'Cestování',
    types: [
      { id: 'travel_document', label: 'Cestovní dokument' },
      { id: 'travel_confirmation', label: 'Potvrzení pro cestování' },
      { id: 'travel_other', label: 'Jiný cestovní dokument' },
    ],
  },
  {
    id: 'other',
    label: 'Ostatní',
    types: [{ id: 'other', label: 'Jiný dokument' }],
  },
]

export const DOCUMENT_FILTER_OPTIONS: Array<{ id: DocumentCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Vše' },
  ...DOCUMENT_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
]

export function getDocumentTypesForCategory(category: DocumentCategory): DocumentTypeOption[] {
  return DOCUMENT_CATEGORIES.find((c) => c.id === category)?.types ?? []
}

export function getDocumentCategoryLabel(category: DocumentCategory): string {
  return DOCUMENT_CATEGORIES.find((c) => c.id === category)?.label ?? category
}

export function getDocumentTypeLabel(
  category: DocumentCategory,
  documentType: DocumentTypeId,
): string {
  const types = getDocumentTypesForCategory(category)
  return types.find((t) => t.id === documentType)?.label ?? documentType
}

/** Map legacy mock `type` values onto the new taxonomy. */
export function mapLegacyDocumentType(
  legacy?: string,
): { category: DocumentCategory; documentType: DocumentTypeId } {
  switch (legacy) {
    case 'passport':
      return { category: 'identification', documentType: 'eu_passport' }
    case 'chip':
      return { category: 'identification', documentType: 'microchip_certificate' }
    case 'insurance':
      return { category: 'insurance', documentType: 'insurance_policy' }
    case 'lab':
      return { category: 'health', documentType: 'lab_results' }
    default:
      return { category: 'other', documentType: 'other' }
  }
}
