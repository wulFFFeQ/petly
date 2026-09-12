export {
  getAuthSession,
  getAuthenticatedUserId,
  isRealAuthAvailable,
  onAuthStateChange,
  signInWithEmailPassword,
  signOutAuth,
  signUpWithEmailPassword,
  type AuthResult,
  type AuthSession,
  type AuthAccount,
} from './sessionAuth'
export {
  clearAuthSessionCache,
  getCachedAuthenticatedAccountId,
  isAuthSessionReady,
  setAuthSessionReady,
  setCachedAuthenticatedAccountId,
} from './sessionCache'
