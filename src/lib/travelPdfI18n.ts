import type {
  Pet,
  PetTravelPackage,
  TravelDestination,
  TravelRequirementCheck,
} from '../types'
import { BRAND_NAME } from './brand'

export type TravelPdfLocale =
  | 'de'
  | 'pl'
  | 'sk'
  | 'hu'
  | 'hr'
  | 'sl'
  | 'it'
  | 'fr'
  | 'es'
  | 'pt'
  | 'el'
  | 'nl'
  | 'fi'
  | 'en'

const DESTINATION_LOCALE: Record<string, TravelPdfLocale> = {
  de: 'de',
  at: 'de',
  sk: 'sk',
  pl: 'pl',
  hu: 'hu',
  hr: 'hr',
  si: 'sl',
  it: 'it',
  fr: 'fr',
  es: 'es',
  pt: 'pt',
  gr: 'el',
  nl: 'nl',
  be: 'nl',
  fi: 'fi',
  ie: 'en',
  mt: 'en',
  gb: 'en',
  us: 'en',
}

const LOCALE_BCP47: Record<TravelPdfLocale, string> = {
  de: 'de-DE',
  pl: 'pl-PL',
  sk: 'sk-SK',
  hu: 'hu-HU',
  hr: 'hr-HR',
  sl: 'sl-SI',
  it: 'it-IT',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  el: 'el-GR',
  nl: 'nl-NL',
  fi: 'fi-FI',
  en: 'en-GB',
}

type UiStrings = {
  travelPackTitle: string
  destinationPrefix: string
  ready: string
  almostReady: string
  needsWork: string
  statusReady: string
  statusAttention: string
  statusMissing: string
  euPassport: string
  vaccination: string
  microchip: string
  healthRecords: string
  validUntil: string
  nextDue: string
  registeredIn: string
  clinicalRecords: string
  lastVisit: string
  requirementsFor: string
  documentsInPack: string
  footerSummary: string
  generatedPrefix: string
  shareTitle: string
  sharePet: string
  shareDestination: string
  shareStatus: string
  shareDocuments: string
  passportValid: string
  passportExpiring: string
  passportMissing: string
  chipMissing: string
  tapewormHint: string
  parasiteHint: string
  healthCertReady: string
  healthCertMissing: string
  insuranceReady: string
  insuranceAttention: string
  importPermitHint: string
  dash: string
}

const UI: Record<TravelPdfLocale, UiStrings> = {
  de: {
    travelPackTitle: 'REISEPAKET',
    destinationPrefix: 'Ziel:',
    ready: 'Reisefertig',
    almostReady: 'Fast bereit',
    needsWork: 'Anforderungen ergänzen',
    statusReady: 'Erfüllt',
    statusAttention: 'Zu ergänzen',
    statusMissing: 'Fehlt',
    euPassport: 'EU-AUSWEIS',
    vaccination: 'IMPFUNGEN',
    microchip: 'CHIP',
    healthRecords: 'GESUNDHEITSAKTEN',
    validUntil: 'Gültig bis',
    nextDue: 'Nächster Termin:',
    registeredIn: 'Registriert in',
    clinicalRecords: 'klinische Einträge',
    lastVisit: 'Letzter Besuch:',
    requirementsFor: 'ANFORDERUNGEN FÜR',
    documentsInPack: 'DOKUMENTE IM PAKET',
    footerSummary: 'Zusammenfassung der Reisedokumente ·',
    generatedPrefix: 'Erstellt',
    shareTitle: 'Reisepaket',
    sharePet: 'Tier:',
    shareDestination: 'Reiseziel:',
    shareStatus: 'Status:',
    shareDocuments: 'Dokumente:',
    passportValid: 'Gültig bis',
    passportExpiring: 'Gültigkeit endet',
    passportMissing: 'EU-Ausweis fehlt oder ist abgelaufen',
    chipMissing: 'Chip ist nicht im System erfasst',
    tapewormHint: 'Behandlung vor der Einreise beim Tierarzt erforderlich',
    parasiteHint: 'Vor der Reise beim Tierarzt empfohlen',
    healthCertReady: 'Gesundheitsübersicht ist im Paket',
    healthCertMissing: 'Offizielles Zertifikat vom Tierarzt erforderlich',
    insuranceReady: 'Versicherung ist Teil des Pakets',
    insuranceAttention: 'Vor der Reise empfohlen zu ergänzen',
    importPermitHint: 'Vor Abflug online zu beantragen',
    dash: '—',
  },
  pl: {
    travelPackTitle: 'PAKIET PODRÓŻNY',
    destinationPrefix: 'Cel:',
    ready: 'Gotowy do podróży',
    almostReady: 'Prawie gotowy',
    needsWork: 'Uzupełnij wymagania',
    statusReady: 'Spełnione',
    statusAttention: 'Do uzupełnienia',
    statusMissing: 'Brakuje',
    euPassport: 'PASZPORT UE',
    vaccination: 'SZCZEPIENIA',
    microchip: 'CHIP',
    healthRecords: 'DOKUMENTACJA MEDYCZNA',
    validUntil: 'Ważny do',
    nextDue: 'Następny termin:',
    registeredIn: 'Zarejestrowany w systemie',
    clinicalRecords: 'wpisów klinicznych',
    lastVisit: 'Ostatnia wizyta:',
    requirementsFor: 'WYMAGANIA DLA',
    documentsInPack: 'DOKUMENTY W PAKIECIE',
    footerSummary: 'Podsumowanie dokumentów podróżnych ·',
    generatedPrefix: 'Wygenerowano',
    shareTitle: 'Pakiet podróżny',
    sharePet: 'Zwierzę:',
    shareDestination: 'Destynacja:',
    shareStatus: 'Status:',
    shareDocuments: 'Dokumenty:',
    passportValid: 'Ważny do',
    passportExpiring: 'Ważność kończy się',
    passportMissing: 'Brak paszportu UE lub wygasł',
    chipMissing: 'Chip nie jest zapisany w systemie',
    tapewormHint: 'Wymagane leczenie u weterynarza przed wjazdem',
    parasiteHint: 'Zalecane przed podróżą u weterynarza',
    healthCertReady: 'Podsumowanie zdrowia jest w pakiecie',
    healthCertMissing: 'Wymagany oficjalny certyfikat od weterynarza',
    insuranceReady: 'Ubezpieczenie jest częścią pakietu',
    insuranceAttention: 'Zalecane uzupełnienie przed podróżą',
    importPermitHint: 'Należy załatwić online przed wylotem',
    dash: '—',
  },
  sk: {
    travelPackTitle: 'CESTOVNÝ BALÍČEK',
    destinationPrefix: 'Cieľ:',
    ready: 'Pripravené na cestu',
    almostReady: 'Takmer pripravené',
    needsWork: 'Doplniť požiadavky',
    statusReady: 'Splnené',
    statusAttention: 'Doplniť',
    statusMissing: 'Chýba',
    euPassport: 'EÚ PAS',
    vaccination: 'OČKOVANIE',
    microchip: 'ČIP',
    healthRecords: 'ZDRAVOTNÉ ZÁZNAMY',
    validUntil: 'Platnosť do',
    nextDue: 'Ďalší termín:',
    registeredIn: 'Registrovaný v systéme',
    clinicalRecords: 'klinických záznamov',
    lastVisit: 'Posledná návšteva:',
    requirementsFor: 'POŽIADAVKY PRE',
    documentsInPack: 'DOKUMENTY V BALÍČKU',
    footerSummary: 'Súhrn cestovných dokumentov ·',
    generatedPrefix: 'Vygenerované',
    shareTitle: 'Cestovný balíček',
    sharePet: 'Maznáčik:',
    shareDestination: 'Destinácia:',
    shareStatus: 'Stav:',
    shareDocuments: 'Dokumenty:',
    passportValid: 'Platný do',
    passportExpiring: 'Platnosť končí',
    passportMissing: 'EÚ pas chýba alebo expiroval',
    chipMissing: 'Čip nie je zapísaný v systéme',
    tapewormHint: 'Nutné ošetrenie u veterinára pred vstupom',
    parasiteHint: 'Odporúčané zabezpečiť pred cestou u veterinára',
    healthCertReady: 'Zdravotný súhrn je v balíčku',
    healthCertMissing: 'Vyžaduje sa oficiálny certifikát od veterinára',
    insuranceReady: 'Poistenie je súčasťou balíčka',
    insuranceAttention: 'Odporúčané doplniť pred cestou',
    importPermitHint: 'Nutné vybaviť online pred odletom',
    dash: '—',
  },
  hu: {
    travelPackTitle: 'UTAZÁSI CSOMAG',
    destinationPrefix: 'Cél:',
    ready: 'Utazásra kész',
    almostReady: 'Majdnem kész',
    needsWork: 'Követelmények pótlása',
    statusReady: 'Teljesítve',
    statusAttention: 'Kiegészítendő',
    statusMissing: 'Hiányzik',
    euPassport: 'EU ÚTLEVÉL',
    vaccination: 'OLTÁSOK',
    microchip: 'CHIP',
    healthRecords: 'EGÉSZSÉGÜGYI NYILVÁNTARTÁS',
    validUntil: 'Érvényes:',
    nextDue: 'Következő időpont:',
    registeredIn: 'Regisztrálva a rendszerben:',
    clinicalRecords: 'klinikai bejegyzés',
    lastVisit: 'Utolsó látogatás:',
    requirementsFor: 'KÖVETELMÉNYEK:',
    documentsInPack: 'DOKUMENTUMOK A CSOMAGBAN',
    footerSummary: 'Utazási dokumentumok összefoglalója ·',
    generatedPrefix: 'Létrehozva',
    shareTitle: 'Utazási csomag',
    sharePet: 'Kisállat:',
    shareDestination: 'Úticél:',
    shareStatus: 'Állapot:',
    shareDocuments: 'Dokumentumok:',
    passportValid: 'Érvényes:',
    passportExpiring: 'Érvényesség vége:',
    passportMissing: 'Az EU útlevél hiányzik vagy lejárt',
    chipMissing: 'A chip nincs rögzítve a rendszerben',
    tapewormHint: 'Belépés előtt állatorvosi kezelés szükséges',
    parasiteHint: 'Utazás előtt ajánlott állatorvosnál',
    healthCertReady: 'Az egészségügyi összefoglaló a csomagban van',
    healthCertMissing: 'Hivatalos állatorvosi igazolás szükséges',
    insuranceReady: 'A biztosítás része a csomagnak',
    insuranceAttention: 'Utazás előtt ajánlott kiegészíteni',
    importPermitHint: 'Indulás előtt online intézendő',
    dash: '—',
  },
  hr: {
    travelPackTitle: 'PUTNI PAKET',
    destinationPrefix: 'Odredište:',
    ready: 'Spremno za put',
    almostReady: 'Gotovo spremno',
    needsWork: 'Dopuniti zahtjeve',
    statusReady: 'Ispunjeno',
    statusAttention: 'Za dopunu',
    statusMissing: 'Nedostaje',
    euPassport: 'EU PUTOVNICA',
    vaccination: 'CJEPIVA',
    microchip: 'ČIP',
    healthRecords: 'ZDRAVSTVENI ZAPISI',
    validUntil: 'Vrijedi do',
    nextDue: 'Sljedeći termin:',
    registeredIn: 'Registrirano u sustavu',
    clinicalRecords: 'kliničkih zapisa',
    lastVisit: 'Posljednji posjet:',
    requirementsFor: 'ZAHTJEVI ZA',
    documentsInPack: 'DOKUMENTI U PAKETU',
    footerSummary: 'Sažetak putnih dokumenata ·',
    generatedPrefix: 'Generirano',
    shareTitle: 'Putni paket',
    sharePet: 'Ljubimac:',
    shareDestination: 'Destinacija:',
    shareStatus: 'Status:',
    shareDocuments: 'Dokumenti:',
    passportValid: 'Vrijedi do',
    passportExpiring: 'Važenje istječe',
    passportMissing: 'EU putovnica nedostaje ili je istekla',
    chipMissing: 'Čip nije upisan u sustav',
    tapewormHint: 'Potrebno liječenje kod veterinara prije ulaska',
    parasiteHint: 'Preporučeno prije puta kod veterinara',
    healthCertReady: 'Zdravstveni sažetak je u paketu',
    healthCertMissing: 'Potreban je službeni veterinarski certifikat',
    insuranceReady: 'Osiguranje je dio paketa',
    insuranceAttention: 'Preporučeno dopuniti prije puta',
    importPermitHint: 'Potrebno riješiti online prije polaska',
    dash: '—',
  },
  sl: {
    travelPackTitle: 'POTOVALNI PAKET',
    destinationPrefix: 'Cilj:',
    ready: 'Pripravljeno za potovanje',
    almostReady: 'Skoraj pripravljeno',
    needsWork: 'Dopolniti zahteve',
    statusReady: 'Izpolnjeno',
    statusAttention: 'Za dopolnitev',
    statusMissing: 'Manjka',
    euPassport: 'EU POTNI LIST',
    vaccination: 'CEPLJENJE',
    microchip: 'ČIP',
    healthRecords: 'ZDRAVSTVENI ZAPISI',
    validUntil: 'Velja do',
    nextDue: 'Naslednji termin:',
    registeredIn: 'Registrirano v sistemu',
    clinicalRecords: 'kliničnih zapisov',
    lastVisit: 'Zadnji obisk:',
    requirementsFor: 'ZAHTEVE ZA',
    documentsInPack: 'DOKUMENTI V PAKETU',
    footerSummary: 'Povzetek potovalnih dokumentov ·',
    generatedPrefix: 'Ustvarjeno',
    shareTitle: 'Potovalni paket',
    sharePet: 'Ljubljenček:',
    shareDestination: 'Destinacija:',
    shareStatus: 'Stanje:',
    shareDocuments: 'Dokumenti:',
    passportValid: 'Velja do',
    passportExpiring: 'Veljavnost poteče',
    passportMissing: 'EU potni list manjka ali je potekel',
    chipMissing: 'Čip ni vpisan v sistem',
    tapewormHint: 'Pred vstopom potrebno zdravljenje pri veterinarju',
    parasiteHint: 'Priporočeno pred potovanjem pri veterinarju',
    healthCertReady: 'Zdravstveni povzetek je v paketu',
    healthCertMissing: 'Zahtevan je uradni veterinarski certifikat',
    insuranceReady: 'Zavarovanje je del paketa',
    insuranceAttention: 'Priporočeno dopolniti pred potovanjem',
    importPermitHint: 'Potrebno urediti spletno pred odhodom',
    dash: '—',
  },
  it: {
    travelPackTitle: 'PACCHETTO DI VIAGGIO',
    destinationPrefix: 'Destinazione:',
    ready: 'Pronto per il viaggio',
    almostReady: 'Quasi pronto',
    needsWork: 'Completare i requisiti',
    statusReady: 'Soddisfatto',
    statusAttention: 'Da integrare',
    statusMissing: 'Mancante',
    euPassport: 'PASSAPORTO UE',
    vaccination: 'VACCINAZIONI',
    microchip: 'MICROCHIP',
    healthRecords: 'CARTELLA CLINICA',
    validUntil: 'Valido fino al',
    nextDue: 'Prossima scadenza:',
    registeredIn: 'Registrato nel sistema',
    clinicalRecords: 'referti clinici',
    lastVisit: 'Ultima visita:',
    requirementsFor: 'REQUISITI PER',
    documentsInPack: 'DOCUMENTI NEL PACCHETTO',
    footerSummary: 'Riepilogo documenti di viaggio ·',
    generatedPrefix: 'Generato',
    shareTitle: 'Pacchetto di viaggio',
    sharePet: 'Animale:',
    shareDestination: 'Destinazione:',
    shareStatus: 'Stato:',
    shareDocuments: 'Documenti:',
    passportValid: 'Valido fino al',
    passportExpiring: 'Scade il',
    passportMissing: 'Passaporto UE mancante o scaduto',
    chipMissing: 'Microchip non registrato nel sistema',
    tapewormHint: 'Trattamento obbligatorio dal veterinario prima dell’ingresso',
    parasiteHint: 'Consigliato prima del viaggio dal veterinario',
    healthCertReady: 'Riepilogo sanitario presente nel pacchetto',
    healthCertMissing: 'È richiesto un certificato ufficiale del veterinario',
    insuranceReady: 'L’assicurazione è inclusa nel pacchetto',
    insuranceAttention: 'Consigliato completare prima del viaggio',
    importPermitHint: 'Da richiedere online prima della partenza',
    dash: '—',
  },
  fr: {
    travelPackTitle: 'PACK DE VOYAGE',
    destinationPrefix: 'Destination :',
    ready: 'Prêt à voyager',
    almostReady: 'Presque prêt',
    needsWork: 'Compléter les exigences',
    statusReady: 'Conforme',
    statusAttention: 'À compléter',
    statusMissing: 'Manquant',
    euPassport: 'PASSEPORT UE',
    vaccination: 'VACCINS',
    microchip: 'PUCE',
    healthRecords: 'DOSSIER MÉDICAL',
    validUntil: 'Valable jusqu’au',
    nextDue: 'Prochaine échéance :',
    registeredIn: 'Enregistré dans le système',
    clinicalRecords: 'dossiers cliniques',
    lastVisit: 'Dernière visite :',
    requirementsFor: 'EXIGENCES POUR',
    documentsInPack: 'DOCUMENTS DU PACK',
    footerSummary: 'Résumé des documents de voyage ·',
    generatedPrefix: 'Généré le',
    shareTitle: 'Pack de voyage',
    sharePet: 'Animal :',
    shareDestination: 'Destination :',
    shareStatus: 'Statut :',
    shareDocuments: 'Documents :',
    passportValid: 'Valable jusqu’au',
    passportExpiring: 'Expire le',
    passportMissing: 'Passeport UE manquant ou expiré',
    chipMissing: 'Puce non enregistrée dans le système',
    tapewormHint: 'Traitement requis chez le vétérinaire avant l’entrée',
    parasiteHint: 'Recommandé avant le voyage chez le vétérinaire',
    healthCertReady: 'Résumé de santé inclus dans le pack',
    healthCertMissing: 'Certificat officiel du vétérinaire requis',
    insuranceReady: 'Assurance incluse dans le pack',
    insuranceAttention: 'Recommandé de compléter avant le voyage',
    importPermitHint: 'À obtenir en ligne avant le départ',
    dash: '—',
  },
  es: {
    travelPackTitle: 'PAQUETE DE VIAJE',
    destinationPrefix: 'Destino:',
    ready: 'Listo para viajar',
    almostReady: 'Casi listo',
    needsWork: 'Completar requisitos',
    statusReady: 'Cumplido',
    statusAttention: 'Por completar',
    statusMissing: 'Falta',
    euPassport: 'PASAPORTE UE',
    vaccination: 'VACUNAS',
    microchip: 'CHIP',
    healthRecords: 'HISTORIAL MÉDICO',
    validUntil: 'Válido hasta',
    nextDue: 'Próxima fecha:',
    registeredIn: 'Registrado en el sistema',
    clinicalRecords: 'registros clínicos',
    lastVisit: 'Última visita:',
    requirementsFor: 'REQUISITOS PARA',
    documentsInPack: 'DOCUMENTOS DEL PAQUETE',
    footerSummary: 'Resumen de documentos de viaje ·',
    generatedPrefix: 'Generado',
    shareTitle: 'Paquete de viaje',
    sharePet: 'Mascota:',
    shareDestination: 'Destino:',
    shareStatus: 'Estado:',
    shareDocuments: 'Documentos:',
    passportValid: 'Válido hasta',
    passportExpiring: 'Caduca el',
    passportMissing: 'Falta el pasaporte UE o está caducado',
    chipMissing: 'El chip no está registrado en el sistema',
    tapewormHint: 'Tratamiento obligatorio con el veterinario antes de la entrada',
    parasiteHint: 'Recomendado antes del viaje con el veterinario',
    healthCertReady: 'El resumen de salud está en el paquete',
    healthCertMissing: 'Se requiere un certificado oficial del veterinario',
    insuranceReady: 'El seguro forma parte del paquete',
    insuranceAttention: 'Se recomienda completar antes del viaje',
    importPermitHint: 'Debe tramitarse en línea antes de la salida',
    dash: '—',
  },
  pt: {
    travelPackTitle: 'PACOTE DE VIAGEM',
    destinationPrefix: 'Destino:',
    ready: 'Pronto para viajar',
    almostReady: 'Quase pronto',
    needsWork: 'Completar requisitos',
    statusReady: 'Cumprido',
    statusAttention: 'A completar',
    statusMissing: 'Em falta',
    euPassport: 'PASSAPORTE UE',
    vaccination: 'VACINAÇÃO',
    microchip: 'CHIP',
    healthRecords: 'REGISTOS DE SAÚDE',
    validUntil: 'Válido até',
    nextDue: 'Próxima data:',
    registeredIn: 'Registado no sistema',
    clinicalRecords: 'registos clínicos',
    lastVisit: 'Última visita:',
    requirementsFor: 'REQUISITOS PARA',
    documentsInPack: 'DOCUMENTOS NO PACOTE',
    footerSummary: 'Resumo dos documentos de viagem ·',
    generatedPrefix: 'Gerado',
    shareTitle: 'Pacote de viagem',
    sharePet: 'Animal:',
    shareDestination: 'Destino:',
    shareStatus: 'Estado:',
    shareDocuments: 'Documentos:',
    passportValid: 'Válido até',
    passportExpiring: 'Validade termina',
    passportMissing: 'Passaporte UE em falta ou expirado',
    chipMissing: 'Chip não registado no sistema',
    tapewormHint: 'Tratamento obrigatório no veterinário antes da entrada',
    parasiteHint: 'Recomendado antes da viagem no veterinário',
    healthCertReady: 'Resumo de saúde incluído no pacote',
    healthCertMissing: 'É necessário um certificado oficial do veterinário',
    insuranceReady: 'O seguro faz parte do pacote',
    insuranceAttention: 'Recomendado completar antes da viagem',
    importPermitHint: 'Deve ser tratado online antes da partida',
    dash: '—',
  },
  el: {
    travelPackTitle: 'ΤΑΞΙΔΙΩΤΙΚΟ ΠΑΚΕΤΟ',
    destinationPrefix: 'Προορισμός:',
    ready: 'Έτοιμο για ταξίδι',
    almostReady: 'Σχεδόν έτοιμο',
    needsWork: 'Συμπληρώστε τις απαιτήσεις',
    statusReady: 'Ολοκληρώθηκε',
    statusAttention: 'Προς συμπλήρωση',
    statusMissing: 'Λείπει',
    euPassport: 'ΔΙΑΒΑΤΗΡΙΟ ΕΕ',
    vaccination: 'ΕΜΒΟΛΙΑΣΜΟΙ',
    microchip: 'ΤΣΙΠ',
    healthRecords: 'ΙΑΤΡΙΚΟ ΙΣΤΟΡΙΚΟ',
    validUntil: 'Ισχύει έως',
    nextDue: 'Επόμενη ημερομηνία:',
    registeredIn: 'Καταχωρημένο στο σύστημα',
    clinicalRecords: 'κλινικές καταγραφές',
    lastVisit: 'Τελευταία επίσκεψη:',
    requirementsFor: 'ΑΠΑΙΤΗΣΕΙΣ ΓΙΑ',
    documentsInPack: 'ΕΓΓΡΑΦΑ ΣΤΟ ΠΑΚΕΤΟ',
    footerSummary: 'Σύνοψη ταξιδιωτικών εγγράφων ·',
    generatedPrefix: 'Δημιουργήθηκε',
    shareTitle: 'Ταξιδιωτικό πακέτο',
    sharePet: 'Κατοικίδιο:',
    shareDestination: 'Προορισμός:',
    shareStatus: 'Κατάσταση:',
    shareDocuments: 'Έγγραφα:',
    passportValid: 'Ισχύει έως',
    passportExpiring: 'Λήγει στις',
    passportMissing: 'Το διαβατήριο ΕΕ λείπει ή έχει λήξει',
    chipMissing: 'Το τσιπ δεν είναι καταχωρημένο στο σύστημα',
    tapewormHint: 'Απαιτείται θεραπεία από κτηνίατρο πριν την είσοδο',
    parasiteHint: 'Συνιστάται πριν το ταξίδι από κτηνίατρο',
    healthCertReady: 'Η σύνοψη υγείας είναι στο πακέτο',
    healthCertMissing: 'Απαιτείται επίσημο πιστοποιητικό κτηνιάτρου',
    insuranceReady: 'Η ασφάλεια περιλαμβάνεται στο πακέτο',
    insuranceAttention: 'Συνιστάται συμπλήρωση πριν το ταξίδι',
    importPermitHint: 'Πρέπει να διεκπεραιωθεί online πριν την αναχώρηση',
    dash: '—',
  },
  nl: {
    travelPackTitle: 'REISPAKKET',
    destinationPrefix: 'Bestemming:',
    ready: 'Klaar om te reizen',
    almostReady: 'Bijna klaar',
    needsWork: 'Eisen aanvullen',
    statusReady: 'Voldaan',
    statusAttention: 'Aan te vullen',
    statusMissing: 'Ontbreekt',
    euPassport: 'EU-PASPOORT',
    vaccination: 'VACCINATIES',
    microchip: 'CHIP',
    healthRecords: 'MEDISCH DOSSIER',
    validUntil: 'Geldig tot',
    nextDue: 'Volgende termijn:',
    registeredIn: 'Geregistreerd in het systeem',
    clinicalRecords: 'klinische dossiers',
    lastVisit: 'Laatste bezoek:',
    requirementsFor: 'VEREISTEN VOOR',
    documentsInPack: 'DOCUMENTEN IN HET PAKKET',
    footerSummary: 'Samenvatting reisdocumenten ·',
    generatedPrefix: 'Gegenereerd',
    shareTitle: 'Reispakket',
    sharePet: 'Huisdier:',
    shareDestination: 'Bestemming:',
    shareStatus: 'Status:',
    shareDocuments: 'Documenten:',
    passportValid: 'Geldig tot',
    passportExpiring: 'Geldigheid eindigt',
    passportMissing: 'EU-paspoort ontbreekt of is verlopen',
    chipMissing: 'Chip is niet geregistreerd in het systeem',
    tapewormHint: 'Behandeling bij de dierenarts vóór binnenkomst vereist',
    parasiteHint: 'Aanbevolen vóór de reis bij de dierenarts',
    healthCertReady: 'Gezondheidsoverzicht zit in het pakket',
    healthCertMissing: 'Officieel certificaat van de dierenarts vereist',
    insuranceReady: 'Verzekering maakt deel uit van het pakket',
    insuranceAttention: 'Aanbevolen om vóór de reis aan te vullen',
    importPermitHint: 'Online te regelen vóór vertrek',
    dash: '—',
  },
  fi: {
    travelPackTitle: 'MATKAPAKETTI',
    destinationPrefix: 'Kohde:',
    ready: 'Valmis matkaan',
    almostReady: 'Melkein valmis',
    needsWork: 'Täydennä vaatimukset',
    statusReady: 'Täytetty',
    statusAttention: 'Täydennettävä',
    statusMissing: 'Puuttuu',
    euPassport: 'EU-PASSI',
    vaccination: 'ROKOTUKSET',
    microchip: 'MIKROSIRU',
    healthRecords: 'TERVEYSTIETOJA',
    validUntil: 'Voimassa',
    nextDue: 'Seuraava ajankohta:',
    registeredIn: 'Rekisteröity järjestelmään',
    clinicalRecords: 'kliinistä merkintää',
    lastVisit: 'Viimeisin käynti:',
    requirementsFor: 'VAATIMUKSET:',
    documentsInPack: 'ASIAKIRJAT PAKETISSA',
    footerSummary: 'Matka-asiakirjojen yhteenveto ·',
    generatedPrefix: 'Luotu',
    shareTitle: 'Matkapaketti',
    sharePet: 'Lemmikki:',
    shareDestination: 'Kohde:',
    shareStatus: 'Tila:',
    shareDocuments: 'Asiakirjat:',
    passportValid: 'Voimassa',
    passportExpiring: 'Voimassaolo päättyy',
    passportMissing: 'EU-passi puuttuu tai on vanhentunut',
    chipMissing: 'Mikrosirua ei ole merkitty järjestelmään',
    tapewormHint: 'Hoito eläinlääkärillä ennen maahantuloa pakollinen',
    parasiteHint: 'Suositellaan ennen matkaa eläinlääkärillä',
    healthCertReady: 'Terveysyhteenveto on paketissa',
    healthCertMissing: 'Virallinen eläinlääkärin todistus vaaditaan',
    insuranceReady: 'Vakuutus kuuluu pakettiin',
    insuranceAttention: 'Suositellaan täydennettäväksi ennen matkaa',
    importPermitHint: 'Hoidettava verkossa ennen lähtöä',
    dash: '—',
  },
  en: {
    travelPackTitle: 'TRAVEL PACKAGE',
    destinationPrefix: 'Destination:',
    ready: 'Ready to travel',
    almostReady: 'Almost ready',
    needsWork: 'Complete requirements',
    statusReady: 'Met',
    statusAttention: 'To complete',
    statusMissing: 'Missing',
    euPassport: 'EU PASSPORT',
    vaccination: 'VACCINATION',
    microchip: 'MICROCHIP',
    healthRecords: 'HEALTH RECORDS',
    validUntil: 'Valid until',
    nextDue: 'Next due:',
    registeredIn: 'Registered in',
    clinicalRecords: 'clinical records',
    lastVisit: 'Last visit:',
    requirementsFor: 'REQUIREMENTS FOR',
    documentsInPack: 'DOCUMENTS IN PACKAGE',
    footerSummary: 'Travel documents summary ·',
    generatedPrefix: 'Generated',
    shareTitle: 'Travel package',
    sharePet: 'Pet:',
    shareDestination: 'Destination:',
    shareStatus: 'Status:',
    shareDocuments: 'Documents:',
    passportValid: 'Valid until',
    passportExpiring: 'Expires',
    passportMissing: 'EU passport missing or expired',
    chipMissing: 'Microchip is not recorded in the system',
    tapewormHint: 'Veterinary treatment required before entry',
    parasiteHint: 'Recommended before travel with a vet',
    healthCertReady: 'Health summary is in the package',
    healthCertMissing: 'Official veterinary certificate required',
    insuranceReady: 'Insurance is included in the package',
    insuranceAttention: 'Recommended to add before travel',
    importPermitHint: 'Must be arranged online before departure',
    dash: '—',
  },
}

type ReqText = { label: string; detail: string }

type LocaleContent = {
  country: Record<string, string>
  summary: Record<string, string>
  core: {
    passport: ReqText
    rabies: ReqText
    chip: ReqText
  }
  insuranceLabel: string
  tapewormLabel: string
  parasiteLabel: string
  insuranceDetail: Record<string, string>
  tapewormDetail: Record<string, string>
  parasiteDetail: Record<string, string>
  special: Record<string, ReqText>
  documents: Record<string, string>
  vaccination: Record<string, string>
  breeds: Record<string, string>
}

function content(partial: LocaleContent): LocaleContent {
  return partial
}

const CONTENT: Record<TravelPdfLocale, LocaleContent> = {
  de: content({
    country: {
      de: 'Deutschland',
      at: 'Österreich',
      sk: 'Slowakei',
      pl: 'Polen',
      hu: 'Ungarn',
      hr: 'Kroatien',
      si: 'Slowenien',
      it: 'Italien',
      fr: 'Frankreich',
      es: 'Spanien',
      pt: 'Portugal',
      gr: 'Griechenland',
      nl: 'Niederlande',
      be: 'Belgien',
      fi: 'Finnland',
      ie: 'Irland',
      mt: 'Malta',
      gb: 'Vereinigtes Königreich',
      us: 'Vereinigte Staaten',
    },
    summary: {
      de: 'Reisen innerhalb der EU – Standardregeln für Heimtiere.',
      at: 'EU-Reiseziel – keine Quarantäne bei Erfüllung der Standardbedingungen.',
      sk: 'Benachbartes EU-Land – gleiche Regeln wie in Tschechien (Pass, Chip, Tollwut).',
      pl: 'EU-Reiseziel – Standardbedingungen für Hunde und Katzen aus Tschechien.',
      hu: 'EU-Reiseziel – keine Quarantäne bei gültigem Pass, Chip und Impfung.',
      hr: 'Beliebtes Sommerziel – EU-Regeln, Zeckenschutz empfohlen.',
      si: 'EU-Reiseziel – Standardbedingungen, oft Transit zur Adria.',
      it: 'EU-Reiseziel – in warmen Regionen Schutz vor Leishmaniose und Zecken empfohlen.',
      fr: 'EU-Reiseziel – Standardbedingungen; in manchen Regionen Zecken- und Flohrisiko.',
      es: 'EU-Reiseziel – im Süden und auf Inseln stark empfohlener Leishmaniose-Schutz.',
      pt: 'EU-Reiseziel – warmes Klima, Parasitenschutz empfohlen.',
      gr: 'EU-Reiseziel – auf Inseln und dem Festland Zecken- und Flohschutz empfohlen.',
      nl: 'EU-Reiseziel – Standardbedingungen für Heimtiere aus Tschechien.',
      be: 'EU-Reiseziel – keine Quarantäne bei Pass, Chip und Impfung.',
      fi: 'EU mit strengerer Regel – Bandwurmbehandlung bei Hunden vor Einreise Pflicht.',
      ie: 'EU mit strengerer Regel – Bandwurmbehandlung bei Hunden vor Einreise Pflicht.',
      mt: 'EU-Inselziel – Bandwurmbehandlung bei Hunden vor Einreise Pflicht.',
      gb: 'Nach dem Brexit strengere Regeln – Bandwurmbehandlung und Gesundheitszertifikat nötig.',
      us: 'Außerhalb der EU – CDC-Einfuhrzustimmung und tierärztliches Zertifikat nötig.',
    },
    core: {
      passport: {
        label: 'Gültiger EU-Ausweis',
        detail:
          'In der EU ausgestellter Ausweis mit Chip- und Impfdaten, gültig für die gesamte Aufenthaltsdauer.',
      },
      rabies: {
        label: 'Tollwutimpfung',
        detail:
          'Gültig mindestens 21 Tage vor der Reise (Erstimpfung), im EU-Ausweis eingetragen.',
      },
      chip: {
        label: 'ISO-Mikrochip',
        detail:
          'Der Chip muss lesbar und vor der Tollwutimpfung im Ausweis eingetragen sein.',
      },
    },
    insuranceLabel: 'Reiseversicherung für das Haustier',
    tapewormLabel: 'Bandwurmbehandlung',
    parasiteLabel: 'Parasitenschutz',
    insuranceDetail: {
      de: 'Empfohlen für tierärztliche Versorgung im Ausland.',
      pl: 'Besonders bei längerem Aufenthalt empfohlen.',
      hr: 'Empfohlen für Strandaufenthalt und aktiven Urlaub.',
      it: 'Empfohlen für längeren Urlaub.',
      fr: 'Empfohlen für tierärztliche Versorgung während des Aufenthalts.',
      es: 'Empfohlen – tierärztliche Versorgung in Touristengebieten ist teuer.',
      gr: 'Empfohlen für Inselaufenthalte.',
      ie: 'Empfohlen wegen höherem Risiko bei Kanalüberquerung.',
      us: 'Empfohlen – tierärztliche Versorgung in den USA ist teuer.',
    },
    tapewormDetail: {
      fi: 'Für Hunde 1–5 Tage vor Einreise Pflicht (Praziquantel) – Eintrag des Tierarztes im Ausweis.',
      ie: 'Für Hunde 1–5 Tage vor Einreise Pflicht – Eintrag des Tierarztes im EU-Ausweis.',
      mt: 'Für Hunde 1–5 Tage vor Einreise Pflicht – Eintrag des Tierarztes im Ausweis.',
      gb: 'Pflicht 24–120 Stunden vor Einreise – Eintrag des Tierarztes im Ausweis.',
    },
    parasiteDetail: {
      hr: 'Schutz vor Zecken und Flöhen empfohlen (Strand, Natur).',
      it: 'Schutz vor Zecken und Leishmaniose-Überträgern empfohlen (besonders Süden und Inseln).',
      es: 'Schutz vor Flöhen, Zecken und Leishmaniose empfohlen (besonders Mittelmeer und Kanaren).',
      pt: 'Ganzjähriger Schutz vor Zecken, Flöhen und Leishmaniose empfohlen.',
      gr: 'Schutz vor Zecken, Flöhen und Leishmaniose-Überträgern empfohlen.',
      mt: 'Schutz vor Zecken und Flöhen im warmen Klima empfohlen.',
    },
    special: {
      gb_health: {
        label: 'Offizielles Gesundheitszertifikat',
        detail: 'Vor der Reise von einem zugelassenen Tierarzt ausgestellt (AHC).',
      },
      us_rabies: {
        label: 'Tollwutimpfung',
        detail: 'Gültige Impfung gemäß CDC-Anforderungen des jeweiligen Bundesstaates.',
      },
      us_chip: {
        label: 'ISO-Mikrochip',
        detail: 'Pflichtidentifikation für den Import in die USA.',
      },
      us_health: {
        label: 'Internationales Gesundheitszertifikat',
        detail: 'Offizielles Zertifikat auf Englisch, maximal 30 Tage alt.',
      },
      us_import: {
        label: 'CDC-Einfuhrgenehmigung',
        detail: 'Vor Abflug online gemäß Regeln des jeweiligen Bundesstaates zu beantragen.',
      },
    },
    documents: {
      'EU pas mazlíčka': 'EU-Heimtierausweis',
      'Očkovací certifikát': 'Impfausweis',
      'Potvrzení o čipu': 'Chip-Bestätigung',
      'Zdravotní souhrn': 'Gesundheitsübersicht',
      'Pojišťovací kartička': 'Versicherungskarte',
    },
    vaccination: {
      'Vzteklina, leptospiróza – platné': 'Tollwut, Leptospirose – gültig',
      'FVRCP – platné': 'FVRCP – gültig',
      'Vzteklina – platná, doporučená kontrola': 'Tollwut – gültig, Kontrolle empfohlen',
    },
    breeds: {
      'Zlatý retriever': 'Golden Retriever',
      'Britská krátkosrstá kočka': 'Britisch Kurzhaar',
      'Border kolie': 'Border Collie',
    },
  }),
  pl: content({
    country: {
      de: 'Niemcy',
      at: 'Austria',
      sk: 'Słowacja',
      pl: 'Polska',
      hu: 'Węgry',
      hr: 'Chorwacja',
      si: 'Słowenia',
      it: 'Włochy',
      fr: 'Francja',
      es: 'Hiszpania',
      pt: 'Portugalia',
      gr: 'Grecja',
      nl: 'Holandia',
      be: 'Belgia',
      fi: 'Finlandia',
      ie: 'Irlandia',
      mt: 'Malta',
      gb: 'Wielka Brytania',
      us: 'Stany Zjednoczone',
    },
    summary: {
      de: 'Podróż w ramach UE – standardowe przepisy dla zwierząt domowych.',
      at: 'Destynacja UE – bez kwarantanny przy spełnieniu standardowych warunków.',
      sk: 'Sąsiedni kraj UE – te same zasady co w Czechach (paszport, chip, wścieklizna).',
      pl: 'Destynacja UE – standardowe warunki wjazdu dla psów i kotów z Czech.',
      hu: 'Destynacja UE – bez kwarantanny przy ważnym paszporcie, chipie i szczepieniu.',
      hr: 'Popularna destynacja wakacyjna – przepisy UE, zalecana ochrona przed kleszczami.',
      si: 'Destynacja UE – standardowe warunki, często tranzyt w stronę Adriatyku.',
      it: 'Destynacja UE – w ciepłych regionach zalecana ochrona przed leiszmaniozą i kleszczami.',
      fr: 'Destynacja UE – warunki standardowe; w niektórych regionach ryzyko kleszczy i pcheł.',
      es: 'Destynacja UE – na południu i wyspach silnie zalecana ochrona przed leiszmaniozą.',
      pt: 'Destynacja UE – ciepły klimat, zalecana ochrona przed pasożytami.',
      gr: 'Destynacja UE – na wyspach i stałym lądzie zalecana ochrona przed kleszczami i pchłami.',
      nl: 'Destynacja UE – standardowe warunki wjazdu dla zwierząt z Czech.',
      be: 'Destynacja UE – bez kwarantanny przy paszporcie, chipie i szczepieniu.',
      fi: 'UE z surowszą regułą – obowiązkowe odrobaczanie psów przed wjazdem.',
      ie: 'UE z surowszą regułą – obowiązkowe odrobaczanie psów przed wjazdem.',
      mt: 'Wyspiarska destynacja UE – obowiązkowe odrobaczanie psów przed wjazdem.',
      gb: 'Po Brexicie surowsze przepisy – odrobaczanie i certyfikat zdrowotny.',
      us: 'Poza UE – wymagana zgoda CDC na import oraz certyfikat weterynaryjny.',
    },
    core: {
      passport: {
        label: 'Ważny paszport UE',
        detail:
          'Paszport wydany w UE z danymi chipa i szczepień, ważny przez cały okres pobytu.',
      },
      rabies: {
        label: 'Szczepienie przeciw wściekliźnie',
        detail:
          'Ważne min. 21 dni przed podróżą (pierwsze szczepienie), wpisane w paszporcie UE.',
      },
      chip: {
        label: 'Mikrochip ISO',
        detail:
          'Chip musi być odczytywalny i wpisany w paszporcie przed szczepieniem przeciw wściekliźnie.',
      },
    },
    insuranceLabel: 'Ubezpieczenie podróżne zwierzęcia',
    tapewormLabel: 'Odrobaczanie przeciw tasiemcom',
    parasiteLabel: 'Profilaktyka przeciwpasożytnicza',
    insuranceDetail: {
      de: 'Zalecane na opiekę weterynaryjną za granicą.',
      pl: 'Zalecane szczególnie przy dłuższym pobycie.',
      hr: 'Zalecane na pobyt nad morzem i aktywny urlop.',
      it: 'Zalecane na dłuższe wakacje.',
      fr: 'Zalecane na opiekę weterynaryjną podczas pobytu.',
      es: 'Zalecane – opieka weterynaryjna w regionach turystycznych bywa droga.',
      gr: 'Zalecane na pobyt na wyspach.',
      ie: 'Zalecane ze względu na wyższe ryzyko podróży przez kanał.',
      us: 'Zalecane – opieka weterynaryjna w USA jest kosztowna.',
    },
    tapewormDetail: {
      fi: 'Dla psów obowiązkowe 1–5 dni przed wjazdem (prazykwantel) – wpis weterynarza w paszporcie.',
      ie: 'Dla psów obowiązkowe 1–5 dni przed wjazdem – wpis weterynarza w paszporcie UE.',
      mt: 'Dla psów obowiązkowe 1–5 dni przed wjazdem – wpis weterynarza w paszporcie.',
      gb: 'Obowiązkowe 24–120 godzin przed wjazdem – wpis weterynarza w paszporcie.',
    },
    parasiteDetail: {
      hr: 'Zalecana ochrona przed kleszczami i pchłami (morze, natura).',
      it: 'Zalecana ochrona przed kleszczami i nosicielami leiszmaniozy (szczególnie południe i wyspy).',
      es: 'Zalecana ochrona przed pchłami, kleszczami i leiszmaniozą (szczególnie Morze Śródziemne i Wyspy Kanaryjskie).',
      pt: 'Zalecana całoroczna ochrona przed kleszczami, pchłami i leiszmaniozą.',
      gr: 'Zalecana ochrona przed kleszczami, pchłami i nosicielami leiszmaniozy.',
      mt: 'Zalecana ochrona przed kleszczami i pchłami w ciepłym klimacie.',
    },
    special: {
      gb_health: {
        label: 'Oficjalny certyfikat zdrowotny',
        detail: 'Wystawiony przez uprawnionego weterynarza przed podróżą (AHC).',
      },
      us_rabies: {
        label: 'Szczepienie przeciw wściekliźnie',
        detail: 'Ważne szczepienie spełniające wymagania CDC dla danego stanu.',
      },
      us_chip: {
        label: 'Mikrochip ISO',
        detail: 'Obowiązkowa identyfikacja przy imporcie do USA.',
      },
      us_health: {
        label: 'Międzynarodowy certyfikat zdrowotny',
        detail: 'Oficjalny certyfikat po angielsku, max. 30 dni.',
      },
      us_import: {
        label: 'Zezwolenie importowe CDC',
        detail: 'Należy załatwić online przed wylotem zgodnie z zasadami danego stanu.',
      },
    },
    documents: {
      'EU pas mazlíčka': 'Paszport UE zwierzęcia',
      'Očkovací certifikát': 'Certyfikat szczepień',
      'Potvrzení o čipu': 'Potwierdzenie chipa',
      'Zdravotní souhrn': 'Podsumowanie zdrowia',
      'Pojišťovací kartička': 'Karta ubezpieczeniowa',
    },
    vaccination: {
      'Vzteklina, leptospiróza – platné': 'Wścieklizna, leptospiroza – ważne',
      'FVRCP – platné': 'FVRCP – ważne',
      'Vzteklina – platná, doporučená kontrola': 'Wścieklizna – ważna, zalecana kontrola',
    },
    breeds: {
      'Zlatý retriever': 'Golden retriever',
      'Britská krátkosrstá kočka': 'Brytyjski krótkowłosy',
      'Border kolie': 'Border collie',
    },
  }),
  sk: content({
    country: {
      de: 'Nemecko',
      at: 'Rakúsko',
      sk: 'Slovensko',
      pl: 'Poľsko',
      hu: 'Maďarsko',
      hr: 'Chorvátsko',
      si: 'Slovinsko',
      it: 'Taliansko',
      fr: 'Francúzsko',
      es: 'Španielsko',
      pt: 'Portugalsko',
      gr: 'Grécko',
      nl: 'Holandsko',
      be: 'Belgicko',
      fi: 'Fínsko',
      ie: 'Írsko',
      mt: 'Malta',
      gb: 'Veľká Británia',
      us: 'Spojené štáty',
    },
    summary: {
      de: 'Cestovanie v rámci EÚ – štandardné pravidlá pre domáce zvieratá.',
      at: 'EÚ destinácia – bez karantény pri splnení štandardných podmienok.',
      sk: 'Susedná krajina EÚ – platia rovnaké pravidlá ako v ČR (pas, čip, besnota).',
      pl: 'EÚ destinácia – štandardné podmienky vstupu pre psy a mačky z ČR.',
      hu: 'EÚ destinácia – bez karantény pri platnom pase, čipe a očkovaní.',
      hr: 'Obľúbená letná destinácia – pravidlá EÚ, odporúčaná prevencia proti kliešťom.',
      si: 'EÚ destinácia – štandardné podmienky, často tranzit smerom k Jadranu.',
      it: 'EÚ destinácia – v teplých oblastiach odporúčaná ochrana proti leishmanióze a kliešťom.',
      fr: 'EÚ destinácia – štandardné podmienky; v niektorých regiónoch riziko kliešťov a blch.',
      es: 'EÚ destinácia – na juhu a ostrovoch silne odporúčaná prevencia proti leishmanióze.',
      pt: 'EÚ destinácia – teplé podnebie, odporúčaná prevencia proti parazitom.',
      gr: 'EÚ destinácia – na ostrovoch a pevnine odporúčaná prevencia proti kliešťom a blchám.',
      nl: 'EÚ destinácia – štandardné podmienky vstupu pre maznáčikov z ČR.',
      be: 'EÚ destinácia – bez karantény pri splnení pasu, čipu a očkovania.',
      fi: 'EÚ s prísnejším pravidlom – u psov povinné ošetrenie proti pásomniciam pred vstupom.',
      ie: 'EÚ s prísnejším pravidlom – u psov povinné ošetrenie proti pásomniciam pred vstupom.',
      mt: 'Ostrovná destinácia EÚ – u psov povinné ošetrenie proti pásomniciam pred vstupom.',
      gb: 'Po Brexite prísnejšie pravidlá – ošetrenie proti pásomniciam a zdravotný certifikát.',
      us: 'Mimo EÚ – nutný importný súhlas CDC a veterinárny certifikát.',
    },
    core: {
      passport: {
        label: 'Platný EÚ pas',
        detail:
          'Pas vydaný v EÚ s údajmi o čipe a očkovaní, platný po celú dobu pobytu.',
      },
      rabies: {
        label: 'Očkovanie proti besnote',
        detail:
          'Platné min. 21 dní pred cestou (prvá vakcinácia), zapísané v EÚ pase.',
      },
      chip: {
        label: 'Mikročip ISO',
        detail:
          'Čip musí byť načítateľný a zapísaný v pase pred očkovaním proti besnote.',
      },
    },
    insuranceLabel: 'Cestovné poistenie maznáčika',
    tapewormLabel: 'Ošetrenie proti pásomniciam',
    parasiteLabel: 'Prevencia proti parazitom',
    insuranceDetail: {
      de: 'Odporúčané pre veterinárnu starostlivosť v zahraničí.',
      pl: 'Odporúčané najmä pri dlhšom pobyte.',
      hr: 'Odporúčané pre pobyt pri mori a aktívnu dovolenku.',
      it: 'Odporúčané pre dlhšiu dovolenku.',
      fr: 'Odporúčané pre veterinárnu starostlivosť počas pobytu.',
      es: 'Odporúčané – veterinárna starostlivosť v turistických oblastiach býva drahá.',
      gr: 'Odporúčané pre pobyt na ostrovoch.',
      ie: 'Odporúčané kvôli vyššiemu riziku cestovania cez kanál.',
      us: 'Odporúčané – veterinárna starostlivosť v USA je nákladná.',
    },
    tapewormDetail: {
      fi: 'Pre psy povinné 1–5 dní pred vstupom (praziquantel) – záznam veterinára v pase.',
      ie: 'Pre psy povinné 1–5 dní pred vstupom – záznam veterinára v EÚ pase.',
      mt: 'Pre psy povinné 1–5 dní pred vstupom – záznam veterinára v pase.',
      gb: 'Povinné 24–120 hodín pred vstupom – záznam veterinára v pase.',
    },
    parasiteDetail: {
      hr: 'Odporúčaná ochrana proti kliešťom a blchám (pobyt pri mori, príroda).',
      it: 'Odporúčaná prevencia proti kliešťom a prenášačom leishmaniózy (najmä juh a ostrovy).',
      es: 'Odporúčaná ochrana proti blchám, kliešťom a leishmanióze (najmä Stredomorie a Kanárske ostrovy).',
      pt: 'Odporúčaná celoročná ochrana proti kliešťom, blchám a leishmanióze.',
      gr: 'Odporúčaná ochrana proti kliešťom, blchám a prenášačom leishmaniózy.',
      mt: 'Odporúčaná ochrana proti kliešťom a blchám v teplom podnebí.',
    },
    special: {
      gb_health: {
        label: 'Oficiálny zdravotný certifikát',
        detail: 'Vystavený oprávneným veterinárom pred cestou (AHC).',
      },
      us_rabies: {
        label: 'Očkovanie proti besnote',
        detail: 'Platné očkovanie spĺňajúce požiadavky CDC pre daný štát.',
      },
      us_chip: {
        label: 'Mikročip ISO',
        detail: 'Povinná identifikácia pre import do USA.',
      },
      us_health: {
        label: 'Medzinárodný zdravotný certifikát',
        detail: 'Oficiálny certifikát v angličtine, max. 30 dní starý.',
      },
      us_import: {
        label: 'Importné povolenie CDC',
        detail: 'Nutné vybaviť online pred odletom podľa pravidiel daného štátu.',
      },
    },
    documents: {
      'EU pas mazlíčka': 'EÚ pas maznáčika',
      'Očkovací certifikát': 'Očkovací certifikát',
      'Potvrzení o čipu': 'Potvrdenie o čipe',
      'Zdravotní souhrn': 'Zdravotný súhrn',
      'Pojišťovací kartička': 'Poisťovacia kartička',
    },
    vaccination: {
      'Vzteklina, leptospiróza – platné': 'Besnota, leptospiróza – platné',
      'FVRCP – platné': 'FVRCP – platné',
      'Vzteklina – platná, doporučená kontrola': 'Besnota – platná, odporúčaná kontrola',
    },
    breeds: {
      'Zlatý retriever': 'Zlatý retriever',
      'Britská krátkosrstá kočka': 'Britská krátkosrstá mačka',
      'Border kolie': 'Border kólia',
    },
  }),
  en: content({
    country: {
      de: 'Germany',
      at: 'Austria',
      sk: 'Slovakia',
      pl: 'Poland',
      hu: 'Hungary',
      hr: 'Croatia',
      si: 'Slovenia',
      it: 'Italy',
      fr: 'France',
      es: 'Spain',
      pt: 'Portugal',
      gr: 'Greece',
      nl: 'Netherlands',
      be: 'Belgium',
      fi: 'Finland',
      ie: 'Ireland',
      mt: 'Malta',
      gb: 'United Kingdom',
      us: 'United States',
    },
    summary: {
      de: 'Travel within the EU – standard rules for pet animals.',
      at: 'EU destination – no quarantine when standard conditions are met.',
      sk: 'Neighbouring EU country – same rules as in Czechia (passport, chip, rabies).',
      pl: 'EU destination – standard entry conditions for dogs and cats from Czechia.',
      hu: 'EU destination – no quarantine with a valid passport, chip and vaccination.',
      hr: 'Popular summer destination – EU rules; tick prevention recommended.',
      si: 'EU destination – standard conditions, often used as transit to the Adriatic.',
      it: 'EU destination – in warm areas protection against leishmaniasis and ticks is recommended.',
      fr: 'EU destination – standard conditions; tick and flea risk in some regions.',
      es: 'EU destination – in the south and on islands leishmaniasis prevention is strongly recommended.',
      pt: 'EU destination – warm climate; parasite prevention recommended.',
      gr: 'EU destination – on islands and mainland tick and flea prevention recommended.',
      nl: 'EU destination – standard entry conditions for pets from Czechia.',
      be: 'EU destination – no quarantine when passport, chip and vaccination are met.',
      fi: 'EU with a stricter rule – tapeworm treatment for dogs required before entry.',
      ie: 'EU with a stricter rule – tapeworm treatment for dogs required before entry.',
      mt: 'EU island destination – tapeworm treatment for dogs required before entry.',
      gb: 'Stricter post-Brexit rules – tapeworm treatment and a health certificate required.',
      us: 'Outside the EU – CDC import approval and a veterinary certificate required.',
    },
    core: {
      passport: {
        label: 'Valid EU pet passport',
        detail:
          'EU-issued passport with chip and vaccination details, valid for the entire stay.',
      },
      rabies: {
        label: 'Rabies vaccination',
        detail:
          'Valid at least 21 days before travel (primary vaccination), recorded in the EU passport.',
      },
      chip: {
        label: 'ISO microchip',
        detail:
          'The chip must be readable and recorded in the passport before the rabies vaccination.',
      },
    },
    insuranceLabel: 'Pet travel insurance',
    tapewormLabel: 'Tapeworm treatment',
    parasiteLabel: 'Parasite prevention',
    insuranceDetail: {
      de: 'Recommended for veterinary care abroad.',
      pl: 'Especially recommended for longer stays.',
      hr: 'Recommended for seaside stays and an active holiday.',
      it: 'Recommended for longer holidays.',
      fr: 'Recommended for veterinary care during the stay.',
      es: 'Recommended – veterinary care in tourist areas can be expensive.',
      gr: 'Recommended for island stays.',
      ie: 'Recommended due to higher risk when travelling across the Channel.',
      us: 'Recommended – veterinary care in the USA is expensive.',
    },
    tapewormDetail: {
      fi: 'Mandatory for dogs 1–5 days before entry (praziquantel) – vet record in the passport.',
      ie: 'Mandatory for dogs 1–5 days before entry – vet record in the EU passport.',
      mt: 'Mandatory for dogs 1–5 days before entry – vet record in the passport.',
      gb: 'Mandatory 24–120 hours before entry – vet record in the passport.',
    },
    parasiteDetail: {
      hr: 'Tick and flea protection recommended (seaside, outdoors).',
      it: 'Prevention against ticks and leishmaniasis vectors recommended (especially south and islands).',
      es: 'Protection against fleas, ticks and leishmaniasis recommended (especially Mediterranean and Canary Islands).',
      pt: 'Year-round protection against ticks, fleas and leishmaniasis recommended.',
      gr: 'Protection against ticks, fleas and leishmaniasis vectors recommended.',
      mt: 'Tick and flea protection recommended in a warm climate.',
    },
    special: {
      gb_health: {
        label: 'Official health certificate',
        detail: 'Issued by an authorised veterinarian before travel (AHC).',
      },
      us_rabies: {
        label: 'Rabies vaccination',
        detail: 'Valid vaccination meeting CDC requirements for the given state.',
      },
      us_chip: {
        label: 'ISO microchip',
        detail: 'Mandatory identification for import into the USA.',
      },
      us_health: {
        label: 'International health certificate',
        detail: 'Official certificate in English, max. 30 days old.',
      },
      us_import: {
        label: 'CDC import permit',
        detail: 'Must be arranged online before departure per the rules of the given state.',
      },
    },
    documents: {
      'EU pas mazlíčka': 'EU pet passport',
      'Očkovací certifikát': 'Vaccination certificate',
      'Potvrzení o čipu': 'Microchip confirmation',
      'Zdravotní souhrn': 'Health summary',
      'Pojišťovací kartička': 'Insurance card',
    },
    vaccination: {
      'Vzteklina, leptospiróza – platné': 'Rabies, leptospirosis – valid',
      'FVRCP – platné': 'FVRCP – valid',
      'Vzteklina – platná, doporučená kontrola': 'Rabies – valid, check recommended',
    },
    breeds: {
      'Zlatý retriever': 'Golden Retriever',
      'Britská krátkosrstá kočka': 'British Shorthair',
      'Border kolie': 'Border Collie',
    },
  }),
  // Remaining locales reuse English core structure with translated UI already in UI map;
  // full native content for hu/hr/sl/it/fr/es/pt/el/nl/fi below as compact overrides via EN base + patches.
  hu: null as unknown as LocaleContent,
  hr: null as unknown as LocaleContent,
  sl: null as unknown as LocaleContent,
  it: null as unknown as LocaleContent,
  fr: null as unknown as LocaleContent,
  es: null as unknown as LocaleContent,
  pt: null as unknown as LocaleContent,
  el: null as unknown as LocaleContent,
  nl: null as unknown as LocaleContent,
  fi: null as unknown as LocaleContent,
}

// Fill remaining locales from English with localised country/summary/core overlays.
function cloneEn(overrides: Partial<LocaleContent> & Pick<LocaleContent, 'country' | 'summary' | 'core'>): LocaleContent {
  const base = CONTENT.en
  return {
    ...base,
    ...overrides,
    insuranceDetail: { ...base.insuranceDetail, ...overrides.insuranceDetail },
    tapewormDetail: { ...base.tapewormDetail, ...overrides.tapewormDetail },
    parasiteDetail: { ...base.parasiteDetail, ...overrides.parasiteDetail },
    special: { ...base.special, ...overrides.special },
    documents: { ...base.documents, ...overrides.documents },
    vaccination: { ...base.vaccination, ...overrides.vaccination },
    breeds: { ...base.breeds, ...overrides.breeds },
  }
}

CONTENT.hu = cloneEn({
  country: {
    de: 'Németország', at: 'Ausztria', sk: 'Szlovákia', pl: 'Lengyelország', hu: 'Magyarország',
    hr: 'Horvátország', si: 'Szlovénia', it: 'Olaszország', fr: 'Franciaország', es: 'Spanyolország',
    pt: 'Portugália', gr: 'Görögország', nl: 'Hollandia', be: 'Belgium', fi: 'Finnország',
    ie: 'Írország', mt: 'Málta', gb: 'Egyesült Királyság', us: 'Egyesült Államok',
  },
  summary: {
    de: 'Utazás az EU-n belül – standard szabályok háziállatokra.',
    at: 'EU úticél – karantén nélkül a standard feltételek teljesítése esetén.',
    sk: 'Szomszédos EU-ország – ugyanazok a szabályok, mint Csehországban.',
    pl: 'EU úticél – standard belépési feltételek csehországi kutyákra és macskákra.',
    hu: 'EU úticél – karantén nélkül érvényes útlevél, chip és oltás esetén.',
    hr: 'Népszerű nyári úticél – EU szabályok, kullancsvédelem ajánlott.',
    si: 'EU úticél – standard feltételek, gyakran tranzit az Adriához.',
    it: 'EU úticél – meleg területeken leishmaniasis és kullancs elleni védelem ajánlott.',
    fr: 'EU úticél – standard feltételek; egyes régiókban kullancs- és bolhakockázat.',
    es: 'EU úticél – délen és a szigeteken erősen ajánlott a leishmaniasis elleni védelem.',
    pt: 'EU úticél – meleg éghajlat, parazitaellenes megelőzés ajánlott.',
    gr: 'EU úticél – szigeteken és a szárazföldön kullancs- és bolhavédelem ajánlott.',
    nl: 'EU úticél – standard belépési feltételek csehországi kisállatokra.',
    be: 'EU úticél – karantén nélkül útlevél, chip és oltás teljesítése esetén.',
    fi: 'EU szigorúbb szabállyal – kutyáknál kötelező galandféreg-kezelés belépés előtt.',
    ie: 'EU szigorúbb szabállyal – kutyáknál kötelező galandféreg-kezelés belépés előtt.',
    mt: 'EU szigetország – kutyáknál kötelező galandféreg-kezelés belépés előtt.',
    gb: 'A Brexit után szigorúbb szabályok – galandféreg-kezelés és egészségügyi igazolás.',
    us: 'EU-n kívül – CDC importengedély és állatorvosi igazolás szükséges.',
  },
  core: {
    passport: {
      label: 'Érvényes EU útlevél',
      detail: 'EU-ban kiállított útlevél chip- és oltási adatokkal, a tartózkodás teljes idejére érvényes.',
    },
    rabies: {
      label: 'Veszettség elleni oltás',
      detail: 'Legalább 21 nappal az utazás előtt érvényes (első oltás), az EU útlevélben rögzítve.',
    },
    chip: {
      label: 'ISO mikrochip',
      detail: 'A chipnek olvashatónak kell lennie, és a veszettségoltás előtt be kell jegyezni az útlevélbe.',
    },
  },
  insuranceLabel: 'Kisállat-utazási biztosítás',
  tapewormLabel: 'Galandféreg elleni kezelés',
  parasiteLabel: 'Parazitaellenes megelőzés',
  documents: {
    'EU pas mazlíčka': 'EU kisállat-útlevél',
    'Očkovací certifikát': 'Oltási bizonyítvány',
    'Potvrzení o čipu': 'Chipigazolás',
    'Zdravotní souhrn': 'Egészségügyi összefoglaló',
    'Pojišťovací kartička': 'Biztosítási kártya',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Veszettség, leptospirosis – érvényes',
    'FVRCP – platné': 'FVRCP – érvényes',
    'Vzteklina – platná, doporučená kontrola': 'Veszettség – érvényes, ellenőrzés ajánlott',
  },
})

CONTENT.hr = cloneEn({
  country: {
    de: 'Njemačka', at: 'Austrija', sk: 'Slovačka', pl: 'Poljska', hu: 'Mađarska',
    hr: 'Hrvatska', si: 'Slovenija', it: 'Italija', fr: 'Francuska', es: 'Španjolska',
    pt: 'Portugal', gr: 'Grčka', nl: 'Nizozemska', be: 'Belgija', fi: 'Finska',
    ie: 'Irska', mt: 'Malta', gb: 'Ujedinjeno Kraljevstvo', us: 'Sjedinjene Američke Države',
  },
  summary: {
    de: 'Putovanje unutar EU – standardna pravila za kućne ljubimce.',
    at: 'EU destinacija – bez karantene uz ispunjenje standardnih uvjeta.',
    sk: 'Susjedna EU zemlja – ista pravila kao u Češkoj.',
    pl: 'EU destinacija – standardni uvjeti ulaska za pse i mačke iz Češke.',
    hu: 'EU destinacija – bez karantene uz važeću putovnicu, čip i cijepljenje.',
    hr: 'Popularna ljetna destinacija – EU pravila, preporučena zaštita od krpelja.',
    si: 'EU destinacija – standardni uvjeti, često tranzit prema Jadranu.',
    it: 'EU destinacija – u toplim područjima preporučena zaštita od lišmanioze i krpelja.',
    fr: 'EU destinacija – standardni uvjeti; u nekim regijama rizik od krpelja i buha.',
    es: 'EU destinacija – na jugu i otocima snažno preporučena zaštita od lišmanioze.',
    pt: 'EU destinacija – topla klima, preporučena prevencija parazita.',
    gr: 'EU destinacija – na otocima i kopnu preporučena zaštita od krpelja i buha.',
    nl: 'EU destinacija – standardni uvjeti ulaska za ljubimce iz Češke.',
    be: 'EU destinacija – bez karantene uz putovnicu, čip i cijepljenje.',
    fi: 'EU sa strožim pravilom – obvezno liječenje trakavice za pse prije ulaska.',
    ie: 'EU sa strožim pravilom – obvezno liječenje trakavice za pse prije ulaska.',
    mt: 'Otočna EU destinacija – obvezno liječenje trakavice za pse prije ulaska.',
    gb: 'Nakon Brexita stroža pravila – liječenje trakavice i zdravstveni certifikat.',
    us: 'Izvan EU – potreban CDC uvozni pristanak i veterinarski certifikat.',
  },
  core: {
    passport: {
      label: 'Važeća EU putovnica',
      detail: 'Putovnica izdana u EU s podacima o čipu i cijepljenju, važeća tijekom cijelog boravka.',
    },
    rabies: {
      label: 'Cijepljenje protiv bjesnoće',
      detail: 'Važeće najmanje 21 dan prije puta (prva vakcinacija), upisano u EU putovnicu.',
    },
    chip: {
      label: 'ISO mikročip',
      detail: 'Čip mora biti čitljiv i upisan u putovnicu prije cijepljenja protiv bjesnoće.',
    },
  },
  insuranceLabel: 'Putno osiguranje ljubimca',
  tapewormLabel: 'Liječenje protiv trakavice',
  parasiteLabel: 'Prevencija parazita',
  documents: {
    'EU pas mazlíčka': 'EU putovnica ljubimca',
    'Očkovací certifikát': 'Certifikat o cijepljenju',
    'Potvrzení o čipu': 'Potvrda o čipu',
    'Zdravotní souhrn': 'Zdravstveni sažetak',
    'Pojišťovací kartička': 'Osigurateljna kartica',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Bjesnoća, leptospiroza – važeće',
    'FVRCP – platné': 'FVRCP – važeće',
    'Vzteklina – platná, doporučená kontrola': 'Bjesnoća – važeće, preporučena kontrola',
  },
})

CONTENT.sl = cloneEn({
  country: {
    de: 'Nemčija', at: 'Avstrija', sk: 'Slovaška', pl: 'Poljska', hu: 'Madžarska',
    hr: 'Hrvaška', si: 'Slovenija', it: 'Italija', fr: 'Francija', es: 'Španija',
    pt: 'Portugalska', gr: 'Grčija', nl: 'Nizozemska', be: 'Belgija', fi: 'Finska',
    ie: 'Irska', mt: 'Malta', gb: 'Združeno kraljestvo', us: 'Združene države',
  },
  summary: {
    de: 'Potovanje znotraj EU – standardna pravila za hišne ljubljenčke.',
    at: 'EU destinacija – brez karantene ob izpolnitvi standardnih pogojev.',
    sk: 'Sosednja EU država – enaka pravila kot na Češkem.',
    pl: 'EU destinacija – standardni pogoji vstopa za pse in mačke s Češke.',
    hu: 'EU destinacija – brez karantene ob veljavnem potnem listu, čipu in cepljenju.',
    hr: 'Priljubljena poletna destinacija – pravila EU, priporočena zaščita pred klopi.',
    si: 'EU destinacija – standardni pogoji, pogosto tranzit proti Jadranu.',
    it: 'EU destinacija – v toplih območjih priporočena zaščita pred lišmanijozo in klopi.',
    fr: 'EU destinacija – standardni pogoji; v nekaterih regijah tveganje klopov in bolh.',
    es: 'EU destinacija – na jugu in otokih močno priporočena zaščita pred lišmanijozo.',
    pt: 'EU destinacija – toplo podnebje, priporočena preventiva proti zajedavcem.',
    gr: 'EU destinacija – na otokih in celini priporočena zaščita pred klopi in bolhami.',
    nl: 'EU destinacija – standardni pogoji vstopa za ljubljenčke s Češke.',
    be: 'EU destinacija – brez karantene ob potnem listu, čipu in cepljenju.',
    fi: 'EU s strožjim pravilom – obvezno zdravljenje trakulje pri psih pred vstopom.',
    ie: 'EU s strožjim pravilom – obvezno zdravljenje trakulje pri psih pred vstopom.',
    mt: 'Otoška EU destinacija – obvezno zdravljenje trakulje pri psih pred vstopom.',
    gb: 'Po Brexitu strožja pravila – zdravljenje trakulje in zdravstveni certifikat.',
    us: 'Zunaj EU – potrebno CDC uvozno soglasje in veterinarski certifikat.',
  },
  core: {
    passport: {
      label: 'Veljaven EU potni list',
      detail: 'Potni list izdan v EU s podatki o čipu in cepljenju, veljaven ves čas bivanja.',
    },
    rabies: {
      label: 'Cepljenje proti steklini',
      detail: 'Veljavno vsaj 21 dni pred potovanjem (prvo cepljenje), vpisano v EU potni list.',
    },
    chip: {
      label: 'ISO mikročip',
      detail: 'Čip mora biti berljiv in vpisán v potni list pred cepljenjem proti steklini.',
    },
  },
  insuranceLabel: 'Potovalno zavarovanje ljubljenčka',
  tapewormLabel: 'Zdravljenje proti trakulji',
  parasiteLabel: 'Preventiva proti zajedavcem',
  documents: {
    'EU pas mazlíčka': 'EU potni list ljubljenčka',
    'Očkovací certifikát': 'Potrdilo o cepljenju',
    'Potvrzení o čipu': 'Potrdilo o čipu',
    'Zdravotní souhrn': 'Zdravstveni povzetek',
    'Pojišťovací kartička': 'Zavarovalna kartica',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Steklina, leptospiroza – veljavno',
    'FVRCP – platné': 'FVRCP – veljavno',
    'Vzteklina – platná, doporučená kontrola': 'Steklina – veljavno, priporočena kontrola',
  },
})

CONTENT.it = cloneEn({
  country: {
    de: 'Germania', at: 'Austria', sk: 'Slovacchia', pl: 'Polonia', hu: 'Ungheria',
    hr: 'Croazia', si: 'Slovenia', it: 'Italia', fr: 'Francia', es: 'Spagna',
    pt: 'Portogallo', gr: 'Grecia', nl: 'Paesi Bassi', be: 'Belgio', fi: 'Finlandia',
    ie: 'Irlanda', mt: 'Malta', gb: 'Regno Unito', us: 'Stati Uniti',
  },
  summary: {
    de: 'Viaggio nell’UE – regole standard per gli animali domestici.',
    at: 'Destinazione UE – nessuna quarantena se sono soddisfatte le condizioni standard.',
    sk: 'Paese UE confinante – stesse regole della Cechia.',
    pl: 'Destinazione UE – condizioni di ingresso standard per cani e gatti dalla Cechia.',
    hu: 'Destinazione UE – nessuna quarantena con passaporto, chip e vaccinazione validi.',
    hr: 'Destinazione estiva popolare – regole UE, prevenzione zecche consigliata.',
    si: 'Destinazione UE – condizioni standard, spesso transito verso l’Adriatico.',
    it: 'Destinazione UE – nelle zone calde è consigliata la protezione da leishmaniosi e zecche.',
    fr: 'Destinazione UE – condizioni standard; in alcune regioni rischio zecche e pulci.',
    es: 'Destinazione UE – nel sud e sulle isole è fortemente consigliata la prevenzione della leishmaniosi.',
    pt: 'Destinazione UE – clima caldo, prevenzione antiparassitaria consigliata.',
    gr: 'Destinazione UE – su isole e continente prevenzione zecche e pulci consigliata.',
    nl: 'Destinazione UE – condizioni di ingresso standard per animali dalla Cechia.',
    be: 'Destinazione UE – nessuna quarantena con passaporto, chip e vaccinazione.',
    fi: 'UE con regola più severa – trattamento contro la tenia obbligatorio per i cani prima dell’ingresso.',
    ie: 'UE con regola più severa – trattamento contro la tenia obbligatorio per i cani prima dell’ingresso.',
    mt: 'Destinazione insulare UE – trattamento contro la tenia obbligatorio per i cani prima dell’ingresso.',
    gb: 'Regole più severe dopo la Brexit – trattamento contro la tenia e certificato sanitario.',
    us: 'Fuori dall’UE – necessario assenso CDC all’importazione e certificato veterinario.',
  },
  core: {
    passport: {
      label: 'Passaporto UE valido',
      detail: 'Passaporto rilasciato nell’UE con dati di chip e vaccinazioni, valido per tutta la permanenza.',
    },
    rabies: {
      label: 'Vaccinazione antirabbica',
      detail: 'Valida almeno 21 giorni prima del viaggio (prima vaccinazione), registrata nel passaporto UE.',
    },
    chip: {
      label: 'Microchip ISO',
      detail: 'Il chip deve essere leggibile e registrato nel passaporto prima della vaccinazione antirabbica.',
    },
  },
  insuranceLabel: 'Assicurazione di viaggio per l’animale',
  tapewormLabel: 'Trattamento contro la tenia',
  parasiteLabel: 'Prevenzione antiparassitaria',
  documents: {
    'EU pas mazlíčka': 'Passaporto UE dell’animale',
    'Očkovací certifikát': 'Certificato di vaccinazione',
    'Potvrzení o čipu': 'Conferma del microchip',
    'Zdravotní souhrn': 'Riepilogo sanitario',
    'Pojišťovací kartička': 'Tessera assicurativa',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Rabbia, leptospirosi – valide',
    'FVRCP – platné': 'FVRCP – valido',
    'Vzteklina – platná, doporučená kontrola': 'Rabbia – valida, controllo consigliato',
  },
})

CONTENT.fr = cloneEn({
  country: {
    de: 'Allemagne', at: 'Autriche', sk: 'Slovaquie', pl: 'Pologne', hu: 'Hongrie',
    hr: 'Croatie', si: 'Slovénie', it: 'Italie', fr: 'France', es: 'Espagne',
    pt: 'Portugal', gr: 'Grèce', nl: 'Pays-Bas', be: 'Belgique', fi: 'Finlande',
    ie: 'Irlande', mt: 'Malte', gb: 'Royaume-Uni', us: 'États-Unis',
  },
  summary: {
    de: 'Voyage au sein de l’UE – règles standard pour les animaux de compagnie.',
    at: 'Destination UE – pas de quarantaine si les conditions standard sont remplies.',
    sk: 'Pays voisin de l’UE – mêmes règles qu’en Tchéquie.',
    pl: 'Destination UE – conditions d’entrée standard pour chiens et chats de Tchéquie.',
    hu: 'Destination UE – pas de quarantaine avec passeport, puce et vaccination valides.',
    hr: 'Destination estivale populaire – règles UE, prévention tiques recommandée.',
    si: 'Destination UE – conditions standard, souvent transit vers l’Adriatique.',
    it: 'Destination UE – dans les régions chaudes, protection contre leishmaniose et tiques recommandée.',
    fr: 'Destination UE – conditions standard ; risque de tiques et puces dans certaines régions.',
    es: 'Destination UE – au sud et sur les îles, prévention forte contre la leishmaniose recommandée.',
    pt: 'Destination UE – climat chaud, prévention antiparasitaire recommandée.',
    gr: 'Destination UE – sur les îles et le continent, prévention tiques et puces recommandée.',
    nl: 'Destination UE – conditions d’entrée standard pour animaux de Tchéquie.',
    be: 'Destination UE – pas de quarantaine avec passeport, puce et vaccination.',
    fi: 'UE avec règle plus stricte – traitement contre le ténia obligatoire pour les chiens avant l’entrée.',
    ie: 'UE avec règle plus stricte – traitement contre le ténia obligatoire pour les chiens avant l’entrée.',
    mt: 'Destination insulaire UE – traitement contre le ténia obligatoire pour les chiens avant l’entrée.',
    gb: 'Règles plus strictes après le Brexit – traitement contre le ténia et certificat sanitaire.',
    us: 'Hors UE – accord d’importation CDC et certificat vétérinaire requis.',
  },
  core: {
    passport: {
      label: 'Passeport UE valide',
      detail: 'Passeport délivré dans l’UE avec données de puce et vaccins, valable pendant tout le séjour.',
    },
    rabies: {
      label: 'Vaccination antirabique',
      detail: 'Valable au moins 21 jours avant le voyage (première vaccination), inscrite dans le passeport UE.',
    },
    chip: {
      label: 'Puce électronique ISO',
      detail: 'La puce doit être lisible et inscrite dans le passeport avant la vaccination antirabique.',
    },
  },
  insuranceLabel: 'Assurance voyage pour l’animal',
  tapewormLabel: 'Traitement contre le ténia',
  parasiteLabel: 'Prévention antiparasitaire',
  documents: {
    'EU pas mazlíčka': 'Passeport UE de l’animal',
    'Očkovací certifikát': 'Certificat de vaccination',
    'Potvrzení o čipu': 'Confirmation de puce',
    'Zdravotní souhrn': 'Résumé de santé',
    'Pojišťovací kartička': 'Carte d’assurance',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Rage, leptospirose – valides',
    'FVRCP – platné': 'FVRCP – valide',
    'Vzteklina – platná, doporučená kontrola': 'Rage – valide, contrôle recommandé',
  },
})

CONTENT.es = cloneEn({
  country: {
    de: 'Alemania', at: 'Austria', sk: 'Eslovaquia', pl: 'Polonia', hu: 'Hungría',
    hr: 'Croacia', si: 'Eslovenia', it: 'Italia', fr: 'Francia', es: 'España',
    pt: 'Portugal', gr: 'Grecia', nl: 'Países Bajos', be: 'Bélgica', fi: 'Finlandia',
    ie: 'Irlanda', mt: 'Malta', gb: 'Reino Unido', us: 'Estados Unidos',
  },
  summary: {
    de: 'Viaje dentro de la UE – normas estándar para mascotas.',
    at: 'Destino UE – sin cuarentena si se cumplen las condiciones estándar.',
    sk: 'País vecino de la UE – mismas normas que en Chequia.',
    pl: 'Destino UE – condiciones de entrada estándar para perros y gatos de Chequia.',
    hu: 'Destino UE – sin cuarentena con pasaporte, chip y vacunación válidos.',
    hr: 'Destino de verano popular – normas UE, prevención de garrapatas recomendada.',
    si: 'Destino UE – condiciones estándar, a menudo tránsito hacia el Adriático.',
    it: 'Destino UE – en zonas cálidas se recomienda protección frente a leishmaniosis y garrapatas.',
    fr: 'Destino UE – condiciones estándar; en algunas regiones riesgo de garrapatas y pulgas.',
    es: 'Destino UE – en el sur y las islas se recomienda firmemente prevención de leishmaniosis.',
    pt: 'Destino UE – clima cálido, prevención antiparasitaria recomendada.',
    gr: 'Destino UE – en islas y continente se recomienda prevención de garrapatas y pulgas.',
    nl: 'Destino UE – condiciones de entrada estándar para mascotas de Chequia.',
    be: 'Destino UE – sin cuarentena con pasaporte, chip y vacunación.',
    fi: 'UE con norma más estricta – tratamiento antiparasitario interno obligatorio en perros antes de la entrada.',
    ie: 'UE con norma más estricta – tratamiento antiparasitario interno obligatorio en perros antes de la entrada.',
    mt: 'Destino insular UE – tratamiento antiparasitario interno obligatorio en perros antes de la entrada.',
    gb: 'Normas más estrictas tras el Brexit – tratamiento antiparasitario y certificado sanitario.',
    us: 'Fuera de la UE – se requiere autorización de importación CDC y certificado veterinario.',
  },
  core: {
    passport: {
      label: 'Pasaporte UE válido',
      detail: 'Pasaporte emitido en la UE con datos de chip y vacunas, válido durante toda la estancia.',
    },
    rabies: {
      label: 'Vacunación antirrábica',
      detail: 'Válida al menos 21 días antes del viaje (primera vacunación), registrada en el pasaporte UE.',
    },
    chip: {
      label: 'Microchip ISO',
      detail: 'El chip debe ser legible y estar registrado en el pasaporte antes de la vacunación antirrábica.',
    },
  },
  insuranceLabel: 'Seguro de viaje para la mascota',
  tapewormLabel: 'Tratamiento contra tenias',
  parasiteLabel: 'Prevención antiparasitaria',
  documents: {
    'EU pas mazlíčka': 'Pasaporte UE de la mascota',
    'Očkovací certifikát': 'Certificado de vacunación',
    'Potvrzení o čipu': 'Confirmación del chip',
    'Zdravotní souhrn': 'Resumen de salud',
    'Pojišťovací kartička': 'Tarjeta de seguro',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Rabia, leptospirosis – válidas',
    'FVRCP – platné': 'FVRCP – válida',
    'Vzteklina – platná, doporučená kontrola': 'Rabia – válida, revisión recomendada',
  },
})

CONTENT.pt = cloneEn({
  country: {
    de: 'Alemanha', at: 'Áustria', sk: 'Eslováquia', pl: 'Polónia', hu: 'Hungria',
    hr: 'Croácia', si: 'Eslovénia', it: 'Itália', fr: 'França', es: 'Espanha',
    pt: 'Portugal', gr: 'Grécia', nl: 'Países Baixos', be: 'Bélgica', fi: 'Finlândia',
    ie: 'Irlanda', mt: 'Malta', gb: 'Reino Unido', us: 'Estados Unidos',
  },
  summary: {
    de: 'Viagem na UE – regras padrão para animais de companhia.',
    at: 'Destino UE – sem quarentena quando as condições padrão são cumpridas.',
    sk: 'País vizinho da UE – mesmas regras que na Chéquia.',
    pl: 'Destino UE – condições de entrada padrão para cães e gatos da Chéquia.',
    hu: 'Destino UE – sem quarentena com passaporte, chip e vacinação válidos.',
    hr: 'Destino de verão popular – regras da UE, prevenção de carraças recomendada.',
    si: 'Destino UE – condições padrão, frequentemente trânsito para o Adriático.',
    it: 'Destino UE – em zonas quentes recomenda-se proteção contra leishmaniose e carraças.',
    fr: 'Destino UE – condições padrão; em algumas regiões risco de carraças e pulgas.',
    es: 'Destino UE – no sul e nas ilhas recomenda-se fortemente prevenção da leishmaniose.',
    pt: 'Destino UE – clima quente, prevenção antiparasitária recomendada.',
    gr: 'Destino UE – em ilhas e continente recomenda-se prevenção de carraças e pulgas.',
    nl: 'Destino UE – condições de entrada padrão para animais da Chéquia.',
    be: 'Destino UE – sem quarentena com passaporte, chip e vacinação.',
    fi: 'UE com regra mais rigorosa – tratamento contra ténia obrigatório em cães antes da entrada.',
    ie: 'UE com regra mais rigorosa – tratamento contra ténia obrigatório em cães antes da entrada.',
    mt: 'Destino insular UE – tratamento contra ténia obrigatório em cães antes da entrada.',
    gb: 'Regras mais rigorosas após o Brexit – tratamento contra ténia e certificado de saúde.',
    us: 'Fora da UE – necessário consentimento de importação CDC e certificado veterinário.',
  },
  core: {
    passport: {
      label: 'Passaporte UE válido',
      detail: 'Passaporte emitido na UE com dados de chip e vacinas, válido durante toda a estadia.',
    },
    rabies: {
      label: 'Vacinação antirábica',
      detail: 'Válida pelo menos 21 dias antes da viagem (primeira vacinação), registada no passaporte UE.',
    },
    chip: {
      label: 'Microchip ISO',
      detail: 'O chip deve ser legível e registado no passaporte antes da vacinação antirábica.',
    },
  },
  insuranceLabel: 'Seguro de viagem do animal',
  tapewormLabel: 'Tratamento contra ténias',
  parasiteLabel: 'Prevenção antiparasitária',
  documents: {
    'EU pas mazlíčka': 'Passaporte UE do animal',
    'Očkovací certifikát': 'Certificado de vacinação',
    'Potvrzení o čipu': 'Confirmação do chip',
    'Zdravotní souhrn': 'Resumo de saúde',
    'Pojišťovací kartička': 'Cartão de seguro',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Raiva, leptospirose – válidas',
    'FVRCP – platné': 'FVRCP – válida',
    'Vzteklina – platná, doporučená kontrola': 'Raiva – válida, controlo recomendado',
  },
})

CONTENT.el = cloneEn({
  country: {
    de: 'Γερμανία', at: 'Αυστρία', sk: 'Σλοβακία', pl: 'Πολωνία', hu: 'Ουγγαρία',
    hr: 'Κροατία', si: 'Σλοβενία', it: 'Ιταλία', fr: 'Γαλλία', es: 'Ισπανία',
    pt: 'Πορτογαλία', gr: 'Ελλάδα', nl: 'Ολλανδία', be: 'Βέλγιο', fi: 'Φινλανδία',
    ie: 'Ιρλανδία', mt: 'Μάλτα', gb: 'Ηνωμένο Βασίλειο', us: 'Ηνωμένες Πολιτείες',
  },
  summary: {
    de: 'Ταξίδι εντός ΕΕ – τυπικοί κανόνες για κατοικίδια.',
    at: 'Προορισμός ΕΕ – χωρίς καραντίνα όταν πληρούνται οι τυπικές προϋποθέσεις.',
    sk: 'Γειτονική χώρα ΕΕ – ίδιοι κανόνες με την Τσεχία.',
    pl: 'Προορισμός ΕΕ – τυπικές προϋποθέσεις εισόδου για σκύλους και γάτες από την Τσεχία.',
    hu: 'Προορισμός ΕΕ – χωρίς καραντίνα με έγκυρο διαβατήριο, τσιπ και εμβολιασμό.',
    hr: 'Δημοφιλής καλοκαιρινός προορισμός – κανόνες ΕΕ, συνιστάται πρόληψη τσιμπουριών.',
    si: 'Προορισμός ΕΕ – τυπικές προϋποθέσεις, συχνά διέλευση προς την Αδριατική.',
    it: 'Προορισμός ΕΕ – σε θερμές περιοχές συνιστάται προστασία από λεϊσμανίωση και τσιμπούρια.',
    fr: 'Προορισμός ΕΕ – τυπικές προϋποθέσεις· σε ορισμένες περιοχές κίνδυνος τσιμπουριών και ψύλλων.',
    es: 'Προορισμός ΕΕ – στον νότο και στα νησιά συνιστάται έντονα πρόληψη λεϊσμανίωσης.',
    pt: 'Προορισμός ΕΕ – θερμό κλίμα, συνιστάται πρόληψη παρασίτων.',
    gr: 'Προορισμός ΕΕ – σε νησιά και ηπειρωτική χώρα συνιστάται πρόληψη τσιμπουριών και ψύλλων.',
    nl: 'Προορισμός ΕΕ – τυπικές προϋποθέσεις εισόδου για κατοικίδια από την Τσεχία.',
    be: 'Προορισμός ΕΕ – χωρίς καραντίνα με διαβατήριο, τσιπ και εμβολιασμό.',
    fi: 'ΕΕ με αυστηρότερο κανόνα – υποχρεωτική θεραπεία ταινίας σε σκύλους πριν την είσοδο.',
    ie: 'ΕΕ με αυστηρότερο κανόνα – υποχρεωτική θεραπεία ταινίας σε σκύλους πριν την είσοδο.',
    mt: 'Νησιωτικός προορισμός ΕΕ – υποχρεωτική θεραπεία ταινίας σε σκύλους πριν την είσοδο.',
    gb: 'Αυστηρότεροι κανόνες μετά το Brexit – θεραπεία ταινίας και πιστοποιητικό υγείας.',
    us: 'Εκτός ΕΕ – απαιτείται έγκριση εισαγωγής CDC και κτηνιατρικό πιστοποιητικό.',
  },
  core: {
    passport: {
      label: 'Έγκυρο διαβατήριο ΕΕ',
      detail: 'Διαβατήριο που εκδόθηκε στην ΕΕ με στοιχεία τσιπ και εμβολιασμών, έγκυρο καθ’ όλη τη διάρκεια παραμονής.',
    },
    rabies: {
      label: 'Εμβολιασμός κατά της λύσσας',
      detail: 'Έγκυρος τουλάχιστον 21 ημέρες πριν το ταξίδι (πρώτος εμβολιασμός), καταχωρημένος στο διαβατήριο ΕΕ.',
    },
    chip: {
      label: 'Μικροτσίπ ISO',
      detail: 'Το τσιπ πρέπει να είναι αναγνώσιμο και καταχωρημένο στο διαβατήριο πριν τον εμβολιασμό κατά της λύσσας.',
    },
  },
  insuranceLabel: 'Ταξιδιωτική ασφάλεια κατοικιδίου',
  tapewormLabel: 'Θεραπεία κατά της ταινίας',
  parasiteLabel: 'Πρόληψη παρασίτων',
  documents: {
    'EU pas mazlíčka': 'Διαβατήριο ΕΕ κατοικιδίου',
    'Očkovací certifikát': 'Πιστοποιητικό εμβολιασμού',
    'Potvrzení o čipu': 'Επιβεβαίωση τσιπ',
    'Zdravotní souhrn': 'Σύνοψη υγείας',
    'Pojišťovací kartička': 'Κάρτα ασφάλειας',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Λύσσα, λεπτοσπείρωση – έγκυρα',
    'FVRCP – platné': 'FVRCP – έγκυρο',
    'Vzteklina – platná, doporučená kontrola': 'Λύσσα – έγκυρο, συνιστάται έλεγχος',
  },
})

CONTENT.nl = cloneEn({
  country: {
    de: 'Duitsland', at: 'Oostenrijk', sk: 'Slowakije', pl: 'Polen', hu: 'Hongarije',
    hr: 'Kroatië', si: 'Slovenië', it: 'Italië', fr: 'Frankrijk', es: 'Spanje',
    pt: 'Portugal', gr: 'Griekenland', nl: 'Nederland', be: 'België', fi: 'Finland',
    ie: 'Ierland', mt: 'Malta', gb: 'Verenigd Koninkrijk', us: 'Verenigde Staten',
  },
  summary: {
    de: 'Reizen binnen de EU – standaardregels voor huisdieren.',
    at: 'EU-bestemming – geen quarantaine bij voldoen aan standaardvoorwaarden.',
    sk: 'Buurland in de EU – dezelfde regels als in Tsjechië.',
    pl: 'EU-bestemming – standaard inreisvoorwaarden voor honden en katten uit Tsjechië.',
    hu: 'EU-bestemming – geen quarantaine met geldig paspoort, chip en vaccinatie.',
    hr: 'Populaire zomerbestemming – EU-regels, tekenpreventie aanbevolen.',
    si: 'EU-bestemming – standaardvoorwaarden, vaak doorreis naar de Adriatische Zee.',
    it: 'EU-bestemming – in warme gebieden bescherming tegen leishmaniasis en teken aanbevolen.',
    fr: 'EU-bestemming – standaardvoorwaarden; in sommige regio’s risico op teken en vlooien.',
    es: 'EU-bestemming – in het zuiden en op eilanden sterk aanbevolen preventie tegen leishmaniasis.',
    pt: 'EU-bestemming – warm klimaat, parasietenpreventie aanbevolen.',
    gr: 'EU-bestemming – op eilanden en vasteland teken- en vlooienpreventie aanbevolen.',
    nl: 'EU-bestemming – standaard inreisvoorwaarden voor huisdieren uit Tsjechië.',
    be: 'EU-bestemming – geen quarantaine bij paspoort, chip en vaccinatie.',
    fi: 'EU met strengere regel – lintwormbehandeling voor honden verplicht vóór binnenkomst.',
    ie: 'EU met strengere regel – lintwormbehandeling voor honden verplicht vóór binnenkomst.',
    mt: 'EU-eilandbestemming – lintwormbehandeling voor honden verplicht vóór binnenkomst.',
    gb: 'Strengere regels na de Brexit – lintwormbehandeling en gezondheidscertificaat vereist.',
    us: 'Buiten de EU – CDC-invoergoedkeuring en veterinair certificaat vereist.',
  },
  core: {
    passport: {
      label: 'Geldig EU-paspoort',
      detail: 'In de EU afgegeven paspoort met chip- en vaccinatiegegevens, geldig gedurende het hele verblijf.',
    },
    rabies: {
      label: 'Rabiësvaccinatie',
      detail: 'Geldig minstens 21 dagen vóór vertrek (eerste vaccinatie), geregistreerd in het EU-paspoort.',
    },
    chip: {
      label: 'ISO-microchip',
      detail: 'De chip moet leesbaar zijn en vóór de rabiësvaccinatie in het paspoort staan.',
    },
  },
  insuranceLabel: 'Reisverzekering voor het huisdier',
  tapewormLabel: 'Lintwormbehandeling',
  parasiteLabel: 'Parasietenpreventie',
  documents: {
    'EU pas mazlíčka': 'EU-huisdierenpaspoort',
    'Očkovací certifikát': 'Vaccinatiecertificaat',
    'Potvrzení o čipu': 'Chipbevestiging',
    'Zdravotní souhrn': 'Gezondheidsoverzicht',
    'Pojišťovací kartička': 'Verzekeringskaart',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Rabiës, leptospirose – geldig',
    'FVRCP – platné': 'FVRCP – geldig',
    'Vzteklina – platná, doporučená kontrola': 'Rabiës – geldig, controle aanbevolen',
  },
})

CONTENT.fi = cloneEn({
  country: {
    de: 'Saksa', at: 'Itävalta', sk: 'Slovakia', pl: 'Puola', hu: 'Unkari',
    hr: 'Kroatia', si: 'Slovenia', it: 'Italia', fr: 'Ranska', es: 'Espanja',
    pt: 'Portugali', gr: 'Kreikka', nl: 'Alankomaat', be: 'Belgia', fi: 'Suomi',
    ie: 'Irlanti', mt: 'Malta', gb: 'Yhdistynyt kuningaskunta', us: 'Yhdysvallat',
  },
  summary: {
    de: 'Matkustaminen EU:ssa – vakiosäännöt lemmikkieläimille.',
    at: 'EU-kohde – ei karanteenia, kun vakioehdot täyttyvät.',
    sk: 'Naapurimaa EU:ssa – samat säännöt kuin Tšekissä.',
    pl: 'EU-kohde – vakioehdot koirien ja kissojen maahantulolle Tšekistä.',
    hu: 'EU-kohde – ei karanteenia voimassa olevalla passilla, sirulla ja rokotuksella.',
    hr: 'Suosittu kesäkohde – EU-säännöt, punkkisuojaus suositeltavaa.',
    si: 'EU-kohde – vakioehdot, usein kauttakulku Adrianmerelle.',
    it: 'EU-kohde – lämpimillä alueilla suositellaan suojaa leishmanioosia ja punkkeja vastaan.',
    fr: 'EU-kohde – vakioehdot; joillain alueilla punkki- ja kirppuriski.',
    es: 'EU-kohde – etelässä ja saarilla leishmanioosin ehkäisy vahvasti suositeltavaa.',
    pt: 'EU-kohde – lämmin ilmasto, loistorjunta suositeltavaa.',
    gr: 'EU-kohde – saarilla ja mantereella punkki- ja kirppusuojaus suositeltavaa.',
    nl: 'EU-kohde – vakioehdot lemmikkien maahantulolle Tšekistä.',
    be: 'EU-kohde – ei karanteenia passin, sirun ja rokotuksen täyttyessä.',
    fi: 'EU tiukemmalla säännöllä – koirilla pakollinen heisimatohoito ennen maahantuloa.',
    ie: 'EU tiukemmalla säännöllä – koirilla pakollinen heisimatohoito ennen maahantuloa.',
    mt: 'EU:n saarikohde – koirilla pakollinen heisimatohoito ennen maahantuloa.',
    gb: 'Tiukemmat säännöt Brexitin jälkeen – heisimatohoito ja terveystodistus.',
    us: 'EU:n ulkopuolella – CDC:n tuontilupa ja eläinlääkärin todistus vaaditaan.',
  },
  core: {
    passport: {
      label: 'Voimassa oleva EU-passi',
      detail: 'EU:ssa myönnetty passi siru- ja rokotustiedoilla, voimassa koko oleskelun ajan.',
    },
    rabies: {
      label: 'Rabiesrokotus',
      detail: 'Voimassa vähintään 21 päivää ennen matkaa (ensirokotus), merkitty EU-passiin.',
    },
    chip: {
      label: 'ISO-mikrosiru',
      detail: 'Sirun on oltava luettavissa ja merkitty passiin ennen rabiesrokotusta.',
    },
  },
  insuranceLabel: 'Lemmikin matkavakuutus',
  tapewormLabel: 'Heisimatohoito',
  parasiteLabel: 'Loistorjunta',
  documents: {
    'EU pas mazlíčka': 'EU-lemmikkipassi',
    'Očkovací certifikát': 'Rokotustodistus',
    'Potvrzení o čipu': 'Siruvahvistus',
    'Zdravotní souhrn': 'Terveysyhteenveto',
    'Pojišťovací kartička': 'Vakuutuskortti',
  },
  vaccination: {
    'Vzteklina, leptospiróza – platné': 'Rabies, leptospiroosi – voimassa',
    'FVRCP – platné': 'FVRCP – voimassa',
    'Vzteklina – platná, doporučená kontrola': 'Rabies – voimassa, tarkistus suositeltava',
  },
})

export type TravelPackPdfSource = {
  pet: Pet
  pack: PetTravelPackage
  destination: TravelDestination
  overall: 'ready' | 'attention' | 'missing'
  evaluated: Array<{
    id: string
    check: TravelRequirementCheck
    status: 'ready' | 'attention' | 'missing'
  }>
}

export type LocalizedTravelPdf = {
  locale: TravelPdfLocale
  bcp47: string
  countryName: string
  summary: string
  breed: string
  vaccinationSummary: string
  travelPackTitle: string
  destinationLine: string
  readinessLabel: string
  statusLabel: (status: 'ready' | 'attention' | 'missing') => string
  euPassportTitle: string
  vaccinationTitle: string
  microchipTitle: string
  healthRecordsTitle: string
  validUntilLine: string
  nextDueLine: string
  registeredLine: string
  clinicalRecordsLine: string
  lastVisitLine: string
  requirementsHeading: string
  documentsHeading: string
  footerLeft: string
  footerRight: string
  evaluated: Array<{
    label: string
    detail: string
    hint: string
    status: 'ready' | 'attention' | 'missing'
  }>
  documents: Array<{ label: string; ready: boolean }>
  filename: string
  shareText: string
}

function translateRequirement(
  locale: TravelPdfLocale,
  destId: string,
  reqId: string,
  check: TravelRequirementCheck,
): ReqText {
  const c = CONTENT[locale]
  if (c.special[reqId]) return c.special[reqId]

  if (check === 'eu_passport') return c.core.passport
  if (check === 'rabies') return c.core.rabies
  if (check === 'microchip') return c.core.chip
  if (check === 'insurance') {
    return {
      label: c.insuranceLabel,
      detail: c.insuranceDetail[destId] ?? c.insuranceDetail.de,
    }
  }
  if (check === 'tapeworm') {
    return {
      label: c.tapewormLabel,
      detail: c.tapewormDetail[destId] ?? c.tapewormDetail.gb,
    }
  }
  if (check === 'parasite_prevention') {
    return {
      label: c.parasiteLabel,
      detail: c.parasiteDetail[destId] ?? c.parasiteDetail.hr,
    }
  }
  if (check === 'health_cert') {
    return (
      c.special[reqId] ?? {
        label: c.special.gb_health.label,
        detail: c.special.gb_health.detail,
      }
    )
  }
  if (check === 'import_permit') {
    return c.special.us_import
  }
  return { label: reqId, detail: '' }
}

function hintFor(
  ui: UiStrings,
  pack: PetTravelPackage,
  check: TravelRequirementCheck,
  status: 'ready' | 'attention' | 'missing',
): string {
  switch (check) {
    case 'eu_passport':
      if (status === 'ready') return `${ui.passportValid} ${pack.euPassport.validUntil}`
      if (status === 'attention') return `${ui.passportExpiring} ${pack.euPassport.validUntil}`
      return ui.passportMissing
    case 'rabies':
      return pack.vaccinationSummary
    case 'microchip':
      return status === 'ready' ? pack.microchip : ui.chipMissing
    case 'tapeworm':
      return ui.tapewormHint
    case 'parasite_prevention':
      return ui.parasiteHint
    case 'health_cert':
      return status === 'ready' ? ui.healthCertReady : ui.healthCertMissing
    case 'insurance':
      return status === 'ready' ? ui.insuranceReady : ui.insuranceAttention
    case 'import_permit':
      return ui.importPermitHint
  }
}

export function localeForDestination(destinationId: string): TravelPdfLocale {
  return DESTINATION_LOCALE[destinationId] ?? 'en'
}

export function localizeTravelPackForPdf(input: TravelPackPdfSource): LocalizedTravelPdf {
  const locale = localeForDestination(input.destination.id)
  const ui = UI[locale]
  const content = CONTENT[locale]
  const destId = input.destination.id
  const countryName = content.country[destId] ?? input.destination.country
  const summary = content.summary[destId] ?? input.destination.summary
  const breed = content.breeds[input.pet.breed] ?? input.pet.breed
  const vaccinationSummary =
    content.vaccination[input.pack.vaccinationSummary] ?? input.pack.vaccinationSummary

  const readinessLabel =
    input.overall === 'ready'
      ? ui.ready
      : input.overall === 'attention'
        ? ui.almostReady
        : ui.needsWork

  const statusLabel = (status: 'ready' | 'attention' | 'missing') =>
    status === 'ready'
      ? ui.statusReady
      : status === 'attention'
        ? ui.statusAttention
        : ui.statusMissing

  const evaluated = input.evaluated.map((item) => {
    const text = translateRequirement(locale, destId, item.id, item.check)
    let hint = hintFor(ui, input.pack, item.check, item.status)
    if (item.check === 'rabies') {
      hint = content.vaccination[input.pack.vaccinationSummary] ?? input.pack.vaccinationSummary
    }
    return {
      label: text.label,
      detail: text.detail,
      hint,
      status: item.status,
    }
  })

  const documents = input.pack.documents.map((doc) => ({
    label: content.documents[doc.label] ?? doc.label,
    ready: doc.ready,
  }))

  const nextDue = input.pet.nextVaccination ?? ui.dash
  const lastVisit = input.pet.lastVetVisit ?? ui.dash
  const generated = new Date().toLocaleString(LOCALE_BCP47[locale])

  const shareDocs = documents.map((doc) => `${doc.ready ? '✓' : '–'} ${doc.label}`).join('\n')

  return {
    locale,
    bcp47: LOCALE_BCP47[locale],
    countryName,
    summary,
    breed,
    vaccinationSummary,
    travelPackTitle: ui.travelPackTitle,
    destinationLine: `${ui.destinationPrefix} ${countryName}`,
    readinessLabel,
    statusLabel,
    euPassportTitle: ui.euPassport,
    vaccinationTitle: ui.vaccination,
    microchipTitle: ui.microchip,
    healthRecordsTitle: ui.healthRecords,
    validUntilLine: `${ui.validUntil} ${input.pack.euPassport.validUntil}`,
    nextDueLine: `${ui.nextDue} ${nextDue}`,
    registeredLine: `${ui.registeredIn} ${BRAND_NAME}`,
    clinicalRecordsLine: `${input.pack.healthRecordCount} ${ui.clinicalRecords}`,
    lastVisitLine: `${ui.lastVisit} ${lastVisit}`,
    requirementsHeading: `${ui.requirementsFor} ${countryName.toUpperCase()}`,
    documentsHeading: ui.documentsInPack,
    footerLeft: `${ui.footerSummary} ${input.pet.name}`,
    footerRight: `${ui.generatedPrefix} ${generated}`,
    evaluated,
    documents,
    filename: `travel-pack-${input.pet.name.toLowerCase()}-${destId}.pdf`,
    shareText: [
      `${BRAND_NAME} — ${ui.shareTitle}`,
      '',
      `${ui.sharePet} ${input.pet.name} (${breed})`,
      `${ui.shareDestination} ${countryName}`,
      `${ui.shareStatus} ${readinessLabel}`,
      '',
      `${ui.euPassport}: ${input.pack.euPassport.number}`,
      `${ui.validUntil}: ${input.pack.euPassport.validUntil}`,
      `${ui.vaccination}: ${vaccinationSummary}`,
      `${ui.microchip}: ${input.pack.microchip}`,
      '',
      `${ui.shareDocuments}`,
      shareDocs,
    ].join('\n'),
  }
}
