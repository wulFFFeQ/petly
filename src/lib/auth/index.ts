export {
  getSupabaseBrowserClient,
  resetSupabaseBrowserClientForTests,
} from './supabaseClient'
export {
  getAuthSession,
  getAuthenticatedUserId,
  isRealAuthAvailable,
  onAuthStateChange,
  signInWithEmailPassword,
  signOutAuth,
  signUpWithEmailPassword,
  type AuthResult,
} from './supabaseAuth'
export {
  clearAuthSessionCache,
  getCachedAuthenticatedAccountId,
  isAuthSessionReady,
  setAuthSessionReady,
  setCachedAuthenticatedAccountId,
} from './sessionCache'
