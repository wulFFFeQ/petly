/**
 * Verification providers — honest defaults until real backends exist.
 * Parallel to microchip registry: unconfigured / demo, never pretend live.
 */

export type ProviderMode = 'unconfigured' | 'demo' | 'live'

export interface VerificationProviderInfo {
  id: string
  label: string
  mode: ProviderMode
  /** When false, cannot create presentation:'trust' records via this channel. */
  canIssueTrust: boolean
  note: string
}

const emailProvider: VerificationProviderInfo = {
  id: 'email',
  label: 'E-mail provider',
  mode: 'unconfigured',
  canIssueTrust: false,
  note: 'V této verzi není napojený žádný e-mailový ověřovací provider.',
}

const smsProvider: VerificationProviderInfo = {
  id: 'sms',
  label: 'SMS provider',
  mode: 'unconfigured',
  canIssueTrust: false,
  note: 'V této verzi není napojený žádný SMS ověřovací provider.',
}

const identityProvider: VerificationProviderInfo = {
  id: 'identity',
  label: 'Identity provider',
  mode: 'unconfigured',
  canIssueTrust: false,
  note: 'Ověření identity není k dispozici — provider není napojen.',
}

const petRelationProvider: VerificationProviderInfo = {
  id: 'pet_relation',
  label: 'Pet relation provider',
  mode: 'unconfigured',
  canIssueTrust: false,
  note: 'Ověření vztahu k mazlíčkovi není k dispozici. Mikročip sám o sobě není důkaz vlastnictví.',
}

const vetAttestationProvider: VerificationProviderInfo = {
  id: 'vet_attestation',
  label: 'Veterinary attestation',
  mode: 'unconfigured',
  canIssueTrust: false,
  note: 'Veterinární ověření není k dispozici — attestation provider není napojen.',
}

export function getEmailProvider(): VerificationProviderInfo {
  return emailProvider
}

export function getSmsProvider(): VerificationProviderInfo {
  return smsProvider
}

export function getIdentityProvider(): VerificationProviderInfo {
  return identityProvider
}

export function getPetRelationProvider(): VerificationProviderInfo {
  return petRelationProvider
}

export function getVetAttestationProvider(): VerificationProviderInfo {
  return vetAttestationProvider
}

export function listVerificationProviders(): VerificationProviderInfo[] {
  return [
    getEmailProvider(),
    getSmsProvider(),
    getIdentityProvider(),
    getPetRelationProvider(),
    getVetAttestationProvider(),
  ]
}

/**
 * DEV/demo confirm: creates a demo verification only.
 * Never sets presentation to 'trust'.
 */
export function canRunLocalDemoConfirm(channel: 'email' | 'phone'): boolean {
  void channel
  return true
}
