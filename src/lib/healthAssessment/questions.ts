import type { PetType } from '../petTypes'

/** How strongly an answer pushes the overall result (priority, not a score sum). */
export type AnswerSeverity =
  | 'ok'
  | 'watch'
  | 'concern'
  | 'urgent'
  | 'emergency'

export type AssessmentSectionId =
  | 'current'
  | 'body'
  | 'external'
  | 'behavior'
  | 'known'
  | 'prevention'

export type AssessmentQuestionId =
  | 'activity'
  | 'appetite'
  | 'water'
  | 'stool'
  | 'urination'
  | 'vomiting'
  | 'breathing'
  | 'pain'
  | 'mobility'
  | 'weight_change'
  | 'body_condition'
  | 'eyes'
  | 'ears'
  | 'mouth'
  | 'skin'
  | 'coat'
  | 'lumps'
  | 'behavior_change'
  | 'anxiety'
  | 'apathy'
  | 'restlessness'
  | 'activity_change'
  | 'diagnosed_disease'
  | 'allergies'
  | 'long_term_treatment'
  | 'active_meds'
  | 'surgeries'
  | 'vaccination_status'
  | 'parasite_prevention'
  | 'last_vet_check'
  | 'dental_care'

export type AssessmentOption = {
  value: string
  label: string
  severity: AnswerSeverity
  /** Extra flag for combination rules in the evaluator. */
  flag?: string
}

export type AssessmentQuestion = {
  id: AssessmentQuestionId
  section: AssessmentSectionId
  label: string
  hint?: string
  /** If set, question only appears for these species. */
  species?: PetType[]
  options: AssessmentOption[]
}

export const ASSESSMENT_SECTIONS: {
  id: AssessmentSectionId
  title: string
  description: string
}[] = [
  {
    id: 'current',
    title: 'Aktuální stav',
    description: 'Jak se mazlíček cítí v posledních dnech',
  },
  {
    id: 'body',
    title: 'Tělesný stav',
    description: 'Hmotnost a kondice',
  },
  {
    id: 'external',
    title: 'Vnější stav',
    description: 'Oči, uši, srst a další vnější znaky',
  },
  {
    id: 'behavior',
    title: 'Chování',
    description: 'Změny nálady a chování',
  },
  {
    id: 'known',
    title: 'Známé zdravotní problémy',
    description: 'Diagnózy, alergie a léčba',
  },
  {
    id: 'prevention',
    title: 'Prevence',
    description: 'Očkování, antiparazitika a kontroly',
  },
]

const opt = (
  value: string,
  label: string,
  severity: AnswerSeverity,
  flag?: string,
): AssessmentOption => ({ value, label, severity, flag })

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // —— Current ——
  {
    id: 'activity',
    section: 'current',
    label: 'Aktivita a energie',
    species: ['dog'],
    options: [
      opt('normal', 'Normální, jako obvykle', 'ok'),
      opt('slightly_low', 'Trochu méně energie', 'watch'),
      opt('low', 'Výrazně unavený / apatický', 'concern', 'lethargy'),
      opt('hyper', 'Neobvykle hyperaktivní', 'watch'),
      opt('collapsed', 'Skoro se nehne / kolabuje', 'emergency', 'collapse'),
    ],
  },
  {
    id: 'activity',
    section: 'current',
    label: 'Aktivita a energie',
    species: ['cat'],
    options: [
      opt('normal', 'Normální, jako obvykle', 'ok'),
      opt('slightly_low', 'Méně hraje / více spí', 'watch'),
      opt('low', 'Schovaný, téměř bez aktivity', 'concern', 'lethargy'),
      opt('hyper', 'Neobvykle neklidný', 'watch'),
      opt('collapsed', 'Leží bez reakce / kolabuje', 'emergency', 'collapse'),
    ],
  },
  {
    id: 'appetite',
    section: 'current',
    label: 'Chuť k jídlu',
    options: [
      opt('normal', 'Normální', 'ok'),
      opt('slightly_low', 'Trochu menší chuť', 'watch'),
      opt('none', 'Nežere vůbec (více než 24 h)', 'urgent', 'anorexia'),
      opt('increased', 'Výrazně zvýšená chuť', 'watch'),
    ],
  },
  {
    id: 'water',
    section: 'current',
    label: 'Příjem vody',
    options: [
      opt('normal', 'Normální', 'ok'),
      opt('increased', 'Pije výrazně více', 'concern', 'polydipsia'),
      opt('decreased', 'Pije méně', 'watch'),
      opt('none', 'Skoro nepije', 'urgent', 'dehydration_risk'),
    ],
  },
  {
    id: 'stool',
    section: 'current',
    label: 'Stolice',
    species: ['dog'],
    options: [
      opt('normal', 'Normální', 'ok'),
      opt('soft', 'Měkká / mírný průjem', 'watch'),
      opt('diarrhea', 'Silný průjem', 'concern', 'diarrhea'),
      opt('blood', 'S krví nebo černá', 'urgent', 'gi_bleed'),
      opt('constipation', 'Zácpa / žádná stolice', 'concern'),
    ],
  },
  {
    id: 'stool',
    section: 'current',
    label: 'Stolice (včetně litter boxu)',
    species: ['cat'],
    options: [
      opt('normal', 'Normální', 'ok'),
      opt('soft', 'Měkká / mírný průjem', 'watch'),
      opt('diarrhea', 'Silný průjem', 'concern', 'diarrhea'),
      opt('blood', 'S krví nebo černá', 'urgent', 'gi_bleed'),
      opt('constipation', 'Nechodí na stolici / zácpa', 'concern', 'cat_constipation'),
      opt('outside_box', 'Mimo toaletu', 'watch'),
    ],
  },
  {
    id: 'urination',
    section: 'current',
    label: 'Močení',
    species: ['dog'],
    options: [
      opt('normal', 'Normální', 'ok'),
      opt('frequent', 'Častější / více močí', 'watch'),
      opt('straining', 'Tlačí / bolestivé', 'urgent', 'urinary'),
      opt('blood', 'Krev v moči', 'urgent', 'urinary'),
      opt('none', 'Nemůže se vymočit', 'emergency', 'urinary_block'),
    ],
  },
  {
    id: 'urination',
    section: 'current',
    label: 'Močení (toaleta)',
    species: ['cat'],
    options: [
      opt('normal', 'Normální', 'ok'),
      opt('frequent', 'Často chodí na toaletu', 'concern', 'urinary'),
      opt('straining', 'Tlačí, ale téměř nic', 'emergency', 'urinary_block'),
      opt('blood', 'Krev v moči / růžová podestýlka', 'urgent', 'urinary'),
      opt('outside_box', 'Močí mimo toaletu', 'watch'),
      opt('none', 'Vůbec nemočí', 'emergency', 'urinary_block'),
    ],
  },
  {
    id: 'vomiting',
    section: 'current',
    label: 'Zvracení',
    species: ['dog'],
    options: [
      opt('none', 'Nezvrací', 'ok'),
      opt('once', 'Jednou / výjimečně', 'watch'),
      opt('repeated', 'Opakovaně během dne', 'urgent', 'vomiting'),
      opt('blood', 'Se krví / jako kávová sedlina', 'emergency', 'gi_bleed'),
    ],
  },
  {
    id: 'vomiting',
    section: 'current',
    label: 'Zvracení / vykašlávání chuchvalců',
    species: ['cat'],
    options: [
      opt('none', 'Nezvrací', 'ok'),
      opt('hairball', 'Občas chuchvalec srsti', 'ok'),
      opt('once', 'Jednou / výjimečně', 'watch'),
      opt('repeated', 'Opakovaně během dne', 'urgent', 'vomiting'),
      opt('blood', 'Se krví', 'emergency', 'gi_bleed'),
    ],
  },
  {
    id: 'breathing',
    section: 'current',
    label: 'Dýchání',
    options: [
      opt('normal', 'Klidné, pravidelné', 'ok'),
      opt('fast', 'Zrychlené v klidu', 'concern', 'breathing'),
      opt('labored', 'Namáhavé / otevřená tlama', 'emergency', 'breathing'),
      opt('cough', 'Kašel / sípání', 'concern', 'breathing'),
    ],
  },
  {
    id: 'pain',
    section: 'current',
    label: 'Známky bolesti',
    options: [
      opt('none', 'Nejsou patrné', 'ok'),
      opt('mild', 'Mírné (např. citlivost při doteku)', 'watch'),
      opt('moderate', 'Výrazné (kňučení, agresivita při doteku)', 'urgent', 'pain'),
      opt('severe', 'Silná bolest / strach se hýbat', 'emergency', 'pain'),
    ],
  },
  {
    id: 'mobility',
    section: 'current',
    label: 'Pohyb',
    species: ['dog'],
    options: [
      opt('normal', 'Normální chůze a běh', 'ok'),
      opt('stiff', 'Ztuhlost / opatrná chůze', 'watch'),
      opt('limp', 'Kulhání', 'concern', 'lameness'),
      opt('unable', 'Nemůže vstát / chodit', 'emergency', 'collapse'),
    ],
  },
  {
    id: 'mobility',
    section: 'current',
    label: 'Pohyb (skoky, chůze)',
    species: ['cat'],
    options: [
      opt('normal', 'Normální pohyb a skoky', 'ok'),
      opt('stiff', 'Opatrnější / méně skáče', 'watch'),
      opt('limp', 'Kulhání nebo nepoužívá nohu', 'concern', 'lameness'),
      opt('unable', 'Nemůže chodit / skákat', 'emergency', 'collapse'),
    ],
  },

  // —— Body ——
  {
    id: 'weight_change',
    section: 'body',
    label: 'Změna hmotnosti',
    options: [
      opt('stable', 'Stabilní', 'ok'),
      opt('gain', 'Přibral/a', 'watch'),
      opt('loss_mild', 'Mírný úbytek', 'watch'),
      opt('loss_rapid', 'Rychlý úbytek bez diety', 'concern', 'weight_loss'),
    ],
  },
  {
    id: 'body_condition',
    section: 'body',
    label: 'Tělesná kondice',
    options: [
      opt('ideal', 'Ideální (žebra cítit, nevidět ostře)', 'ok'),
      opt('under', 'Příliš hubený/á', 'concern'),
      opt('over', 'Nadváha', 'watch'),
      opt('obese', 'Obézní', 'concern'),
    ],
  },

  // —— External ——
  {
    id: 'eyes',
    section: 'external',
    label: 'Oči',
    options: [
      opt('normal', 'Čisté, bez výtoku', 'ok'),
      opt('discharge', 'Výtok / slepené', 'watch'),
      opt('red', 'Zarudlé / bolestivé', 'concern', 'eyes'),
      opt('closed', 'Zavřené / silná bolest', 'urgent', 'eyes'),
    ],
  },
  {
    id: 'ears',
    section: 'external',
    label: 'Uši',
    options: [
      opt('normal', 'Čisté, bez zápachu', 'ok'),
      opt('dirty', 'Špína / mírný zápach', 'watch'),
      opt('infected', 'Zarudlé, bolestivé, silný zápach', 'concern', 'ears'),
      opt('head_tilt', 'Nakloněná hlava / točení', 'urgent', 'ears'),
    ],
  },
  {
    id: 'mouth',
    section: 'external',
    label: 'Zuby / dutina ústní',
    options: [
      opt('normal', 'Bez výrazných potíží', 'ok'),
      opt('tartar', 'Zubní kámen / zápach', 'watch'),
      opt('pain', 'Nechce žvýkat / bolest tlamy', 'concern', 'dental'),
      opt('bleeding', 'Krvácení dásní / zlomený zub', 'urgent', 'dental'),
    ],
  },
  {
    id: 'skin',
    section: 'external',
    label: 'Kůže',
    options: [
      opt('normal', 'Bez problémů', 'ok'),
      opt('itch', 'Škrábání / zarudnutí', 'watch'),
      opt('rash', 'Vyrážka / hnis', 'concern', 'skin'),
      opt('wounds', 'Otevřené rány', 'urgent', 'wounds'),
    ],
  },
  {
    id: 'coat',
    section: 'external',
    label: 'Srst',
    options: [
      opt('normal', 'Lesklá / obvyklá', 'ok'),
      opt('dull', 'Matná / řídká', 'watch'),
      opt('hairloss', 'Výrazná ztráta srsti', 'concern'),
    ],
  },
  {
    id: 'lumps',
    section: 'external',
    label: 'Neobvyklé boule, rány nebo jiné změny',
    options: [
      opt('none', 'Nic nového', 'ok'),
      opt('known_stable', 'Známá boule, stabilní', 'watch'),
      opt('new', 'Nová boule / změna velikosti', 'concern', 'lump'),
      opt('open', 'Otevřená rána / krvácení', 'urgent', 'wounds'),
    ],
  },

  // —— Behavior ——
  {
    id: 'behavior_change',
    section: 'behavior',
    label: 'Neobvyklá změna chování',
    options: [
      opt('none', 'Bez změny', 'ok'),
      opt('mild', 'Mírná změna', 'watch'),
      opt('strong', 'Výrazná změna osobnosti', 'concern', 'behavior'),
    ],
  },
  {
    id: 'anxiety',
    section: 'behavior',
    label: 'Strach / úzkost',
    options: [
      opt('none', 'Ne', 'ok'),
      opt('mild', 'Mírně', 'watch'),
      opt('strong', 'Silný strach / panika', 'concern'),
    ],
  },
  {
    id: 'apathy',
    section: 'behavior',
    label: 'Apatie',
    options: [
      opt('none', 'Ne', 'ok'),
      opt('mild', 'Trochu apatický/á', 'watch'),
      opt('strong', 'Nezajímá se o okolí', 'concern', 'lethargy'),
    ],
  },
  {
    id: 'restlessness',
    section: 'behavior',
    label: 'Neobvyklý neklid',
    options: [
      opt('none', 'Ne', 'ok'),
      opt('mild', 'Mírný neklid', 'watch'),
      opt('strong', 'Silný neklid / neschopnost se uklidnit', 'concern'),
    ],
  },
  {
    id: 'activity_change',
    section: 'behavior',
    label: 'Změna běžné aktivity',
    options: [
      opt('none', 'Stejná jako obvykle', 'ok'),
      opt('less', 'Méně aktivní', 'watch'),
      opt('more', 'Neobvykle aktivnější', 'watch'),
      opt('stopped', 'Přestal/a o aktivity úplně', 'concern', 'lethargy'),
    ],
  },

  // —— Known issues ——
  {
    id: 'diagnosed_disease',
    section: 'known',
    label: 'Diagnostikované onemocnění',
    options: [
      opt('none', 'Žádné známé', 'ok'),
      opt('stable', 'Ano, stabilní / pod kontrolou', 'watch', 'chronic'),
      opt('unstable', 'Ano, aktuálně se zhoršuje', 'concern', 'chronic_flare'),
    ],
  },
  {
    id: 'allergies',
    section: 'known',
    label: 'Alergie',
    options: [
      opt('none', 'Neznámé / žádné', 'ok'),
      opt('known', 'Známé, bez aktuálních potíží', 'ok'),
      opt('flare', 'Aktuální alergická reakce', 'concern', 'allergy'),
      opt('anaphylaxis', 'Dušnost / otok tlamy / kolaps', 'emergency', 'allergy_severe'),
    ],
  },
  {
    id: 'long_term_treatment',
    section: 'known',
    label: 'Dlouhodobá léčba',
    options: [
      opt('none', 'Ne', 'ok'),
      opt('yes', 'Ano', 'watch', 'chronic'),
    ],
  },
  {
    id: 'active_meds',
    section: 'known',
    label: 'Aktivní léky',
    options: [
      opt('none', 'Neužívá', 'ok'),
      opt('yes', 'Ano, dle předpisu', 'ok'),
      opt('missed', 'Ano, ale vynechává dávky', 'watch'),
      opt('side_effects', 'Možné nežádoucí účinky', 'concern'),
    ],
  },
  {
    id: 'surgeries',
    section: 'known',
    label: 'Prodělané operace / zákroky',
    options: [
      opt('none', 'Žádné relevantní', 'ok'),
      opt('old', 'Ano, dávno a bez potíží', 'ok'),
      opt('recent', 'Nedávno (do 2 týdnů)', 'watch', 'post_op'),
      opt('complication', 'Nedávno s komplikacemi', 'urgent', 'post_op'),
    ],
  },

  // —— Prevention ——
  {
    id: 'vaccination_status',
    section: 'prevention',
    label: 'Očkování',
    options: [
      opt('up_to_date', 'Aktuální', 'ok'),
      opt('due_soon', 'Brzy vyprší / naplánováno', 'watch'),
      opt('overdue', 'Po termínu / neznámé', 'watch', 'prevention_gap'),
    ],
  },
  {
    id: 'parasite_prevention',
    section: 'prevention',
    label: 'Antiparazitní ochrana',
    options: [
      opt('regular', 'Pravidelná', 'ok'),
      opt('irregular', 'Nepravidelná', 'watch'),
      opt('none', 'Bez ochrany', 'watch', 'prevention_gap'),
    ],
  },
  {
    id: 'last_vet_check',
    section: 'prevention',
    label: 'Poslední veterinární kontrola',
    options: [
      opt('recent', 'Do 12 měsíců', 'ok'),
      opt('old', 'Více než rok', 'watch', 'prevention_gap'),
      opt('unknown', 'Nevím / dlouho nebyl/a', 'watch', 'prevention_gap'),
    ],
  },
  {
    id: 'dental_care',
    section: 'prevention',
    label: 'Dentální péče',
    options: [
      opt('ok', 'V pořádku / pravidelná', 'ok'),
      opt('needed', 'Potřebuje kontrolu / čištění', 'watch'),
      opt('problem', 'Aktuální problémy s tlamou', 'concern', 'dental'),
    ],
  },
]

export function getQuestionsForSpecies(type: PetType): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS.filter(
    (q) => !q.species || q.species.includes(type),
  )
}

export function findQuestionOption(
  question: AssessmentQuestion,
  value: string | undefined,
): AssessmentOption | undefined {
  if (!value) return undefined
  return question.options.find((o) => o.value === value)
}
