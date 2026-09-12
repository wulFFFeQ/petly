/**
 * K47 — Security Context + Central Authorization Runtime
 *
 * One SecurityContext + one authorize() entry point.
 * Wraps existing HH / Pro / OrgPet / ownership / booking / payment / messaging boundaries.
 * Does NOT rewrite access models or invent a unified PetAccess.
 */

export type {
  ActiveMode,
  ActorKind,
  AuthenticationKind,
  AuthorizationAllowReason,
  AuthorizationAuditPayload,
  AuthorizationDecision,
  AuthorizationDenyClass,
  AuthorizationDenyCode,
  AuthorizationRequest,
  ResourceRef,
  ResourceType,
  SecurityAction,
  SecurityActor,
  SecurityAuthentication,
  SecurityAuthority,
  SecurityChannel,
  SecurityContext,
  ValidatedOrganizationContext,
  ValidatedProfessionalContext,
} from './types'

export {
  KNOWN_SECURITY_ACTIONS,
  householdPermissionForAction,
  isBookingAction,
  isKnownSecurityAction,
  isMessagingAction,
  isPaymentAction,
  isPetDataAction,
  isPublicAction,
  professionalPermissionForAction,
  requiresAuthenticatedAccount,
} from './actions'

export {
  actorAccountId,
  createAnonymousPublicContext,
  createProviderActorContext,
  createSecurityContext,
  createSystemActorContext,
  isAuthenticatedAccount,
  validatedOrg,
  withOrganizationContext,
  withPersonalMode,
  withProfessionalContext,
} from './context'

export {
  createDemoPublicSecurityContext,
  createDemoSecurityContext,
  type DemoSessionAdapterInput,
  type DemoSessionAdapterResult,
} from './demoSessionAdapter'

export {
  authorize,
  assertAuthorized,
  switchToOrganizationMode,
  switchToProfessionalMode,
  type AuthorizeDeps,
} from './authorize'

export { AuthorizationError, isAuthorizationError } from './errors'

export {
  emitAuthorizationAudit,
  setAuthorizationAuditObserver,
  type AuthorizationAuditObserver,
} from './auditHook'

export { isForgedActorClaim, resolveActor } from './resolveActor'

export {
  PETS_STORAGE_KEY,
  loadPetsFromDemoStorage,
  resolveResource,
  type AuthorizationResourceStore,
  type ResolvedResource,
} from './resolveResource'

export {
  resolveOrganizationContext,
  type ResolveOrganizationContextDeps,
} from './resolveOrganizationContext'

export {
  resolveProfessionalContext,
  type ResolveProfessionalContextDeps,
} from './resolveProfessionalContext'

export { projectAfterAuthorize } from './adapters/project'
export { projectAuthorizedPublicPet } from './adapters/public'
export { actorHasOrgMembershipOnly } from './adapters/organizationPet'
