import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp, type NewHealthRecordInput } from '../../context/AppContext'
import {
  appendAndPersistAccessLogs,
  assertCanAddHealthRecord,
  assertCanAddNote,
  assertCanAddVaccination,
  assertCanAddVisit,
  assertProfessionalViewSafe,
  canProfessionalAddHealthRecord,
  canProfessionalAddNote,
  canProfessionalAddVaccination,
  canProfessionalAddVisit,
  createAccessLogEntry,
  findAccess,
  getRoleMeta,
  isAccessEffective,
  loadAccessState,
  loadPetProfessionalAccess,
  projectPetForProfessional,
  saveProfessionalAccessLogs,
} from '../../lib/professional'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'

/**
 * Professional pet view under /professional/pets/:petId.
 * Always uses projectPetForProfessional — never raw owner PetProfile.
 */
export function ProfessionalPetPage() {
  const { petId = '' } = useParams()
  const navigate = useNavigate()
  const { pets, healthRecords, documents, addHealthRecord, showToast } = useApp()
  const [noteTitle, setNoteTitle] = useState('')
  const [recordTitle, setRecordTitle] = useState('')
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [refreshKey, setRefreshKey] = useState(0)

  const professional = getActiveSelfProfessionalProfile()
  const professionalId = professional?.id ?? ''
  const pet = pets.find((p) => p.id === petId)

  const access = useMemo(() => {
    if (!professionalId || !petId) return null
    return findAccess(loadPetProfessionalAccess(), petId, professionalId) ?? null
  }, [petId, professionalId, refreshKey])

  const { view, denied } = useMemo(() => {
    if (!pet || !access || !isAccessEffective(access)) {
      return { view: null, denied: true as const }
    }
    const { logs: existingLogs } = loadAccessState()
    const result = projectPetForProfessional(pet, {
      access,
      healthRecords,
      documents,
      logViews: true,
      auditLogs: existingLogs,
    })
    assertProfessionalViewSafe(result.view)
    if (result.logs.length !== existingLogs.length) {
      saveProfessionalAccessLogs(result.logs)
    }
    return { view: result.view, denied: false as const }
  }, [pet, access, healthRecords, documents, refreshKey])

  const logWrite = (action: 'record_added' | 'vaccination_added') => {
    if (!access || !professionalId) return
    const { logs } = loadAccessState()
    const next = [
      ...logs,
      createAccessLogEntry({
        petId,
        professionalId,
        action,
        metadata: { accessId: access.id },
      }),
    ]
    appendAndPersistAccessLogs(next)
    setRefreshKey((k) => k + 1)
  }

  const submitWrite = (
    type: NewHealthRecordInput['type'],
    writeKind: 'visit' | 'vaccination' | 'health' | 'note',
  ) => {
    if (!access || !pet) return
    try {
      if (writeKind === 'visit') assertCanAddVisit(access)
      if (writeKind === 'vaccination') assertCanAddVaccination(access)
      if (writeKind === 'health') assertCanAddHealthRecord(access)
      if (writeKind === 'note') assertCanAddNote(access)

      const title =
        writeKind === 'note'
          ? noteTitle.trim() || 'Poznámka profesionála'
          : recordTitle.trim()
      if (!title && writeKind !== 'note') {
        showToast('Doplňte název', 'Zadejte krátký popis záznamu.', 'info')
        return
      }

      addHealthRecord({
        petId: pet.id,
        type: writeKind === 'vaccination' ? 'vaccination' : writeKind === 'visit' ? 'vet' : type,
        title: title || 'Poznámka',
        date: recordDate,
        doctor: professional?.displayName,
      })

      if (writeKind === 'vaccination') logWrite('vaccination_added')
      else logWrite('record_added')

      setRecordTitle('')
      setNoteTitle('')
      showToast('Záznam přidán', pet.name, 'success')
      setRefreshKey((k) => k + 1)
    } catch {
      showToast('Bez oprávnění', 'Tuto akci nemáte povolenou.', 'info')
    }
  }

  if (!professional) {
    return (
      <Card className="mx-auto max-w-lg text-center" data-testid="pro-dash-pet-missing-pro">
        <p className="text-sm font-bold">Chybí profesionální profil</p>
        <Button className="mt-3" size="sm" onClick={() => navigate('/professional')}>
          Zpět
        </Button>
      </Card>
    )
  }

  if (denied || !view || !access) {
    return (
      <Card className="mx-auto max-w-lg text-center" data-testid="pro-dash-pet-denied">
        <p className="text-sm font-bold text-[#191E1B]">Přístup není dostupný</p>
        <p className="mt-2 text-xs text-[#7D8B82]">
          K tomuto mazlíčkovi nemáte aktivní PetProfessionalAccess, nebo byl přístup
          odebrán / vypršel / čeká na schválení.
        </p>
        <Button className="mt-3" size="sm" onClick={() => navigate('/professional/pets')}>
          Zpět na propojení
        </Button>
      </Card>
    )
  }

  const roleLabel = getRoleMeta(professional.type).label
  const photoAllowed = Boolean(view.name) // identity only when projected

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8" data-testid="pro-dash-pet-page">
      <Link
        to="/professional/pets"
        className="inline-flex text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
      >
        ← Zpět na propojení
      </Link>

      <Card variant="elevated">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
          Profesionální pohled · {roleLabel}
        </p>
        <div className="mt-2 flex items-start gap-3">
          {photoAllowed && pet?.image ? (
            <img
              src={pet.image}
              alt=""
              className="h-16 w-16 rounded-full object-cover border border-[#E8E4DC]"
            />
          ) : null}
          <div>
            <h1 className="text-xl font-bold text-[#191E1B]" data-testid="pro-dash-pet-name">
              {view.name}
            </h1>
            <p className="text-xs text-[#7D8B82]">
              {view.breed}
              {view.type ? ` · ${view.type}` : ''}
            </p>
            <Badge className="mt-2">Aktivní přístup</Badge>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#A3AEA7]">
          Mikročip a kontakty majitele nejsou součástí tohoto pohledu.
        </p>
      </Card>

      {view.healthRecords ? (
        <Card variant="elevated" data-testid="pro-dash-pet-health">
          <h2 className="text-sm font-bold text-[#191E1B]">Zdraví</h2>
          {view.healthRecords.length === 0 ? (
            <p className="mt-2 text-xs text-[#7D8B82]">Žádné záznamy</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {view.healthRecords.map((r) => (
                <li key={r.id} className="rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2">
                  <p className="text-xs font-bold text-[#191E1B]">{r.title}</p>
                  <p className="text-[11px] text-[#7D8B82]">
                    {r.subtitle} · {r.date}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card data-testid="pro-dash-health-hidden">
          <p className="text-xs text-[#7D8B82]">
            Tento obsah vám majitel nezpřístupnil. (Zdraví)
          </p>
        </Card>
      )}

      {view.vaccinations ? (
        <Card variant="elevated" data-testid="pro-dash-pet-vaccinations">
          <h2 className="text-sm font-bold text-[#191E1B]">Očkování</h2>
          {view.vaccinations.length === 0 ? (
            <p className="mt-2 text-xs text-[#7D8B82]">Žádná očkování</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {view.vaccinations.map((r) => (
                <li key={r.id} className="text-xs text-[#4A564F]">
                  {r.subtitle || r.vaccineName || r.title} · {r.date}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card data-testid="pro-dash-vaccinations-hidden">
          <p className="text-xs text-[#7D8B82]">
            Tento obsah vám majitel nezpřístupnil. (Očkování)
          </p>
        </Card>
      )}

      {view.medications ? (
        <Card variant="elevated" data-testid="pro-dash-pet-medications">
          <h2 className="text-sm font-bold text-[#191E1B]">Léky</h2>
          {view.medications.length === 0 ? (
            <p className="mt-2 text-xs text-[#7D8B82]">Žádné léky</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {view.medications.map((r) => (
                <li key={r.id} className="text-xs text-[#4A564F]">
                  {r.subtitle || r.title} · {r.date}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card data-testid="pro-dash-medications-hidden">
          <p className="text-xs text-[#7D8B82]">
            Tento obsah vám majitel nezpřístupnil. (Léky)
          </p>
        </Card>
      )}

      {view.documents ? (
        <Card variant="elevated" data-testid="pro-dash-pet-documents">
          <h2 className="text-sm font-bold text-[#191E1B]">Dokumenty</h2>
          {view.documents.length === 0 ? (
            <p className="mt-2 text-xs text-[#7D8B82]">Žádné dokumenty</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {view.documents.map((d) => (
                <li key={d.id} className="text-xs text-[#4A564F]">
                  {d.name || d.fileName || d.id}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card data-testid="pro-dash-documents-hidden">
          <p className="text-xs text-[#7D8B82]">
            Tento obsah vám majitel nezpřístupnil. (Dokumenty)
          </p>
        </Card>
      )}

      <Card variant="elevated" data-testid="pro-dash-pet-write">
        <h2 className="text-sm font-bold text-[#191E1B]">Přidat záznam</h2>
        <p className="mt-1 text-[11px] text-[#7D8B82]">
          WRITE vyžaduje explicitní oprávnění. READ neznamená WRITE.
        </p>
        <div className="mt-3 space-y-2">
          <Input
            label="Datum"
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
          />
          <Input
            label="Popis záznamu"
            value={recordTitle}
            onChange={(e) => setRecordTitle(e.target.value)}
            placeholder="např. kontrola, vakcína…"
          />
          <div className="flex flex-wrap gap-2">
            {canProfessionalAddVisit(access) ? (
              <Button
                size="sm"
                variant="secondary"
                data-testid="pro-dash-add-visit"
                onClick={() => submitWrite('vet', 'visit')}
              >
                Přidat návštěvu
              </Button>
            ) : null}
            {canProfessionalAddVaccination(access) ? (
              <Button
                size="sm"
                variant="secondary"
                data-testid="pro-dash-add-vaccination"
                onClick={() => submitWrite('vaccination', 'vaccination')}
              >
                Přidat očkování
              </Button>
            ) : null}
            {canProfessionalAddHealthRecord(access) ? (
              <Button
                size="sm"
                variant="secondary"
                data-testid="pro-dash-add-health"
                onClick={() => submitWrite('examination', 'health')}
              >
                Přidat zdravotní záznam
              </Button>
            ) : null}
          </div>
          {canProfessionalAddNote(access) ? (
            <div className="pt-2">
              <Input
                label="Poznámka"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Krátká poznámka"
              />
              <Button
                size="sm"
                className="mt-2"
                variant="outline"
                data-testid="pro-dash-add-note"
                onClick={() => submitWrite('examination', 'note')}
              >
                Přidat poznámku
              </Button>
            </div>
          ) : null}
          {!canProfessionalAddVisit(access) &&
          !canProfessionalAddVaccination(access) &&
          !canProfessionalAddHealthRecord(access) &&
          !canProfessionalAddNote(access) ? (
            <p className="text-xs text-[#A3AEA7]" data-testid="pro-dash-no-write">
              Nemáte žádná WRITE oprávnění.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
