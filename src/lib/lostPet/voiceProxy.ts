import type { VoiceProxyConfig } from '../../types/lostPet'

/**
 * Architecture stub for future anonymous/proxy voice calls.
 * Never exposes real phone numbers of either party.
 *
 * Future flow (when enabled):
 * 1. Owner or finder requests a proxy session for `SafeContactChannel.id`
 * 2. Provider (Twilio Proxy / Vonage) allocates ephemeral numbers
 * 3. Both parties dial the proxy — real numbers stay with the provider only
 * 4. Session ends when the channel closes (`pet_home`)
 */
export function getVoiceProxyConfig(): VoiceProxyConfig {
  return {
    enabled: false,
    provider: 'none',
    label: 'Spojit telefonicky',
    unavailableReason:
      'Anonymní hovor bude dostupný po připojení proxy služby. Skutečné číslo druhé strany se nikdy nezobrazí.',
  }
}

export type VoiceProxyRequestResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: 'unavailable' | 'channel_closed' }

/**
 * Placeholder — always unavailable until a provider is wired.
 */
export async function requestAnonymousVoiceSession(_channelId: string): Promise<VoiceProxyRequestResult> {
  void _channelId
  return { ok: false, reason: 'unavailable' }
}
