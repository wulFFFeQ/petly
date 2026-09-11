import type { HouseholdPetPermission, HouseholdPetRole } from './types'

export const HOUSEHOLD_PERMISSION_LABELS: Record<HouseholdPetPermission, string> = {
  pet_profile_read: 'Číst profil',
  pet_profile_write: 'Upravovat profil',
  health_read: 'Číst zdraví',
  health_write: 'Upravovat zdraví',
  documents_read: 'Číst dokumenty',
  documents_write: 'Upravovat dokumenty',
  calendar_read: 'Číst kalendář',
  calendar_write: 'Upravovat kalendář',
  gallery_read: 'Číst galerii',
  gallery_write: 'Upravovat galerii',
  timeline_read: 'Číst timeline',
  timeline_write: 'Upravovat timeline',
  emergency_read: 'Číst emergency',
  emergency_write: 'Spravovat emergency',
  household_manage: 'Spravovat domácnost',
}

export const HOUSEHOLD_ROLE_LABELS: Record<HouseholdPetRole, string> = {
  co_owner: 'Spolumajitel',
  caregiver: 'Pečující osoba',
  viewer: 'Pozorovatel',
}

export const HOUSEHOLD_PERMISSION_OPTIONS = (
  Object.keys(HOUSEHOLD_PERMISSION_LABELS) as HouseholdPetPermission[]
).map((id) => ({
  id,
  label: HOUSEHOLD_PERMISSION_LABELS[id],
}))

export function formatHouseholdPermissionList(permissions: HouseholdPetPermission[]): string[] {
  return permissions.map((p) => HOUSEHOLD_PERMISSION_LABELS[p] ?? p)
}
